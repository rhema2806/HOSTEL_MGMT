import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../services/api';

/** Fetches a single resource. Pass url = null to skip. Returns { data, loading, error, reload, extra }. */
export default function useFetch(url, params, deps = []) {
  const [state, setState] = useState({ data: null, extra: null, loading: !!url, error: null });
  const seq = useRef(0);
  const key = JSON.stringify(params || {});

  const load = useCallback(async () => {
    if (!url) { setState({ data: null, extra: null, loading: false, error: null }); return; }
    const id = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const { data, ...extra } = await api.get(url, { params });
      if (id === seq.current) setState({ data, extra, loading: false, error: null });
    } catch (err) {
      if (id === seq.current) setState({ data: null, extra: null, loading: false, error: err.message });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, key, ...deps]);

  useEffect(() => { load(); }, [load]);
  return { ...state, reload: load };
}
