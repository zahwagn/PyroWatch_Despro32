// FIRMS NASA API — hotspot VIIRS realtime
// Daftar API key gratis: https://firms.modaps.eosdis.nasa.gov/api/area/

const FIRMS_API_KEY = import.meta.env.VITE_FIRMS_API_KEY || 'YOUR_FIRMS_API_KEY'

// Bounding box seluruh Indonesia
const INDONESIA_BBOX = '94.0,-11.5,141.5,6.5' // west,south,east,north

// day_range: 1 = 24 jam terakhir
const FIRMS_URL = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${FIRMS_API_KEY}/VIIRS_SNPP_NRT/${INDONESIA_BBOX}/1`

/**
 * Parse CSV response dari FIRMS
 * Kolom yang relevan: latitude, longitude, bright_ti4 (brightness/intensitas)
 */
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim())
  const latIdx  = headers.indexOf('latitude')
  const lngIdx  = headers.indexOf('longitude')
  const frpIdx  = headers.indexOf('frp') // fire radiative power (MW) — intensitas

  if (latIdx === -1 || lngIdx === -1) return []

  return lines.slice(1).map(line => {
    const cols = line.split(',')
    const lat  = parseFloat(cols[latIdx])
    const lng  = parseFloat(cols[lngIdx])
    const frp  = frpIdx !== -1 ? parseFloat(cols[frpIdx]) : 10

    if (isNaN(lat) || isNaN(lng)) return null

    // Temporary scaling for testing: keep low-FRP hotspots visible.
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
