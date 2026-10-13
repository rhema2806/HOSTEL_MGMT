import { useAuth } from '../context/AuthContext';
import useFetch from '../hooks/useFetch';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorState from '../components/ErrorState';
import StudentDashboard from './dashboard/StudentDashboard';
import WardenDashboard from './dashboard/WardenDashboard';
import MessDashboard from './dashboard/MessDashboard';
import AdminDashboard from './dashboard/AdminDashboard';

const VIEWS = { student: StudentDashboard, warden: WardenDashboard, mess_manager: MessDashboard, admin: AdminDashboard };

export default function Dashboard() {
  const { role, user } = useAuth();
  const { data, loading, error, reload } = useFetch('/dashboard');
  const View = VIEWS[role];
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  return <View data={data} user={user} />;
}
