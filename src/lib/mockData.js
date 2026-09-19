export const mockSensorData = {
  fireRiskIndex: 0.09,
  temperature: 27.0,
  humidity: 78.0,
  windSpeed: 1.2,
  windDirection: 142,
  co: 5.0,
  ch4: 50.0,
  fireSpread: 2.87,
  riskLevel: 'Low',
  timestamp: new Date().toISOString(),
}

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
