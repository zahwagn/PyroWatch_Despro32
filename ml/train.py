"""Training model PyroWatch: klasifikasi skenario + prediksi eskalasi & komponen.

Model yang dilatih (HistGradientBoosting, scikit-learn):
  1. scenario      : klasifikasi skenario fisik (NORMAL, FUEL_DRYING, EARLY_SMOLDERING,
                     ACTIVE_SMOLDERING, WIND_DRIVEN_FIRE, DECAYING, SENSOR_ANOMALY)
  2. high_30m      : probabilitas FRI mencapai >= 0,6 (High) dalam 30 menit
  3. extreme_30m   : probabilitas FRI mencapai >= 0,8 (Extreme) dalam 30 menit
  4. fri_delta_{15,30}_{q10,q50,q90}: perubahan FRI (bukan skor FRI kedua) + rentang
  5. {co,ch4,temp,hum,wind}_delta_15 : proyeksi tiap komponen sensor 15 menit

Data latih = skenario fisik sintetis (scenario_sim.py) + data historis nyata dari
SQLite (sensor_readings) untuk target regresi/eskalasi. Evaluasi memakai holdout
per-deret (bukan per-baris) dan dibandingkan dengan baseline persistence.
"""
import os
import json
import sqlite3
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.ensemble import HistGradientBoostingClassifier, HistGradientBoostingRegressor
from sklearn.metrics import accuracy_score, f1_score, mean_absolute_error, roc_auc_score, confusion_matrix

import pyro_core as core
import scenario_sim

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = Path(os.getenv('PYROWATCH_DB', '/data/pyrowatch1.db'))
MODEL_DIR = Path(os.getenv('PYROWATCH_MODEL_DIR', BASE_DIR / 'models'))
MODEL_PATH = MODEL_DIR / 'forecast_models.pkl'
MODEL_VERSION = 'pyrowatch-scenario-hgb-v4'
N_SEQUENCES = int(os.getenv('PYROWATCH_SIM_SEQUENCES', '700'))
SEED = 42
HORIZONS = (15, 30)
REAL_WEIGHT = 3.0   # data nyata diberi bobot lebih besar daripada data sintetis


def _point(series, i):
    return {k: float(series[k][i]) for k in ('co', 'ch4', 'temp', 'hum', 'wind')}


def _targets(series, fri, t):
    f_now = fri[t]
    out = {}
    for h in HORIZONS:
        out[f'fri_delta_{h}'] = fri[t + h] - f_now
    future = fri[t + 1:t + 31]
    out['high_30m'] = int(np.nanmax(future) >= 0.6)
    out['extreme_30m'] = int(np.nanmax(future) >= 0.8)
    for k in ('co', 'ch4', 'temp', 'hum', 'wind'):
        out[f'{k}_delta_15'] = float(series[k][t + 15] - series[k][t])
    return out


def synthetic_dataset():
    rng = np.random.default_rng(SEED + 1)
    rows = []
    for seq_id, s in scenario_sim.generate(N_SEQUENCES, SEED):
        n = len(s['co'])
        fri = np.array([core.fri_wsm(s['temp'][i], s['hum'][i], s['co'][i], s['ch4'][i]) for i in range(n)])
        for t in range(int(core.TREND_WINDOW_MIN), n - 31, 2):
            history = []
            if rng.random() > 0.2:   # 20% sampel dilatih tanpa riwayat (node baru / data putus)
                keep = rng.uniform(0.3, 1.0)
                for i in range(t - int(core.TREND_WINDOW_MIN), t):
                    if rng.random() < keep:
                        history.append((float(t - i), _point(s, i)))
            current = _point(s, t)
            if rng.random() < 0.05:   # anemometer hilang / tidak valid
                current['wind'] = np.nan
                history = [(m, {**h, 'wind': np.nan}) for m, h in history]
            feats = core.build_features(current, history)
            row = {c: feats[c] for c in core.FEATURES}
            row.update(_targets(s, fri, t))
            row.update({'scenario': s['label'][t], 'group': f'sim-{seq_id}', 'source': 'synthetic'})
            rows.append(row)
    return pd.DataFrame(rows)


