import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import Section from '../../components/Section';
import KeyValue from '../../components/KeyValue';
import { Stats, Cell, OccupancyBar } from './parts';
import { money } from '../../utils/format';

/** Simple horizontal bars: one useful comparison (collections per month) without a charting library. */
function CollectionBars({ rows }) {
  if (!rows.length) return <Typography variant="body2" color="text.secondary">No payments recorded in the last six months.</Typography>;
  const max = Math.max(...rows.map((r) => r.total));
  return (
    <Box sx={{ display: 'grid', gap: 1.25 }}>
      {rows.map((r) => (
        <Box key={r.month} sx={{ display: 'grid', gridTemplateColumns: '70px 1fr 96px', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="body2" color="text.secondary">{r.month}</Typography>
          <Box sx={{ bgcolor: 'action.hover', borderRadius: 1, height: 14 }}><Box sx={{ width: `${(r.total / max) * 100}%`, height: '100%', bgcolor: 'primary.main', borderRadius: 1 }} /></Box>
          <Typography variant="body2" align="right">{money(r.total)}</Typography>
        </Box>
      ))}
    </Box>
  );
}

export default function AdminDashboard({ data: d }) {
  return (
    <>
      <PageHeader title="System overview" subtitle="Live figures across all hostels and messes" />
      <Stats>
        <Cell><StatCard label="Students" value={d.totalStudents} to="/students" /></Cell>
        <Cell><StatCard label="Hostels" value={d.totalHostels} to="/hostels" /></Cell>
        <Cell><StatCard label="Rooms" value={d.totalRooms} to="/rooms" /></Cell>
        <Cell><StatCard label="Total beds" value={d.totalBeds} /></Cell>
        <Cell><StatCard label="Occupied beds" value={d.occupiedBeds} /></Cell>
        <Cell><StatCard label="Vacant beds" value={d.vacantBeds} to="/allocations" /></Cell>
        <Cell><StatCard label="Pending complaints" value={d.pendingComplaints} to="/complaints" tone={d.pendingComplaints ? 'warning' : undefined} /></Cell>
        <Cell><StatCard label="Pending leave requests" value={d.pendingLeaves} to="/leaves" tone={d.pendingLeaves ? 'warning' : undefined} /></Cell>
      </Stats>
      <Grid container spacing={2.5}>
        <Grid item xs={12} md={5}>
          <Section title="Occupancy"><OccupancyBar occupied={d.occupiedBeds} total={d.totalBeds} percent={d.occupancyPercent} /></Section>
          <Box sx={{ mt: 2.5 }}>
            <Section title="Mess billing">
              <KeyValue items={[['Pending or overdue bills', d.pendingBills], ['Billed', money(d.billing.billed)], ['Collected', money(d.billing.collected)], ['Outstanding', money(d.billing.outstanding)]]} />
            </Section>
          </Box>
        </Grid>
        <Grid item xs={12} md={7}><Section title="Collections, last six months"><CollectionBars rows={d.collectionsByMonth} /></Section></Grid>
      </Grid>
    </>
  );
}
