import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import Section from '../../components/Section';
import StatusBadge from '../../components/StatusBadge';
import { Stats, Cell, OccupancyBar, NoticeList } from './parts';
import { fmtDateTime, titleCase } from '../../utils/format';

export default function WardenDashboard({ data: d, user }) {
  return (
    <>
      <PageHeader title="Hostel overview" subtitle={d.hostels.map((h) => h.name).join(', ') || 'No hostel assigned to your account yet'} />
      <Stats>
        <Cell><StatCard label="Students" value={d.totalStudents} to="/students" /></Cell>
        <Cell><StatCard label="Rooms" value={d.totalRooms} to="/rooms" /></Cell>
        <Cell><StatCard label="Occupied beds" value={d.occupiedBeds} hint={`of ${d.totalBeds} total`} /></Cell>
        <Cell><StatCard label="Vacant beds" value={d.vacantBeds} to="/allocations" /></Cell>
        <Cell xs={6} sm={6} md={3}><StatCard label="Pending leave requests" value={d.pendingLeaves} to="/leaves" tone={d.pendingLeaves ? 'warning' : undefined} /></Cell>
        <Cell xs={6} sm={6} md={3}><StatCard label="Pending complaints" value={d.pendingComplaints} to="/complaints" tone={d.pendingComplaints ? 'warning' : undefined} /></Cell>
      </Stats>
      <Grid container spacing={2.5}>
        <Grid item xs={12} md={6}><Section title="Occupancy"><OccupancyBar occupied={d.occupiedBeds} total={d.totalBeds} percent={d.occupancyPercent} /></Section></Grid>
        <Grid item xs={12} md={6}>
          <Section title="Recent complaint activity" action={<Button size="small" component={Link} to="/complaints">Open</Button>}>
            {d.recentActivity.length ? (
              <List dense disablePadding>
                {d.recentActivity.map((c) => (
                  <ListItem key={c._id} disableGutters divider secondaryAction={<StatusBadge value={c.status} />}>
                    <ListItemText primary={c.title} secondary={`${c.student?.name} · ${titleCase(c.category)} · ${fmtDateTime(c.updatedAt)}`} sx={{ pr: 10 }} />
                  </ListItem>
                ))}
              </List>
            ) : <Typography variant="body2" color="text.secondary">No complaints yet.</Typography>}
          </Section>
        </Grid>
        <Grid item xs={12}><Section title="Recent notices" action={<Button size="small" component={Link} to="/notices">Manage</Button>}><NoticeList notices={d.recentNotices} /></Section></Grid>
      </Grid>
    </>
  );
}
