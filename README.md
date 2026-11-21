# PyroWatch_Despro32

Sistem peringatan dini kebakaran lahan gambut berbasis IoT (ESP32 + MQ-7/MQ-2/DHT22 + anemometer → LoRa → MQTT/Mosquitto → Node-RED → ML backend → dashboard).

## Layanan

| Service | Port | Fungsi |
|---|---|---|
| `mosquitto` | 1883 | Broker MQTT |
| `node-red` | 1880 | Ingest data, hitung FRI, simpan ke SQLite (`node-red/data/pyrowatch1.db`), dashboard |
| `ml` | 5000 | Prediksi eskalasi + analisis skenario + rekomendasi tindakan (`ml/`) |

```bash
docker compose up -d --build
```

## ML backend (v4: `pyrowatch-scenario-hgb-v4`)

### Masalah versi sebelumnya
* Model hanya memprediksi "FRI 15 menit lagi". Data latih didominasi kondisi normal dan uji simulasi yang hanya sesaat bernilai tinggi, sehingga model belajar *mean reversion*: setiap FRI tinggi diprediksi turun satu level.
* Skor FRI prediksi kedua redundan dengan FRI dari sensor.
* Rekomendasi hanya bergantung pada level FRI, jadi terlalu umum. Dua kondisi dengan FRI sama mendapat saran yang sama, padahal penyebab fisiknya bisa berbeda.

### Pendekatan baru
FRI dari sensor tetap menjadi nilai resmi. ML tidak menghitung ulang FRI, tetapi menjawab tiga pertanyaan operasional:

1. **Mengapa FRI bernilai sekian? (klasifikasi skenario).** Model membaca komposisi komponen (kontribusi gas/suhu/kelembapan pada WSM) dan tren 15 menit terakhir, lalu memilih salah satu skenario: `NORMAL`, `FUEL_DRYING`, `EARLY_SMOLDERING`, `ACTIVE_SMOLDERING`, `WIND_DRIVEN_FIRE`, `DECAYING`, `SENSOR_ANOMALY`.
   Contoh: dengan FRI ≈ 0,5, cuaca panas-kering tanpa gas dikenali sebagai *pencegahan*, CO yang naik sebagai *verifikasi smoldering*, CH4 tanpa CO sebagai *cek sensor*, dan gas yang turun sebagai *mop-up*.
2. **Seberapa cepat memburuk? (eskalasi).** Model memberi probabilitas FRI mencapai High (≥0,6) dan Extreme (≥0,8) dalam 30 menit, perkiraan waktu (ETA), serta perubahan FRI 15/30 menit dengan rentang 80% (regresi kuantil). Model juga memproyeksikan tiap komponen sensor (CO, CH4, suhu, kelembapan, angin) untuk 15 menit ke depan.
3. **Apa yang harus dilakukan petugas? (rekomendasi).** Rencana aksi dibagi per fase (`SEGERA 0–15 menit`, `LANJUTAN 15–60 menit`, `PASCA`) dan per kategori. Isinya mencakup:
   * sektor pencarian sumber di **hulu angin**, karena gas terbawa angin dari sumber ke node;
   * sektor ancaman di **hilir angin**;
   * radius pemeriksaan, estimasi laju rambat, APD sesuai kadar CO (35/200/1200 ppm), dan interval sampling;
   * eskalasi ke BPBD/Manggala Agni.

Tren dihitung dari riwayat node di SQLite (read-only) ditambah buffer memori. Karena itu FRI yang sama dengan tren berbeda menghasilkan prediksi berbeda.

### Data latih
Database belum memiliki label kejadian lapangan (`observed_spread_rate_cmph` kosong). Karena itu `scenario_sim.py` membangkitkan deret waktu skenario fisik kebakaran gambut berdasarkan parameter di proposal. Rumus FRI/WSM yang dipakai adalah wT=0,3, wH=0,2, wG=0,5, dengan ambang CO 35/50/200 ppm. Data nyata dari `sensor_readings` ikut dipakai untuk target regresi/eskalasi dengan bobot 3×.

Evaluasi memakai holdout per deret, dibandingkan dengan baseline (persistence / FRI saat ini). Lihat `GET /model-info`.

| Target | Model | Baseline |
|---|---|---|
| Skenario (7 kelas) | akurasi ≈ 0,92, macro-F1 ≈ 0,92 | – |
| P(High ≤ 30 mnt) | AUC ≈ 0,99 | AUC FRI saat ini ≈ 0,97 |
| ΔFRI 30 mnt pada kasus naik | MAE ≈ 0,06 | MAE ≈ 0,17 |

> ⚠️ Metrik di atas diukur pada data skenario, bukan validasi lapangan. Setelah ada kejadian/uji bakar berlabel, tambahkan labelnya ke database lalu latih ulang. Radius, laju rambat, dan sektor adalah heuristik yang perlu dikalibrasi lapangan. Keputusan pemadaman/evakuasi tetap mengikuti SOP.

### API
* `GET /health`
* `GET /model-info`: metrik dan versi model
* `POST /predict-forecast` (atau `/analyze`). Body berisi payload sensor: `node_id`, `timestamp`, `co`, `ch4`, `temp`, `hum`, `fri`, `wind_speed_sensor`, `wind_direction_deg`, `wind_direction`, `spread_rate_cmph`, `gas_calibrated`, ...

Field respons utama untuk dashboard Node-RED:

| Field | Isi |
|---|---|
| `current_fri`, `current_fri_level` | FRI resmi dari sensor (tidak ada skor FRI kedua) |
| `scenario`, `scenario_label`, `scenario_confidence`, `scenario_probabilities` | hasil klasifikasi skenario |
| `escalation.p_high_30m`, `escalation.p_extreme_30m`, `escalation.eta_high_min`, `escalation.fri_change_30m{expected,low,high}` | prediksi eskalasi |
| `drivers` | kontribusi komponen, pendorong dominan, catatan selisih FRI node vs rumus WSM |
| `component_projection_15m`, `component_trend_per_min` | proyeksi & tren tiap sensor |
| `spread` | mode rambat, laju, jarak, `source_search_sector`, `threat_sector`, `inspection_radius_m` |
| `recommendations.priority` | `ROUTINE` / `WATCH` / `DATA_CHECK` / `ELEVATED` / `URGENT` |
| `recommendations.action_plan[]` | `{phase, category, action, reason}` |
| `recommendations.monitoring`, `early_response`, `area_protection`, `coordination`, `operational_caveat`, `trigger_summary` | ringkasan teks (kompatibel dengan flow lama) |
| `insight_text`, `highlights[]`, `data_quality[]` | narasi & kartu ringkas |
| `future_wind_speed`, `future_spread_direction`, `spread_direction_probability`, `forecast_confidence`, `forecast_interpretation` | sesuai kolom tabel `ml_forecasts` |

### Training & uji
```bash
cd ml
PYROWATCH_DB=../node-red/data/pyrowatch1.db python train.py   # ~1 menit, menulis models/forecast_models.pkl
PYROWATCH_DB=/nonexistent python test_scenarios.py            # 6 kasus FRI serupa dengan analisis berbeda
```

Saat container `ml` start, model yang tidak ada, versinya lama, atau dibuat dengan versi scikit-learn yang berbeda akan otomatis dilatih ulang.
