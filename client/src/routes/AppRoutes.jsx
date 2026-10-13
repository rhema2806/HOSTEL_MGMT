import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import { RequireAuth, RequireRole } from './guards';
import { useAuth } from '../context/AuthContext';

const p = (name) => lazy(() => import(`../pages/${name}.jsx`));
const Login = p('Login');
const ChangePassword = p('ChangePassword');
const Dashboard = p('Dashboard');
const Profile = p('Profile');
const Students = p('Students');
const Users = p('Users');
const Hostels = p('Hostels');
const Rooms = p('Rooms');
const Allocations = p('Allocations');
const MyRoom = p('MyRoom');
const Messes = p('Messes');
const Menus = p('Menus');
const Attendance = p('Attendance');
const MyAttendance = p('MyAttendance');
const Bills = p('Bills');
const MyBills = p('MyBills');
const Complaints = p('Complaints');
const MyComplaints = p('MyComplaints');
const Leaves = p('Leaves');
const MyLeaves = p('MyLeaves');
const Notices = p('Notices');
const Notifications = p('Notifications');
const Feedback = p('Feedback');
const Reports = p('Reports');
const NotFound = p('NotFound');
const Forbidden = p('Forbidden');


export default function AppRoutes() {
  const { isAuthenticated } = useAuth();
  return (
    <Suspense fallback={<LoadingSpinner fullPage />}>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
        <Route element={<RequireAuth />}>
          <Route path="/change-password" element={<ChangePassword />} />
          <Route element={<DashboardLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="profile" element={<Profile />} />
            <Route path="notices" element={<Notices />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="menu" element={<Menus />} />
            <Route path="forbidden" element={<Forbidden />} />

            <Route element={<RequireRole roles={['admin', 'warden']} />}>
              <Route path="students" element={<Students />} />
              <Route path="hostels" element={<Hostels />} />
              <Route path="rooms" element={<Rooms />} />
              <Route path="allocations" element={<Allocations />} />
              <Route path="leaves" element={<Leaves />} />
            </Route>
            <Route element={<RequireRole roles={['admin']} />}>
              <Route path="users" element={<Users />} />
            </Route>
            <Route element={<RequireRole roles={['admin', 'mess_manager']} />}>
              <Route path="messes" element={<Messes />} />
              <Route path="attendance" element={<Attendance />} />
            </Route>
            <Route element={<RequireRole roles={['admin', 'warden', 'mess_manager']} />}>
              <Route path="bills" element={<Bills />} />
              <Route path="complaints" element={<Complaints />} />
              <Route path="reports" element={<Reports />} />
            </Route>
            <Route element={<RequireRole roles={['admin', 'mess_manager', 'student']} />}>
              <Route path="feedback" element={<Feedback />} />
            </Route>
            <Route element={<RequireRole roles={['student']} />}>
              <Route path="my-room" element={<MyRoom />} />
              <Route path="my-attendance" element={<MyAttendance />} />
              <Route path="my-bills" element={<MyBills />} />
              <Route path="my-complaints" element={<MyComplaints />} />
              <Route path="my-leaves" element={<MyLeaves />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
