import { useState } from 'react';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import AddIcon from '@mui/icons-material/Add';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import FilterBar from '../components/FilterBar';
import FilterSelect from '../components/FilterSelect';
import StatusBadge from '../components/StatusBadge';
import FormDialog from '../components/FormDialog';
import KeyValue from '../components/KeyValue';
import useList from '../hooks/useList';
import useFetch from '../hooks/useFetch';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { validateForm } from '../utils/validate';
import { COMPLAINT_CATEGORIES, COMPLAINT_STATUS, PRIORITIES } from '../utils/constants';
import { fmtDateTime, titleCase } from '../utils/format';

const emptyForm = { category: '', title: '', description: '', priority: 'medium' };

export default function MyComplaints() {
  const toast = useToast();
  const { rows, pagination, loading, error, setFilter, setPage, setLimit, reload } = useList('/complaints', {});
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [detail, setDetail] = useState(null);

  const openCreate = () => { setForm(emptyForm); setErrors({}); setFormError(''); setDialog(true); };
  const submit = async () => {
    const v = validateForm(form, { category: { label: 'Category', required: true }, title: { label: 'Title', required: true }, description: { label: 'Description', required: true, minLength: 10 } });
    setErrors(v);
    if (Object.keys(v).length) return;
    setBusy(true); setFormError('');
    try { await api.post('/complaints', form); toast.success('Complaint submitted'); setDialog(false); reload(); }
    catch (err) { setFormError(err.message); } finally { setBusy(false); }
  };

  const columns = [
    { key: 'title', label: 'Title', render: (r) => <a href="#" onClick={(e) => { e.preventDefault(); setDetail(r); }} style={{ fontWeight: 600, color: 'inherit', textDecoration: 'none' }}>{r.title}</a> },
    { key: 'category', label: 'Category', render: (r) => titleCase(r.category) },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> },
    { key: 'createdAt', label: 'Filed', render: (r) => fmtDateTime(r.createdAt) },
  ];

  return (
    <>
      <PageHeader title="My complaints" subtitle="File and track complaints about your hostel or mess" actions={<Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>File a complaint</Button>} />
      <FilterBar><FilterSelect label="Status" options={COMPLAINT_STATUS} onChange={(v) => setFilter({ status: v })} value="" /></FilterBar>
      <DataTable columns={columns} rows={rows} loading={loading} error={error} onRetry={reload} pagination={pagination} onPageChange={setPage} onLimitChange={setLimit} emptyTitle="No complaints filed" emptyMessage="If something needs attention, file a complaint and we will track it here." />

      <FormDialog open={dialog} title="File a complaint" onClose={() => setDialog(false)} onSubmit={submit} busy={busy} error={formError} submitLabel="Submit">
        <Box sx={{ display: 'grid', gap: 2 }}>
          <TextField select label="Category" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} error={!!errors.category} helperText={errors.category}>{COMPLAINT_CATEGORIES.map((c) => <MenuItem key={c} value={c}>{titleCase(c)}</MenuItem>)}</TextField>
          <TextField label="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} error={!!errors.title} helperText={errors.title} />
          <TextField label="Description" multiline minRows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} error={!!errors.description} helperText={errors.description || 'Please include as much detail as possible'} />
          <TextField select label="Priority" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>{PRIORITIES.map((p) => <MenuItem key={p} value={p}>{titleCase(p)}</MenuItem>)}</TextField>
        </Box>
      </FormDialog>

      <FormDialog open={!!detail} title={detail?.title} onClose={() => setDetail(null)} hideActions maxWidth="sm">
        <ComplaintReadOnly id={detail?._id} onClose={() => setDetail(null)} />
      </FormDialog>
    </>
  );
}

function ComplaintReadOnly({ id, onClose }) {
  const { data } = useFetch(id ? `/complaints/${id}` : null, {}, [id]);
  if (!data) return null;
  return (
    <Box sx={{ display: 'grid', gap: 2.5 }}>
      <KeyValue items={[['Category', titleCase(data.category)], ['Priority', <StatusBadge key="p" value={data.priority} />], ['Status', <StatusBadge key="s" value={data.status} />], ['Filed', fmtDateTime(data.createdAt)]]} />
      <Box><Typography variant="subtitle2">Description</Typography><Typography variant="body2" color="text.secondary">{data.description}</Typography></Box>
      {data.resolution && <Box><Typography variant="subtitle2">Resolution</Typography><Typography variant="body2" color="text.secondary">{data.resolution}</Typography></Box>}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>History</Typography>
        <List dense disablePadding>{data.statusHistory.map((h, i) => <ListItem key={i} disableGutters><ListItemText primary={titleCase(h.status)} secondary={fmtDateTime(h.at)} /></ListItem>)}</List>
      </Box>
      <Button onClick={onClose} sx={{ justifySelf: 'start' }}>Close</Button>
    </Box>
  );
}
