const USE_MOCK = false;

export async function fetchSensorData() {

  if (USE_MOCK) {
    const { mockSensorData } = await import('./mockData.js')
    return mockSensorData
  }

  const res = await fetch('/api/sensor/latest', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!res.ok) {
    throw new Error(
      `Gagal mengambil data sensor (HTTP ${res.status})`
    )
  }

  const result = await res.json()

  if (!result.success || !result.data) {
    throw new Error(
      result.message || 'Data sensor tidak tersedia'
    )
  }

  const d = result.data

  // ----------------------------------------------------------
  // NORMALISASI
  // ----------------------------------------------------------
  // Node-RED menggunakan snake_case.
  // React component lama menggunakan camelCase.
  //
  // Kita normalisasi di sini supaya component React
  // tidak perlu mengetahui struktur backend.
  // ----------------------------------------------------------

  return {
    // Sensor
    nodeId: d.node_id,
    timestamp: d.timestamp,

    temperature: Number(d.temp ?? 0),
    humidity: Number(d.hum ?? 0),
    co: Number(d.co ?? 0),
    ch4: Number(d.ch4 ?? 0),

    // FRI
    fireRiskIndex: Number(d.fri ?? 0),
    riskLevel: d.fri_level ?? 'Unknown',

    // Wind
    windSpeed: Number(d.wind_speed ?? 0),
    windDirection: Number(d.wind_direction_deg ?? 0),
    windDirectionLabel: d.wind_direction ?? 'UNKNOWN',

    // Fire spread
    fireSpread: Number(d.spread_rate_cmph ?? 0),
    spreadRateBase: Number(d.spread_rate_base_cmph ?? 0),
    windEffectFactor: Number(d.wind_effect_factor ?? 0),
    spreadModel: d.spread_model ?? null,
    spreadDirectionSource:
      d.spread_direction_source ?? null,

    // Weather
    weatherSource: d.weather_source ?? null,
    weatherStatus: d.weather_status ?? null,

    // ML
    mlPrediction: d.ml_prediction ?? null,
    mlLabelIdx: d.ml_label_idx ?? null,
    mlConfidence: Number(d.ml_confidence ?? 0),
    mlProba: d.ml_proba ?? {},

    // Keep original Node-RED payload if needed
    raw: d,
  }
}


// ============================================================
// FETCH AI ANALYSIS
// ============================================================

export async function fetchAIAnalysis() {

  if (USE_MOCK) {
    const { mockAIAnalysis } = await import('./mockData.js')
    return mockAIAnalysis
  }

  const res = await fetch('/api/ai/latest', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  })

  // AI bisa belum tersedia apabila Gemini belum
  // menghasilkan insight.
  if (res.status === 404) {
    return null
  }

  if (!res.ok) {
    throw new Error(
      `Gagal mengambil analisis AI (HTTP ${res.status})`
    )
  }

  const result = await res.json()

  if (!result.success || !result.data) {
    return null
  }

  const d = result.data

  // ----------------------------------------------------------
  // NORMALISASI AI
  // ----------------------------------------------------------

  return {
    analisisRisiko:
      d.analisis_risiko ?? null,

    estimasiPenyebaran:
      d.estimasi_penyebaran ?? null,

    faktorPemicu:
      d.faktor_pemicu ?? null,

    rekomendasi:
      d.rekomendasi ?? null,

    tingkatKewaspadaan:
      d.tingkat_kewaspadaan ?? null,

    raw: d,
  }
}