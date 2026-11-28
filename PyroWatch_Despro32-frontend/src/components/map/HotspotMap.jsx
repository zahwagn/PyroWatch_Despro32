import { useEffect, useRef, useState } from 'react'
import { Map as MapIcon } from 'lucide-react'
import IconBadge from '../ui/IconBadge.jsx'
import { fetchFIRMSHotspots } from '../../lib/firms.js'
import { mockHotspots } from '../../lib/mockData.js'

const USE_MOCK = !import.meta.env.VITE_FIRMS_API_KEY
const REFRESH_INTERVAL_MINUTES = 3
const HIGH_INTENSITY = 0.7
const OVERVIEW_CELL_SIZE = 32

function getOverviewHotspots(hotspots, map, zoomLevel) {
  const strongestByCell = new Map()
  for (const hotspot of hotspots) {
    if (!(hotspot.intensity >= HIGH_INTENSITY)) continue

    const { x, y } = map.project([hotspot.lat, hotspot.lng], zoomLevel)
    const cell = [Math.floor(x / OVERVIEW_CELL_SIZE), Math.floor(y / OVERVIEW_CELL_SIZE)].join(',')
    const strongest = strongestByCell.get(cell)
    if (!strongest || hotspot.intensity > strongest.intensity) {
      strongestByCell.set(cell, hotspot)
    }
  }
  return [...strongestByCell.values()]
}

export default function HotspotMap({ height = 'h-80' }) {
  const mapRef      = useRef(null)
  const instanceRef = useRef(null)
  const heatRef     = useRef(null)
  const detailRef   = useRef(null)

  const [hotspotCount, setHotspotCount] = useState(0)
  const [hotspots, setHotspots]         = useState([])
  const [zoomLevel, setZoomLevel]       = useState(4)
  const [tick, setTick]                 = useState(0)
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)
  const [lastFetch, setLastFetch]       = useState(null)

  useEffect(() => {
    if (!mapRef.current || instanceRef.current) return
    const L = window.L
    if (!L) return

    const map = L.map(mapRef.current, {
      center: [-2.5, 118.0],
      zoom: 4,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map)

    map.on('zoomend', () => setZoomLevel(map.getZoom()))
    instanceRef.current = map

    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(mapRef.current)

    return () => {
      observer.disconnect()
      map.remove()
      instanceRef.current = null
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(() => setTick((value) => value + 1), REFRESH_INTERVAL_MINUTES * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    async function loadHotspots() {
      if (!instanceRef.current) return

      setLoading(true)
      setError(null)

      try {
        const hotspots = USE_MOCK
          ? mockHotspots
          : await fetchFIRMSHotspots()

        setHotspotCount(hotspots.length)
        setLastFetch(new Date())

        const waitForHeat = () => new Promise((resolve) => {
          const check = () => window.L?.heatLayer ? resolve() : setTimeout(check, 100)
          check()
        })
        await waitForHeat()
        setHotspots(hotspots)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadHotspots()
  }, [tick])

  useEffect(() => {
    const map = instanceRef.current
    const L = window.L
    if (!map || !L) return

    if (heatRef.current) map.removeLayer(heatRef.current)
    if (detailRef.current) map.removeLayer(detailRef.current)
    heatRef.current = null
    detailRef.current = null
    if (!hotspots.length) return

    const zoomedOut = zoomLevel <= 5
    const heat = L.heatLayer(
      hotspots.map(({ lat, lng, intensity }) => [lat, lng, intensity]),
      {
        radius: zoomedOut ? 8 : zoomLevel < 9 ? 10 : 7,
        blur: zoomedOut ? 3 : zoomLevel < 9 ? 4 : 3,
        max: 1.0,
        // Soften overlapping heat at the overview scale.
        maxZoom: Math.max(zoomLevel, 8),
        gradient: {
          0.0: '#52b788',
          0.4: '#f4a261',
          [HIGH_INTENSITY]: '#e63946',
        },
      },
    ).addTo(map)
    heatRef.current = heat

    if (zoomedOut || zoomLevel >= 8) {
      const markerHotspots = zoomedOut ? getOverviewHotspots(hotspots, map, zoomLevel) : hotspots
      const details = L.layerGroup(markerHotspots.map(({ lat, lng, intensity }) => {
        const isHigh = intensity >= HIGH_INTENSITY
        const color = isHigh ? '#e63946' : intensity >= 0.4 ? '#f4a261' : '#52b788'
        return L.circleMarker([lat, lng], {
          radius: zoomedOut ? 3 : isHigh ? 7 : 5,
          color: '#ffffff',
          weight: zoomedOut ? 1 : 1.5,
          fillColor: color,
          fillOpacity: 0.95,
        }).bindPopup(`Intensitas hotspot: ${(intensity * 100).toFixed(0)}%`)
      })).addTo(map)
      detailRef.current = details
    }
  }, [hotspots, zoomLevel])

  const timeStr = lastFetch
    ? lastFetch.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    : '—'

  return (
    <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">
      <div className="px-6 pt-6 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <IconBadge icon={MapIcon} tone="green" />
          <p className="text-lg font-semibold text-gray-900">Hotspot Aktif — Indonesia</p>
          {!loading && !error && (
            <span className="text-sm bg-forest-100 text-forest-700 px-3 py-1 rounded-full font-semibold">
              {hotspotCount} titik
            </span>
          )}
          {loading && (
            <span className="text-sm bg-gray-100 text-gray-500 px-3 py-1 rounded-full animate-pulse">
              Memuat...
            </span>
          )}
          {error && (
            <span title={error} className="text-sm bg-red-50 text-red-500 px-3 py-1 rounded-full">
              Gagal memuat
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-forest-400 inline-block" /> Rendah
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" /> Sedang
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Tinggi
            </span>
          </div>
          <span className="text-sm text-gray-500">
            {USE_MOCK ? 'Mock data' : `FIRMS VIIRS · ${timeStr}`}
          </span>
        </div>
      </div>

      <div ref={mapRef} className={`w-full ${height}`} />

      {!USE_MOCK && (
        <div className="px-6 py-3 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            Sumber: NASA FIRMS VIIRS NOAA-21 Near Real-Time · Dicek otomatis tiap {REFRESH_INTERVAL_MINUTES} menit
          </p>
        </div>
      )}
    </div>
  )
}