"""Generator skenario fisik kebakaran gambut (physics-informed synthetic data).

Database PyroWatch saat ini belum memiliki label kejadian lapangan
(observed_spread_rate_cmph kosong, sebagian besar data adalah kondisi normal
atau uji simulasi). Model yang hanya dilatih dari data itu belajar
"mean reversion": setiap FRI tinggi diprediksi turun lagi, karena pada data
uji nilai tinggi memang hanya muncul sesaat.

Generator ini membuat deret waktu 1 menit untuk tiap skenario dengan dinamika
yang berbeda walaupun nilai FRI-nya bisa sama, misalnya FRI ~0.5 dapat berasal
dari (a) cuaca panas-kering tanpa gas, (b) CO naik bertahap (smoldering awal),
(c) CH4 tinggi tanpa CO (gangguan sensor / sumber non-kebakaran), atau
(d) sisa kebakaran yang sedang mereda. Dinamika masa depannya berbeda, sehingga
model belajar membedakan skenario dari komposisi komponen dan tren.

Parameter dinamika didasarkan pada karakteristik di proposal (CO normal
~0,1 ppm, >50 ppm di titik asap, ambang 35/200 ppm, smoldering gambut lambat
dan mudah menyala kembali). Model WAJIB dilatih ulang ketika label lapangan
tersedia (lihat README).
"""
import numpy as np

STEP_MIN = 1.0


def _noise(rng, n, scale):
    return rng.normal(0.0, scale, n)


def _ar_wind(rng, n, mean, sd=0.6):
    w = np.empty(n)
    w[0] = max(0.0, rng.normal(mean, sd))
    for i in range(1, n):
        w[i] = max(0.0, w[i - 1] + 0.15 * (mean - w[i - 1]) + rng.normal(0, sd * 0.5))
    return w


def _ramp(rng, n, start, rate, lo=-np.inf, hi=np.inf, curvature=0.0):
    t = np.arange(n) * STEP_MIN
    return np.clip(start + rate * t + curvature * t * t, lo, hi)


