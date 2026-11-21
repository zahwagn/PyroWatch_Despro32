"""PyroWatch ML API — prediksi eskalasi dan analisis skenario kebakaran gambut.

Endpoint:
  GET  /health            status model
  GET  /model-info        metrik evaluasi model
  POST /predict-forecast  (kompatibel dengan flow Node-RED lama)
  POST /analyze           alias /predict-forecast

Perbedaan dengan versi sebelumnya:
  * Tidak lagi menampilkan "FRI prediksi" kedua yang redundan dengan FRI sensor.
    Output utama adalah SKENARIO (mengapa FRI bernilai sekian), PROBABILITAS
    ESKALASI ke High/Extreme dalam 30 menit + perkiraan waktu (ETA), perubahan FRI
    dengan rentang ketidakpastian, dan proyeksi tiap komponen sensor.
  * Model memakai tren 15 menit terakhir (dibaca dari SQLite + buffer memori),
    sehingga FRI yang sama dengan komposisi/tren berbeda menghasilkan prediksi berbeda.
  * Rekomendasi tindakan detail per fase waktu, sektor pencarian sumber (hulu angin),
    sektor ancaman (hilir angin), radius pemeriksaan, APD, dan interval sampling.
"""
import json
import os
import sqlite3
import threading
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import sklearn

import advisor
import pyro_core as core
from pyro_core import num

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = Path(os.getenv('PYROWATCH_MODEL_DIR', BASE_DIR / 'models'))
MODEL_PATH = MODEL_DIR / 'forecast_models.pkl'
DB_PATH = Path(os.getenv('PYROWATCH_DB', '/data/pyrowatch1.db'))
HOST, PORT = '0.0.0.0', int(os.getenv('PORT', '5000'))
bundle = None
_buffers = defaultdict(lambda: deque(maxlen=600))
_lock = threading.Lock()


# ------------------------------------------------------------------ model
def load_model():
    global bundle
    candidate = None
    if MODEL_PATH.exists():
        try:
            candidate = joblib.load(MODEL_PATH)
        except Exception as exc:  # pickle tidak kompatibel
            print('[WARN] Gagal memuat model:', exc)
    if (candidate is None or 'scenario' not in candidate.get('models', {})
            or candidate.get('sklearn_version') != sklearn.__version__):
        print('[INFO] Model tidak ada / versi lama / beda versi scikit-learn -> training ulang otomatis.')
        import train
        candidate = train.main()
    bundle = candidate
    print('Loaded:', bundle.get('model_version'), 'trained_at:', bundle.get('trained_at'))


def _predict(key, X):
    m = bundle['models'].get(key)
    return float(m.predict(X)[0]) if m is not None else None


def _proba(key, X):
    m = bundle['models'].get(key)
    if m is None:
        return None
    p = m.predict_proba(X)[0]
    classes = list(m.classes_)
    return float(p[classes.index(1)]) if 1 in classes else 0.0


# ------------------------------------------------------------------ riwayat
def timestamp_of(data):
    raw = data.get('timestamp')
    if not raw:
        return datetime.now(timezone.utc)
    stamp = datetime.fromisoformat(str(raw).replace('Z', '+00:00'))
    if stamp.tzinfo is None:
        stamp = stamp.replace(tzinfo=timezone.utc)
    return stamp.astimezone(timezone.utc)


MAX_PLAUSIBLE_WIND = 25.0  # m/s; di atas ini kemungkinan salah satuan (km/jam) atau sensor rusak


def _raw_wind(d):
    return num(d.get('wind_speed_sensor') if d.get('wind_speed_sensor') is not None else d.get('wind_speed'))


def _reading(d):
    wind = _raw_wind(d)
    if np.isfinite(wind) and not 0 <= wind <= MAX_PLAUSIBLE_WIND:
        wind = np.nan
    return {'co': num(d.get('co')), 'ch4': num(d.get('ch4')), 'temp': num(d.get('temp')), 'hum': num(d.get('hum')),
            'wind': wind}


def _iso(ts):
    return ts.strftime('%Y-%m-%dT%H:%M:%S.') + f'{ts.microsecond // 1000:03d}Z'


