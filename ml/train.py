import os
import sqlite3
import json
import joblib
import numpy as np
import pandas as pd

from pathlib import Path
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = Path(os.getenv("PYROWATCH_DB", "/data/pyrowatch1.db"))
MODEL_DIR = BASE_DIR / "models"
MODEL_PATH = MODEL_DIR / "forecast_models.pkl"

HORIZON_MINUTES = 15
RESAMPLE_RULE = "1min"
TARGET_TOLERANCE_MINUTES = 2
MIN_TRAIN_ROWS = 40
TEST_RATIO = 0.20
RANDOM_STATE = 42
MODEL_VERSION = "pyrowatch-insight-rf-15m-v2"
MODEL_DIR.mkdir(parents=True, exist_ok=True)

# Fitur saat ini. Spread yang digunakan adalah estimasi baseline dari Node-RED,
# bukan label ground-truth. Kecepatan angin Open-Meteo tidak digunakan.
BASE_FEATURES = [
    "co", "ch4", "temp", "hum", "fri",
    "wind_speed_sensor", "spread_rate_cmph",
    "wind_direction_sin", "wind_direction_cos",
    "hour_sin", "hour_cos"
]


def load_database():
    if not DB_PATH.exists():
        raise FileNotFoundError(f"Database tidak ditemukan: {DB_PATH}")
    connection = sqlite3.connect(DB_PATH)
    try:
        df = pd.read_sql_query(
            """
            SELECT node_id, timestamp, co, ch4, temp, hum, fri,
                   wind_speed, wind_speed_sensor, wind_direction_deg,
                   spread_rate_cmph, observed_spread_rate_cmph,
                   observed_spread_direction
            FROM sensor_readings
            ORDER BY node_id, timestamp
            """,
            connection
        )
    finally:
        connection.close()
    if df.empty:
        raise ValueError("Tabel sensor_readings masih kosong.")
    return df


def prepare_raw_data(df):
    df = df.copy()
    df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce", utc=True)
    df = df.dropna(subset=["node_id", "timestamp"])
    numeric_columns = [
        "co", "ch4", "temp", "hum", "fri", "wind_speed",
        "wind_speed_sensor", "wind_direction_deg", "spread_rate_cmph",
        "observed_spread_rate_cmph"
    ]
    for column in numeric_columns:
        if column in df.columns:
            df[column] = pd.to_numeric(df[column], errors="coerce")
    if "wind_speed_sensor" not in df.columns:
        df["wind_speed_sensor"] = np.nan
    df["wind_speed_sensor"] = df["wind_speed_sensor"].fillna(df["wind_speed"])
    if "spread_rate_cmph" not in df.columns:
        df["spread_rate_cmph"] = np.nan
    if "observed_spread_rate_cmph" not in df.columns:
        df["observed_spread_rate_cmph"] = np.nan
    return df


def build_features(frame):
    result = frame.copy()
    direction = np.deg2rad(result["wind_direction_deg"])
    result["wind_direction_sin"] = np.sin(direction)
    result["wind_direction_cos"] = np.cos(direction)
    hour = result.index.hour + result.index.minute / 60.0
    result["hour_sin"] = np.sin(2 * np.pi * hour / 24)
    result["hour_cos"] = np.cos(2 * np.pi * hour / 24)
    return result


def aggregate_by_node(df):
    aggregated = []
    for node_id, group in df.groupby("node_id"):
        group = group.sort_values("timestamp").set_index("timestamp")
        numeric = group.select_dtypes(include=[np.number])
        if numeric.empty:
            continue
        minute = numeric.resample(RESAMPLE_RULE).mean()
        minute = minute.interpolate(method="time", limit=2, limit_area="inside")
        minute["node_id"] = node_id
        aggregated.append(build_features(minute))
    if not aggregated:
        raise ValueError("Tidak ada data yang dapat diagregasikan.")
    return aggregated


