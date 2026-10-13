import { useState } from 'react';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import AddIcon from '@mui/icons-material/Add';
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
import { useAuth } from '../context/AuthContext';
import { fmtDate, money, monthISO } from '../utils/format';
import { BILL_STATUS, PAYMENT_METHODS } from '../utils/constants';

export default function Bills() {
  const { role } = useAuth();
  const toast = useToast();
  const { rows, pagination, loading, error, setFilter, setPage, setLimit, reload } = useList('/mess-bills', {});
  const { rows: messes } = useList('/messes', { limit: 50 });
  const [genDialog, setGenDialog] = useState(false);
  const [detail, setDetail] = useState(null);

  const columns = [
    { key: 'student', label: 'Student', render: (r) => `${r.student.name} (${r.student.studentId})` },
    { key: 'mess', label: 'Mess', render: (r) => r.mess.name },
    { key: 'month', label: 'Month' },
    { key: 'finalAmount', label: 'Amount', align: 'right', render: (r) => money(r.finalAmount) },
    { key: 'paidAmount', label: 'Paid', align: 'right', render: (r) => money(r.paidAmount) },
    { key: 'dueDate', label: 'Due', render: (r) => fmtDate(r.dueDate) },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> },
    { key: 'actions', label: '', align: 'right', render: (r) => <Button size="small" onClick={() => setDetail(r)}>Details</Button> },
  ];

  return (
    <>
      <PageHeader title="Mess bills" subtitle="Generate, review and record payments" actions={role !== 'warden' && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setGenDialog(true)}>Generate bills</Button>} />
      <FilterBar>
        <SearchBar placeholder="Search by student name or ID" onSearch={(v) => setFilter({ search: v })} />
        <FilterSelect label="Status" options={BILL_STATUS} onChange={(v) => setFilter({ status: v })} value="" />
        {messes.length > 1 && <FilterSelect label="Mess" options={messes.map((m) => ({ value: m._id, label: m.name }))} onChange={(v) => setFilter({ mess: v })} value="" />}
        <TextField label="Month" type="month" size="small" onChange={(e) => setFilter({ month: e.target.value })} InputLabelProps={{ shrink: true }} sx={{ minWidth: 150 }} />
      </FilterBar>
      <DataTable columns={columns} rows={rows} loading={loading} error={error} onRetry={reload} pagination={pagination} onPageChange={setPage} onLimitChange={setLimit} emptyTitle="No bills found" />
      {role !== 'warden' && <GenerateDialog open={genDialog} onClose={() => setGenDialog(false)} messes={messes} onDone={reload} />}
      <BillDetail bill={detail} onClose={() => setDetail(null)} readOnly={role === 'warden'} onChanged={reload} />
    </>
  );
}

function GenerateDialog({ open, onClose, messes, onDone }) {
  const toast = useToast();
  const [form, setForm] = useState({ mess: '', month: monthISO(-1), dueDate: '', otherCharges: 0 });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const submit = async () => {
    if (!form.mess || !form.month || !form.dueDate) return setError('Fill in mess, month and due date');
    setBusy(true); setError(''); setResult(null);
    try {
      const res = await api.post('/mess-bills/generate', { ...form, otherCharges: Number(form.otherCharges) || 0 });
      setResult(res.data); toast.success(`${res.data.created} bill(s) generated`); onDone();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <FormDialog open={open} title="Generate mess bills" onClose={() => { onClose(); setResult(null); }} onSubmit={submit} busy={busy} error={error} submitLabel="Generate">
      <Box sx={{ display: 'grid', gap: 2 }}>
        <Typography variant="body2" color="text.secondary">Generates one bill per active student in the mess, based on their recorded meal attendance for the month. Students who already have a bill for this month are skipped.</Typography>
        <TextField select label="Mess" value={form.mess} onChange={(e) => setForm((f) => ({ ...f, mess: e.target.value }))}>{messes.map((m) => <MenuItem key={m._id} value={m._id}>{m.name}</MenuItem>)}</TextField>
        <TextField label="Billing month" type="month" value={form.month} onChange={(e) => setForm((f) => ({ ...f, month: e.target.value }))} InputLabelProps={{ shrink: true }} />
        <TextField label="Due date" type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} InputLabelProps={{ shrink: true }} />
        <TextField label="Other charges per student (optional)" type="number" value={form.otherCharges} onChange={(e) => setForm((f) => ({ ...f, otherCharges: e.target.value }))} />
        {result && <Alert severity="success">Generated {result.created}, skipped {result.skipped} (already billed) of {result.totalStudents} students.</Alert>}
      </Box>
    </FormDialog>
  );
}

function BillDetail({ bill, onClose, readOnly, onChanged }) {
  const toast = useToast();
  const { data, reload } = useFetch(bill ? `/mess-bills/${bill._id}` : null, {}, [bill?._id]);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pay = async () => {
    if (!(Number(amount) > 0)) return setError('Enter a valid amount');
    setBusy(true); setError('');
    try { await api.post(`/mess-bills/${bill._id}/payments`, { amount: Number(amount), method }); toast.success('Payment recorded'); setAmount(''); reload(); onChanged(); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <FormDialog open={!!bill} title={bill ? `Bill for ${bill.student.name} — ${bill.month}` : ''} onClose={onClose} hideActions maxWidth="sm">
      {data && (
        <Box sx={{ display: 'grid', gap: 2.5 }}>
          <KeyValue items={[['Total meals', data.totalMeals], ['Meal charges', money(data.mealCharges)], ['Other charges', money(data.otherCharges)], ['Discount', money(data.discount)], ['Final amount', money(data.finalAmount)], ['Paid', money(data.paidAmount)], ['Balance', money(data.finalAmount - data.paidAmount)], ['Due date', fmtDate(data.dueDate)], ['Status', <StatusBadge key="s" value={data.status} />]]} />
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Payment history</Typography>
            {data.payments.length ? (
              <Table size="small"><TableHead><TableRow><TableCell>Date</TableCell><TableCell>Amount</TableCell><TableCell>Method</TableCell><TableCell>Recorded by</TableCell></TableRow></TableHead>
                <TableBody>{data.payments.map((p) => <TableRow key={p._id}><TableCell>{fmtDate(p.paidAt)}</TableCell><TableCell>{money(p.amount)}</TableCell><TableCell>{p.method}</TableCell><TableCell>{p.recordedBy?.name}</TableCell></TableRow>)}</TableBody>
              </Table>
            ) : <Typography variant="body2" color="text.secondary">No payments recorded yet.</Typography>}
          </Box>
          {!readOnly && data.status !== 'paid' && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Record a payment</Typography>
              {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                <TextField label="Amount" type="number" size="small" value={amount} onChange={(e) => setAmount(e.target.value)} sx={{ maxWidth: 140 }} />
                <TextField select label="Method" size="small" value={method} onChange={(e) => setMethod(e.target.value)} sx={{ minWidth: 140 }}>{PAYMENT_METHODS.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}</TextField>
                <Button variant="contained" onClick={pay} disabled={busy}>{busy ? 'Saving' : 'Record payment'}</Button>
              </Box>
            </Box>
          )}
          <Button onClick={onClose} sx={{ justifySelf: 'start' }}>Close</Button>
        </Box>
      )}
    </FormDialog>
  );
}
