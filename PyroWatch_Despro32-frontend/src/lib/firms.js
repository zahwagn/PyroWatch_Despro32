// FIRMS NASA API — hotspot VIIRS realtime
// Daftar API key gratis: https://firms.modaps.eosdis.nasa.gov/api/area/

const FIRMS_API_KEY = import.meta.env.VITE_FIRMS_API_KEY || 'YOUR_FIRMS_API_KEY'
const SOURCE        = 'VIIRS_NOAA21_NRT'
// FIRMS area coordinates are west,south,east,north.
const AREA          = '94,-12,142,7'
const DAY_RANGE     = 5

const FIRMS_URL = `/firms/api/area/csv/${FIRMS_API_KEY}/${SOURCE}/${AREA}/${DAY_RANGE}`

function parseCSV(csvText) {
  const lines = csvText.trim().split('\n')

  const headers = lines[0].split(',').map(h => h.trim())
  const latIdx  = headers.indexOf('latitude')
  const lngIdx  = headers.indexOf('longitude')
  const frpIdx  = headers.indexOf('frp')

  if (latIdx === -1 || lngIdx === -1) throw new Error('Format respons hotspot FIRMS tidak valid')

  return lines.slice(1).map(line => {
    const cols = line.split(',')
    const lat  = parseFloat(cols[latIdx])
    const lng  = parseFloat(cols[lngIdx])
    const frp  = frpIdx !== -1 ? parseFloat(cols[frpIdx]) : 10

    if (isNaN(lat) || isNaN(lng)) return null

    const intensity = Math.max(Math.min(frp / 20, 1), 0.3)
    return { lat, lng, intensity }
  }).filter(Boolean)
}

export async function fetchFIRMSHotspots() {
  const res = await fetch(FIRMS_URL)
  if (!res.ok) throw new Error(`FIRMS API error: ${res.status}`)
  const csv = await res.text()
  return parseCSV(csv)
}