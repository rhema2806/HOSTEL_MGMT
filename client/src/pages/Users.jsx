import { useState } from 'react';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Autocomplete from '@mui/material/Autocomplete';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import AddIcon from '@mui/icons-material/Add';
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
import { validateForm } from '../utils/validate';
import { roleLabel } from '../utils/format';

const ROLES = ['admin', 'warden', 'mess_manager'];
const emptyForm = { name: '', email: '', role: 'warden', phone: '', assignedHostels: [], assignedMesses: [] };

export default function Users() {
  const toast = useToast();
  const { rows, pagination, loading, error, setFilter, setPage, setLimit, reload } = useList('/users', { role: 'admin,warden,mess_manager' });
  const { rows: hostels } = useList('/hostels', { limit: 100 });
  const { rows: messes } = useList('/messes', { limit: 100 });
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [deactivate, setDeactivate] = useState(null);
  const [credentials, setCredentials] = useState(null);

  const openCreate = () => { setForm(emptyForm); setErrors({}); setFormError(''); setDialog({ mode: 'create' }); };
  const openEdit = (row) => { setForm({ name: row.name, email: row.email, role: row.role, phone: row.phone || '', assignedHostels: row.assignedHostels?.map((h) => h._id) || [], assignedMesses: row.assignedMesses?.map((m) => m._id) || [] }); setErrors({}); setFormError(''); setDialog({ mode: 'edit', row }); };
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    const v = validateForm(form, { name: { label: 'Name', required: true }, email: { label: 'Email', required: true, email: true } });
    if (form.role === 'warden' && !form.assignedHostels.length) v.assignedHostels = 'Assign at least one hostel';
    if (form.role === 'mess_manager' && !form.assignedMesses.length) v.assignedMesses = 'Assign at least one mess';
    setErrors(v);
    if (Object.keys(v).length) return;
    setBusy(true); setFormError('');
    try {
      if (dialog.mode === 'create') {
        const res = await api.post('/auth/register', form);
        toast.success('Staff account created');
        if (res.temporaryPassword) setCredentials({ email: form.email, password: res.temporaryPassword });
      } else {
        await api.patch(`/users/${dialog.row._id}`, form);
        toast.success('User updated');
      }
      setDialog(null); reload();
    } catch (err) { setFormError(err.message); } finally { setBusy(false); }
  };

  const toggleActive = async (row) => { try { await api.patch(`/users/${row._id}`, { isActive: !row.isActive }); reload(); } catch (err) { toast.error(err.message); } };
  const doDeactivate = async () => { try { await api.delete(`/users/${deactivate._id}`); toast.success('User deactivated'); setDeactivate(null); reload(); } catch (err) { toast.error(err.message); } };
  const resetPw = async (row) => { try { const res = await api.post(`/users/${row._id}/reset-password`, {}); setCredentials({ email: row.email, password: res.data.temporaryPassword }); } catch (err) { toast.error(err.message); } };

  const columns = [
    { key: 'name', label: 'Name', render: (r) => <a href="#" onClick={(e) => { e.preventDefault(); openEdit(r); }} style={{ color: 'inherit', fontWeight: 600, textDecoration: 'none' }}>{r.name}</a> },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role', render: (r) => roleLabel(r.role) },
    { key: 'scope', label: 'Scope', render: (r) => r.assignedHostels?.map((h) => h.name).join(', ') || r.assignedMesses?.map((m) => m.name).join(', ') || '-' },
    { key: 'isActive', label: 'Status', render: (r) => <StatusBadge value={r.isActive ? 'active' : 'inactive'} /> },
    { key: 'actions', label: '', align: 'right', render: (r) => (
      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
        <Button size="small" onClick={() => resetPw(r)}>Reset password</Button>
        {r.isActive ? <Button size="small" color="error" onClick={() => setDeactivate(r)}>Deactivate</Button> : <Button size="small" onClick={() => toggleActive(r)}>Reactivate</Button>}
      </Box>
    ) },
  ];

  return (
    <>
      <PageHeader title="Users and roles" subtitle="Create and manage warden, mess manager and admin accounts" actions={<Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Add staff user</Button>} />
      <FilterBar>
        <SearchBar placeholder="Search by name or email" onSearch={(v) => setFilter({ search: v })} />
        <FilterSelect label="Role" options={ROLES.map((r) => ({ value: r, label: roleLabel(r) }))} onChange={(v) => setFilter({ role: v || 'admin,warden,mess_manager' })} value="" />
      </FilterBar>
      <DataTable columns={columns} rows={rows} loading={loading} error={error} onRetry={reload} pagination={pagination} onPageChange={setPage} onLimitChange={setLimit} emptyTitle="No users found" />

      <FormDialog open={!!dialog} title={dialog?.mode === 'create' ? 'Add staff user' : 'Edit user'} onClose={() => setDialog(null)} onSubmit={submit} busy={busy} error={formError}>
        <Grid container spacing={2}>
          <Grid item xs={12}><TextField label="Name" value={form.name} onChange={set('name')} error={!!errors.name} helperText={errors.name} /></Grid>
          <Grid item xs={12} sm={6}><TextField label="Email" type="email" value={form.email} onChange={set('email')} error={!!errors.email} helperText={errors.email} disabled={dialog?.mode === 'edit'} /></Grid>
          <Grid item xs={12} sm={6}><TextField label="Phone" value={form.phone} onChange={set('phone')} /></Grid>
          <Grid item xs={12}><TextField select label="Role" value={form.role} onChange={set('role')}>{ROLES.map((r) => <MenuItem key={r} value={r}>{roleLabel(r)}</MenuItem>)}</TextField></Grid>
          {form.role === 'warden' && (
            <Grid item xs={12}>
              <Autocomplete multiple options={hostels} getOptionLabel={(o) => o.name} isOptionEqualToValue={(o, v) => o._id === v._id}
                value={hostels.filter((h) => form.assignedHostels.includes(h._id))}
                onChange={(_, val) => setForm((f) => ({ ...f, assignedHostels: val.map((v) => v._id) }))}
                renderInput={(params) => <TextField {...params} label="Assigned hostels" error={!!errors.assignedHostels} helperText={errors.assignedHostels} />} />
            </Grid>
          )}
          {form.role === 'mess_manager' && (
            <Grid item xs={12}>
              <Autocomplete multiple options={messes} getOptionLabel={(o) => o.name} isOptionEqualToValue={(o, v) => o._id === v._id}
                value={messes.filter((m) => form.assignedMesses.includes(m._id))}
                onChange={(_, val) => setForm((f) => ({ ...f, assignedMesses: val.map((v) => v._id) }))}
                renderInput={(params) => <TextField {...params} label="Assigned messes" error={!!errors.assignedMesses} helperText={errors.assignedMesses} />} />
            </Grid>
          )}
        </Grid>
      </FormDialog>

      <ConfirmDialog open={!!deactivate} title="Deactivate user?" destructive confirmLabel="Deactivate" message={`${deactivate?.name} will no longer be able to sign in.`} onConfirm={doDeactivate} onClose={() => setDeactivate(null)} />

      <FormDialog open={!!credentials} title="Account credentials" onClose={() => setCredentials(null)} hideActions>
        <Typography variant="body2" sx={{ mb: 1 }}>Share these sign-in details. A new password must be set at first login.</Typography>
        <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1, fontFamily: 'monospace', fontSize: 14 }}>Email: {credentials?.email}<br />Temporary password: {credentials?.password}</Box>
        <Button sx={{ mt: 2 }} onClick={() => setCredentials(null)}>Close</Button>
      </FormDialog>
    </>
  );
}
