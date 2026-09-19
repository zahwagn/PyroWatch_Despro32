import { useEffect, useRef, useState } from 'react'
import { Map } from 'lucide-react'
import { fetchFIRMSHotspots } from '../../lib/firms.js'
import { mockHotspots } from '../../lib/mockData.js'

const USE_MOCK = !import.meta.env.VITE_FIRMS_API_KEY

export default function HotspotMap() {
  const mapRef      = useRef(null)
  const instanceRef = useRef(null)
  const heatRef     = useRef(null)

  const [hotspotCount, setHotspotCount] = useState(0)
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

    instanceRef.current = map

    return () => {
      map.remove()
      instanceRef.current = null
    }
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

        if (heatRef.current) {
          instanceRef.current.removeLayer(heatRef.current)
        }

        const waitForHeat = () => new Promise((resolve) => {
          const check = () => window.L?.heatLayer ? resolve() : setTimeout(check, 100)
          check()
        })
        await waitForHeat()

        if (hotspots.length > 0) {
          const heatData = hotspots.map(({ lat, lng, intensity }) => [lat, lng, intensity])
          const heat = window.L.heatLayer(heatData, {
            radius: 25,
            blur: 20,
            max: 0.8,
            maxZoom: 14,
            gradient: {
              0.0: '#52b788',
              0.4: '#f4a261',
              0.8: '#e63946',
            },
          })
          heat.addTo(instanceRef.current)
          heatRef.current = heat
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    const timer = setTimeout(loadHotspots, 300)
    const interval = setInterval(loadHotspots, 10 * 60 * 1000)

    return () => {
      clearTimeout(timer)
      clearInterval(interval)
    }
  }, [])

  const timeStr = lastFetch
    ? lastFetch.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    : '—'

  return (
    <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-forest-50">
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Map size={16} strokeWidth={1.75} className="text-forest-400" />
          <p className="text-sm font-semibold text-forest-700">Hotspot Aktif — Indonesia</p>
          {!loading && !error && (
            <span className="text-xs bg-forest-100 text-forest-600 px-2 py-0.5 rounded-full font-medium">
              {hotspotCount} titik
            </span>
          )}
          {loading && (
            <span className="text-xs bg-forest-50 text-forest-400 px-2 py-0.5 rounded-full animate-pulse">
              Memuat...
            </span>
          )}
          {error && (
            <span className="text-xs bg-red-50 text-red-400 px-2 py-0.5 rounded-full">
              Gagal memuat
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-forest-400">
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
          <span className="text-xs text-forest-300">
            {USE_MOCK ? 'Mock data' : `FIRMS VIIRS · ${timeStr}`}
          </span>
        </div>
      </div>

      <div ref={mapRef} className="w-full h-80" />

      {!USE_MOCK && (
        <div className="px-5 py-2 border-t border-forest-50">
          <p className="text-xs text-forest-300">
            Sumber: NASA FIRMS VIIRS SNPP Near Real-Time · Diperbarui otomatis tiap 10 menit
          </p>
        </div>
      )}
    </div>
  )
}
