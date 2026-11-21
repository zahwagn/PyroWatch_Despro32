// ============================================================
// PYROWATCH FRONTEND API
// Source: Node-RED /api/sensor/latest
// Semua hasil ML dikirim bersama snapshot sensor.
// Tidak ada endpoint LLM /api/ai/latest.
// ============================================================

const USE_MOCK = false;

function toNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

async function requestJson(url) {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  let body;

  try {
    body = await response.json();
  } catch {
    throw new Error('Respons server bukan JSON yang valid.');
  }

  if (!response.ok) {
    throw new Error(
      body?.message || `Gagal mengambil data (HTTP ${response.status})`
    );
  }

  if (body?.success === false) {
    throw new Error(body.message || 'Data PyroWatch belum tersedia.');
  }

  return body?.data ?? body;
}

// ============================================================
// FETCH SENSOR + ML FORECAST
// ============================================================

export async function fetchSensorData() {
  if (USE_MOCK) {
    const { mockSensorData } = await import('./mockData.js');
    return mockSensorData;
  }

  const d = await requestJson('/api/sensor/latest');

  if (!d || typeof d !== 'object' || Array.isArray(d)) {
    throw new Error('Format data sensor tidak sesuai.');
  }

  // Catatan sumber data:
  // 1. Wind speed: ESP32 anemometer.
  // 2. Wind direction: Open-Meteo.
  // 3. Arah angin bukan arah rambat api.
  // 4. FRI utama adalah FRI aktual dari sensor.
  // 5. ML memprediksi perubahan FRI, bukan skor FRI kedua.

  return {
    // --------------------------------------------------------
    // IDENTITAS DAN WAKTU
    // --------------------------------------------------------

    nodeId: d.node_id ?? null,
    timestamp: d.timestamp ?? null,

    // --------------------------------------------------------
    // DATA SENSOR
    // --------------------------------------------------------

    temperature: toNumber(d.temp),
    humidity: toNumber(d.hum),

    // Data gas hanya ditampilkan jika status kalibrasi aktif.
    co: d.gas_calibrated === true ? toNumber(d.co) : null,
    ch4: d.gas_calibrated === true ? toNumber(d.ch4) : null,

    gasCalibrated: d.gas_calibrated === true,
    gasCalibrationValidated:
      d.gas_calibration_validated === true,
    gasCalibrationStatus:
      d.gas_calibration_status ?? 'NOT_CALIBRATED',

    // --------------------------------------------------------
    // KONDISI TANAH
    // --------------------------------------------------------

    soilMoisture: toNumber(d.soil_moisture),
    soilCondition: d.soil_condition ?? 'Tidak diketahui',

    // --------------------------------------------------------
    // FIRE RISK INDEX AKTUAL
    // --------------------------------------------------------

    fireRiskIndex: toNumber(d.fri),
    riskLevel: d.fri_level ?? 'UNKNOWN',
    friDataStatus: d.fri_data_status ?? 'UNKNOWN',

    // --------------------------------------------------------
    // ANGIN
    // Kecepatan dari ESP32, arah dari Open-Meteo
    // --------------------------------------------------------

    windSpeed: toNumber(
      d.wind_speed_sensor ?? d.wind_speed
    ),

    windDirection: toNumber(d.wind_direction_deg),
    windDirectionLabel: d.wind_direction ?? 'UNKNOWN',

    weatherSource: d.weather_source ?? 'Open-Meteo',
    weatherStatus: d.weather_status ?? 'UNKNOWN',

    // --------------------------------------------------------
    // ESTIMASI LAJU RAMBAT BASELINE
    // Bukan ground truth dan bukan hasil prediksi ML.
    // --------------------------------------------------------

    fireSpread: toNumber(d.spread_rate_cmph),

    spreadLabelType:
      d.spread_label_type ??
      'SEMI_EMPIRICAL_ESTIMATE_NOT_GROUND_TRUTH',

    spreadModelStatus:
      d.spread_model_status ?? 'UNKNOWN',

    // --------------------------------------------------------
    // MACHINE LEARNING FORECAST 15 MENIT
    // --------------------------------------------------------

    mlForecast: {
      status: d.ml_forecast_status ?? 'UNAVAILABLE',

      horizonMinutes:
        toNumber(d.ml_forecast_horizon_minutes) ?? 15,

      forecastTimestamp:
        d.ml_forecast_timestamp ?? null,

      insightText:
        d.ml_insight_text ?? null,

      trend:
        d.ml_trend ?? 'UNKNOWN',

      friChange:
        toNumber(d.ml_fri_change),

      currentFri:
        toNumber(d.ml_current_fri ?? d.fri),

      currentFriLevel:
        d.ml_current_fri_level ??
        d.fri_level ??
        'UNKNOWN',

      futureWindSpeed:
        toNumber(d.ml_future_wind_speed),

      futureSpreadRate:
        toNumber(d.ml_future_spread_rate_cmph),

      highlights:
        Array.isArray(d.ml_highlights)
          ? d.ml_highlights
          : [],

      // Mempertahankan nama field rekomendasi dari backend:
      // priority, trigger_summary, monitoring, early_response,
      // area_protection, coordination, operational_caveat.
      recommendations:
        d.ml_recommendations ?? null,

      modelVersion:
        d.ml_model_version ?? null,

      inputStatus:
        d.ml_input_status ?? 'UNKNOWN',
    },

    // Payload asli untuk debugging.
    raw: d,
  };
}