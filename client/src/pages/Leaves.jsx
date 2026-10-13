import { useState } from 'react';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import FilterBar from '../components/FilterBar';
import FilterSelect from '../components/FilterSelect';
import StatusBadge from '../components/StatusBadge';
import FormDialog from '../components/FormDialog';
import KeyValue from '../components/KeyValue';
import useList from '../hooks/useList';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { LEAVE_STATUS } from '../utils/constants';
import { fmtDate } from '../utils/format';

export default function Leaves() {
  const toast = useToast();
  const { rows, pagination, loading, error, setFilter, setPage, setLimit, reload } = useList('/leaves', {});
  const [detail, setDetail] = useState(null);

  const columns = [
    { key: 'student', label: 'Student', render: (r) => `${r.student.name} (${r.student.studentId})` },
    { key: 'dates', label: 'Dates', render: (r) => `${fmtDate(r.startDate)} — ${fmtDate(r.endDate)}` },
    { key: 'reason', label: 'Reason', render: (r) => <Box sx={{ maxWidth: 260, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.reason}</Box> },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> },
    { key: 'actions', label: '', align: 'right', render: (r) => <Button size="small" onClick={() => setDetail(r)}>Review</Button> },
  ];

  return (
    <>
      <PageHeader title="Leave requests" subtitle="Approve or reject student leave requests" />
      <FilterBar><FilterSelect label="Status" options={LEAVE_STATUS} onChange={(v) => setFilter({ status: v })} value="pending" /></FilterBar>
      <DataTable columns={columns} rows={rows} loading={loading} error={error} onRetry={reload} pagination={pagination} onPageChange={setPage} onLimitChange={setLimit} emptyTitle="No leave requests found" />
      <LeaveDetail leave={detail} onClose={() => setDetail(null)} onChanged={reload} />
    </>
  );
}

function LeaveDetail({ leave, onClose, onChanged }) {
  const toast = useToast();
  const [remarks, setRemarks] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const decide = async (status) => {
    if (status === 'rejected' && !remarks.trim()) return setError('Add remarks explaining the rejection');
    setBusy(true); setError('');
    try { await api.patch(`/leaves/${leave._id}/decision`, { status, remarks: remarks || undefined }); toast.success(`Leave ${status}`); setRemarks(''); onClose(); onChanged(); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <FormDialog open={!!leave} title={leave ? `Leave request — ${leave.student.name}` : ''} onClose={onClose} hideActions maxWidth="sm">
      {leave && (
        <Box sx={{ display: 'grid', gap: 2.5 }}>
          <KeyValue items={[['Student', `${leave.student.name} (${leave.student.studentId})`], ['Department / Year', `${leave.student.department}, Year ${leave.student.year}`], ['From', fmtDate(leave.startDate)], ['To', fmtDate(leave.endDate)], ['Destination', leave.destination], ['Contact', leave.contact], ['Status', <StatusBadge key="s" value={leave.status} />]]} />
          <Box><Box component="span" sx={{ fontWeight: 600, fontSize: 14 }}>Reason</Box><Box sx={{ fontSize: 14, color: 'text.secondary', mt: 0.5 }}>{leave.reason}</Box></Box>
          {leave.remarks && <Box><Box component="span" sx={{ fontWeight: 600, fontSize: 14 }}>Remarks</Box><Box sx={{ fontSize: 14, color: 'text.secondary', mt: 0.5 }}>{leave.remarks}</Box></Box>}
          {leave.status === 'pending' && (
            <Box>
              {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
              <TextField label="Remarks (required to reject)" fullWidth multiline minRows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} sx={{ mb: 1.5 }} />
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="contained" color="success" onClick={() => decide('approved')} disabled={busy}>Approve</Button>
                <Button variant="outlined" color="error" onClick={() => decide('rejected')} disabled={busy}>Reject</Button>
              </Box>
            </Box>
          )}
          <Button onClick={onClose} sx={{ justifySelf: 'start' }}>Close</Button>
        </Box>
      )}
    </FormDialog>
  );
}