def real_dataset():
    if not DB_PATH.exists():
        print(f'[INFO] Database {DB_PATH} tidak ditemukan; training hanya memakai data skenario.')
        return pd.DataFrame()
    with sqlite3.connect(f'file:{DB_PATH}?mode=ro', uri=True) as con:
        df = pd.read_sql_query('SELECT node_id,timestamp,co,ch4,temp,hum,wind_speed_sensor,wind_speed '
                               'FROM sensor_readings', con)
    df['timestamp'] = pd.to_datetime(df['timestamp'], errors='coerce', utc=True)
    df = df.dropna(subset=['node_id', 'timestamp'])
    for c in ('co', 'ch4', 'temp', 'hum', 'wind_speed_sensor', 'wind_speed'):
        df[c] = pd.to_numeric(df[c], errors='coerce')
    df['wind'] = df['wind_speed_sensor'].fillna(df['wind_speed'])
    rows = []
    for node, g in df.groupby('node_id'):
        m = g.set_index('timestamp')[['co', 'ch4', 'temp', 'hum', 'wind']].sort_index().resample('1min').mean()
        m = m.dropna(subset=['co', 'ch4', 'temp', 'hum'])
        if len(m) < 20:
            continue
        times = m.index
        vals = {k: m[k].to_numpy() for k in m.columns}
        vals['wind'] = np.nan_to_num(vals['wind'], nan=0.0)
        fri = np.array([core.fri_wsm(vals['temp'][i], vals['hum'][i], vals['co'][i], vals['ch4'][i]) for i in range(len(m))])
        for t in range(len(m)):
            now = times[t]
            idx = {}
            for h in (*HORIZONS, ):
                j = times.searchsorted(now + pd.Timedelta(minutes=h))
                if j < len(times) and abs(times[j] - (now + pd.Timedelta(minutes=h))) <= pd.Timedelta(minutes=2):
                    idx[h] = j
            if len(idx) != len(HORIZONS):
                continue
            fut = (times > now) & (times <= now + pd.Timedelta(minutes=30))
            history = [((now - times[i]).total_seconds() / 60.0, _point(vals, i))
                       for i in range(max(0, t - 30), t) if 0 < (now - times[i]).total_seconds() / 60.0 <= core.TREND_WINDOW_MIN]
            feats = core.build_features(_point(vals, t), history)
            row = {c: feats[c] for c in core.FEATURES}
            for h, j in idx.items():
                row[f'fri_delta_{h}'] = fri[j] - fri[t]
            row['high_30m'] = int(np.nanmax(fri[fut]) >= 0.6)
            row['extreme_30m'] = int(np.nanmax(fri[fut]) >= 0.8)
            for k in ('co', 'ch4', 'temp', 'hum', 'wind'):
                row[f'{k}_delta_15'] = float(vals[k][idx[15]] - vals[k][t])
            row.update({'scenario': None, 'group': f'real-{node}-{now.date()}', 'source': 'real'})
            rows.append(row)
    out = pd.DataFrame(rows)
    print(f'[INFO] Data historis nyata: {len(out)} sampel berlabel horizon 15/30 menit.')
    return out


def split_groups(ds, test_ratio=0.2):
    groups = ds['group'].unique()
    rng = np.random.default_rng(SEED)
    test = set(rng.choice(groups, size=max(1, int(len(groups) * test_ratio)), replace=False))
    mask = ds['group'].isin(test)
    return ds[~mask], ds[mask]


def clf():
    return HistGradientBoostingClassifier(max_iter=250, learning_rate=0.08, max_leaf_nodes=31,
                                          l2_regularization=0.5, random_state=SEED)


def reg(quantile=None):
    if quantile is None:
        return HistGradientBoostingRegressor(max_iter=250, learning_rate=0.08, max_leaf_nodes=31, random_state=SEED)
    return HistGradientBoostingRegressor(loss='quantile', quantile=quantile, max_iter=200,
                                         learning_rate=0.08, max_leaf_nodes=31, random_state=SEED)


def weights(df):
    return np.where(df['source'] == 'real', REAL_WEIGHT, 1.0)


