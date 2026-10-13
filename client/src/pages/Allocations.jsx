import { useState } from 'react';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import SwapHorizIcon from '@mui/icons-material/SwapHorizOutlined';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import FilterBar from '../components/FilterBar';
import FilterSelect from '../components/FilterSelect';
import FormDialog from '../components/FormDialog';
import ConfirmDialog from '../components/ConfirmDialog';
import StatusBadge from '../components/StatusBadge';
import useList from '../hooks/useList';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { fmtDate } from '../utils/format';

const emptyForm = { hostel: '', studentId: '', roomId: '', bedNumber: '', remarks: '' };

export default function Allocations() {
  const toast = useToast();
  const [tab, setTab] = useState('active');
  const { rows, pagination, loading, error, setFilter, setPage, setLimit, reload } = useList('/allocations', { status: tab });
  const { rows: hostels } = useList('/hostels', { limit: 100 });
  const [dialog, setDialog] = useState(null); // 'allocate' | 'transfer'
  const [form, setForm] = useState(emptyForm);
  const [studentQuery, setStudentQuery] = useState('');
  const [studentOptions, setStudentOptions] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [vacate, setVacate] = useState(null);

  const changeTab = (_, v) => { setTab(v); setFilter({ status: v }); };

  const searchStudents = async (q) => {
    setStudentQuery(q);
    if (q.length < 2) return setStudentOptions([]);
    const params = dialog === 'allocate' ? { search: q, unallocated: 'true', limit: 10 } : { search: q, limit: 10 };
    const res = await api.get('/students', { params });
    setStudentOptions(res.data);
  };
  const loadRooms = async (hostelId) => { if (!hostelId) return setRooms([]); const res = await api.get('/beds/available', { params: { hostel: hostelId } }); setRooms(res.data); };

  const openAllocate = () => { setForm(emptyForm); setStudentOptions([]); setRooms([]); setFormError(''); setDialog('allocate'); };
  const openTransfer = () => { setForm(emptyForm); setStudentOptions([]); setRooms([]); setFormError(''); setDialog('transfer'); };

  const selectedRoom = rooms.find((r) => r._id === form.roomId);

  const submit = async () => {
    if (!form.studentId || !form.roomId || !form.bedNumber) return setFormError('Select a student, room and bed');
    setBusy(true); setFormError('');
    try {
      const payload = { studentId: form.studentId, roomId: form.roomId, bedNumber: Number(form.bedNumber), remarks: form.remarks || undefined };
      await api.post(dialog === 'allocate' ? '/allocations' : '/allocations/transfer', payload);
      toast.success(dialog === 'allocate' ? 'Room allocated' : 'Room changed');
      setDialog(null); reload();
    } catch (err) { setFormError(err.message); } finally { setBusy(false); }
  };
  const doVacate = async () => { try { await api.post(`/allocations/${vacate._id}/vacate`, {}); toast.success('Bed vacated'); setVacate(null); reload(); } catch (err) { toast.error(err.message); } };

  const columns = [
    { key: 'student', label: 'Student', render: (r) => `${r.student.name} (${r.student.studentId})` },
    { key: 'hostel', label: 'Hostel', render: (r) => r.hostel.name },
    { key: 'room', label: 'Room / Bed', render: (r) => `${r.room.roomNumber} / Bed ${r.bedNumber}` },
    { key: 'checkInDate', label: 'Check-in', render: (r) => fmtDate(r.checkInDate) },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> },
    ...(tab === 'active' ? [{ key: 'actions', label: '', align: 'right', render: (r) => <Button size="small" color="error" onClick={() => setVacate(r)}>Vacate</Button> }] : []),
  ];

  return (
    <>
      <PageHeader title="Room allocations" subtitle="Allocate, transfer and vacate student beds" actions={
        <>
          <Button variant="outlined" startIcon={<SwapHorizIcon />} onClick={openTransfer}>Change room</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAllocate}>Allocate bed</Button>
        </>
      } />
      <Tabs value={tab} onChange={changeTab} sx={{ mb: 2 }}>
        <Tab value="active" label="Active" /><Tab value="vacated" label="Vacated" /><Tab value="transferred" label="Transferred" /><Tab value="all" label="All" />
      </Tabs>
      <FilterBar><FilterSelect label="Hostel" options={hostels.map((h) => ({ value: h._id, label: h.name }))} onChange={(v) => setFilter({ hostel: v })} value="" /></FilterBar>
      <DataTable columns={columns} rows={rows} loading={loading} error={error} onRetry={reload} pagination={pagination} onPageChange={setPage} onLimitChange={setLimit} emptyTitle="No allocations found" />

      <FormDialog open={!!dialog} title={dialog === 'allocate' ? 'Allocate a bed' : 'Change room'} onClose={() => setDialog(null)} onSubmit={submit} busy={busy} error={formError} submitLabel={dialog === 'allocate' ? 'Allocate' : 'Move student'}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Autocomplete
              options={studentOptions} getOptionLabel={(o) => `${o.name} (${o.studentId})`} filterOptions={(x) => x} onInputChange={(_, v) => searchStudents(v)}
              onChange={(_, val) => setForm((f) => ({ ...f, studentId: val?._id || '', roomId: '', bedNumber: '' }))}
              renderInput={(params) => <TextField {...params} label={dialog === 'allocate' ? 'Unallocated student' : 'Student'} placeholder="Type a name or student ID" helperText="Type at least 2 characters" />} />
          </Grid>
          <Grid item xs={12} sm={6}><TextField select label="Hostel" value={form.hostel} onChange={(e) => { setForm((f) => ({ ...f, hostel: e.target.value, roomId: '', bedNumber: '' })); loadRooms(e.target.value); }}>{hostels.map((h) => <MenuItem key={h._id} value={h._id}>{h.name}</MenuItem>)}</TextField></Grid>
          <Grid item xs={12} sm={6}><TextField select label="Room" value={form.roomId} onChange={(e) => setForm((f) => ({ ...f, roomId: e.target.value, bedNumber: '' }))} disabled={!form.hostel}>{rooms.map((r) => <MenuItem key={r._id} value={r._id}>{r.roomNumber} ({r.block.name}) — {r.freeBeds.length} free</MenuItem>)}</TextField></Grid>
          <Grid item xs={12} sm={6}>
            <TextField select label="Bed" value={form.bedNumber} onChange={(e) => setForm((f) => ({ ...f, bedNumber: e.target.value }))} disabled={!selectedRoom}>
              {(selectedRoom?.freeBeds || []).map((n) => <MenuItem key={n} value={n}>Bed {n}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12}><TextField label="Remarks (optional)" value={form.remarks} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))} /></Grid>
        </Grid>
      </FormDialog>

      <ConfirmDialog open={!!vacate} title="Vacate bed?" destructive confirmLabel="Vacate" message={`Release bed ${vacate?.bedNumber} in room ${vacate?.room?.roomNumber} for ${vacate?.student?.name}?`} onConfirm={doVacate} onClose={() => setVacate(null)} />
    </>
  );
}