def simulate(scenario, rng, n=150):
    """Kembalikan dict array: temp, hum, co, ch4, wind, label (per menit)."""
    labels = np.array([scenario] * n, dtype=object)
    wind = _ar_wind(rng, n, rng.uniform(0.3, 4.0))

    if scenario == 'NORMAL':
        temp = rng.uniform(25, 33) + np.cumsum(_noise(rng, n, 0.03))
        hum = rng.uniform(58, 90) + np.cumsum(_noise(rng, n, 0.12))
        co = np.abs(rng.uniform(0, 10) + _noise(rng, n, 1.5))
        ch4 = np.abs(rng.uniform(0, 90) + _noise(rng, n, 8))

    elif scenario == 'FUEL_DRYING':
        temp = _ramp(rng, n, rng.uniform(30, 37), rng.uniform(0.01, 0.1), hi=52)
        hum = _ramp(rng, n, rng.uniform(48, 66), -rng.uniform(0.03, 0.18), lo=24)
        co = np.abs(rng.uniform(0, 20) + _noise(rng, n, 2))
        ch4 = np.abs(rng.uniform(0, 120) + _noise(rng, n, 10))
        wind = _ar_wind(rng, n, rng.uniform(1, 6))
        # Sebagian kondisi kering berlanjut menjadi penyalaan smoldering.
        if rng.random() < 0.35:
            k = int(rng.integers(40, n - 30))
            m = n - k
            co[k:] += _ramp(rng, m, rng.uniform(5, 25), rng.uniform(1.0, 5.0), hi=420, curvature=rng.uniform(0, 0.03))
            ch4[k:] += _ramp(rng, m, rng.uniform(20, 80), rng.uniform(4, 18), hi=1000)
            labels[k:] = 'EARLY_SMOLDERING'

    elif scenario == 'EARLY_SMOLDERING':
        temp = _ramp(rng, n, rng.uniform(26, 43), rng.uniform(0.0, 0.05), hi=50)
        hum = _ramp(rng, n, rng.uniform(35, 72), -rng.uniform(0.0, 0.1), lo=25)
        co_rate = rng.uniform(0.0, 0.3) if rng.random() < 0.25 else rng.uniform(0.6, 4.5)  # 25%: smoldering plateau
        co = _ramp(rng, n, rng.uniform(25, 110), co_rate, hi=450, curvature=rng.uniform(0, 0.02) if co_rate > 0.5 else 0)
        ch4 = _ramp(rng, n, rng.uniform(40, 250), rng.uniform(2, 15), hi=1000)
        # Pada sebagian kasus pembakaran tidak berkembang (bara kecil, padam sendiri).
        if rng.random() < 0.25:
            k = int(rng.integers(30, 90))
            co[k:] = np.maximum(co[k] - np.arange(n - k) * rng.uniform(0.5, 2.5), rng.uniform(2, 15))
            ch4[k:] = np.maximum(ch4[k] - np.arange(n - k) * rng.uniform(2, 8), rng.uniform(10, 80))
            labels[k + 10:] = 'DECAYING'

    elif scenario == 'ACTIVE_SMOLDERING':
        # Bara di bawah permukaan tidak selalu menaikkan suhu udara di node (sensor ~1 m di atas tanah),
        # sehingga suhu udara bisa tetap mendekati normal walaupun CO sudah tinggi dan menetap.
        temp = _ramp(rng, n, rng.uniform(28, 48), rng.uniform(-0.01, 0.05), lo=26, hi=56)
        hum = _ramp(rng, n, rng.uniform(28, 68), rng.uniform(-0.08, 0.02), lo=20, hi=80)
        co = _ramp(rng, n, rng.uniform(150, 320), rng.uniform(-0.3, 2.5), lo=120, hi=600) * (1 + _noise(rng, n, 0.06))
        ch4 = _ramp(rng, n, rng.uniform(300, 850), rng.uniform(-1, 6), lo=200, hi=1500)
        wind = _ar_wind(rng, n, rng.uniform(0.3, 4.0))
        if rng.random() < 0.3:  # transisi ke api permukaan ketika angin menguat
            k = int(rng.integers(40, n - 30))
            wind[k:] = _ar_wind(rng, n - k, rng.uniform(5.5, 11))
            temp[k:] = np.minimum(temp[k:] + np.arange(n - k) * 0.08, 60)
            hum[k:] = np.maximum(hum[k:] - np.arange(n - k) * 0.08, 18)
            labels[k:] = 'WIND_DRIVEN_FIRE'

    elif scenario == 'WIND_DRIVEN_FIRE':
        temp = _ramp(rng, n, rng.uniform(40, 52), rng.uniform(0, 0.08), hi=62)
        hum = _ramp(rng, n, rng.uniform(20, 40), rng.uniform(-0.06, 0.0), lo=15)
        co = rng.uniform(180, 400) * (1 + _noise(rng, n, 0.15)) + np.arange(n) * rng.uniform(0, 1.5)
        ch4 = _ramp(rng, n, rng.uniform(350, 900), rng.uniform(0, 5), hi=1600)
        wind = _ar_wind(rng, n, rng.uniform(5.5, 12), sd=1.0)

    elif scenario == 'DECAYING':
        temp = _ramp(rng, n, rng.uniform(34, 46), -rng.uniform(0.02, 0.12), lo=26)
        hum = _ramp(rng, n, rng.uniform(35, 60), rng.uniform(0.1, 0.5), hi=95)
        co = np.maximum(rng.uniform(120, 300) - np.arange(n) * rng.uniform(1.0, 5.0), rng.uniform(3, 20))
        ch4 = np.maximum(rng.uniform(300, 800) - np.arange(n) * rng.uniform(4, 15), rng.uniform(20, 90))
        # Gambut sering menyala kembali bila pemadaman tidak tuntas.
        if rng.random() < 0.2:
            k = int(rng.integers(70, n - 30))
            co[k:] += _ramp(rng, n - k, 0, rng.uniform(1, 4), hi=350)
            ch4[k:] += _ramp(rng, n - k, 0, rng.uniform(3, 12), hi=900)
            labels[k + 5:] = 'EARLY_SMOLDERING'

    elif scenario == 'SENSOR_ANOMALY':
        temp = rng.uniform(25, 33) + np.cumsum(_noise(rng, n, 0.03))
        hum = rng.uniform(55, 92) + np.cumsum(_noise(rng, n, 0.1))
        co = np.abs(rng.uniform(0, 10) + _noise(rng, n, 1.5))
        ch4 = np.abs(rng.uniform(0, 90) + _noise(rng, n, 8))
        kind = rng.integers(0, 3)
        if kind == 0:   # CH4 tinggi tanpa CO & tanpa panas (cross-sensitivity MQ-2 / sumber BBM)
            ch4 = rng.uniform(400, 1100) + _noise(rng, n, 25)
        elif kind == 1:  # lonjakan sesaat (spike) pada CO / CH4
            for k in rng.choice(n, size=int(rng.integers(4, 10)), replace=False):
                co[k] += rng.uniform(100, 400)
                if rng.random() < 0.5:
                    ch4[k] += rng.uniform(200, 900)
        else:           # sensor CO macet di nilai tinggi (nilai identik) saat udara lembap
            co[:] = rng.uniform(120, 300)
            hum = rng.uniform(85, 98) + _noise(rng, n, 0.3)
    else:
        raise ValueError(scenario)

    return {
        'temp': temp + _noise(rng, n, 0.25),
        'hum': np.clip(hum + _noise(rng, n, 0.8), 5, 100),
        'co': np.clip(co + (_noise(rng, n, 1.5) if scenario != 'SENSOR_ANOMALY' else 0), 0, None),
        'ch4': np.clip(ch4 + _noise(rng, n, 6), 0, None),
        'wind': np.clip(wind, 0, None),
        'label': labels,
    }


SCENARIO_WEIGHTS = {
    'NORMAL': 0.20, 'FUEL_DRYING': 0.17, 'EARLY_SMOLDERING': 0.18, 'ACTIVE_SMOLDERING': 0.14,
    'WIND_DRIVEN_FIRE': 0.09, 'DECAYING': 0.11, 'SENSOR_ANOMALY': 0.11,
}


def generate(n_sequences=700, seed=42, length=150):
    rng = np.random.default_rng(seed)
    names = list(SCENARIO_WEIGHTS)
    p = np.array([SCENARIO_WEIGHTS[k] for k in names])
    p = p / p.sum()
    for seq_id in range(n_sequences):
        yield seq_id, simulate(names[rng.choice(len(names), p=p)], rng, length)
