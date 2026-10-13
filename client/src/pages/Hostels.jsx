import { useState } from 'react';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import AddIcon from '@mui/icons-material/Add';
import PageHeader from '../components/PageHeader';
import Section from '../components/Section';
import FormDialog from '../components/FormDialog';
import ConfirmDialog from '../components/ConfirmDialog';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import useList from '../hooks/useList';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { validateForm } from '../utils/validate';

function BlockManager({ hostelId, isAdmin }) {
  const toast = useToast();
  const { rows, loading, reload } = useList('/blocks', { hostel: hostelId, limit: 100 });
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState({ name: '', floors: 1 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [remove, setRemove] = useState(null);

  const submit = async () => {
    if (!form.name.trim()) return setError('Block name is required');
    setBusy(true); setError('');
    try { await api.post('/blocks', { hostel: hostelId, name: form.name, floors: Number(form.floors) }); toast.success('Block added'); setDialog(null); reload(); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const doRemove = async () => { try { await api.delete(`/blocks/${remove._id}`); toast.success('Block removed'); setRemove(null); reload(); } catch (err) { toast.error(err.message); } };

  if (loading) return <LoadingSpinner />;
  return (
    <Box>
      {isAdmin && <Button size="small" startIcon={<AddIcon />} onClick={() => { setForm({ name: '', floors: 1 }); setError(''); setDialog(true); }} sx={{ mb: 1 }}>Add block</Button>}
      {rows.length ? (
        <List dense disablePadding>
          {rows.map((b) => (
            <ListItem key={b._id} disableGutters divider secondaryAction={isAdmin && <Button size="small" color="error" onClick={() => setRemove(b)}>Remove</Button>}>
              <ListItemText primary={b.name} secondary={`${b.floors} floor(s)`} />
            </ListItem>
          ))}
        </List>
      ) : <Typography variant="body2" color="text.secondary">No blocks yet.</Typography>}
      <FormDialog open={!!dialog} title="Add block" onClose={() => setDialog(null)} onSubmit={submit} busy={busy} error={error}>
        <Box sx={{ display: 'grid', gap: 2 }}>
          <TextField label="Block name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <TextField label="Number of floors" type="number" inputProps={{ min: 1, max: 30 }} value={form.floors} onChange={(e) => setForm((f) => ({ ...f, floors: e.target.value }))} />
        </Box>
      </FormDialog>
      <ConfirmDialog open={!!remove} title="Remove block?" destructive confirmLabel="Remove" message={`Remove "${remove?.name}"? This only works if the block has no rooms.`} onConfirm={doRemove} onClose={() => setRemove(null)} />
    </Box>
  );
}

export default function Hostels() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const toast = useToast();
  const { rows, loading, error, reload } = useList('/hostels', { limit: 50 });
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState({ name: '', type: 'boys', address: '', contactPhone: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const openCreate = () => { setForm({ name: '', type: 'boys', address: '', contactPhone: '' }); setErrors({}); setFormError(''); setDialog({ mode: 'create' }); };
  const openEdit = (h) => { setForm({ name: h.name, type: h.type, address: h.address || '', contactPhone: h.contactPhone || '' }); setErrors({}); setFormError(''); setDialog({ mode: 'edit', row: h }); };
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    const v = validateForm(form, { name: { label: 'Name', required: true } });
    setErrors(v);
    if (Object.keys(v).length) return;
    setBusy(true); setFormError('');
    try {
      if (dialog.mode === 'create') { await api.post('/hostels', form); toast.success('Hostel created'); }
      else { await api.patch(`/hostels/${dialog.row._id}`, form); toast.success('Hostel updated'); }
      setDialog(null); reload();
    } catch (err) { setFormError(err.message); } finally { setBusy(false); }
  };

  if (loading) return <><PageHeader title="Hostels" /><LoadingSpinner /></>;
  if (error) return <><PageHeader title="Hostels" /><ErrorState message={error} onRetry={reload} /></>;

  return (
    <>
      <PageHeader title="Hostels" subtitle="Hostels, blocks and occupancy" actions={isAdmin && <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Add hostel</Button>} />
      {!rows.length ? <EmptyState title="No hostels yet" message={isAdmin ? 'Add your first hostel to get started.' : 'No hostel has been assigned to you yet.'} /> : (
        <Grid container spacing={2.5}>
          {rows.map((h) => (
            <Grid item xs={12} md={6} key={h._id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="h6">{h.name}</Typography>
                      <Typography variant="body2" color="text.secondary">{h.address || 'No address on file'}</Typography>
                    </Box>
                    <Chip size="small" label={h.type} variant="outlined" />
                  </Box>
                  <Grid container spacing={1.5} sx={{ mt: 1 }}>
                    {[['Rooms', h.stats.totalRooms], ['Beds', h.stats.totalBeds], ['Occupied', h.stats.occupiedBeds], ['Vacant', h.stats.vacantBeds], ['Occupancy', `${h.stats.occupancyPercent}%`]].map(([l, v]) => (
                      <Grid item xs={4} sm key={l}><Typography variant="caption" color="text.secondary" display="block">{l}</Typography><Typography variant="subtitle2">{v}</Typography></Grid>
                    ))}
                  </Grid>
                </CardContent>
                <CardActions sx={{ px: 2, pb: 1.5 }}>
                  <Button size="small" onClick={() => setExpanded(expanded === h._id ? null : h._id)}>{expanded === h._id ? 'Hide blocks' : 'Manage blocks'}</Button>
                  {isAdmin && <Button size="small" onClick={() => openEdit(h)}>Edit</Button>}
                </CardActions>
                {expanded === h._id && <Box sx={{ px: 2, pb: 2, borderTop: 1, borderColor: 'divider', pt: 2 }}><BlockManager hostelId={h._id} isAdmin={isAdmin} /></Box>}
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      <FormDialog open={!!dialog} title={dialog?.mode === 'create' ? 'Add hostel' : 'Edit hostel'} onClose={() => setDialog(null)} onSubmit={submit} busy={busy} error={formError}>
        <Box sx={{ display: 'grid', gap: 2 }}>
          <TextField label="Name" value={form.name} onChange={set('name')} error={!!errors.name} helperText={errors.name} />
          <TextField select label="Type" value={form.type} onChange={set('type')}>{['boys', 'girls', 'co-ed'].map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}</TextField>
          <TextField label="Address" value={form.address} onChange={set('address')} multiline minRows={2} />
          <TextField label="Contact phone" value={form.contactPhone} onChange={set('contactPhone')} />
        </Box>
      </FormDialog>
    </>
  );
}
