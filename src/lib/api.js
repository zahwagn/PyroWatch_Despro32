// Swap mock data for real Node-RED endpoints here
// Node-RED runs on localhost:1880 by default
// Vite proxies /api → http://localhost:1880

import { mockSensorData, mockAIAnalysis } from './mockData.js'

const USE_MOCK = true // flip to false when Node-RED is ready

export async function fetchSensorData() {
  if (USE_MOCK) return mockSensorData
  const res = await fetch('/api/sensor/latest')
  if (!res.ok) throw new Error('Failed to fetch sensor data')
  return res.json()
}

export async function fetchAIAnalysis(sensorData) {
  if (USE_MOCK) return mockAIAnalysis
  const res = await fetch('/api/ai/analysis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sensorData),
  })
  if (!res.ok) throw new Error('Failed to fetch AI analysis')
  return res.json()
}
