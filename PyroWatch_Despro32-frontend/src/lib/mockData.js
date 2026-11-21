// Snapshot contoh dari GET /api/sensor/latest (flow Node-RED + ML v4, skenario simulasi EARLY_SMOLDERING).
// Aktifkan dengan VITE_USE_MOCK=true.
export const mockSensorData = {
  "sample_id": "SIM-EARLY_SMOLDERING-1795265385378-9",
  "node_id": "PYROWATCH_SIM_EARLY_SMOLDERING",
  "timestamp": "2026-11-21T12:49:45.378Z",
  "sensor_timestamp": null,
  "simulation": true,
  "simulation_scenario": "EARLY_SMOLDERING",
  "temp": 33.1,
  "hum": 57.6,
  "co": 111,
  "ch4": 279.8,
  "gas_calibrated": true,
  "gas_calibration_validated": false,
  "gas_calibration_status": "PROVISIONAL",
  "gas_calibration_method": "UNKNOWN",
  "mq7_heater_cycle_compliant": false,
  "mq2_raw": null,
  "mq7_raw": null,
  "mq2_vout_v": null,
  "mq7_vout_v": null,
  "mq2_rs_kohm": null,
  "mq7_rs_kohm": null,
  "mq2_r0_kohm": null,
  "mq7_r0_kohm": null,
  "mq2_response_percent": null,
  "mq7_response_percent": null,
  "mq2_signal_change_detected": false,
  "mq7_signal_change_detected": false,
  "gas_signal_change_detected": false,
  "soil_raw": null,
  "soil_moisture": 25,
  "soil_condition": "Kering",
  "wind_speed": 2.13,
  "wind_speed_sensor": 2.13,
  "wind_speed_weather": null,
  "wind_direction_deg": 135,
  "wind_direction": "SE",
  "weather_source": "Open-Meteo",
  "weather_status": "SIMULATED",
  "rain": 0,
  "fri_f_temperature": 0.2700000000000001,
  "fri_f_humidity": 0.5399999999999999,
  "fri_f_co": 0.555,
  "fri_f_ch4": 0.2798,
  "fri_f_gas": 0.555,
  "fri_base": 0.4665,
  "fri": 0.4665,
  "fri_level": "Moderate",
  "fri_data_status": "PROVISIONAL_GAS_INPUT",
  "spread_rate_base_cmph": 2.7,
  "wind_effect_factor": 1.1006,
  "spread_rate_cmph": 2.97,
  "spread_model": "SIMULATION_ONLY",
  "spread_model_status": "ESTIMATE",
  "spread_model_reference": null,
  "spread_direction_source": null,
  "spread_label_type": "SEMI_EMPIRICAL_ESTIMATE_NOT_GROUND_TRUTH",
  "ml_forecast_status": "OK",
  "ml_forecast_horizon_minutes": 30,
  "ml_forecast_timestamp": "2026-11-21T13:19:45.378000+00:00",
  "ml_model_version": "pyrowatch-scenario-hgb-v4",
  "ml_input_status": "OK",
  "ml_cached_from_sample": null,
  "ml_history_points_used": 10,
  "ml_data_quality": [],
  "ml_scenario": "EARLY_SMOLDERING",
  "ml_scenario_label": "Indikasi smoldering awal (gas pembakaran mulai naik)",
  "ml_scenario_confidence": 1,
  "ml_scenario_probabilities": {
    "EARLY_SMOLDERING": 1,
    "SENSOR_ANOMALY": 0,
    "DECAYING": 0,
    "NORMAL": 0,
    "FUEL_DRYING": 0,
    "WIND_DRIVEN_FIRE": 0,
    "ACTIVE_SMOLDERING": 0
  },
  "ml_drivers": {
    "contributions": {
      "gas": 0.278,
      "suhu": 0.081,
      "kelembapan": 0.108
    },
    "contribution_share": {
      "gas": 0.595,
      "suhu": 0.174,
      "kelembapan": 0.232
    },
    "dominant_driver": "gas",
    "gas_source": "CO (MQ-7)",
    "fri_wsm_recomputed": 0.467,
    "fri_residual_vs_wsm": 0,
    "notes": [
      "Gas pembakaran menyumbang 0.28 poin (59%) dari FRI, sumber dominan CO (MQ-7); ini bukti fisik langsung kemungkinan smoldering."
    ]
  },
  "ml_dominant_driver": "gas",
  "ml_trend": "RISING",
  "ml_fri_change": 0.172,
  "ml_p_high_30m": 0.993,
  "ml_p_extreme_30m": 0,
  "ml_eta_high_min": 11.6,
  "ml_eta_extreme_min": 22.6,
  "ml_fri_change_15m": {
    "expected": 0.172,
    "low": 0.145,
    "high": 0.193
  },
  "ml_fri_change_30m": {
    "expected": 0.216,
    "low": 0.212,
    "high": 0.251
  },
  "ml_component_projection_15m": {
    "co": 193.72,
    "ch4": 498.84,
    "temp": 33.25,
    "hum": 56.39,
    "wind": 2.06
  },
  "ml_component_trend_per_min": {
    "co": 5.841,
    "ch4": 14.815,
    "temp": 0.008,
    "hum": -0.028,
    "wind": 0.01
  },
  "ml_current_fri": 0.4665,
  "ml_current_fri_level": "Moderate",
  "ml_future_wind_speed": 2.06231307125729,
  "ml_future_spread_rate_cmph": 2.97,
  "ml_spread": {
    "mode": "smoldering bawah permukaan",
    "wind_from_deg": 135,
    "downwind_deg": 315,
    "source_search_sector": "Tenggara (SE, 135° ±45°, rentang 90°–180°)",
    "threat_sector": "Barat Laut (NW, 315° ±45°, rentang 270°–0°)",
    "surface_transition_probability": 0,
    "rate_cmph": 2.97,
    "rate_m_per_min": 0.00049,
    "distance_m": {
      "6h": 0.18,
      "24h": 0.71
    },
    "inspection_radius_m": 113,
    "direction_confidence": "rendah (rambat bawah tanah dipengaruhi kadar air gambut, bukan angin)"
  },
  "ml_spread_mode": "smoldering bawah permukaan",
  "ml_source_search_sector": "Tenggara (SE, 135° ±45°, rentang 90°–180°)",
  "ml_threat_sector": "Barat Laut (NW, 315° ±45°, rentang 270°–0°)",
  "ml_inspection_radius_m": 113,
  "ml_insight_text": "Skenario: Indikasi smoldering awal (gas pembakaran mulai naik) (keyakinan model 100%). FRI sensor 0.47 (Moderate) tersusun dari gas 60%, suhu 17%, kelembapan 23%. Gas pembakaran menyumbang 0.28 poin (59%) dari FRI, sumber dominan CO (MQ-7); ini bukti fisik langsung kemungkinan smoldering. Probabilitas eskalasi ke High ≤30 menit: 99% (ETA ±12 menit). Perubahan FRI 30 menit diperkirakan +0.22 (rentang 80%: +0.21 s.d. +0.25). Proyeksi 15 menit: CO 111→194 ppm, CH4 280→499 ppm, suhu 33.1→33.2 °C, kelembapan 58→56%. Estimasi rambat smoldering ±2.97 cm/jam; sumber dicari di sektor hulu angin Tenggara (SE, 135° ±45°, rentang 90°–180°), radius ±113 m. Prioritas: ELEVATED.",
  "ml_highlights": [
    {
      "key": "scenario",
      "label": "Skenario terdeteksi",
      "value": "Indikasi smoldering awal (gas pembakaran mulai naik)",
      "detail": "Keyakinan 100%. Tidak ada alternatif kuat.",
      "status": "available"
    },
    {
      "key": "drivers",
      "label": "Pendorong FRI",
      "value": "GAS",
      "detail": "gas 0.28, suhu 0.08, kelembapan 0.11",
      "status": "available"
    },
    {
      "key": "escalation",
      "label": "Peluang eskalasi 30 menit",
      "value": "High 99% / Extreme 0%",
      "detail": "ETA High ±12 menit. ETA Extreme ±23 menit.",
      "status": "available"
    },
    {
      "key": "trend",
      "label": "Tren FRI",
      "value": "RISING",
      "detail": "Δ15m +0.17 (+0.15…+0.19); Δ30m +0.22 (+0.21…+0.25).",
      "status": "available"
    },
    {
      "key": "component_forecast",
      "label": "Proyeksi CO 15 menit",
      "value": "194 ppm",
      "detail": "Tren CO +5.8 ppm/menit, CH4 +14.8 ppm/menit.",
      "status": "available"
    },
    {
      "key": "wind_forecast",
      "label": "Proyeksi kecepatan angin",
      "value": "2.1 m/s",
      "detail": "Saat ini 2.1 m/s.",
      "status": "available"
    },
    {
      "key": "spread_forecast",
      "label": "Estimasi rambat & sektor",
      "value": "smoldering bawah permukaan",
      "detail": "Cari sumber: Tenggara (SE, 135° ±45°, rentang 90°–180°). Ancaman: Barat Laut (NW, 315° ±45°, rentang 270°–0°). Radius ±113 m.",
      "status": "available"
    }
  ],
  "ml_priority": "ELEVATED",
  "ml_action_plan": [
    {
      "phase": "SEGERA (0–15 menit)",
      "category": "monitoring",
      "action": "Naikkan interval sampling ke 1 menit; konfirmasi kenaikan CO pada 3 pembacaan berikutnya.",
      "reason": "CO 111 ppm (tren +5.8 ppm/menit, proyeksi 15 menit ≈ 194 ppm) melewati ambang gejala awal 50 ppm."
    },
    {
      "phase": "SEGERA (0–15 menit)",
      "category": "early_response",
      "action": "Kirim 1 regu kecil (2–3 orang) untuk verifikasi: cari sumber asap putih/bau gambut terbakar di sektor Tenggara (SE, 135° ±45°, rentang 90°–180°) (hulu angin) dalam radius ±113 m, gunakan termometer tusuk/kamera termal pada kedalaman 10–30 cm.",
      "reason": "Gas terbawa angin dari sumber ke node, sehingga sumber smoldering berada di arah datang angin; deteksi dini memungkinkan pemadaman dengan air sedikit sebelum bara meluas."
    },
    {
      "phase": "LANJUTAN (15–60 menit)",
      "category": "early_response",
      "action": "Bila titik panas ditemukan: siapkan pompa portabel + nozzle tusuk (penetrator) dan lakukan pembasahan sampai lapisan gambut jenuh, lalu ukur ulang suhu tanah.",
      "reason": "Smoldering gambut berada di bawah permukaan; penyiraman permukaan saja tidak memadamkan bara."
    },
    {
      "phase": "LANJUTAN (15–60 menit)",
      "category": "area_protection",
      "action": "Tandai area Barat Laut (NW, 315° ±45°, rentang 270°–0°) (hilir angin) sebagai zona paparan asap; batasi akses warga bila CO > 35 ppm.",
      "reason": "CO 111 ppm ≥ 35 ppm: gunakan respirator (minimal N95 + detektor CO personal), batasi paparan, dekati dari hulu angin, hentikan pekerjaan bila pusing/mual."
    },
    {
      "phase": "LANJUTAN (15–60 menit)",
      "category": "coordination",
      "action": "Laporkan ke koordinator pos sebagai \"dugaan smoldering\" lengkap dengan node, waktu, CO/CH4, tren, dan sektor pencarian; siagakan regu kedua.",
      "reason": "Probabilitas eskalasi ke High ≤30 menit: 99%, ETA ±12 menit."
    },
    {
      "phase": "SEGERA (0–15 menit)",
      "category": "monitoring",
      "action": "Perlakukan nilai ppm sebagai estimasi (kalibrasi gas belum tervalidasi standar).",
      "reason": "Ambang ppm proposal berlaku untuk sensor terkalibrasi; konfirmasi dengan detektor gas portabel."
    }
  ],
  "ml_ppe": "CO 111 ppm ≥ 35 ppm: gunakan respirator (minimal N95 + detektor CO personal), batasi paparan, dekati dari hulu angin, hentikan pekerjaan bila pusing/mual.",
  "ml_sampling_interval": "5 menit",
  "ml_recommendations": {
    "priority": "ELEVATED",
    "scenario": "EARLY_SMOLDERING",
    "monitoring": "[SEGERA (0–15 menit)] Naikkan interval sampling ke 1 menit; konfirmasi kenaikan CO pada 3 pembacaan berikutnya. [SEGERA (0–15 menit)] Perlakukan nilai ppm sebagai estimasi (kalibrasi gas belum tervalidasi standar).",
    "early_response": "[SEGERA (0–15 menit)] Kirim 1 regu kecil (2–3 orang) untuk verifikasi: cari sumber asap putih/bau gambut terbakar di sektor Tenggara (SE, 135° ±45°, rentang 90°–180°) (hulu angin) dalam radius ±113 m, gunakan termometer tusuk/kamera termal pada kedalaman 10–30 cm. [LANJUTAN (15–60 menit)] Bila titik panas ditemukan: siapkan pompa portabel + nozzle tusuk (penetrator) dan lakukan pembasahan sampai lapisan gambut jenuh, lalu ukur ulang suhu tanah.",
    "area_protection": "[LANJUTAN (15–60 menit)] Tandai area Barat Laut (NW, 315° ±45°, rentang 270°–0°) (hilir angin) sebagai zona paparan asap; batasi akses warga bila CO > 35 ppm.",
    "coordination": "[LANJUTAN (15–60 menit)] Laporkan ke koordinator pos sebagai \"dugaan smoldering\" lengkap dengan node, waktu, CO/CH4, tren, dan sektor pencarian; siagakan regu kedua.",
    "action_plan": [
      {
        "phase": "SEGERA (0–15 menit)",
        "category": "monitoring",
        "action": "Naikkan interval sampling ke 1 menit; konfirmasi kenaikan CO pada 3 pembacaan berikutnya.",
        "reason": "CO 111 ppm (tren +5.8 ppm/menit, proyeksi 15 menit ≈ 194 ppm) melewati ambang gejala awal 50 ppm."
      },
      {
        "phase": "SEGERA (0–15 menit)",
        "category": "early_response",
        "action": "Kirim 1 regu kecil (2–3 orang) untuk verifikasi: cari sumber asap putih/bau gambut terbakar di sektor Tenggara (SE, 135° ±45°, rentang 90°–180°) (hulu angin) dalam radius ±113 m, gunakan termometer tusuk/kamera termal pada kedalaman 10–30 cm.",
        "reason": "Gas terbawa angin dari sumber ke node, sehingga sumber smoldering berada di arah datang angin; deteksi dini memungkinkan pemadaman dengan air sedikit sebelum bara meluas."
      },
      {
        "phase": "LANJUTAN (15–60 menit)",
        "category": "early_response",
        "action": "Bila titik panas ditemukan: siapkan pompa portabel + nozzle tusuk (penetrator) dan lakukan pembasahan sampai lapisan gambut jenuh, lalu ukur ulang suhu tanah.",
        "reason": "Smoldering gambut berada di bawah permukaan; penyiraman permukaan saja tidak memadamkan bara."
      },
      {
        "phase": "LANJUTAN (15–60 menit)",
        "category": "area_protection",
        "action": "Tandai area Barat Laut (NW, 315° ±45°, rentang 270°–0°) (hilir angin) sebagai zona paparan asap; batasi akses warga bila CO > 35 ppm.",
        "reason": "CO 111 ppm ≥ 35 ppm: gunakan respirator (minimal N95 + detektor CO personal), batasi paparan, dekati dari hulu angin, hentikan pekerjaan bila pusing/mual."
      },
      {
        "phase": "LANJUTAN (15–60 menit)",
        "category": "coordination",
        "action": "Laporkan ke koordinator pos sebagai \"dugaan smoldering\" lengkap dengan node, waktu, CO/CH4, tren, dan sektor pencarian; siagakan regu kedua.",
        "reason": "Probabilitas eskalasi ke High ≤30 menit: 99%, ETA ±12 menit."
      },
      {
        "phase": "SEGERA (0–15 menit)",
        "category": "monitoring",
        "action": "Perlakukan nilai ppm sebagai estimasi (kalibrasi gas belum tervalidasi standar).",
        "reason": "Ambang ppm proposal berlaku untuk sensor terkalibrasi; konfirmasi dengan detektor gas portabel."
      }
    ],
    "sampling_interval": "5 menit",
    "source_search_sector": "Tenggara (SE, 135° ±45°, rentang 90°–180°)",
    "threat_sector": "Barat Laut (NW, 315° ±45°, rentang 270°–0°)",
    "inspection_radius_m": 113,
    "ppe": "CO 111 ppm ≥ 35 ppm: gunakan respirator (minimal N95 + detektor CO personal), batasi paparan, dekati dari hulu angin, hentikan pekerjaan bila pusing/mual.",
    "operational_caveat": "Rekomendasi adalah alat bantu prioritas berbasis model dan heuristik yang perlu dikalibrasi lapangan. Tindakan pemadaman/evakuasi tetap mengikuti SOP dan konfirmasi petugas.",
    "trigger_summary": "Gas pembakaran menyumbang 0.28 poin (59%) dari FRI, sumber dominan CO (MQ-7); ini bukti fisik langsung kemungkinan smoldering."
  }
};

export const mockAIAnalysis = {
  riskLevel: 'Low',
  analisisRisiko: 'Risiko kebakaran sangat rendah karena kelembaban udara tinggi dan suhu relatif sejuk.',
  estimasiPenyebaran: 'Laju rambatan api sangat lambat sekitar 2.87 cm/jam dengan kecepatan angin rendah.',
  rekomendasi: 'Lakukan pemantauan rutin berkala pada area rawan. Tidak diperlukan tindakan darurat saat ini.',
}

export const mockHotspots = [
  { lat: -2.5,  lng: 113.9,  intensity: 0.8 },
  { lat: -2.52, lng: 113.92, intensity: 0.6 },
  { lat: -2.48, lng: 113.88, intensity: 0.4 },
  { lat: -2.55, lng: 113.95, intensity: 0.9 },
  { lat: -2.45, lng: 113.85, intensity: 0.3 },
]

export const mockWindHistory = [
  { time: '00:00', speed: 0.8 },
  { time: '04:00', speed: 0.9 },
  { time: '08:00', speed: 1.8 },
  { time: '12:00', speed: 2.1 },
  { time: '16:00', speed: 1.2 },
  { time: '20:00', speed: 0.9 },
  { time: '22:00', speed: 1.2 },
]
