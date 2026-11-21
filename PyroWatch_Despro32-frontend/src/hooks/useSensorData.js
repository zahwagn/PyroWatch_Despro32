import {
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';

import { fetchSensorData, fetchNodeList } from '../lib/api.js';

// nodeId = null -> snapshot terbaru dari node mana pun (/api/sensor/latest).
export function useSensorData(pollInterval = 15000, nodeId = null) {
  const [sensor, setSensor] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const requestInProgress = useRef(false);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    if (requestInProgress.current) return;

    requestInProgress.current = true;
    setLoading(true);

    try {
      const [sensorData, nodeList] = await Promise.all([
        fetchSensorData(nodeId),
        fetchNodeList(),
      ]);

      if (!mounted.current) return;

      setSensor(sensorData);
      setNodes(nodeList);
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
  }, [nodeId]);

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
    nodes,
    loading,
    error,
    lastUpdated,
    refresh,
  };
}