def load_history(node_id, ts):
    start = ts - timedelta(minutes=core.TREND_WINDOW_MIN)
    points = {}
    if node_id and DB_PATH.exists():
        try:
            with sqlite3.connect(f'file:{DB_PATH}?mode=ro', uri=True, timeout=2) as con:
                rows = con.execute(
                    'SELECT timestamp,co,ch4,temp,hum,wind_speed_sensor,wind_speed FROM sensor_readings '
                    'WHERE node_id=? AND timestamp>=? AND timestamp<? ORDER BY timestamp',
                    (node_id, _iso(start), _iso(ts))).fetchall()
            for r in rows:
                t = timestamp_of({'timestamp': r[0]})
                points[round(t.timestamp())] = (t, _reading({'co': r[1], 'ch4': r[2], 'temp': r[3], 'hum': r[4],
                                                             'wind_speed_sensor': r[5], 'wind_speed': r[6]}))
        except Exception as exc:
            print('[WARN] Riwayat DB tidak terbaca:', exc)
    with _lock:
        for t, rd in _buffers[node_id]:
            if start <= t < ts:
                points.setdefault(round(t.timestamp()), (t, rd))
    hist = []
    for t, rd in points.values():
        minutes = (ts - t).total_seconds() / 60.0
        if 1.0 / 60 <= minutes <= core.TREND_WINDOW_MIN:   # abaikan duplikat pembacaan saat ini
            hist.append((minutes, rd))
    return sorted(hist, key=lambda x: -x[0])


def remember(node_id, ts, reading):
    with _lock:
        buf = _buffers[node_id]
        if not buf or buf[-1][0] < ts:
            buf.append((ts, reading))


# ------------------------------------------------------------------ analisis
def _trend(d15):
    if d15 is None:
        return 'UNKNOWN'
    if d15 >= 0.03:
        return 'RISING'
    if d15 <= -0.03:
        return 'DECLINING'
    return 'STABLE'


def _eta_to(threshold, fri, d15, d30, slope):
    if not np.isfinite(fri) or fri >= threshold:
        return None
    path = [(0, fri), (15, fri + d15), (30, fri + d30)]
    for (t0, f0), (t1, f1) in zip(path, path[1:]):
        if f1 >= threshold > f0:
            return t0 + (threshold - f0) / (f1 - f0) * (t1 - t0)
    if slope > 1e-4:
        eta = (threshold - fri) / slope
        return eta if eta <= 120 else None
    return None


