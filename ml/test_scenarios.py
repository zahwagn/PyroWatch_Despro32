"""Uji perilaku model: FRI serupa, komposisi/tren berbeda -> analisis berbeda.

Jalankan:  PYROWATCH_DB=/tidak/ada python test_scenarios.py
Setiap kasus mengirim 10 pembacaan (interval 1 menit) ke analyze() sehingga
buffer riwayat terisi, lalu mencetak hasil analisis pembacaan terakhir.
"""
import math
import os
from datetime import datetime, timedelta, timezone

os.environ.setdefault('PYROWATCH_DB', '/nonexistent.db')
import predict  # noqa: E402

T0 = datetime(2026, 11, 21, 6, 0, tzinfo=timezone.utc)


def series(node, fn, n=10, wind_dir=135):
    out = None
    for i in range(n):
        co, ch4, temp, hum, wind = fn(i)
        out = predict.analyze({'node_id': node, 'timestamp': (T0 + timedelta(minutes=i)).isoformat(),
                               'co': co, 'ch4': ch4, 'temp': temp, 'hum': hum, 'wind_speed_sensor': wind,
                               'wind_direction_deg': wind_dir, 'gas_calibrated': True})
    return out


CASES = {
    # semua kasus berakhir di FRI ~0.45-0.55 (Moderate)
    'A. Cuaca panas-kering, tanpa gas': lambda i: (5, 40, 46 + 0.1 * i, 34 - 0.1 * i, 3.0),
    'B. CO naik bertahap (smoldering awal)': lambda i: (60 + 6 * i, 150 + 15 * i, 33, 58, 2.0),
    'C. CH4 tinggi tanpa CO (anomali MQ-2)': lambda i: (3, 880 + (i % 3) * 10, 28, 75, 1.5),
    'D. Sisa kebakaran mereda': lambda i: (230 - 12 * i, 650 - 30 * i, 38 - 0.3 * i, 45 + 1.5 * i, 2.0),
    'E. Smoldering aktif + angin kencang': lambda i: (260 + 3 * i, 700, 46, 30, 7.5 + 0.1 * i),
    'F. Proposal (T40 H45 CO80 CH4 300) stabil': lambda i: (80 + 3 * math.sin(1.7 * i), 300 + 10 * math.sin(2.3 * i),
                                                            40 + 0.2 * math.sin(i), 45 + 0.8 * math.cos(i), 3.5),
}


def main():
    predict.load_model()
    for name, fn in CASES.items():
        r = series(name, fn)
        e, rec = r['escalation'], r['recommendations']
        print('=' * 100)
        print(f'{name}\n  FRI {r["current_fri"]:.2f} ({r["current_fri_level"]}) | skenario {r["scenario"]} '
              f'({r["scenario_confidence"]:.0%}) | prioritas {rec["priority"]}')
        print(f'  p_high30 {e["p_high_30m"]:.0%}  p_ext30 {e["p_extreme_30m"]:.0%}  ETA High {e["eta_high_min"]}  '
              f'dFRI30 {e["fri_change_30m"]}  trend {r["trend"]}')
        print('  insight:', r['insight_text'])
        for a in rec['action_plan']:
            print(f'   - [{a["phase"]}] ({a["category"]}) {a["action"]}')


if __name__ == '__main__':
    main()