def create_supervised_dataset(minute_data):
    samples = []
    tolerance = pd.Timedelta(minutes=TARGET_TOLERANCE_MINUTES)
    horizon = pd.Timedelta(minutes=HORIZON_MINUTES)
    for frame in minute_data:
        if frame.empty:
            continue
        node_id = str(frame["node_id"].iloc[0])
        frame = frame.sort_index()
        timestamps = frame.index
        for current_time, current_row in frame.iterrows():
            target_time = current_time + horizon
            position = timestamps.searchsorted(target_time)
            if position >= len(timestamps):
                continue
            target_timestamp = timestamps[position]
            if abs(target_timestamp - target_time) > tolerance:
                continue
            future_row = frame.iloc[position]
            sample = {
                "node_id": node_id,
                "sample_timestamp": current_time,
                "target_timestamp": target_timestamp
            }
            for feature in BASE_FEATURES:
                sample[feature] = current_row.get(feature, np.nan)
            sample["target_fri"] = future_row.get("fri", np.nan)
            sample["target_wind_speed"] = future_row.get("wind_speed_sensor", np.nan)
            # Hanya dipakai apabila terdapat hasil pengamatan spread aktual.
            sample["target_observed_spread_rate"] = future_row.get(
                "observed_spread_rate_cmph", np.nan
            )
            samples.append(sample)
    dataset = pd.DataFrame(samples)
    if dataset.empty:
        raise ValueError(
            "Tidak ditemukan pasangan data untuk target 15 menit. "
            "Periksa timestamp dan kelengkapan data historis."
        )
    return dataset


def create_model():
    return Pipeline([
        ("imputer", SimpleImputer(strategy="median", keep_empty_features=True)),
        ("random_forest", RandomForestRegressor(
            n_estimators=300,
            max_depth=12,
            min_samples_split=4,
            min_samples_leaf=2,
            max_features=0.9,
            random_state=RANDOM_STATE,
            n_jobs=-1
        ))
    ])


def chronological_split(dataset):
    dataset = dataset.sort_values("sample_timestamp").reset_index(drop=True)
    split_index = int(len(dataset) * (1 - TEST_RATIO))
    if split_index < MIN_TRAIN_ROWS:
        raise ValueError(f"Data training terlalu sedikit: {split_index} baris.")
    train = dataset.iloc[:split_index].copy()
    test = dataset.iloc[split_index:].copy()
    test_start = test["sample_timestamp"].min()
    train = train[train["target_timestamp"] < test_start].copy()
    if len(train) < MIN_TRAIN_ROWS or test.empty:
        raise ValueError("Data tidak cukup setelah pemisahan kronologis.")
    return train, test


def train_target(dataset, target_column, feature_columns):
    usable = dataset.dropna(subset=[target_column]).copy()
    if len(usable) < MIN_TRAIN_ROWS:
        print(f"[SKIP] {target_column}: hanya {len(usable)} sampel valid.")
        return None
    train, test = chronological_split(usable)
    model = create_model()
    model.fit(train[feature_columns], train[target_column])
    predictions = model.predict(test[feature_columns])
    metrics = {
        "samples_train": int(len(train)),
        "samples_test": int(len(test)),
        "mae": float(mean_absolute_error(test[target_column], predictions)),
        "rmse": float(np.sqrt(mean_squared_error(test[target_column], predictions))),
        "r2": float(r2_score(test[target_column], predictions)) if len(test) >= 2 else None
    }
    print(f"\nTarget: {target_column}\n{json.dumps(metrics, indent=2)}")
    # Fit ulang pada semua sampel yang tersedia setelah evaluasi kronologis.
    model.fit(usable[feature_columns], usable[target_column])
    return {"model": model, "metrics": metrics}


def main():
    print("=" * 60)
    print(f"PyroWatch - ML Insight Training | Horizon {HORIZON_MINUTES} menit")
    print("=" * 60)
    raw = prepare_raw_data(load_database())
    minute_data = aggregate_by_node(raw)
    dataset = create_supervised_dataset(minute_data)
    feature_columns = [
        column for column in BASE_FEATURES
        if column in dataset.columns and dataset[column].notna().any()
    ]
    if not feature_columns:
        raise ValueError("Tidak ada fitur training yang valid.")
    print("Fitur model:", feature_columns)
    models = {}
    for model_key, target in [
        ("future_fri", "target_fri"),
        ("future_wind_speed", "target_wind_speed"),
        ("future_observed_spread_rate", "target_observed_spread_rate")
    ]:
        trained = train_target(dataset, target, feature_columns)
        if trained:
            models[model_key] = trained
    if not models:
        raise ValueError("Tidak ada model yang berhasil dilatih.")
    bundle = {
        "models": models,
        "feature_columns": feature_columns,
        "horizon_minutes": HORIZON_MINUTES,
        "resample_rule": RESAMPLE_RULE,
        "target_tolerance_minutes": TARGET_TOLERANCE_MINUTES,
        "model_version": MODEL_VERSION,
        "training_rows": int(len(dataset)),
        "trained_at": pd.Timestamp.utcnow().isoformat()
    }
    joblib.dump(bundle, MODEL_PATH)
    print("\nTraining selesai.")
    print("Model tersimpan:", MODEL_PATH)
    print("Model tersedia:", list(models.keys()))


if __name__ == "__main__":
    main()
