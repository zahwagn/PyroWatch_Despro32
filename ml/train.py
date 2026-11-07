
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


# ============================================================
# CONFIGURATION
# ============================================================

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

MODEL_DIR.mkdir(parents=True, exist_ok=True)


# ============================================================
# DATABASE
# ============================================================

def load_database():
    if not DB_PATH.exists():
        raise FileNotFoundError(
            f"Database tidak ditemukan: {DB_PATH}"
        )

    connection = sqlite3.connect(DB_PATH)

    try:
        df = pd.read_sql_query(
            """
            SELECT
                node_id,
                timestamp,
                co,
                ch4,
                temp,
                hum,
                fri,
                wind_speed,
                wind_speed_sensor,
                wind_speed_weather,
                wind_direction_deg,
                observed_spread_rate_cmph,
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


# ============================================================
# PREPROCESSING
# ============================================================

def prepare_raw_data(df):
    df = df.copy()

    df["timestamp"] = pd.to_datetime(
        df["timestamp"],
        errors="coerce",
        utc=True
    )

    df = df.dropna(
        subset=["node_id", "timestamp"]
    )

    numeric_columns = [
        "co",
        "ch4",
        "temp",
        "hum",
        "fri",
        "wind_speed",
        "wind_speed_sensor",
        "wind_speed_weather",
        "wind_direction_deg",
        "observed_spread_rate_cmph"
    ]

    for column in numeric_columns:
        if column in df.columns:
            df[column] = pd.to_numeric(
                df[column],
                errors="coerce"
            )

    # Data historis wind_speed adalah anemometer ESP32.
    if "wind_speed_sensor" not in df.columns:
        df["wind_speed_sensor"] = np.nan

    df["wind_speed_sensor"] = (
        df["wind_speed_sensor"]
        .fillna(df["wind_speed"])
    )

    # Jangan mengisi data Open-Meteo historis
    # menggunakan data anemometer.
    if "wind_speed_weather" not in df.columns:
        df["wind_speed_weather"] = np.nan

    return df


# ============================================================
# FEATURE ENGINEERING
# ============================================================

BASE_FEATURES = [
    "co",
    "ch4",
    "temp",
    "hum",
    "fri",
    "wind_speed_sensor",
    "wind_speed_weather",
    "wind_direction_sin",
    "wind_direction_cos",
    "hour_sin",
    "hour_cos"
]


def build_features(df):
    result = df.copy()

    direction = np.deg2rad(
        result["wind_direction_deg"]
    )

    result["wind_direction_sin"] = np.sin(direction)
    result["wind_direction_cos"] = np.cos(direction)

    hour = (
        result.index.hour
        + result.index.minute / 60.0
    )

    result["hour_sin"] = np.sin(
        2 * np.pi * hour / 24
    )

    result["hour_cos"] = np.cos(
        2 * np.pi * hour / 24
    )

    rolling_columns = {
        "temp": "temp_mean_5m",
        "hum": "hum_mean_5m",
        "co": "co_mean_5m",
        "ch4": "ch4_mean_5m",
        "wind_speed_sensor": "wind_sensor_mean_5m"
    }

    for source, target in rolling_columns.items():
        result[target] = (
            result[source]
            .rolling(window=5, min_periods=1)
            .mean()
        )

    result["temp_std_5m"] = (
        result["temp"]
        .rolling(window=5, min_periods=2)
        .std()
    )

    result["hum_std_5m"] = (
        result["hum"]
        .rolling(window=5, min_periods=2)
        .std()
    )

    return result


# ============================================================
# RESAMPLING
# ============================================================

def aggregate_by_node(df):
    aggregated = []

    for node_id, group in df.groupby("node_id"):
        group = group.sort_values("timestamp")
        group = group.set_index("timestamp")

        numeric = group.select_dtypes(
            include=[np.number]
        )

        if numeric.empty:
            continue

        minute = numeric.resample(
            RESAMPLE_RULE
        ).mean()

        # Tidak mengisi celah panjang dengan interpolasi.
        # Hanya interpolasi maksimal 2 menit untuk fitur.
        minute = minute.interpolate(
            method="time",
            limit=2,
            limit_area="inside"
        )

        minute["node_id"] = node_id

        minute = build_features(minute)

        aggregated.append(minute)

    if not aggregated:
        raise ValueError(
            "Tidak ada data yang dapat diagregasikan."
        )

    return aggregated


# ============================================================
# FUTURE TARGET PAIRING
# ============================================================

def create_supervised_dataset(minute_data):
    samples = []

    tolerance = pd.Timedelta(
        minutes=TARGET_TOLERANCE_MINUTES
    )

    horizon = pd.Timedelta(
        minutes=HORIZON_MINUTES
    )

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

            candidate_time = timestamps[position]

            if abs(candidate_time - target_time) > tolerance:
                continue

            future_row = frame.iloc[position]

            sample = {
                "node_id": node_id,
                "sample_timestamp": current_time,
                "target_timestamp": candidate_time
            }

            for feature in BASE_FEATURES:
                sample[feature] = current_row.get(
                    feature, np.nan
                )

            sample["target_fri"] = future_row.get(
                "fri", np.nan
            )

            sample["target_wind_speed"] = future_row.get(
                "wind_speed_sensor", np.nan
            )

            future_direction = future_row.get(
                "wind_direction_deg", np.nan
            )

            if pd.notna(future_direction):
                radians = np.deg2rad(float(future_direction))
                sample["target_wind_dir_sin"] = np.sin(radians)
                sample["target_wind_dir_cos"] = np.cos(radians)
            else:
                sample["target_wind_dir_sin"] = np.nan
                sample["target_wind_dir_cos"] = np.nan

            samples.append(sample)

    dataset = pd.DataFrame(samples)

    if dataset.empty:
        raise ValueError(
            "Tidak ditemukan pasangan data untuk target "
            "15 menit ke depan. Periksa rentang timestamp "
            "dan TARGET_TOLERANCE_MINUTES."
        )

    return dataset

# ============================================================
# MODEL TRAINING
# ============================================================

def create_model():
    return Pipeline([
        (
            "imputer",
            SimpleImputer(
                strategy="median",
                keep_empty_features=True
            )
        ),
        (
            "random_forest",
            RandomForestRegressor(
                n_estimators=300,
                max_depth=12,
                min_samples_split=4,
                min_samples_leaf=2,
                max_features=0.9,
                random_state=RANDOM_STATE,
                n_jobs=-1
            )
        )
    ])


def chronological_split(dataset):
    dataset = dataset.sort_values(
        "sample_timestamp"
    ).reset_index(drop=True)

    split_index = int(
        len(dataset) * (1 - TEST_RATIO)
    )

    if split_index < MIN_TRAIN_ROWS:
        raise ValueError(
            f"Data training terlalu sedikit: "
            f"{split_index} baris."
        )

    train = dataset.iloc[:split_index].copy()
    test = dataset.iloc[split_index:].copy()

    # Hindari target training yang melampaui awal periode test.
    test_start = test["sample_timestamp"].min()

    train = train[
        train["target_timestamp"] < test_start
    ].copy()

    if len(train) < MIN_TRAIN_ROWS or test.empty:
        raise ValueError(
            "Data tidak cukup setelah pemisahan kronologis "
            "dan pencegahan kebocoran target."
        )

    return train, test


def train_target(dataset, target_column, feature_columns):
    usable = dataset.dropna(
        subset=[target_column]
    ).copy()

    if len(usable) < MIN_TRAIN_ROWS:
        print(
            f"[SKIP] {target_column}: "
            f"hanya {len(usable)} sampel valid."
        )
        return None

    train, test = chronological_split(usable)

    X_train = train[feature_columns]
    y_train = train[target_column]

    X_test = test[feature_columns]
    y_test = test[target_column]

    model = create_model()
    model.fit(X_train, y_train)

    predictions = model.predict(X_test)

    metrics = {
        "samples_train": int(len(train)),
        "samples_test": int(len(test)),
        "mae": float(
            mean_absolute_error(y_test, predictions)
        ),
        "rmse": float(
            np.sqrt(
                mean_squared_error(y_test, predictions)
            )
        ),
        "r2": float(
            r2_score(y_test, predictions)
        ) if len(test) >= 2 else None
    }

    print(f"\nTarget: {target_column}")
    print(json.dumps(metrics, indent=2))

    return {
        "model": model,
        "metrics": metrics
    }


# ============================================================
# MAIN
# ============================================================

def main():
    print("=" * 60)
    print("PyroWatch - Random Forest Forecast Training")
    print(f"Horizon: {HORIZON_MINUTES} minutes")
    print("=" * 60)

    raw = load_database()
    raw = prepare_raw_data(raw)

    print(f"Data mentah: {len(raw)} baris")

    minute_data = aggregate_by_node(raw)

    print(
        "Jumlah node:",
        len(minute_data)
    )

    dataset = create_supervised_dataset(
        minute_data
    )

    print(
        "Jumlah pasangan supervised:",
        len(dataset)
    )

    # Fitur yang benar-benar memiliki data historis.
    feature_columns = [
        column
        for column in BASE_FEATURES
        if column in dataset.columns
        and dataset[column].notna().any()
    ]

    if not feature_columns:
        raise ValueError(
            "Tidak ada fitur training yang valid."
        )

    print("Fitur model:")
    print(feature_columns)

    models = {}

    # Prediksi FRI mendatang.
    fri_result = train_target(
        dataset,
        "target_fri",
        feature_columns
    )

    if fri_result:
        models["future_fri"] = fri_result

    # Prediksi kecepatan angin sensor mendatang.
    wind_result = train_target(
        dataset,
        "target_wind_speed",
        feature_columns
    )

    if wind_result:
        models["future_wind_speed"] = wind_result

    # Arah angin meteorologis diprediksi sebagai sin/cos.
    direction_sin = train_target(
        dataset,
        "target_wind_dir_sin",
        feature_columns
    )

    direction_cos = train_target(
        dataset,
        "target_wind_dir_cos",
        feature_columns
    )

    if direction_sin and direction_cos:
        models["future_wind_dir_sin"] = direction_sin
        models["future_wind_dir_cos"] = direction_cos

    if not models:
        raise ValueError(
            "Tidak ada model yang berhasil dilatih."
        )

    bundle = {
        "models": models,
        "feature_columns": feature_columns,
        "horizon_minutes": HORIZON_MINUTES,
        "resample_rule": RESAMPLE_RULE,
        "target_tolerance_minutes": TARGET_TOLERANCE_MINUTES,
        "model_version": "pyrowatch-rf-15m-v1",
        "training_rows": int(len(dataset)),
        "trained_at": pd.Timestamp.utcnow().isoformat()
    }

    joblib.dump(
        bundle,
        MODEL_PATH
    )

    print("\nTraining selesai.")
    print(f"Model tersimpan: {MODEL_PATH}")
    print(
        "Model tersedia:",
        list(models.keys())
    )


if __name__ == "__main__":
    main()
