import { useState } from 'react';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import FilterBar from '../components/FilterBar';
import FilterSelect from '../components/FilterSelect';
import SearchBar from '../components/SearchBar';
import FormDialog from '../components/FormDialog';
import StatusBadge from '../components/StatusBadge';
import ConfirmDialog from '../components/ConfirmDialog';
import useList from '../hooks/useList';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { validateForm } from '../utils/validate';
import { DEPARTMENTS } from '../utils/constants';

const emptyForm = { studentId: '', name: '', email: '', phone: '', gender: '', department: '', year: '', section: '', mess: '' };
const rules = { studentId: { label: 'Student ID', required: true }, name: { label: 'Name', required: true }, email: { label: 'Email', required: true, email: true }, gender: { label: 'Gender', required: true }, department: { label: 'Department', required: true }, year: { label: 'Year', required: true }, phone: { label: 'Phone', phone: true } };

export default function Students() {
  const { role } = useAuth();
  const toast = useToast();
  const { rows, pagination, loading, error, setFilter, setPage, setLimit, reload } = useList('/students', {});
  const { data: messOptions } = useMessOptions();
  const [dialog, setDialog] = useState(null); // { mode: 'create'|'edit', row }
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [deactivate, setDeactivate] = useState(null);
  const [credentials, setCredentials] = useState(null);

  const openCreate = () => { setForm(emptyForm); setErrors({}); setFormError(''); setDialog({ mode: 'create' }); };
  const openEdit = (row) => { setForm({ studentId: row.studentId, name: row.name, email: row.email, phone: row.phone || '', gender: row.gender, department: row.department, year: row.year, section: row.section || '', mess: row.mess?._id || '' }); setErrors({}); setFormError(''); setDialog({ mode: 'edit', row }); };
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    const v = validateForm(form, rules);
    setErrors(v);
    if (Object.keys(v).length) return;
    setBusy(true); setFormError('');
    try {
      const payload = { ...form, year: Number(form.year), mess: form.mess || undefined };
      if (dialog.mode === 'create') {
        const res = await api.post('/students', payload);
        toast.success('Student added');
        if (res.temporaryPassword) setCredentials({ email: form.email, password: res.temporaryPassword });
      } else {
        await api.patch(`/students/${dialog.row._id}`, payload);
        toast.success('Student updated');
      }
      setDialog(null); reload();
    } catch (err) { setFormError(err.message); } finally { setBusy(false); }
  };

  const doDeactivate = async () => {
    try { await api.delete(`/students/${deactivate._id}`); toast.success('Student deactivated'); setDeactivate(null); reload(); }
    catch (err) { toast.error(err.message); }
  };

  const columns = [
    { key: 'studentId', label: 'Student ID', render: (r) => <Link to={`#`} onClick={(e) => { e.preventDefault(); openEdit(r); }} style={{ color: 'inherit', fontWeight: 600 }}>{r.studentId}</Link> },
    { key: 'name', label: 'Name' },
    { key: 'department', label: 'Department' },
    { key: 'year', label: 'Year', align: 'center' },
    { key: 'room', label: 'Hostel / Room', render: (r) => r.allocation ? `${r.allocation.room.roomNumber} (${r.allocation.hostel.name})` : <Chip size="small" label="Unallocated" variant="outlined" /> },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> },
    ...(role !== 'admin' ? [] : [{ key: 'actions', label: '', align: 'right', render: (r) => r.status === 'active' && <Button size="small" color="error" onClick={() => setDeactivate(r)}>Deactivate</Button> }]),
  ];

  return (
    <>
      <PageHeader title="Students" subtitle="Search, filter and manage student records" actions={<Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Add student</Button>} />
      <FilterBar>
        <SearchBar placeholder="Search by name, ID or email" onSearch={(v) => setFilter({ search: v })} />
        <FilterSelect label="Department" options={DEPARTMENTS} onChange={(v) => setFilter({ department: v })} value="" />
        <FilterSelect label="Year" options={['1', '2', '3', '4']} onChange={(v) => setFilter({ year: v })} value="" />
        <FilterSelect label="Status" options={['active', 'inactive', 'alumni']} onChange={(v) => setFilter({ status: v })} value="" />
        <FilterSelect label="Allocation" options={[{ value: 'true', label: 'Unallocated only' }]} onChange={(v) => setFilter({ unallocated: v })} value="" allLabel="All students" />
      </FilterBar>
      <DataTable columns={columns} rows={rows} loading={loading} error={error} onRetry={reload} pagination={pagination} onPageChange={setPage} onLimitChange={setLimit}
        emptyTitle="No students found" emptyMessage="Try adjusting your search or filters, or add a new student." />

      <FormDialog open={!!dialog} title={dialog?.mode === 'create' ? 'Add student' : 'Edit student'} onClose={() => setDialog(null)} onSubmit={submit} busy={busy} error={formError} maxWidth="md">
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}><TextField label="Student ID" value={form.studentId} onChange={set('studentId')} error={!!errors.studentId} helperText={errors.studentId} disabled={dialog?.mode === 'edit'} /></Grid>
          <Grid item xs={12} sm={6}><TextField label="Name" value={form.name} onChange={set('name')} error={!!errors.name} helperText={errors.name} /></Grid>
          <Grid item xs={12} sm={6}><TextField label="Email" type="email" value={form.email} onChange={set('email')} error={!!errors.email} helperText={errors.email} disabled={dialog?.mode === 'edit'} /></Grid>
          <Grid item xs={12} sm={6}><TextField label="Phone" value={form.phone} onChange={set('phone')} error={!!errors.phone} helperText={errors.phone} /></Grid>
          <Grid item xs={12} sm={4}><TextField select label="Gender" value={form.gender} onChange={set('gender')} error={!!errors.gender} helperText={errors.gender}>{['male', 'female', 'other'].map((g) => <MenuItem key={g} value={g}>{g[0].toUpperCase() + g.slice(1)}</MenuItem>)}</TextField></Grid>
          <Grid item xs={12} sm={4}><TextField select label="Department" value={form.department} onChange={set('department')} error={!!errors.department} helperText={errors.department}>{DEPARTMENTS.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}</TextField></Grid>
          <Grid item xs={6} sm={2}><TextField select label="Year" value={form.year} onChange={set('year')} error={!!errors.year} helperText={errors.year}>{[1, 2, 3, 4].map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}</TextField></Grid>
          <Grid item xs={6} sm={2}><TextField label="Section" value={form.section} onChange={set('section')} /></Grid>
          <Grid item xs={12} sm={6}><TextField select label="Mess" value={form.mess} onChange={set('mess')}><MenuItem value="">Not assigned</MenuItem>{(messOptions || []).map((m) => <MenuItem key={m._id} value={m._id}>{m.name}</MenuItem>)}</TextField></Grid>
        </Grid>
      </FormDialog>

      <ConfirmDialog open={!!deactivate} title="Deactivate student?" destructive confirmLabel="Deactivate"
        message={`This will deactivate ${deactivate?.name} and release their bed allocation, if any. Their history is kept.`}
        onConfirm={doDeactivate} onClose={() => setDeactivate(null)} />

      <FormDialog open={!!credentials} title="Student account created" onClose={() => setCredentials(null)} hideActions>
        <Typography variant="body2" sx={{ mb: 1 }}>Share these sign-in details with the student. They will be asked to set a new password at first login.</Typography>
        <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1, fontFamily: 'monospace', fontSize: 14 }}>
          Email: {credentials?.email}<br />Temporary password: {credentials?.password}
        </Box>
        <Button sx={{ mt: 2 }} onClick={() => setCredentials(null)}>Close</Button>
      </FormDialog>
    </>
  );
}

function useMessOptions() {
  const { rows } = useList('/messes', {});
  return { data: rows };
}