def analyze(data):
    if bundle is None:
        raise RuntimeError('Model belum dimuat.')
    ts = timestamp_of(data)
    node = data.get('node_id')
    current = _reading(data)
    history = load_history(node, ts)
    feats = core.build_features(current, history)
    remember(node, ts, current)

    reported_fri = num(data.get('fri'))
    fri = reported_fri if np.isfinite(reported_fri) else feats['fri_wsm']
    if not np.isfinite(fri):
        return {'forecast_status': 'INSUFFICIENT_INPUTS', 'node_id': node, 'sample_timestamp': ts.isoformat(),
                'current_fri': None, 'current_fri_level': 'Unknown', 'trend': 'UNKNOWN',
                'insight_text': 'Data suhu/kelembapan/gas tidak lengkap sehingga FRI dan analisis tidak dapat dihitung. '
                                'Periksa koneksi sensor dan payload LoRa.',
                'highlights': [], 'recommendations': None, 'input_status': 'MISSING_SENSOR_VALUES',
                'forecast_model_version': bundle.get('model_version')}
    # Pakai level dari Node-RED bila ada, agar batas kelas (<=0,6 / <=0,8) sama persis dengan dashboard.
    given_level = str(data.get('fri_level') or '').strip().title()
    level = given_level if np.isfinite(reported_fri) and given_level in ('Low', 'Moderate', 'High', 'Extreme') \
        else core.classify_fri(fri)
    X = pd.DataFrame([core.feature_row(feats)], columns=core.FEATURES, dtype=float)

    # --- skenario
    sc_model = bundle['models']['scenario']
    probs = dict(zip(sc_model.classes_, sc_model.predict_proba(X)[0]))
    ranked = sorted(probs.items(), key=lambda kv: -kv[1])
    scenario, sc_conf = ranked[0]

    # --- eskalasi & perubahan
    p_high = _proba('high_30m', X) or 0.0
    p_ext = _proba('extreme_30m', X) or 0.0
    p_high = max(p_high, p_ext)            # Extreme selalu berarti sudah melewati High
    if fri >= 0.6:
        p_high = max(p_high, 0.99)
    d = {f'{h}_{q}': _predict(f'fri_delta_{h}_{q}', X) for h in (15, 30) for q in ('q10', 'q50', 'q90')}
    for h in (15, 30):  # jaga urutan kuantil & batas 0..1
        lo, mid, hi = sorted([d[f'{h}_q10'], d[f'{h}_q50'], d[f'{h}_q90']])
        d[f'{h}_q10'], d[f'{h}_q50'], d[f'{h}_q90'] = [float(np.clip(fri + v, 0, 1) - fri) for v in (lo, mid, hi)]
    trend = _trend(d['15_q50'])
    eta_high = _eta_to(0.6, fri, d['15_q50'], d['30_q50'], feats['slope_fri'])
    eta_ext = _eta_to(0.8, fri, d['15_q50'], d['30_q50'], feats['slope_fri'])

    proj = {}
    for k, lo in (('co', 0), ('ch4', 0), ('temp', -20), ('hum', 0), ('wind', 0)):
        delta = _predict(f'{k}_delta_15', X)
        base = feats[k]
        proj[k] = float(max(lo, base + delta)) if delta is not None and np.isfinite(base) else None
    if proj.get('hum') is not None:
        proj['hum'] = min(100.0, proj['hum'])

    wind_from = core.direction_deg(data.get('wind_direction_deg'), data.get('wind_direction'))
    p_surface = probs.get('WIND_DRIVEN_FIRE', 0.0)
    if scenario in ('EARLY_SMOLDERING', 'ACTIVE_SMOLDERING') and np.isfinite(feats['wind']) and feats['wind'] >= 5:
        p_surface = max(p_surface, min(0.9, 0.1 * feats['wind'] * (feats['f_hum'] or 0.5)))
    spread = advisor.spread_estimate(scenario, feats, wind_from, num(data.get('spread_rate_cmph')), p_surface)
    drivers = advisor.drivers_analysis(feats, fri)

    quality = []
    gas_validated = data.get('gas_calibration_validated') is True or data.get('gas_calibration_status') == 'GAS_STANDARD_VALIDATED'
    if data.get('gas_calibrated') is False:
        quality.append('Sensor gas belum terkalibrasi; nilai ppm adalah estimasi.')
    if feats['has_trend'] == 0:
        quality.append('Riwayat <3 pembacaan dalam 15 menit terakhir: prediksi hanya dari satu sampel (ketidakpastian lebih besar).')
    raw_wind = _raw_wind(data)
    if np.isfinite(raw_wind) and not 0 <= raw_wind <= MAX_PLAUSIBLE_WIND:
        quality.append(f'Kecepatan angin {raw_wind:.1f} m/s tidak wajar (>{MAX_PLAUSIBLE_WIND:.0f} m/s) sehingga diabaikan '
                       f'model; periksa satuan (km/jam vs m/s) atau anemometer.')
    elif not np.isfinite(raw_wind):
        quality.append('Data kecepatan angin tidak tersedia; estimasi rambat & sektor memakai asumsi angin lemah.')
    if np.isfinite(feats['hum']) and not 0 <= feats['hum'] <= 100:
        quality.append('Kelembapan di luar rentang 0–100%.')
    if drivers['fri_residual_vs_wsm'] is not None and abs(drivers['fri_residual_vs_wsm']) >= 0.05:
        quality.append('FRI node tidak sama dengan rumus WSM proposal (lihat drivers.notes).')

    ctx = {'scenario': scenario, 'features': feats, 'current_fri': fri, 'current_fri_level': level,
           'p_high_30m': p_high, 'p_extreme_30m': p_ext, 'spread': spread,
           'component_projection_15m': proj, 'gas_validated': gas_validated, 'eta_high_min': eta_high}
    rec = advisor.recommend(ctx)
    rec['trigger_summary'] = ' '.join(drivers['notes']) or 'Tidak ada komponen dominan yang melewati ambang.'

    # --- narasi
    sc_label = core.SCENARIOS[scenario]
    alt = [f'{core.SCENARIOS[k]} ({v:.0%})' for k, v in ranked[1:3] if v >= 0.1]
    share = drivers['contribution_share']
    parts = [f'Skenario: {sc_label} (keyakinan model {sc_conf:.0%}).'
             + (f' Alternatif: {", ".join(alt)}.' if alt else ''),
             f'FRI sensor {fri:.2f} ({level}) tersusun dari gas {share.get("gas", 0):.0%}, suhu {share.get("suhu", 0):.0%}, '
             f'kelembapan {share.get("kelembapan", 0):.0%}.']
    parts += drivers['notes']
    if level in ('High', 'Extreme'):
        parts.append(f'Probabilitas mencapai Extreme ≤30 menit: {p_ext:.0%}'
                     + (f' (ETA ±{eta_ext:.0f} menit).' if eta_ext is not None else '.'))
    else:
        parts.append(f'Probabilitas eskalasi ke High ≤30 menit: {p_high:.0%}'
                     + (f' (ETA ±{eta_high:.0f} menit).' if eta_high is not None else '.'))
    parts.append(f'Perubahan FRI 30 menit diperkirakan {d["30_q50"]:+.2f} (rentang 80%: {d["30_q10"]:+.2f} s.d. {d["30_q90"]:+.2f}).')
    if proj.get('co') is not None:
        parts.append(f'Proyeksi 15 menit: CO {feats["co"]:.0f}→{proj["co"]:.0f} ppm, CH4 {feats["ch4"]:.0f}→{proj["ch4"]:.0f} ppm, '
                     f'suhu {feats["temp"]:.1f}→{proj["temp"]:.1f} °C, kelembapan {feats["hum"]:.0f}→{proj["hum"]:.0f}%.')
    if spread.get('rate_cmph') is not None:
        if spread['mode'] == 'api permukaan':
            parts.append(f'Estimasi rambat api permukaan ±{spread["rate_m_per_min"]} m/menit ke sektor {spread["threat_sector"]}.')
        else:
            parts.append(f'Estimasi rambat smoldering ±{spread["rate_cmph"]} cm/jam; sumber dicari di sektor hulu angin '
                         f'{spread["source_search_sector"]}, radius ±{spread["inspection_radius_m"]} m.')
    parts.append(f'Prioritas: {rec["priority"]}.')

    hl = [
        {'key': 'scenario', 'label': 'Skenario terdeteksi', 'value': sc_label,
         'detail': f'Keyakinan {sc_conf:.0%}. ' + ('; '.join(alt) if alt else 'Tidak ada alternatif kuat.'), 'status': 'available'},
        {'key': 'drivers', 'label': 'Pendorong FRI', 'value': (drivers['dominant_driver'] or 'n/a').upper(),
         'detail': ', '.join(f'{k} {v:.2f}' for k, v in drivers['contributions'].items()), 'status': 'available'},
        {'key': 'escalation', 'label': 'Peluang eskalasi 30 menit',
         'value': f'High {p_high:.0%} / Extreme {p_ext:.0%}',
         'detail': (f'ETA High ±{eta_high:.0f} menit. ' if eta_high is not None else '')
                   + (f'ETA Extreme ±{eta_ext:.0f} menit.' if eta_ext is not None else ''), 'status': 'available'},
        {'key': 'trend', 'label': 'Tren FRI', 'value': trend,
         'detail': f'Δ15m {d["15_q50"]:+.2f} ({d["15_q10"]:+.2f}…{d["15_q90"]:+.2f}); '
                   f'Δ30m {d["30_q50"]:+.2f} ({d["30_q10"]:+.2f}…{d["30_q90"]:+.2f}).', 'status': 'available'},
        {'key': 'component_forecast', 'label': 'Proyeksi CO 15 menit',
         'value': f'{proj["co"]:.0f} ppm' if proj.get('co') is not None else 'n/a',
         'detail': f'Tren CO {feats["slope_co"]:+.1f} ppm/menit, CH4 {feats["slope_ch4"]:+.1f} ppm/menit.', 'status': 'available'},
        {'key': 'wind_forecast', 'label': 'Proyeksi kecepatan angin',
         'value': f'{proj["wind"]:.1f} m/s' if proj.get('wind') is not None else 'n/a',
         'detail': f'Saat ini {feats["wind"]:.1f} m/s.' if np.isfinite(feats['wind']) else 'Anemometer tidak tersedia.',
         'status': 'available' if proj.get('wind') is not None else 'unavailable'},
        {'key': 'spread_forecast', 'label': 'Estimasi rambat & sektor', 'value': spread['mode'],
         'detail': f'Cari sumber: {spread["source_search_sector"]}. Ancaman: {spread["threat_sector"]}. '
                   f'Radius ±{spread["inspection_radius_m"]} m.', 'status': 'available'},
    ]

    horizon = 30
    return {
        'forecast_status': 'OK' if feats['has_trend'] else 'PARTIAL',
        'forecast_horizon_minutes': horizon,
        'node_id': node,
        'sample_timestamp': ts.isoformat(),
        'forecast_timestamp': (ts + timedelta(minutes=horizon)).isoformat(),
        'current_fri': float(fri),
        'current_fri_level': level,
        'scenario': scenario,
        'scenario_label': sc_label,
        'scenario_confidence': round(float(sc_conf), 3),
        'scenario_probabilities': {k: round(float(v), 3) for k, v in ranked},
        'escalation': {
            'p_high_30m': round(p_high, 3), 'p_extreme_30m': round(p_ext, 3),
            'eta_high_min': round(eta_high, 1) if eta_high is not None else None,
            'eta_extreme_min': round(eta_ext, 1) if eta_ext is not None else None,
            'fri_change_15m': {'expected': round(d['15_q50'], 3), 'low': round(d['15_q10'], 3), 'high': round(d['15_q90'], 3)},
            'fri_change_30m': {'expected': round(d['30_q50'], 3), 'low': round(d['30_q10'], 3), 'high': round(d['30_q90'], 3)},
        },
        'fri_change': round(d['15_q50'], 3),
        'trend': trend,
        'drivers': drivers,
        'component_trend_per_min': {k: round(feats[f'slope_{k}'], 3) for k in ('co', 'ch4', 'temp', 'hum', 'wind')},
        'component_projection_15m': {k: (round(v, 2) if v is not None else None) for k, v in proj.items()},
        'spread': spread,
        'insight_text': ' '.join(parts),
        'highlights': hl,
        'recommendations': rec,
        'data_quality': quality,
        'history_points_used': int(feats.get('history_points', 1)),
        # kolom yang sesuai tabel ml_forecasts
        'future_wind_speed': proj.get('wind'),
        'future_wind_direction': data.get('wind_direction'),
        'future_spread_rate_cmph': spread.get('rate_cmph'),
        'future_spread_direction': core.compass8(spread['downwind_deg']) if spread.get('downwind_deg') is not None else None,
        'spread_direction_probability': round(float(p_surface), 3),
        'forecast_confidence': round(float(sc_conf), 3),
        'forecast_interpretation': f'{scenario}; trend={trend}; p_high30={p_high:.2f}; p_ext30={p_ext:.2f}; priority={rec["priority"]}',
        'wind_direction_current': data.get('wind_direction') or 'UNKNOWN',
        'forecast_model_version': bundle.get('model_version'),
        'input_status': 'OK',
    }


