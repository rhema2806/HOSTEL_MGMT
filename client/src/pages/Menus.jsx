import { useState } from 'react';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import EditIcon from '@mui/icons-material/EditOutlined';
import PageHeader from '../components/PageHeader';
import FormDialog from '../components/FormDialog';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorState from '../components/ErrorState';
import useList from '../hooks/useList';
import useFetch from '../hooks/useFetch';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { MEAL_TYPES } from '../utils/constants';
import { fmtDate, titleCase } from '../utils/format';

const startOfWeek = (offset = 0) => { const d = new Date(); d.setDate(d.getDate() - d.getDay() + offset * 7); return d; };
const iso = (d) => d.toLocaleDateString('en-CA');
const weekDates = (base) => Array.from({ length: 7 }, (_, i) => { const d = new Date(base); d.setDate(base.getDate() + i); return d; });

export default function Menus() {
  const { role } = useAuth();
  const canEdit = role === 'admin' || role === 'mess_manager';
  const toast = useToast();
  const { rows: messes } = useList('/messes', { limit: 50 }, { enabled: role !== 'student' });
  const [messId, setMessId] = useState('');
  const [weekOffset, setWeekOffset] = useState(0);
  const base = startOfWeek(weekOffset);
  const dates = weekDates(base);
  const { data, loading, error, reload } = useFetch('/menus', { mess: messId || undefined, from: iso(dates[0]), to: iso(dates[6]) }, [messId, weekOffset]);
  const [editDay, setEditDay] = useState(null);

  const menuFor = (d) => data?.find((m) => m.date.slice(0, 10) === iso(d));
  const effectiveMess = role === 'student' ? undefined : messId || messes[0]?._id;

  return (
    <>
      <PageHeader title="Mess menu" subtitle="Breakfast, lunch, snacks and dinner for the week" actions={
        <Stack direction="row" spacing={1}>
          <IconButton onClick={() => setWeekOffset((w) => w - 1)} aria-label="Previous week"><ArrowBackIosNewIcon fontSize="small" /></IconButton>
          <Button size="small" onClick={() => setWeekOffset(0)} variant={weekOffset === 0 ? 'contained' : 'outlined'}>This week</Button>
          <IconButton onClick={() => setWeekOffset((w) => w + 1)} aria-label="Next week"><ArrowForwardIosIcon fontSize="small" /></IconButton>
        </Stack>
      } />
      {role !== 'student' && messes.length > 1 && (
        <TextField select size="small" label="Mess" value={messId || messes[0]?._id || ''} onChange={(e) => setMessId(e.target.value)} sx={{ mb: 2, minWidth: 220 }}>
          {messes.map((m) => <MenuItem key={m._id} value={m._id}>{m.name}</MenuItem>)}
        </TextField>
      )}
      {loading ? <LoadingSpinner /> : error ? <ErrorState message={error} onRetry={reload} /> : (
        <Grid container spacing={2}>
          {dates.map((d) => {
            const menu = menuFor(d);
            const isToday = iso(d) === iso(new Date());
            return (
              <Grid item xs={12} sm={6} md={4} lg={3} xl={12 / 7} key={iso(d)}>
                <Paper variant="outlined" sx={{ p: 1.75, height: '100%', borderColor: isToday ? 'primary.main' : 'divider' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Box><Typography variant="subtitle2">{d.toLocaleDateString('en-IN', { weekday: 'short' })}</Typography><Typography variant="caption" color="text.secondary">{fmtDate(d)}</Typography></Box>
                    {isToday && <Chip size="small" label="Today" color="primary" />}
                    {canEdit && <IconButton size="small" onClick={() => setEditDay({ date: iso(d), mess: effectiveMess, menu })} aria-label="Edit menu"><EditIcon fontSize="inherit" /></IconButton>}
                  </Box>
                  {MEAL_TYPES.map((m) => (
                    <Box key={m} sx={{ mb: 1 }}>
                      <Typography variant="caption" color="text.secondary">{titleCase(m)}</Typography>
                      <Typography variant="body2">{menu?.meals?.[m]?.length ? menu.meals[m].join(', ') : '—'}</Typography>
                    </Box>
                  ))}
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      )}
      {canEdit && <MenuEditor day={editDay} onClose={() => setEditDay(null)} onSaved={reload} />}
    </>
  );
}

function MenuEditor({ day, onClose, onSaved }) {
  const toast = useToast();
  const [meals, setMeals] = useState({});
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadedFor, setLoadedFor] = useState(null);

  const key = day ? `${day.mess}|${day.date}` : null;
  if (day && key !== loadedFor) {
    setMeals(Object.fromEntries(MEAL_TYPES.map((m) => [m, (day.menu?.meals?.[m] || []).join(', ')])));
    setNotes(day.menu?.notes || '');
    setError('');
    setLoadedFor(key);
  }

  const submit = async () => {
    if (!day.mess) return setError('Select a mess first');
    setBusy(true); setError('');
    try {
      await api.put('/menus', { mess: day.mess, date: day.date, notes, meals: Object.fromEntries(MEAL_TYPES.map((m) => [m, (meals[m] || '').split(',').map((s) => s.trim()).filter(Boolean)])) });
      toast.success('Menu saved'); onSaved(); onClose();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <FormDialog open={!!day} title={day ? `Edit menu for ${fmtDate(day.date)}` : ''} onClose={onClose} onSubmit={submit} busy={busy} error={error}>
      <Box sx={{ display: 'grid', gap: 2 }}>
        {MEAL_TYPES.map((m) => (
          <TextField key={m} label={titleCase(m)} placeholder="Comma-separated dishes, e.g. Idly, Sambar, Chutney" value={meals[m] ?? ''} onChange={(e) => setMeals((v) => ({ ...v, [m]: e.target.value }))} multiline minRows={1} />
        ))}
        <TextField label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Box>
    </FormDialog>
  );
}
