import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import PageHeader from '../components/PageHeader';
import Section from '../components/Section';
import KeyValue from '../components/KeyValue';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import useFetch from '../hooks/useFetch';
import { fmtDate } from '../utils/format';

export default function MyRoom() {
  const { data, loading, error, reload } = useFetch('/allocations/me');
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const { current, roommates, history } = data;
  return (
    <>
      <PageHeader title="My room" subtitle="Your current accommodation and history" />
      {!current ? <EmptyState title="No room allocated yet" message="Contact your warden's office for a room allocation." /> : (
        <Grid container spacing={2.5}>
          <Grid item xs={12} md={6}>
            <Section title="Current accommodation">
              <KeyValue items={[['Hostel', current.hostel.name], ['Block', current.block.name], ['Room', current.room.roomNumber], ['Floor', current.room.floor], ['Bed', current.bedNumber], ['Room type', current.room.roomType], ['Checked in', fmtDate(current.checkInDate)]]} />
            </Section>
          </Grid>
          <Grid item xs={12} md={6}>
            <Section title="Roommates">
              {roommates.length ? (
                <Table size="small"><TableHead><TableRow><TableCell>Bed</TableCell><TableCell>Name</TableCell><TableCell>Department</TableCell><TableCell>Year</TableCell></TableRow></TableHead>
                  <TableBody>{roommates.map((r) => <TableRow key={r.bedNumber}><TableCell>{r.bedNumber}</TableCell><TableCell>{r.name}</TableCell><TableCell>{r.department}</TableCell><TableCell>{r.year}</TableCell></TableRow>)}</TableBody>
                </Table>
              ) : <Typography variant="body2" color="text.secondary">You have no roommates in this room right now.</Typography>}
            </Section>
          </Grid>
          <Grid item xs={12}>
            <Section title="Allocation history" padded={false}>
              <Table size="small">
                <TableHead><TableRow><TableCell>Hostel</TableCell><TableCell>Room</TableCell><TableCell>Bed</TableCell><TableCell>Check-in</TableCell><TableCell>Check-out</TableCell><TableCell>Status</TableCell></TableRow></TableHead>
                <TableBody>{history.map((h) => (
                  <TableRow key={h._id}><TableCell>{h.hostel.name}</TableCell><TableCell>{h.room.roomNumber}</TableCell><TableCell>{h.bedNumber}</TableCell><TableCell>{fmtDate(h.checkInDate)}</TableCell><TableCell>{fmtDate(h.checkOutDate)}</TableCell><TableCell><StatusBadge value={h.status} /></TableCell></TableRow>
                ))}</TableBody>
              </Table>
            </Section>
          </Grid>
        </Grid>
      )}
    </>
  );
}