def _clean(o):
    if isinstance(o, dict):
        return {k: _clean(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [_clean(v) for v in o]
    if isinstance(o, (float, np.floating)):
        return float(o) if np.isfinite(o) else None
    if isinstance(o, np.integer):
        return int(o)
    return o


class Handler(BaseHTTPRequestHandler):
    def send_json(self, status, payload):
        body = json.dumps(_clean(payload), ensure_ascii=False, allow_nan=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == '/health':
            return self.send_json(200, {'status': 'OK', 'model_loaded': bundle is not None,
                                        'model_version': bundle.get('model_version') if bundle else None,
                                        'forecast_horizon_minutes': 30})
        if self.path == '/model-info' and bundle:
            return self.send_json(200, {k: bundle.get(k) for k in ('model_version', 'trained_at', 'metrics',
                                                                  'training_rows', 'feature_columns', 'scenario_labels')})
        self.send_json(404, {'error': 'Endpoint not found'})

    def do_POST(self):
        if self.path not in ('/predict-forecast', '/analyze'):
            return self.send_json(404, {'error': 'Endpoint not found'})
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if length <= 0 or length > 1_000_000:
                return self.send_json(400, {'error': 'Invalid request body size'})
            data = json.loads(self.rfile.read(length).decode('utf-8'))
            if not isinstance(data, dict):
                raise ValueError('Request harus berupa JSON object.')
            self.send_json(200, analyze(data))
        except Exception as exc:
            self.send_json(500, {'forecast_status': 'ERROR', 'error': str(exc)})

    def log_message(self, fmt, *args):
        print('[PyroWatch ML]', fmt % args)


if __name__ == '__main__':
    load_model()
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f'PyroWatch ML API listening on {PORT}')
    server.serve_forever()
