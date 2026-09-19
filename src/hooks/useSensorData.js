import { useState, useEffect, useCallback } from 'react'
import { fetchSensorData, fetchAIAnalysis } from '../lib/api.js'

export function useSensorData(pollInterval = 5000) {
  const [sensor, setSensor] = useState(null)
  const [ai, setAi] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const refresh = useCallback(async () => {
    try {
      const sensorData = await fetchSensorData()
      const aiData = await fetchAIAnalysis(sensorData)
      setSensor(sensorData)
      setAi(aiData)
      setLastUpdated(new Date())
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, pollInterval)
    return () => clearInterval(id)
  }, [refresh, pollInterval])

  return { sensor, ai, loading, error, lastUpdated, refresh }
}
