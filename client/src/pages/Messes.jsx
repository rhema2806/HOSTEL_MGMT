import { useState } from 'react';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Autocomplete from '@mui/material/Autocomplete';
import AddIcon from '@mui/icons-material/Add';
import PageHeader from '../components/PageHeader';
import KeyValue from '../components/KeyValue';
import FormDialog from '../components/FormDialog';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import useList from '../hooks/useList';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { money } from '../utils/format';

const MEALS = ['breakfast', 'lunch', 'snacks', 'dinner'];

export default function Messes() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const toast = useToast();
  const { rows, loading, error, reload } = useList('/messes', { limit: 50 });
  const { rows: hostels } = useList('/hostels', { limit: 100 });
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState({ name: '', location: '', hostels: [], mealRates: {} });
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const openCreate = () => { setForm({ name: '', location: '', hostels: [], mealRates: { breakfast: 30, lunch: 60, snacks: 20, dinner: 55 } }); setFormError(''); setDialog({ mode: 'create' }); };
  const openEdit = (m) => { setForm({ name: m.name, location: m.location || '', hostels: m.hostels.map((h) => h._id), mealRates: { ...m.mealRates } }); setFormError(''); setDialog({ mode: 'edit', row: m }); };

  const submit = async () => {
    if (!form.name.trim()) return setFormError('Mess name is required');
    setBusy(true); setFormError('');
    try {
      if (dialog.mode === 'create') { await api.post('/messes', form); toast.success('Mess created'); }
      else { await api.patch(`/messes/${dialog.row._id}`, form); toast.success('Mess updated'); }
      setDialog(null); reload();
    } catch (err) { setFormError(err.message); } finally { setBusy(false); }
  };

  if (loading) return <><PageHeader title="Messes" /><LoadingSpinner /></>;
  if (error) return <><PageHeader title="Messes" /><ErrorState message={error} onRetry={reload} /></>;

  return (
    <>
      <PageHeader title="Messes" subtitle="Mess locations, meal rates and timings" actions={isAdmin && <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Add mess</Button>} />
      {!rows.length ? <EmptyState title="No messes yet" /> : (
        <Grid container spacing={2.5}>
          {rows.map((m) => (
            <Grid item xs={12} md={6} key={m._id}>
              <Card>
                <CardContent>
                  <Typography variant="h6">{m.name}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>{m.location || 'No location on file'} · Serves: {m.hostels.map((h) => h.name).join(', ') || 'Not linked to a hostel'}</Typography>
                  <KeyValue items={MEALS.map((meal) => [meal[0].toUpperCase() + meal.slice(1), money(m.mealRates[meal])])} />
                </CardContent>
                <CardActions><Button size="small" onClick={() => openEdit(m)}>Edit</Button></CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      <FormDialog open={!!dialog} title={dialog?.mode === 'create' ? 'Add mess' : 'Edit mess'} onClose={() => setDialog(null)} onSubmit={submit} busy={busy} error={formError} maxWidth="sm">
        <Box sx={{ display: 'grid', gap: 2 }}>
          <TextField label="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} disabled={!isAdmin} />
          <TextField label="Location" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
          {isAdmin && (
            <Autocomplete multiple options={hostels} getOptionLabel={(o) => o.name} isOptionEqualToValue={(o, v) => o._id === v._id}
              value={hostels.filter((h) => form.hostels.includes(h._id))} onChange={(_, val) => setForm((f) => ({ ...f, hostels: val.map((v) => v._id) }))}
              renderInput={(p) => <TextField {...p} label="Serves hostels" />} />
          )}
          <Typography variant="subtitle2">Meal rates (₹ per meal)</Typography>
          <Grid container spacing={2}>
            {MEALS.map((meal) => (
              <Grid item xs={6} sm={3} key={meal}>
                <TextField label={meal[0].toUpperCase() + meal.slice(1)} type="number" inputProps={{ min: 0 }} value={form.mealRates[meal] ?? ''} onChange={(e) => setForm((f) => ({ ...f, mealRates: { ...f.mealRates, [meal]: e.target.value } }))} />
              </Grid>
            ))}
          </Grid>
        </Box>
      </FormDialog>
    </>
  );
}
