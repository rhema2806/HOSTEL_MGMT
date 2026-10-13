import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { TOKEN_KEY } from '../services/api';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(null); // { user, student?, allocation? }
  const [loading, setLoading] = useState(!!localStorage.getItem(TOKEN_KEY));
  const toast = useToast();
  const navigate = useNavigate();

  const clear = useCallback(() => { localStorage.removeItem(TOKEN_KEY); setProfile(null); }, []);

  const refresh = useCallback(async () => {
    const { data } = await api.get('/auth/me');
    setProfile(data);
    return data;
  }, []);

  // Restore the session on first load.
  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    refresh().catch((err) => { if (err.status === 401) clear(); }).finally(() => setLoading(false));
  }, [refresh, clear]);

  // The API layer emits this when any request comes back 401.
  useEffect(() => {
    const onExpired = (e) => { clear(); toast.info(e.detail || 'Your session has ended. Please sign in again'); navigate('/login', { replace: true }); };
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, [clear, navigate, toast]);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem(TOKEN_KEY, data.token);
    return refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch { /* token may already be invalid */ }
    clear();
    navigate('/login', { replace: true });
  }, [clear, navigate]);

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    const { data } = await api.post('/auth/change-password', { currentPassword, newPassword });
    localStorage.setItem(TOKEN_KEY, data.token);
    return refresh();
  }, [refresh]);

  const value = useMemo(() => ({
    user: profile?.user || null, student: profile?.student || null, allocation: profile?.allocation || null,
    role: profile?.user?.role, loading, isAuthenticated: !!profile, login, logout, refresh, changePassword,
  }), [profile, loading, login, logout, refresh, changePassword]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
