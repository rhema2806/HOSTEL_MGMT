import { useState } from 'react';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import AddIcon from '@mui/icons-material/Add';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import FilterBar from '../components/FilterBar';
import FilterSelect from '../components/FilterSelect';
import StatusBadge from '../components/StatusBadge';
import FormDialog from '../components/FormDialog';
import ConfirmDialog from '../components/ConfirmDialog';
import useList from '../hooks/useList';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { validateForm } from '../utils/validate';
import { LEAVE_STATUS } from '../utils/constants';
import { fmtDate, todayISO } from '../utils/format';

const emptyForm = { startDate: '', endDate: '', reason: '', destination: '', contact: '' };

export default function MyLeaves() {
  const toast = useToast();
  const { rows, pagination, loading, error, setFilter, setPage, setLimit, reload } = useList('/leaves', {});
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);

  const openCreate = () => { setForm(emptyForm); setErrors({}); setFormError(''); setDialog(true); };
  const submit = async () => {
    const v = validateForm(form, { startDate: { label: 'Start date', required: true }, endDate: { label: 'End date', required: true }, reason: { label: 'Reason', required: true, minLength: 5 } });
    if (form.startDate && form.endDate && form.endDate < form.startDate) v.endDate = 'End date cannot be before start date';
    setErrors(v);
    if (Object.keys(v).length) return;
    setBusy(true); setFormError('');
    try { await api.post('/leaves', form); toast.success('Leave request submitted'); setDialog(false); reload(); }
    catch (err) { setFormError(err.message); } finally { setBusy(false); }
  };
  const cancel = async () => { try { await api.patch(`/leaves/${cancelTarget._id}/cancel`); toast.success('Leave cancelled'); setCancelTarget(null); reload(); } catch (err) { toast.error(err.message); } };

  const columns = [
    { key: 'dates', label: 'Dates', render: (r) => `${fmtDate(r.startDate)} — ${fmtDate(r.endDate)}` },
    { key: 'reason', label: 'Reason', render: (r) => <Box sx={{ maxWidth: 260, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.reason}</Box> },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> },
    { key: 'remarks', label: 'Remarks', render: (r) => r.remarks || '-' },
    { key: 'actions', label: '', align: 'right', render: (r) => (r.status === 'pending' || (r.status === 'approved' && r.startDate > todayISO())) && <Button size="small" color="error" onClick={() => setCancelTarget(r)}>Cancel</Button> },
  ];

  return (
    <>
      <PageHeader title="My leave requests" subtitle="Apply for leave and track approvals" actions={<Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Apply for leave</Button>} />
      <FilterBar><FilterSelect label="Status" options={LEAVE_STATUS} onChange={(v) => setFilter({ status: v })} value="" /></FilterBar>
      <DataTable columns={columns} rows={rows} loading={loading} error={error} onRetry={reload} pagination={pagination} onPageChange={setPage} onLimitChange={setLimit} emptyTitle="No leave requests yet" />

      <FormDialog open={dialog} title="Apply for leave" onClose={() => setDialog(false)} onSubmit={submit} busy={busy} error={formError} submitLabel="Submit request">
        <Box sx={{ display: 'grid', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField label="Start date" type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} error={!!errors.startDate} helperText={errors.startDate} InputLabelProps={{ shrink: true }} inputProps={{ min: todayISO() }} />
            <TextField label="End date" type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} error={!!errors.endDate} helperText={errors.endDate} InputLabelProps={{ shrink: true }} inputProps={{ min: form.startDate || todayISO() }} />
          </Box>
          <TextField label="Reason" multiline minRows={2} value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} error={!!errors.reason} helperText={errors.reason} />
          <TextField label="Destination" value={form.destination} onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))} />
          <TextField label="Contact while on leave" value={form.contact} onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))} />
        </Box>
      </FormDialog>

      <ConfirmDialog open={!!cancelTarget} title="Cancel leave request?" destructive confirmLabel="Cancel request" message="This will withdraw your leave request." onConfirm={cancel} onClose={() => setCancelTarget(null)} />
    </>
  );
}
