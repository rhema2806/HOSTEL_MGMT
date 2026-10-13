import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

/** Requires a signed-in user. Redirects to the password-change screen while a temporary password is active. */
export function RequireAuth() {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingSpinner fullPage />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user.mustChangePassword && location.pathname !== '/change-password') return <Navigate to="/change-password" replace />;
  return <Outlet />;
}

/** UI-level role gate for navigation. The API independently enforces every permission. */
export function RequireRole({ roles }) {
  const { role } = useAuth();
  if (!roles.includes(role)) return <Navigate to="/forbidden" replace />;
  return <Outlet />;
}
