# PyroWatch Dashboard

Frontend dashboard untuk sistem monitoring kebakaran lahan gambut PyroWatch.

## Stack
- React 18 + Vite
- Tailwind CSS
- Recharts (grafik angin)
- Leaflet + leaflet.heat (heatmap hotspot)
- Polling ke Node-RED REST API setiap 5 detik

## Setup

```bash
cd dashboard
npm install
npm run dev
```

## Struktur

```
src/
├── components/
│   ├── cards/
│   │   ├── FireRiskCard.jsx     # FRI index + progress bar
│   │   ├── SensorCard.jsx       # Generic sensor card
│   │   ├── WindCard.jsx         # Compass + area chart
│   │   └── FireSpreadCard.jsx   # Laju rambat api
│   ├── map/
│   │   └── HotspotMap.jsx       # Leaflet heatmap
│   ├── ai/
│   │   └── AIAnalysis.jsx       # LLM output panel
│   └── layout/
│       ├── Sidebar.jsx
│       └── Header.jsx
├── hooks/
│   └── useSensorData.js         # Polling + state management
├── lib/
│   ├── api.js                   # Fetch layer (swap mock → real)
│   └── mockData.js              # Data dummy selama dev
└── App.jsx
```

## Integrasi Node-RED

Edit `src/lib/api.js`:
1. Set `USE_MOCK = false`
2. Pastikan Node-RED expose endpoint:
   - `GET /sensor/latest` → return JSON sensor data
   - `POST /ai/analysis` → return AI analysis JSON

Format sensor JSON yang diharapkan:
```json
{
  "fireRiskIndex": 0.09,
  "temperature": 27.0,
  "humidity": 78.0,
  "windSpeed": 1.2,
  "windDirection": 142,
  "co": 5.0,
  "ch4": 50.0,
  "fireSpread": 2.87,
  "riskLevel": "Low"
}
```

Format AI analysis JSON:
```json
{
  "riskLevel": "Low",
  "analisisRisiko": "...",
  "estimasiPenyebaran": "...",
  "rekomendasi": "..."
}
```

## Integrasi Mandum-Rimba (Heatmap)

Edit `src/components/map/HotspotMap.jsx` dan `src/lib/mockData.js`:
- Swap `mockHotspots` dengan data dari mandum-rimba API
- Format: `[{ lat, lng, intensity }]`

## Integrasi ML v4 (skenario + eskalasi)

Dashboard membaca `GET /api/sensor/latest` dan `GET /api/sensor/nodes` dari Node-RED (flow `node-red/flows/pyrowatch_flows.json` di branch `master`).

Kartu **Analisis & Prediksi ML** (`src/components/cards/MLPredictionCard.jsx` + `src/components/ml/`) menampilkan:
- **Skenario terdeteksi** dan komposisi FRI (porsi gas/suhu/kelembapan): menjelaskan *mengapa* FRI bernilai sekian. FRI yang sama bisa berarti pengeringan bahan bakar, smoldering awal, anomali sensor, atau kebakaran yang mereda.
- **Prediksi eskalasi 30 menit**: peluang FRI mencapai High dan Extreme, perkiraan waktu tercapainya, serta perubahan FRI 15/30 menit beserta rentang 80%. Dashboard tidak menampilkan skor FRI kedua.
- **Rencana aksi petugas** per fase (Segera 0–15 menit, Lanjutan 15–60 menit, Pasca), lengkap dengan alasan tiap tindakan.
- **Panduan lapangan**: sektor pencarian sumber (hulu angin), sektor ancaman (hilir angin), radius pemeriksaan, estimasi rambat, APD, dan interval sampling.
- **Proyeksi komponen sensor 15 menit** dan catatan kualitas data.

Kartu angin menampilkan kompas dengan sektor hulu dan hilir angin. Kartu laju rambat membandingkan baseline Node-RED dengan estimasi sesuai skenario ML. Bila ada lebih dari satu node, pemilih node muncul di bawah header.

Mode tanpa backend (data contoh hasil pipeline asli):

```bash
VITE_USE_MOCK=true npm run dev
```
