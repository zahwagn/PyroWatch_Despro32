// ============================================================
// PYROWATCH FRONTEND API
// Source: Node-RED /api/sensor/latest
// Semua hasil ML dikirim bersama snapshot sensor.
// Tidak ada endpoint LLM /api/ai/latest.
// ============================================================

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

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

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function toRange(value) {
  if (!value || typeof value !== 'object') return null;
  return {
    expected: toNumber(value.expected),
    low: toNumber(value.low),
    high: toNumber(value.high),
  };
}

// ============================================================
// MAPPING SNAPSHOT NODE-RED -> MODEL FRONTEND
// ============================================================

export function mapSensorSnapshot(d) {
  if (!d || typeof d !== 'object' || Array.isArray(d)) {
    throw new Error('Format data sensor tidak sesuai.');
  }

  // Catatan sumber data:
  // 1. Kecepatan angin: anemometer ESP32. Arah angin: Open-Meteo (arah DATANG angin).
  // 2. FRI utama = FRI aktual dari sensor (rumus WSM di Node-RED).
  // 3. ML tidak menghitung FRI kedua. ML menjelaskan PENYEBAB FRI (skenario),
  //    PELUANG ESKALASI 30 menit, proyeksi komponen, dan rencana aksi.
  const rec = d.ml_recommendations ?? null;
  const spread = d.ml_spread ?? {};
  const drivers = d.ml_drivers ?? null;

  return {
    nodeId: d.node_id ?? null,
    timestamp: d.timestamp ?? null,
    simulation: d.simulation === true,
    simulationScenario: d.simulation_scenario ?? null,

    temperature: toNumber(d.temp),
    humidity: toNumber(d.hum),
    co: d.gas_calibrated === true ? toNumber(d.co) : null,
    ch4: d.gas_calibrated === true ? toNumber(d.ch4) : null,
    gasCalibrated: d.gas_calibrated === true,
    gasCalibrationValidated: d.gas_calibration_validated === true,
    gasCalibrationStatus: d.gas_calibration_status ?? 'NOT_CALIBRATED',

    soilMoisture: toNumber(d.soil_moisture),
    soilCondition: d.soil_condition ?? 'Tidak diketahui',

    fireRiskIndex: toNumber(d.fri),
    riskLevel: d.fri_level ?? 'UNKNOWN',
    friDataStatus: d.fri_data_status ?? 'UNKNOWN',

    windSpeed: toNumber(d.wind_speed_sensor ?? d.wind_speed),
    windDirection: toNumber(d.wind_direction_deg),
    windDirectionLabel: d.wind_direction ?? 'UNKNOWN',
    weatherSource: d.weather_source ?? 'Open-Meteo',
    weatherStatus: d.weather_status ?? 'UNKNOWN',

    // Baseline semi-empiris Node-RED (bukan ground truth).
    fireSpread: toNumber(d.spread_rate_cmph),
    spreadLabelType: d.spread_label_type ?? 'SEMI_EMPIRICAL_ESTIMATE_NOT_GROUND_TRUTH',
    spreadModelStatus: d.spread_model_status ?? 'UNKNOWN',

    // --------------------------------------------------------
    // MACHINE LEARNING v4 (skenario + eskalasi 30 menit)
    // --------------------------------------------------------
    mlForecast: {
      status: d.ml_forecast_status ?? 'UNAVAILABLE',
      horizonMinutes: toNumber(d.ml_forecast_horizon_minutes) ?? 30,
      forecastTimestamp: d.ml_forecast_timestamp ?? null,
      cachedFromSample: d.ml_cached_from_sample ?? null,
      historyPoints: toNumber(d.ml_history_points_used),
      dataQuality: toArray(d.ml_data_quality),
      modelVersion: d.ml_model_version ?? null,
      inputStatus: d.ml_input_status ?? 'UNKNOWN',
      insightText: d.ml_insight_text ?? null,

      scenario: d.ml_scenario ?? null,
      scenarioLabel: d.ml_scenario_label ?? null,
      scenarioConfidence: toNumber(d.ml_scenario_confidence),
      scenarioProbabilities: d.ml_scenario_probabilities ?? {},
      drivers: drivers
        ? {
            contributions: drivers.contributions ?? {},
            share: drivers.contribution_share ?? {},
            dominant: drivers.dominant_driver ?? null,
            gasSource: drivers.gas_source ?? null,
            notes: toArray(drivers.notes),
            residual: toNumber(drivers.fri_residual_vs_wsm),
          }
        : null,

      trend: d.ml_trend ?? 'UNKNOWN',
      friChange: toNumber(d.ml_fri_change),
      friChange15: toRange(d.ml_fri_change_15m),
      friChange30: toRange(d.ml_fri_change_30m),
      pHigh30: toNumber(d.ml_p_high_30m),
      pExtreme30: toNumber(d.ml_p_extreme_30m),
      etaHighMin: toNumber(d.ml_eta_high_min),
      etaExtremeMin: toNumber(d.ml_eta_extreme_min),
      currentFri: toNumber(d.ml_current_fri ?? d.fri),
      currentFriLevel: d.ml_current_fri_level ?? d.fri_level ?? 'UNKNOWN',

      projection15: d.ml_component_projection_15m ?? {},
      trendPerMin: d.ml_component_trend_per_min ?? {},
      futureWindSpeed: toNumber(d.ml_future_wind_speed),
      futureSpreadRate: toNumber(d.ml_future_spread_rate_cmph),

      spread: {
        mode: spread.mode ?? d.ml_spread_mode ?? null,
        rateCmph: toNumber(spread.rate_cmph),
        rateMPerMin: toNumber(spread.rate_m_per_min),
        distanceM: spread.distance_m ?? null,
        inspectionRadiusM: toNumber(spread.inspection_radius_m ?? d.ml_inspection_radius_m),
        sourceSector: spread.source_search_sector ?? d.ml_source_search_sector ?? null,
        threatSector: spread.threat_sector ?? d.ml_threat_sector ?? null,
        windFromDeg: toNumber(spread.wind_from_deg),
        downwindDeg: toNumber(spread.downwind_deg),
        directionConfidence: spread.direction_confidence ?? null,
        surfaceTransitionProbability: toNumber(spread.surface_transition_probability),
      },

      priority: d.ml_priority ?? rec?.priority ?? null,
      actionPlan: toArray(d.ml_action_plan ?? rec?.action_plan),
      ppe: d.ml_ppe ?? rec?.ppe ?? null,
      samplingInterval: d.ml_sampling_interval ?? rec?.sampling_interval ?? null,
      highlights: toArray(d.ml_highlights),
      // Field teks lama tetap tersedia: priority, trigger_summary, monitoring,
      // early_response, area_protection, coordination, operational_caveat.
      recommendations: rec,
    },

    raw: d,
  };
}

