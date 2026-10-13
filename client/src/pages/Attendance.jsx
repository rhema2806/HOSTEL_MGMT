import { useState } from 'react';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import useList from '../hooks/useList';
import useFetch from '../hooks/useFetch';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { MEAL_TYPES } from '../utils/constants';
import { todayISO, titleCase } from '../utils/format';

export default function Attendance() {
  const toast = useToast();
  const { rows: messes } = useList('/messes', { limit: 50 });
  const [messId, setMessId] = useState('');
  const [date, setDate] = useState(todayISO());
  const [meal, setMeal] = useState('lunch');
  const effectiveMess = messId || messes[0]?._id;
  const { data: roster, loading, error, reload } = useFetch(effectiveMess ? '/meal-attendance/roster' : null, { mess: effectiveMess, date, mealType: meal }, [effectiveMess, date, meal]);
  const [marks, setMarks] = useState({});
  const [busy, setBusy] = useState(false);

  const statusFor = (s) => marks[s._id] ?? s.status ?? 'present';
  const toggle = (s) => setMarks((m) => ({ ...m, [s._id]: statusFor(s) === 'present' ? 'absent' : 'present' }));
  const markAll = (status) => setMarks(Object.fromEntries((roster || []).map((s) => [s._id, status])));

  const save = async () => {
    if (!roster?.length) return;
    setBusy(true);
    try {
      const records = roster.map((s) => ({ student: s._id, status: statusFor(s) }));
      const res = await api.post('/meal-attendance/bulk', { mess: effectiveMess, date, mealType: meal, records });
      toast.success(`Saved attendance for ${res.data.saved} student(s)`);
      setMarks({}); reload();
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader title="Meal attendance" subtitle="Mark students present or absent for a meal" />
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
        {messes.length > 1 && <TextField select label="Mess" value={effectiveMess || ''} onChange={(e) => setMessId(e.target.value)} sx={{ minWidth: 200 }}>{messes.map((m) => <MenuItem key={m._id} value={m._id}>{m.name}</MenuItem>)}</TextField>}
        <TextField label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} InputLabelProps={{ shrink: true }} inputProps={{ max: todayISO() }} sx={{ minWidth: 170 }} />
        <TextField select label="Meal" value={meal} onChange={(e) => setMeal(e.target.value)} sx={{ minWidth: 150 }}>{MEAL_TYPES.map((m) => <MenuItem key={m} value={m}>{titleCase(m)}</MenuItem>)}</TextField>
      </Box>
      {loading ? <LoadingSpinner /> : error ? <ErrorState message={error} onRetry={reload} /> : !roster.length ? <EmptyState title="No students in this mess" /> : (
        <Paper variant="outlined">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, borderBottom: 1, borderColor: 'divider', flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">{roster.length} students · {Object.values(marks).length ? Object.keys(marks).length : roster.filter((s) => s.status).length} marked</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button size="small" onClick={() => markAll('present')}>Mark all present</Button>
              <Button size="small" onClick={() => markAll('absent')}>Mark all absent</Button>
              <Button size="small" variant="contained" onClick={save} disabled={busy}>{busy ? 'Saving' : 'Save attendance'}</Button>
            </Box>
          </Box>
          <Table size="small">
            <TableHead><TableRow><TableCell padding="checkbox">Present</TableCell><TableCell>Student ID</TableCell><TableCell>Name</TableCell><TableCell>Department</TableCell><TableCell>Year</TableCell></TableRow></TableHead>
            <TableBody>
              {roster.map((s) => (
                <TableRow key={s._id} hover onClick={() => toggle(s)} sx={{ cursor: 'pointer' }}>
                  <TableCell padding="checkbox"><Checkbox checked={statusFor(s) === 'present'} onClick={(e) => e.stopPropagation()} onChange={() => toggle(s)} /></TableCell>
                  <TableCell>{s.studentId}</TableCell><TableCell>{s.name}</TableCell><TableCell>{s.department}</TableCell><TableCell>{s.year}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </>
  );
}
