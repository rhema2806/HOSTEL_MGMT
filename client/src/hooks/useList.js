import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../services/api';

/**
 * Server-side paginated list. `params` changes trigger a refetch; changing any filter resets to page 1.
 * Returns rows, pagination, loading, error and helpers to drive filters and paging.
 */
export default function useList(endpoint, initialParams = {}, { enabled = true } = {}) {
  const [params, setParams] = useState({ page: 1, limit: 10, ...initialParams });
  const [state, setState] = useState({ rows: [], pagination: { page: 1, limit: 10, total: 0, pages: 1 }, extra: {}, loading: true, error: null });
  const seq = useRef(0);

  const load = useCallback(async () => {
    if (!enabled) return;
    const id = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null));
      const body = await api.get(endpoint, { params: clean });
      if (id !== seq.current) return; // a newer request superseded this one
      const { data, pagination, ...extra } = body;
      setState({ rows: data, pagination: pagination || { page: 1, limit: data.length, total: data.length, pages: 1 }, extra, loading: false, error: null });
    } catch (err) {
      if (id === seq.current) setState((s) => ({ ...s, loading: false, error: err.message }));
    }
  }, [endpoint, params, enabled]);

  useEffect(() => { load(); }, [load]);

  const setFilter = useCallback((patch) => setParams((p) => ({ ...p, ...patch, page: 1 })), []);
  const setPage = useCallback((page) => setParams((p) => ({ ...p, page })), []);
  const setLimit = useCallback((limit) => setParams((p) => ({ ...p, limit, page: 1 })), []);

  return { ...state, params, setFilter, setPage, setLimit, reload: load };
}
