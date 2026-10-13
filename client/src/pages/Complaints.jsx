import { useState } from 'react';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import FilterBar from '../components/FilterBar';
import FilterSelect from '../components/FilterSelect';
import SearchBar from '../components/SearchBar';
import StatusBadge from '../components/StatusBadge';
import FormDialog from '../components/FormDialog';
import KeyValue from '../components/KeyValue';
import useList from '../hooks/useList';
import useFetch from '../hooks/useFetch';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { COMPLAINT_CATEGORIES, COMPLAINT_STATUS, PRIORITIES } from '../utils/constants';
import { fmtDateTime, titleCase } from '../utils/format';

export default function Complaints() {
  const toast = useToast();
  const { rows, pagination, loading, error, setFilter, setPage, setLimit, reload } = useList('/complaints', {});
  const [detail, setDetail] = useState(null);

  const columns = [
    { key: 'title', label: 'Title', render: (r) => <a href="#" onClick={(e) => { e.preventDefault(); setDetail(r); }} style={{ fontWeight: 600, color: 'inherit', textDecoration: 'none' }}>{r.title}</a> },
    { key: 'student', label: 'Student', render: (r) => r.student.name },
    { key: 'category', label: 'Category', render: (r) => titleCase(r.category) },
    { key: 'priority', label: 'Priority', render: (r) => <StatusBadge value={r.priority} /> },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> },
    { key: 'createdAt', label: 'Filed', render: (r) => fmtDateTime(r.createdAt) },
  ];

  return (
    <>
      <PageHeader title="Complaints" subtitle="Review and resolve student complaints" />
      <FilterBar>
        <SearchBar placeholder="Search by title" onSearch={(v) => setFilter({ search: v })} />
        <FilterSelect label="Category" options={COMPLAINT_CATEGORIES} onChange={(v) => setFilter({ category: v })} value="" />
        <FilterSelect label="Status" options={COMPLAINT_STATUS} onChange={(v) => setFilter({ status: v })} value="" />
        <FilterSelect label="Priority" options={PRIORITIES} onChange={(v) => setFilter({ priority: v })} value="" />
      </FilterBar>
      <DataTable columns={columns} rows={rows} loading={loading} error={error} onRetry={reload} pagination={pagination} onPageChange={setPage} onLimitChange={setLimit} emptyTitle="No complaints found" />
      <ComplaintDetail complaint={detail} onClose={() => setDetail(null)} onChanged={reload} />
    </>
  );
}

function ComplaintDetail({ complaint, onClose, onChanged }) {
  const toast = useToast();
  const { data, reload } = useFetch(complaint ? `/complaints/${complaint._id}` : null, {}, [complaint?._id]);
  const [status, setStatus] = useState('');
  const [resolution, setResolution] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!status) return setError('Choose a status');
    if (['resolved', 'rejected'].includes(status) && !resolution.trim()) return setError(`Add a ${status === 'resolved' ? 'resolution' : 'reason'}`);
    setBusy(true); setError('');
    try { await api.patch(`/complaints/${complaint._id}`, { status, resolution: resolution || undefined }); toast.success('Complaint updated'); setStatus(''); setResolution(''); reload(); onChanged(); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const closed = data && ['resolved', 'rejected'].includes(data.status);
  return (
    <FormDialog open={!!complaint} title={complaint?.title} onClose={onClose} hideActions maxWidth="sm">
      {data && (
        <Box sx={{ display: 'grid', gap: 2.5 }}>
          <KeyValue items={[['Student', data.student.name], ['Category', titleCase(data.category)], ['Priority', <StatusBadge key="p" value={data.priority} />], ['Status', <StatusBadge key="s" value={data.status} />], ['Filed', fmtDateTime(data.createdAt)]]} />
          <Box><Typography variant="subtitle2">Description</Typography><Typography variant="body2" color="text.secondary">{data.description}</Typography></Box>
          {data.resolution && <Box><Typography variant="subtitle2">Resolution</Typography><Typography variant="body2" color="text.secondary">{data.resolution}</Typography></Box>}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>History</Typography>
            <List dense disablePadding>{data.statusHistory.map((h, i) => <ListItem key={i} disableGutters><ListItemText primary={titleCase(h.status)} secondary={`${h.note || ''} ${h.by?.name ? `· ${h.by.name}` : ''} · ${fmtDateTime(h.at)}`} /></ListItem>)}</List>
          </Box>
          {!closed && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Update status</Typography>
              {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
              <TextField select label="New status" size="small" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ mb: 1.5, minWidth: 180 }}>
                {COMPLAINT_STATUS.filter((s) => s !== data.status).map((s) => <MenuItem key={s} value={s}>{titleCase(s)}</MenuItem>)}
              </TextField>
              <TextField label="Note / resolution" fullWidth multiline minRows={2} value={resolution} onChange={(e) => setResolution(e.target.value)} sx={{ mb: 1.5 }} />
              <Button variant="contained" onClick={submit} disabled={busy}>{busy ? 'Saving' : 'Update'}</Button>
            </Box>
          )}
          <Button onClick={onClose} sx={{ justifySelf: 'start' }}>Close</Button>
        </Box>
      )}
    </FormDialog>
  );
}
