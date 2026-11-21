"""Inti bersama PyroWatch ML: rumus FRI (WSM proposal), normalisasi, dan fitur.

Modul ini dipakai oleh train.py, scenario_sim.py, dan predict.py agar fitur
saat training dan saat inferensi dihitung dengan fungsi yang sama persis.

Rumus FRI (Proposal Bab 4.2.3):
    f(T)  = (T - 25) / (55 - 25)              -> clip 0..1
    f(H)  = (90 - H) / (90 - 30)              -> clip 0..1 (inversi)
    f(CO) = CO / 200 ppm, f(CH4) = CH4 / 1000 ppm, f(G) = max(f(CO), f(CH4))
    FRI   = 0.3 f(T) + 0.2 f(H) + 0.5 f(G)

Catatan penting dari rumus ini: tanpa gas, kontribusi cuaca maksimal hanya
0.3 + 0.2 = 0.5 (Moderate). FRI >= 0.6 (High) PASTI membutuhkan sinyal gas.
Karena itu nilai FRI yang sama bisa berasal dari skenario fisik yang berbeda,
dan model menganalisis komposisi komponennya, bukan hanya angka FRI.
"""
import math
import numpy as np

W_TEMP, W_HUM, W_GAS = 0.3, 0.2, 0.5
T_MIN, T_MAX = 25.0, 55.0
H_MIN, H_MAX = 30.0, 90.0
CO_MAX, CH4_MAX = 200.0, 1000.0

CO_WARNING_PPM = 35.0       # proposal: peringatan aktif
CO_SMOLDER_PPM = 50.0       # proposal: indikator smoldering bawah permukaan
CO_CRITICAL_PPM = 200.0     # proposal: alarm kritis
CO_IDLH_PPM = 1200.0        # NIOSH IDLH CO

TREND_WINDOW_MIN = 15.0     # jendela riwayat untuk menghitung tren
FRI_LEVELS = [(0.4, 'Low'), (0.6, 'Moderate'), (0.8, 'High'), (math.inf, 'Extreme')]

SCENARIOS = {
    'NORMAL': 'Kondisi normal',
    'FUEL_DRYING': 'Pengeringan bahan bakar (cuaca panas-kering, tanpa gas pembakaran)',
    'EARLY_SMOLDERING': 'Indikasi smoldering awal (gas pembakaran mulai naik)',
    'ACTIVE_SMOLDERING': 'Smoldering aktif bawah permukaan',
    'WIND_DRIVEN_FIRE': 'Potensi api permukaan terdorong angin',
    'DECAYING': 'Kebakaran mereda (gas turun / kelembapan naik)',
    'SENSOR_ANOMALY': 'Anomali sensor / sumber gas non-kebakaran',
}

FEATURES = [
    'co', 'ch4', 'temp', 'hum', 'wind',
    'f_temp', 'f_hum', 'f_co', 'f_ch4', 'f_gas', 'fri_wsm',
    'c_gas', 'c_temp', 'c_hum', 'gas_share', 'co_minus_ch4',
    'has_trend', 'slope_co', 'slope_ch4', 'slope_temp', 'slope_hum', 'slope_fri', 'slope_wind',
    'co_rel_std', 'co_persist', 'co_jump', 'ch4_jump', 'fri_max_window',
]


def num(value):
    try:
        if value is None or value == '':
            return np.nan
        value = float(value)
        return value if np.isfinite(value) else np.nan
    except (TypeError, ValueError):
        return np.nan


def clip01(x):
    return float(min(1.0, max(0.0, x))) if np.isfinite(x) else np.nan


def normalize(temp, hum, co, ch4):
    f_t = clip01((temp - T_MIN) / (T_MAX - T_MIN))
    f_h = clip01((H_MAX - hum) / (H_MAX - H_MIN))
    f_co = clip01(co / CO_MAX)
    f_ch4 = clip01(ch4 / CH4_MAX)
    gases = [g for g in (f_co, f_ch4) if np.isfinite(g)]
    f_g = max(gases) if gases else np.nan
    return f_t, f_h, f_co, f_ch4, f_g


def fri_wsm(temp, hum, co, ch4):
    f_t, f_h, _, _, f_g = normalize(temp, hum, co, ch4)
    parts = [(W_TEMP, f_t), (W_HUM, f_h), (W_GAS, f_g)]
    if any(not np.isfinite(v) for _, v in parts):
        return np.nan
    return float(sum(w * v for w, v in parts))


def classify_fri(value):
    if value is None or not np.isfinite(value):
        return 'Unknown'
    for limit, name in FRI_LEVELS:
        if value < limit:
            return name
    return 'Extreme'


def _slope(t_min, values):
    mask = np.isfinite(values)
    if mask.sum() < 3:
        return 0.0
    t, v = t_min[mask], values[mask]
    if t.max() - t.min() < 2.0:
        return 0.0
    t = t - t.mean()
    denom = float((t * t).sum())
    return float((t * (v - v.mean())).sum() / denom) if denom > 0 else 0.0


