import { useState } from 'react';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import AccountCircleIcon from '@mui/icons-material/AccountCircleOutlined';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import FilterBar from '../components/FilterBar';
import FilterSelect from '../components/FilterSelect';
import SearchBar from '../components/SearchBar';
import FormDialog from '../components/FormDialog';
import StatusBadge from '../components/StatusBadge';
import ConfirmDialog from '../components/ConfirmDialog';
import useList from '../hooks/useList';
import useFetch from '../hooks/useFetch';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { validateForm } from '../utils/validate';
import { fmtDate } from '../utils/format';

const emptyForm = { hostel: '', block: '', roomNumber: '', floor: '', capacity: 4, roomType: 'standard' };

export default function Rooms() {
  const toast = useToast();
  const { rows, pagination, loading, error, setFilter, setPage, setLimit, reload, params } = useList('/rooms', {});
  const { rows: hostels } = useList('/hostels', { limit: 100 });
  const { rows: blocks } = useList('/blocks', params.hostel ? { hostel: params.hostel, limit: 100 } : { limit: 0 }, { enabled: !!params.hostel });
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formBlocks, setFormBlocks] = useState([]);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [remove, setRemove] = useState(null);
  const [detail, setDetail] = useState(null);

  const loadBlocksFor = async (hostelId) => { if (!hostelId) return setFormBlocks([]); const r = await api.get('/blocks', { params: { hostel: hostelId, limit: 100 } }); setFormBlocks(r.data); };
  const openCreate = async () => { setForm(emptyForm); setFormBlocks([]); setErrors({}); setFormError(''); setDialog({ mode: 'create' }); };
  const openEdit = async (row) => { setForm({ hostel: row.hostel._id, block: row.block._id, roomNumber: row.roomNumber, floor: row.floor, capacity: row.capacity, roomType: row.roomType, status: row.status }); await loadBlocksFor(row.hostel._id); setErrors({}); setFormError(''); setDialog({ mode: 'edit', row }); };
  const set = (k) => (e) => { const v = e.target.value; setForm((f) => ({ ...f, [k]: v })); if (k === 'hostel') { setForm((f) => ({ ...f, hostel: v, block: '' })); loadBlocksFor(v); } };

  const submit = async () => {
    const v = validateForm(form, { block: { label: 'Block', required: true }, roomNumber: { label: 'Room number', required: true }, floor: { label: 'Floor', required: true }, capacity: { label: 'Capacity', required: true } });
    setErrors(v);
    if (Object.keys(v).length) return;
    setBusy(true); setFormError('');
    try {
      const payload = { block: form.block, roomNumber: form.roomNumber, floor: Number(form.floor), capacity: Number(form.capacity), roomType: form.roomType, ...(form.status && { status: form.status }) };
      if (dialog.mode === 'create') { await api.post('/rooms', payload); toast.success('Room created'); }
      else { await api.patch(`/rooms/${dialog.row._id}`, payload); toast.success('Room updated'); }
      setDialog(null); reload();
    } catch (err) { setFormError(err.message); } finally { setBusy(false); }
  };
  const doRemove = async () => { try { await api.delete(`/rooms/${remove._id}`); toast.success('Room removed'); setRemove(null); reload(); } catch (err) { toast.error(err.message); } };

  const columns = [
    { key: 'roomNumber', label: 'Room', render: (r) => <a href="#" onClick={(e) => { e.preventDefault(); setDetail(r); }} style={{ fontWeight: 600, color: 'inherit', textDecoration: 'none' }}>{r.roomNumber}</a> },
    { key: 'hostel', label: 'Hostel', render: (r) => r.hostel.name },
    { key: 'block', label: 'Block', render: (r) => r.block.name },
    { key: 'floor', label: 'Floor', align: 'center' },
    { key: 'capacity', label: 'Capacity', align: 'center' },
    { key: 'occ', label: 'Occupied / Vacant', align: 'center', render: (r) => `${r.occupied} / ${r.vacant}` },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> },
    { key: 'actions', label: '', align: 'right', render: (r) => (
      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
        <Button size="small" onClick={() => openEdit(r)}>Edit</Button>
        {r.occupied === 0 && <Button size="small" color="error" onClick={() => setRemove(r)}>Delete</Button>}
      </Box>
    ) },
  ];

  return (
    <>
      <PageHeader title="Rooms and beds" subtitle="Manage rooms and view bed-level occupancy" actions={<Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Add room</Button>} />
      <FilterBar>
        <SearchBar placeholder="Search by room number" onSearch={(v) => setFilter({ search: v })} />
        <FilterSelect label="Hostel" options={hostels.map((h) => ({ value: h._id, label: h.name }))} onChange={(v) => setFilter({ hostel: v })} value="" />
        <FilterSelect label="Status" options={['available', 'maintenance', 'closed']} onChange={(v) => setFilter({ status: v })} value="" />
        <FilterSelect label="Vacancy" options={[{ value: 'vacant', label: 'Has vacancy' }, { value: 'full', label: 'Full' }]} onChange={(v) => setFilter({ vacancy: v })} value="" />
      </FilterBar>
      <DataTable columns={columns} rows={rows} loading={loading} error={error} onRetry={reload} pagination={pagination} onPageChange={setPage} onLimitChange={setLimit} emptyTitle="No rooms found" />

      <FormDialog open={!!dialog} title={dialog?.mode === 'create' ? 'Add room' : 'Edit room'} onClose={() => setDialog(null)} onSubmit={submit} busy={busy} error={formError}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}><TextField select label="Hostel" value={form.hostel} onChange={set('hostel')} disabled={dialog?.mode === 'edit'}>{hostels.map((h) => <MenuItem key={h._id} value={h._id}>{h.name}</MenuItem>)}</TextField></Grid>
          <Grid item xs={12} sm={6}><TextField select label="Block" value={form.block} onChange={set('block')} error={!!errors.block} helperText={errors.block} disabled={!form.hostel}>{formBlocks.map((b) => <MenuItem key={b._id} value={b._id}>{b.name}</MenuItem>)}</TextField></Grid>
          <Grid item xs={12} sm={4}><TextField label="Room number" value={form.roomNumber} onChange={set('roomNumber')} error={!!errors.roomNumber} helperText={errors.roomNumber} /></Grid>
          <Grid item xs={6} sm={4}><TextField label="Floor" type="number" value={form.floor} onChange={set('floor')} error={!!errors.floor} helperText={errors.floor} /></Grid>
          <Grid item xs={6} sm={4}><TextField label="Capacity" type="number" inputProps={{ min: 1, max: 12 }} value={form.capacity} onChange={set('capacity')} error={!!errors.capacity} helperText={errors.capacity} /></Grid>
          <Grid item xs={12} sm={6}><TextField select label="Room type" value={form.roomType} onChange={set('roomType')}>{['standard', 'ac', 'deluxe'].map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}</TextField></Grid>
          {dialog?.mode === 'edit' && <Grid item xs={12} sm={6}><TextField select label="Status" value={form.status} onChange={set('status')}>{['available', 'maintenance', 'closed'].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}</TextField></Grid>}
        </Grid>
      </FormDialog>

      <ConfirmDialog open={!!remove} title="Delete room?" destructive confirmLabel="Delete" message={`Delete room ${remove?.roomNumber}? Rooms with allocation history are closed instead.`} onConfirm={doRemove} onClose={() => setRemove(null)} />

      <RoomDetailDialog room={detail} onClose={() => setDetail(null)} />
    </>
  );
}

function RoomDetailDialog({ room, onClose }) {
  const { data } = useFetch(room ? `/rooms/${room._id}` : null, {}, [room?._id]);
  return (
    <FormDialog open={!!room} title={room ? `Room ${room.roomNumber}` : ''} onClose={onClose} hideActions>
      {data && (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{data.hostel.name} · {data.block.name} · Floor {data.floor} · Capacity {data.capacity}</Typography>
          <Grid container spacing={1.5}>
            {data.beds.map((b) => (
              <Grid item xs={6} sm={4} key={b.bedNumber}>
                <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1.5, textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary">Bed {b.bedNumber}</Typography>
                  {b.occupied ? (
                    <>
                      <AccountCircleIcon color="primary" sx={{ display: 'block', mx: 'auto', mt: 0.5 }} />
                      <Typography variant="body2" fontWeight={600} noWrap>{b.student.name}</Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>{b.student.studentId}</Typography>
                    </>
                  ) : <Chip size="small" label="Vacant" sx={{ mt: 1 }} />}
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
      <Button sx={{ mt: 2 }} onClick={onClose}>Close</Button>
    </FormDialog>
  );
}
