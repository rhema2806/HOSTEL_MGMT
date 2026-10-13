import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import Section from '../../components/Section';
import StatusBadge from '../../components/StatusBadge';
import KeyValue from '../../components/KeyValue';
import { Stats, Cell, NoticeList, MenuBlock } from './parts';
import { fmtDate, money } from '../../utils/format';

export default function StudentDashboard({ data }) {
  const { student, accommodation: a, todayMenu, currentBill: b, pendingLeave } = data;
  return (
    <>
      <PageHeader title={`Welcome, ${student.name.split(' ')[0]}`} subtitle={`${student.studentId} · ${student.department}, Year ${student.year}`} />
      <Stats>
        <Cell><StatCard label="Active complaints" value={data.activeComplaints} to="/my-complaints" tone={data.activeComplaints ? 'warning' : undefined} /></Cell>
        <Cell><StatCard label="Unread notifications" value={data.unreadNotifications} to="/notifications" /></Cell>
        <Cell><StatCard label="Pending leave" value={pendingLeave ? 'Yes' : 'None'} to="/my-leaves" hint={pendingLeave ? `${fmtDate(pendingLeave.startDate)} to ${fmtDate(pendingLeave.endDate)}` : undefined} /></Cell>
        <Cell><StatCard label="Latest mess bill" value={b ? money(b.finalAmount) : '-'} to="/my-bills" hint={b ? `${b.month}: ${b.status.replace('_', ' ')}` : 'No bill yet'} tone={b?.status === 'overdue' ? 'error' : undefined} /></Cell>
      </Stats>
      <Grid container spacing={2.5}>
        <Grid item xs={12} md={5}>
          <Section title="My accommodation" action={<Button size="small" component={Link} to="/my-room">Details</Button>}>
            {a ? <KeyValue items={[['Hostel', a.hostel], ['Block', a.block], ['Room', a.room], ['Bed', a.bed], ['Floor', a.floor]]} /> : <Typography variant="body2" color="text.secondary">You have not been allocated a room yet. Contact the warden's office.</Typography>}
          </Section>
        </Grid>
        <Grid item xs={12} md={7}>
          <Section title="Current mess bill" action={<Button size="small" component={Link} to="/my-bills">All bills</Button>}>
            {b ? <KeyValue items={[['Month', b.month], ['Total meals', b.totalMeals], ['Amount', money(b.finalAmount)], ['Paid', money(b.paidAmount)], ['Due date', fmtDate(b.dueDate)], ['Status', <StatusBadge key="s" value={b.status} />]]} /> : <Typography variant="body2" color="text.secondary">No bill has been generated for you yet.</Typography>}
          </Section>
        </Grid>
        <Grid item xs={12}>
          <Section title={`Today's menu${data.mess ? ` · ${data.mess.name}` : ''}`} action={<Button size="small" component={Link} to="/menu">Week view</Button>}><MenuBlock menu={todayMenu} /></Section>
        </Grid>
        <Grid item xs={12}>
          <Section title="Recent notices" action={<Button size="small" component={Link} to="/notices">All notices</Button>}><NoticeList notices={data.recentNotices} /></Section>
        </Grid>
      </Grid>
    </>
  );
}