def build_features(current, history=None):
    """Hitung vektor fitur.

    current : dict dengan co, ch4, temp, hum, wind (wind = kecepatan anemometer m/s)
    history : list of (minutes_before_now >= 0, dict) untuk pembacaan SEBELUM current
              dalam jendela TREND_WINDOW_MIN. Boleh kosong.
    """
    co, ch4 = num(current.get('co')), num(current.get('ch4'))
    temp, hum = num(current.get('temp')), num(current.get('hum'))
    wind = num(current.get('wind'))
    f_t, f_h, f_co, f_ch4, f_g = normalize(temp, hum, co, ch4)
    fri = fri_wsm(temp, hum, co, ch4)
    c_gas = W_GAS * f_g if np.isfinite(f_g) else np.nan
    c_temp = W_TEMP * f_t if np.isfinite(f_t) else np.nan
    c_hum = W_HUM * f_h if np.isfinite(f_h) else np.nan
    gas_share = c_gas / fri if np.isfinite(fri) and fri > 1e-6 else 0.0

    feats = {
        'co': co, 'ch4': ch4, 'temp': temp, 'hum': hum, 'wind': wind,
        'f_temp': f_t, 'f_hum': f_h, 'f_co': f_co, 'f_ch4': f_ch4, 'f_gas': f_g, 'fri_wsm': fri,
        'c_gas': c_gas, 'c_temp': c_temp, 'c_hum': c_hum, 'gas_share': gas_share,
        'co_minus_ch4': (f_co - f_ch4) if np.isfinite(f_co) and np.isfinite(f_ch4) else np.nan,
    }

    hist = [(m, h) for m, h in (history or []) if 0 < m <= TREND_WINDOW_MIN]
    if len(hist) >= 2:
        rows = hist + [(0.0, current)]
        t = np.array([-m for m, _ in rows], dtype=float)
        get = lambda k: np.array([num(h.get(k)) for _, h in rows], dtype=float)
        a_co, a_ch4, a_t, a_h, a_w = get('co'), get('ch4'), get('temp'), get('hum'), get('wind')
        a_fri = np.array([fri_wsm(a_t[i], a_h[i], a_co[i], a_ch4[i]) for i in range(len(rows))])
        prev_co, prev_ch4 = a_co[:-1], a_ch4[:-1]
        co_mean = np.nanmean(a_co) if np.isfinite(a_co).any() else np.nan
        feats.update({
            'has_trend': 1.0,
            'slope_co': _slope(t, a_co), 'slope_ch4': _slope(t, a_ch4),
            'slope_temp': _slope(t, a_t), 'slope_hum': _slope(t, a_h),
            'slope_fri': _slope(t, a_fri), 'slope_wind': _slope(t, a_w),
            'co_rel_std': float(np.nanstd(a_co) / (co_mean + 10.0)) if np.isfinite(co_mean) else 0.0,
            'co_persist': float(np.nanmean(a_co >= CO_WARNING_PPM)) if np.isfinite(a_co).any() else 0.0,
            'co_jump': float(co - np.nanmedian(prev_co)) if np.isfinite(co) and np.isfinite(prev_co).any() else 0.0,
            'ch4_jump': float(ch4 - np.nanmedian(prev_ch4)) if np.isfinite(ch4) and np.isfinite(prev_ch4).any() else 0.0,
            'fri_max_window': float(np.nanmax(a_fri)) if np.isfinite(a_fri).any() else fri,
            'history_points': len(rows),
        })
    else:
        feats.update({
            'has_trend': 0.0, 'slope_co': 0.0, 'slope_ch4': 0.0, 'slope_temp': 0.0, 'slope_hum': 0.0,
            'slope_fri': 0.0, 'slope_wind': 0.0, 'co_rel_std': 0.0,
            'co_persist': 1.0 if np.isfinite(co) and co >= CO_WARNING_PPM else 0.0,
            'co_jump': 0.0, 'ch4_jump': 0.0, 'fri_max_window': fri, 'history_points': 1,
        })
    return feats


def feature_row(feats):
    return [feats.get(c, np.nan) for c in FEATURES]


# ---------------------------------------------------------------- arah angin
COMPASS_16 = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
COMPASS_ID = {'N': 'Utara', 'NE': 'Timur Laut', 'E': 'Timur', 'SE': 'Tenggara', 'S': 'Selatan',
              'SW': 'Barat Daya', 'W': 'Barat', 'NW': 'Barat Laut'}
COMPASS_DEG = {name: i * 22.5 for i, name in enumerate(COMPASS_16)}


def direction_deg(deg, label=None):
    d = num(deg)
    if np.isfinite(d):
        return d % 360.0
    if label:
        return COMPASS_DEG.get(str(label).strip().upper(), np.nan)
    return np.nan


def compass8(deg):
    names = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
    return names[int(((deg % 360) + 22.5) // 45) % 8]


def sector_text(deg, half_width=45):
    lo, hi = (deg - half_width) % 360, (deg + half_width) % 360
    c = compass8(deg)
    return f'{COMPASS_ID[c]} ({c}, {deg:.0f}° ±{half_width}°, rentang {lo:.0f}°–{hi:.0f}°)'
