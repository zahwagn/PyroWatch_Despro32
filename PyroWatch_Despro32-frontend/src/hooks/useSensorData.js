import {
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';

import { fetchSensorData } from '../lib/api.js';

export function useSensorData(pollInterval = 15000) {
  const [sensor, setSensor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const requestInProgress = useRef(false);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    if (requestInProgress.current) return;

    requestInProgress.current = true;

    try {
      const sensorData = await fetchSensorData();

      if (!mounted.current) return;

      setSensor(sensorData);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      if (!mounted.current) return;

      setError(
        err instanceof Error
          ? err.message
          : 'Terjadi kesalahan saat mengambil data sensor.'
      );

      // Snapshot terakhir tidak dihapus ketika polling gagal.
    } finally {
      requestInProgress.current = false;

      if (mounted.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;

    refresh();

    const intervalId = window.setInterval(
      refresh,
      pollInterval
    );

    return () => {
      mounted.current = false;
      window.clearInterval(intervalId);
    };
  }, [refresh, pollInterval]);

  return {
    sensor,
    loading,
    error,
    lastUpdated,
    refresh,
  };
}