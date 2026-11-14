const USE_MOCK = false;


// ============================================================
// FETCH SENSOR DATA
// ============================================================

export async function fetchSensorData() {

  if (USE_MOCK) {

    const { mockSensorData } =
      await import('./mockData.js')

    return mockSensorData
  }


  const res = await fetch(
    '/api/sensor/latest',
    {
      method: 'GET',

      headers: {
        Accept: 'application/json',
      },
    }
  )


  if (!res.ok) {

    throw new Error(
      `Gagal mengambil data sensor (HTTP ${res.status})`
    )

  }


  const result = await res.json()


  if (!result.success || !result.data) {

    throw new Error(
      result.message ||
      'Data sensor tidak tersedia'
    )

  }


  const d = result.data


  // ==========================================================
  // SENSOR
  // ==========================================================

  return {

    nodeId:
      d.node_id ?? null,

    timestamp:
      d.timestamp ?? null,

    temperature:
      Number(d.temp ?? 0),

    humidity:
      Number(d.hum ?? 0),

    co:
      d.co == null ? null : Number(d.co),

    ch4:
      d.ch4 == null ? null : Number(d.ch4),


    // ========================================================
    // SOIL
    // ========================================================

    soilMoisture:
      d.soil_moisture == null
        ? null
        : Number(d.soil_moisture),

    soilCondition:
      d.soil_condition ??
      d.soil_status ??
      'Tidak diketahui',


    // ========================================================
    // FRI
    // ========================================================

    fireRiskIndex:
      d.fri == null
        ? null
        : Number(d.fri),

    riskLevel:
      d.fri_level ?? 'UNKNOWN',


    // ========================================================
    // WIND
    // Kecepatan = ESP32 anemometer
    // Arah = Open-Meteo
    // ========================================================

    windSpeed:
      d.wind_speed_sensor == null
        ? (
            d.wind_speed == null
              ? null
              : Number(d.wind_speed)
          )
        : Number(d.wind_speed_sensor),

    windDirection:
      d.wind_direction_deg == null
        ? null
        : Number(d.wind_direction_deg),

    windDirectionLabel:
      d.wind_direction ?? 'UNKNOWN',


    // ========================================================
    // FIRE SPREAD
    // ========================================================

    fireSpread:
      d.spread_rate_cmph == null
        ? null
        : Number(d.spread_rate_cmph),

    spreadRateBase:
      d.spread_rate_base_cmph == null
        ? null
        : Number(d.spread_rate_base_cmph),

    windEffectFactor:
      d.wind_effect_factor == null
        ? null
        : Number(d.wind_effect_factor),

    spreadModel:
      d.spread_model ?? null,

    spreadDirectionSource:
      d.spread_direction_source ?? null,


    // ========================================================
    // WEATHER
    // ========================================================

    weatherSource:
      d.weather_source ?? null,

    weatherStatus:
      d.weather_status ?? null,


    // ========================================================
    // ML FORECAST 15 MINUTES
    // ========================================================

    mlForecast: {

      status:
        d.ml_forecast_status ??
        'UNAVAILABLE',

      horizonMinutes:
        Number(
          d.ml_forecast_horizon_minutes ?? 15
        ),

      forecastTimestamp:
        d.ml_forecast_timestamp ?? null,

      insightText:
        d.ml_insight_text ?? null,

      riskLevel:
        d.ml_risk_level ?? 'UNKNOWN',

      trend:
        d.ml_trend ?? 'UNKNOWN',


      // Highlight prediksi
      highlights:
        Array.isArray(d.ml_highlights)
          ? d.ml_highlights
          : [],


      // Empat rekomendasi
      recommendations:
        d.ml_recommendations ?? {},


      // Informasi model
      modelVersion:
        d.ml_model_version ?? null,

      inputStatus:
        d.ml_input_status ?? 'UNKNOWN',

    },


    // ========================================================
    // ORIGINAL NODE-RED PAYLOAD
    // ========================================================

    raw: d,

  }

}


// ============================================================
// FETCH AI ANALYSIS
// ============================================================

export async function fetchAIAnalysis() {

  if (USE_MOCK) {

    const { mockAIAnalysis } =
      await import('./mockData.js')

    return mockAIAnalysis

  }


  const res = await fetch(
    '/api/ai/latest',
    {
      method: 'GET',

      headers: {
        Accept: 'application/json',
      },
    }
  )


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