// ============================================================
// FETCH SENSOR + ML
// nodeId opsional: bila diisi, ambil snapshot node itu dari /api/sensor/nodes.
// ============================================================

export async function fetchSensorData(nodeId = null) {
  if (USE_MOCK) {
    const { mockSensorData } = await import('./mockData.js');
    return mapSensorSnapshot(mockSensorData);
  }

  if (nodeId) {
    const nodes = await requestJson('/api/sensor/nodes');
    const match = toArray(nodes).find((item) => item?.node_id === nodeId);
    if (match) return mapSensorSnapshot(match);
  }

  return mapSensorSnapshot(await requestJson('/api/sensor/latest'));
}

// Daftar node yang pernah mengirim data (endpoint baru di flow Node-RED).
// Mengembalikan [] bila endpoint belum tersedia agar dashboard tetap jalan.
export async function fetchNodeList() {
  if (USE_MOCK) {
    const { mockSensorData } = await import('./mockData.js');
    return [{ nodeId: mockSensorData.node_id, timestamp: mockSensorData.timestamp,
      riskLevel: mockSensorData.fri_level, priority: mockSensorData.ml_priority }];
  }
  try {
    const nodes = await requestJson('/api/sensor/nodes');
    return toArray(nodes)
      .filter((item) => item?.node_id)
      .map((item) => ({
        nodeId: item.node_id,
        timestamp: item.timestamp ?? null,
        riskLevel: item.fri_level ?? 'UNKNOWN',
        priority: item.ml_priority ?? null,
        simulation: item.simulation === true,
      }))
      .sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
  } catch {
    return [];
  }
}
