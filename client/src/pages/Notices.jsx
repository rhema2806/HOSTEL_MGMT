import { useState } from 'react';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import AddIcon from '@mui/icons-material/Add';
import PageHeader from '../components/PageHeader';
import FilterBar from '../components/FilterBar';
import FilterSelect from '../components/FilterSelect';
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
import { DEPARTMENTS } from '../utils/constants';
import { fmtDate, titleCase } from '../utils/format';

const CATEGORIES = ['general', 'hostel', 'mess', 'maintenance', 'event', 'urgent'];
const emptyForm = { title: '', description: '', category: 'general', audienceType: 'all', hostel: '', mess: '', year: '', department: '', expiryDate: '' };

export default function Notices() {
  const { role, user } = useAuth();
  const canWrite = role !== 'student';
  const toast = useToast();
  const { rows, loading, error, setFilter, reload } = useList('/notices', { limit: 50 });
  const { rows: hostels } = useList('/hostels', { limit: 100 }, { enabled: canWrite && role !== 'mess_manager' });
  const { rows: messes } = useList('/messes', { limit: 100 }, { enabled: canWrite && role !== 'warden' });
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [remove, setRemove] = useState(null);

  const audienceOptions = role === 'warden' ? ['hostel'] : role === 'mess_manager' ? ['mess'] : ['all', 'hostel', 'mess', 'year', 'department'];

  const openCreate = () => { setForm({ ...emptyForm, audienceType: audienceOptions[0] }); setErrors({}); setFormError(''); setDialog({ mode: 'create' }); };
  const openEdit = (n) => { setForm({ title: n.title, description: n.description, category: n.category, audienceType: n.audience.type, hostel: n.audience.hostel?._id || '', mess: n.audience.mess?._id || '', year: n.audience.year || '', department: n.audience.department || '', expiryDate: n.expiryDate ? n.expiryDate.slice(0, 10) : '' }); setErrors({}); setFormError(''); setDialog({ mode: 'edit', row: n }); };

  const submit = async () => {
    const v = validateForm(form, { title: { label: 'Title', required: true }, description: { label: 'Description', required: true, minLength: 10 } });
    setErrors(v);
    if (Object.keys(v).length) return;
    setBusy(true); setFormError('');
    try {
      const audience = { type: form.audienceType, hostel: form.hostel || undefined, mess: form.mess || undefined, year: form.year || undefined, department: form.department || undefined };
      const payload = { title: form.title, description: form.description, category: form.category, audience, expiryDate: form.expiryDate || undefined };
      if (dialog.mode === 'create') { await api.post('/notices', payload); toast.success('Notice published'); }
      else { await api.patch(`/notices/${dialog.row._id}`, payload); toast.success('Notice updated'); }
      setDialog(null); reload();
    } catch (err) { setFormError(err.message); } finally { setBusy(false); }
  };
  const doRemove = async () => { try { await api.delete(`/notices/${remove._id}`); toast.success('Notice deleted'); setRemove(null); reload(); } catch (err) { toast.error(err.message); } };

  const audienceLabel = (n) => ({ all: 'All students', hostel: n.audience.hostel?.name, mess: n.audience.mess?.name, year: `Year ${n.audience.year}`, department: n.audience.department }[n.audience.type]);

  return (
    <>
      <PageHeader title="Notices" subtitle="Hostel and mess announcements" actions={canWrite && <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Publish notice</Button>} />
      <FilterBar><FilterSelect label="Category" options={CATEGORIES} onChange={(v) => setFilter({ category: v })} value="" /></FilterBar>
      {loading ? <LoadingSpinner /> : error ? <ErrorState message={error} onRetry={reload} /> : !rows.length ? <EmptyState title="No notices" /> : (
        <Grid container spacing={2}>
          {rows.map((n) => (
            <Grid item xs={12} md={6} key={n._id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 0.5 }}>
                    <Typography variant="subtitle1">{n.title}</Typography>
                    <Chip size="small" label={titleCase(n.category)} variant="outlined" />
                  </Box>
                  <Typography variant="caption" color="text.secondary">{audienceLabel(n)} · {fmtDate(n.publishDate)} · {n.publishedBy?.name}</Typography>
                  <Typography variant="body2" sx={{ mt: 1.5, whiteSpace: 'pre-wrap' }}>{n.description}</Typography>
                </CardContent>
                {canWrite && (n.publishedBy?._id === user._id || role === 'admin') && (
                  <CardActions><Button size="small" onClick={() => openEdit(n)}>Edit</Button><Button size="small" color="error" onClick={() => setRemove(n)}>Delete</Button></CardActions>
                )}
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      <FormDialog open={!!dialog} title={dialog?.mode === 'create' ? 'Publish notice' : 'Edit notice'} onClose={() => setDialog(null)} onSubmit={submit} busy={busy} error={formError} maxWidth="sm">
        <Box sx={{ display: 'grid', gap: 2 }}>
          <TextField label="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} error={!!errors.title} helperText={errors.title} />
          <TextField label="Description" multiline minRows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} error={!!errors.description} helperText={errors.description} />
          <TextField select label="Category" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>{CATEGORIES.map((c) => <MenuItem key={c} value={c}>{titleCase(c)}</MenuItem>)}</TextField>
          <TextField select label="Audience" value={form.audienceType} onChange={(e) => setForm((f) => ({ ...f, audienceType: e.target.value }))} disabled={audienceOptions.length === 1}>{audienceOptions.map((a) => <MenuItem key={a} value={a}>{titleCase(a === 'all' ? 'All students' : a)}</MenuItem>)}</TextField>
          {form.audienceType === 'hostel' && <TextField select label="Hostel" value={form.hostel} onChange={(e) => setForm((f) => ({ ...f, hostel: e.target.value }))}>{hostels.map((h) => <MenuItem key={h._id} value={h._id}>{h.name}</MenuItem>)}</TextField>}
          {form.audienceType === 'mess' && <TextField select label="Mess" value={form.mess} onChange={(e) => setForm((f) => ({ ...f, mess: e.target.value }))}>{messes.map((m) => <MenuItem key={m._id} value={m._id}>{m.name}</MenuItem>)}</TextField>}
          {form.audienceType === 'year' && <TextField select label="Year" value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}>{[1, 2, 3, 4].map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}</TextField>}
          {form.audienceType === 'department' && <TextField select label="Department" value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}>{DEPARTMENTS.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}</TextField>}
          <TextField label="Expiry date (optional)" type="date" value={form.expiryDate} onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))} InputLabelProps={{ shrink: true }} />
        </Box>
      </FormDialog>
      <ConfirmDialog open={!!remove} title="Delete notice?" destructive confirmLabel="Delete" message={`Delete "${remove?.title}"?`} onConfirm={doRemove} onClose={() => setRemove(null)} />
    </>
  );
}