def main():
    syn = synthetic_dataset()
    real = real_dataset()
    ds = pd.concat([syn, real], ignore_index=True) if not real.empty else syn
    print(f'[INFO] Total sampel: {len(ds)} (sintetis {len(syn)}, nyata {len(real)})')
    train, test = split_groups(ds)
    X_cols = core.FEATURES
    models, metrics = {}, {}

    # 1) Klasifikasi skenario (hanya sampel yang memiliki label skenario)
    tr_s, te_s = train.dropna(subset=['scenario']), test.dropna(subset=['scenario'])
    m = clf().fit(tr_s[X_cols], tr_s['scenario'])
    pred = m.predict(te_s[X_cols])
    labels = list(m.classes_)
    metrics['scenario'] = {
        'accuracy': float(accuracy_score(te_s['scenario'], pred)),
        'macro_f1': float(f1_score(te_s['scenario'], pred, average='macro')),
        'labels': labels,
        'confusion_matrix': confusion_matrix(te_s['scenario'], pred, labels=labels).tolist(),
    }
    models['scenario'] = clf().fit(ds.dropna(subset=['scenario'])[X_cols], ds.dropna(subset=['scenario'])['scenario'])

    # 2) Probabilitas eskalasi
    for key in ('high_30m', 'extreme_30m'):
        m = clf().fit(train[X_cols], train[key], sample_weight=weights(train))
        p = m.predict_proba(test[X_cols])[:, 1]
        auc = float(roc_auc_score(test[key], p)) if test[key].nunique() > 1 else None
        # baseline: FRI saat ini sebagai skor
        base_auc = float(roc_auc_score(test[key], test['fri_wsm'])) if test[key].nunique() > 1 else None
        metrics[key] = {'auc': auc, 'baseline_auc_current_fri': base_auc,
                        'positive_rate_test': float(test[key].mean())}
        models[key] = clf().fit(ds[X_cols], ds[key], sample_weight=weights(ds))

    # 3) Perubahan FRI + rentang (quantile)
    for h in HORIZONS:
        target = f'fri_delta_{h}'
        tr, te = train.dropna(subset=[target]), test.dropna(subset=[target])
        m = reg().fit(tr[X_cols], tr[target], sample_weight=weights(tr))
        p = m.predict(te[X_cols])
        rising = te[target] >= 0.05
        q10 = reg(0.1).fit(tr[X_cols], tr[target]).predict(te[X_cols])
        q90 = reg(0.9).fit(tr[X_cols], tr[target]).predict(te[X_cols])
        metrics[target] = {
            'mae': float(mean_absolute_error(te[target], p)),
            'baseline_persistence_mae': float(mean_absolute_error(te[target], np.zeros(len(te)))),
            'mae_on_rising_cases': float(mean_absolute_error(te[target][rising], p[rising])) if rising.any() else None,
            'baseline_mae_on_rising_cases': float(te[target][rising].abs().mean()) if rising.any() else None,
            'interval_80_coverage': float(np.mean((te[target] >= q10) & (te[target] <= q90))),
        }
        models[f'{target}_q50'] = reg().fit(ds.dropna(subset=[target])[X_cols], ds.dropna(subset=[target])[target],
                                             sample_weight=weights(ds.dropna(subset=[target])))
        for q in (0.1, 0.9):
            models[f'{target}_q{int(q * 100)}'] = reg(q).fit(ds.dropna(subset=[target])[X_cols], ds.dropna(subset=[target])[target])

    # 4) Proyeksi komponen sensor 15 menit
    for k in ('co', 'ch4', 'temp', 'hum', 'wind'):
        target = f'{k}_delta_15'
        tr, te = train.dropna(subset=[target]), test.dropna(subset=[target])
        m = reg().fit(tr[X_cols], tr[target], sample_weight=weights(tr))
        metrics[target] = {'mae': float(mean_absolute_error(te[target], m.predict(te[X_cols]))),
                           'baseline_persistence_mae': float(te[target].abs().mean())}
        full = ds.dropna(subset=[target])
        models[target] = reg().fit(full[X_cols], full[target], sample_weight=weights(full))

    for k, v in metrics.items():
        print(k, json.dumps({a: b for a, b in v.items() if a != 'confusion_matrix'}))

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    payload = {
        'models': models, 'metrics': metrics, 'feature_columns': X_cols,
        'scenario_labels': core.SCENARIOS, 'model_version': MODEL_VERSION,
        'sklearn_version': sklearn.__version__, 'horizons': list(HORIZONS),
        'training_rows': {'synthetic': int(len(syn)), 'real': int(len(real))},
        'trained_at': pd.Timestamp.utcnow().isoformat(),
    }
    joblib.dump(payload, MODEL_PATH, compress=3)
    print('Training selesai:', MODEL_PATH, f'({MODEL_PATH.stat().st_size / 1e6:.1f} MB)')
    return payload


if __name__ == '__main__':
    main()
