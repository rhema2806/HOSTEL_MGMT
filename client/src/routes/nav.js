import DashboardIcon from '@mui/icons-material/SpaceDashboardOutlined';
import PeopleIcon from '@mui/icons-material/PeopleOutline';
import ApartmentIcon from '@mui/icons-material/ApartmentOutlined';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoomOutlined';
import SwapIcon from '@mui/icons-material/SwapHorizOutlined';
import BedIcon from '@mui/icons-material/BedOutlined';
import RestaurantIcon from '@mui/icons-material/RestaurantMenuOutlined';
import ChecklistIcon from '@mui/icons-material/FactCheckOutlined';
import ReceiptIcon from '@mui/icons-material/ReceiptLongOutlined';
import ReportIcon from '@mui/icons-material/ReportProblemOutlined';
import EventIcon from '@mui/icons-material/EventNoteOutlined';
import CampaignIcon from '@mui/icons-material/CampaignOutlined';
import BellIcon from '@mui/icons-material/NotificationsNoneOutlined';
import FeedbackIcon from '@mui/icons-material/RateReviewOutlined';
import ReportsIcon from '@mui/icons-material/AssessmentOutlined';
import AdminIcon from '@mui/icons-material/ManageAccountsOutlined';
import PersonIcon from '@mui/icons-material/PersonOutline';
import KitchenIcon from '@mui/icons-material/StorefrontOutlined';

const dash = { label: 'Dashboard', to: '/', icon: DashboardIcon };
const notices = { label: 'Notices', to: '/notices', icon: CampaignIcon };
const notifications = { label: 'Notifications', to: '/notifications', icon: BellIcon };
const account = { label: 'My account', to: '/profile', icon: PersonIcon };

/** Grouped navigation per role. Visibility only: every route is also enforced by the API. */
export const NAV = {
  student: [
    { items: [dash, { label: 'My room', to: '/my-room', icon: BedIcon }, { label: 'Mess menu', to: '/menu', icon: RestaurantIcon }, { label: 'Meal attendance', to: '/my-attendance', icon: ChecklistIcon }, { label: 'Mess bills', to: '/my-bills', icon: ReceiptIcon }] },
    { title: 'Requests', items: [{ label: 'Complaints', to: '/my-complaints', icon: ReportIcon }, { label: 'Leave', to: '/my-leaves', icon: EventIcon }, { label: 'Mess feedback', to: '/feedback', icon: FeedbackIcon }] },
    { title: 'Updates', items: [notices, notifications, account] },
  ],
  warden: [
    { items: [dash, { label: 'Students', to: '/students', icon: PeopleIcon }] },
    { title: 'Hostel', items: [{ label: 'Hostels', to: '/hostels', icon: ApartmentIcon }, { label: 'Rooms and beds', to: '/rooms', icon: MeetingRoomIcon }, { label: 'Allocations', to: '/allocations', icon: SwapIcon }] },
    { title: 'Requests', items: [{ label: 'Complaints', to: '/complaints', icon: ReportIcon }, { label: 'Leave requests', to: '/leaves', icon: EventIcon }] },
    { title: 'Information', items: [{ label: 'Mess menu', to: '/menu', icon: RestaurantIcon }, { label: 'Mess bills', to: '/bills', icon: ReceiptIcon }, notices, { label: 'Reports', to: '/reports', icon: ReportsIcon }, notifications, account] },
  ],
  mess_manager: [
    { items: [dash] },
    { title: 'Mess', items: [{ label: 'Menus', to: '/menu', icon: RestaurantIcon }, { label: 'Meal attendance', to: '/attendance', icon: ChecklistIcon }, { label: 'Billing', to: '/bills', icon: ReceiptIcon }, { label: 'Feedback', to: '/feedback', icon: FeedbackIcon }, { label: 'Mess settings', to: '/messes', icon: KitchenIcon }] },
    { title: 'Information', items: [{ label: 'Food complaints', to: '/complaints', icon: ReportIcon }, notices, { label: 'Reports', to: '/reports', icon: ReportsIcon }, notifications, account] },
  ],
  admin: [
    { items: [dash, { label: 'Students', to: '/students', icon: PeopleIcon }, { label: 'Users and roles', to: '/users', icon: AdminIcon }] },
    { title: 'Hostel', items: [{ label: 'Hostels and blocks', to: '/hostels', icon: ApartmentIcon }, { label: 'Rooms and beds', to: '/rooms', icon: MeetingRoomIcon }, { label: 'Allocations', to: '/allocations', icon: SwapIcon }] },
    { title: 'Mess', items: [{ label: 'Messes', to: '/messes', icon: KitchenIcon }, { label: 'Menus', to: '/menu', icon: RestaurantIcon }, { label: 'Meal attendance', to: '/attendance', icon: ChecklistIcon }, { label: 'Billing', to: '/bills', icon: ReceiptIcon }, { label: 'Feedback', to: '/feedback', icon: FeedbackIcon }] },
    { title: 'Requests', items: [{ label: 'Complaints', to: '/complaints', icon: ReportIcon }, { label: 'Leave requests', to: '/leaves', icon: EventIcon }] },
    { title: 'Information', items: [notices, { label: 'Reports', to: '/reports', icon: ReportsIcon }, notifications, account] },
  ],
};
