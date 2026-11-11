import { useEffect, useState } from 'react';
import { loadLiveData, type LiveData } from './api';

// Intenta cargar los datos del back end. status: 'loading' | 'online' | 'offline'.
export function useBackendData() {
  const [data, setData] = useState<LiveData | null>(null);
  const [status, setStatus] = useState<'loading' | 'online' | 'offline'>('loading');
  useEffect(() => {
    let cancelled = false;
    loadLiveData()
      .then((d) => { if (!cancelled) { setData(d); setStatus('online'); } })
      .catch(() => { if (!cancelled) setStatus('offline'); });
    return () => { cancelled = true; };
  }, []);
  return { data, status };
}
