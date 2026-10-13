import { useState } from 'react';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Rating from '@mui/material/Rating';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import FilterBar from '../components/FilterBar';
import FilterSelect from '../components/FilterSelect';
import FormDialog from '../components/FormDialog';
import Section from '../components/Section';
import StatCard from '../components/StatCard';
import useList from '../hooks/useList';
import useFetch from '../hooks/useFetch';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { MEAL_TYPES, RATING_LABELS } from '../utils/constants';
import { fmtDate, todayISO, titleCase } from '../utils/format';

export default function Feedback() {
  const { role } = useAuth();
  const toast = useToast();
  const isStaff = role !== 'student';
  const { rows, pagination, loading, error, setFilter, setPage, setLimit, reload } = useList('/feedback', {});
  const { data: summary } = useFetch(isStaff ? '/feedback/summary' : null);
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({ mealType: 'lunch', date: todayISO(), rating: 4, comment: '' });
  const [error2, setError2] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true); setError2('');
    try { await api.post('/feedback', form); toast.success('Thanks for the feedback'); setDialog(false); reload(); }
    catch (err) { setError2(err.message); } finally { setBusy(false); }
  };

  const columns = [
    ...(isStaff ? [{ key: 'student', label: 'Student', render: (r) => r.student.name }] : []),
    { key: 'date', label: 'Date', render: (r) => fmtDate(r.date) },
    { key: 'mealType', label: 'Meal', render: (r) => titleCase(r.mealType) },
    { key: 'rating', label: 'Rating', render: (r) => <Rating value={r.rating} readOnly size="small" /> },
    { key: 'comment', label: 'Comment', render: (r) => r.comment || '-' },
  ];

  return (
    <>
      <PageHeader title={isStaff ? 'Mess feedback' : 'Mess feedback'} subtitle={isStaff ? 'What students are saying about meals' : 'Rate your meals to help the mess improve'} actions={!isStaff && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog(true)}>Give feedback</Button>} />
      {isStaff && summary && (
        <Grid container spacing={2} sx={{ mb: 2.5 }}>
          <Grid item xs={6} sm={3}><StatCard label="Overall average" value={summary.overallAverage || '-'} hint={`${summary.totalResponses} responses`} /></Grid>
          {summary.byMeal.map((m) => <Grid item xs={6} sm={3} key={m.mealType}><StatCard label={titleCase(m.mealType)} value={m.average ?? '-'} hint={`${m.count} responses`} /></Grid>)}
        </Grid>
      )}
      <FilterBar><FilterSelect label="Meal" options={MEAL_TYPES.map((m) => ({ value: m, label: titleCase(m) }))} onChange={(v) => setFilter({ mealType: v })} value="" /></FilterBar>
      <DataTable columns={columns} rows={rows} loading={loading} error={error} onRetry={reload} pagination={pagination} onPageChange={setPage} onLimitChange={setLimit} emptyTitle="No feedback yet" />

      <FormDialog open={dialog} title="Rate a meal" onClose={() => setDialog(false)} onSubmit={submit} busy={busy} error={error2} submitLabel="Submit">
        <Box sx={{ display: 'grid', gap: 2 }}>
          <TextField label="Date" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} InputLabelProps={{ shrink: true }} inputProps={{ max: todayISO() }} />
          <TextField select label="Meal" value={form.mealType} onChange={(e) => setForm((f) => ({ ...f, mealType: e.target.value }))}>{MEAL_TYPES.map((m) => <MenuItem key={m} value={m}>{titleCase(m)}</MenuItem>)}</TextField>
          <Box>
            <Typography variant="body2" sx={{ mb: 0.5 }}>Rating</Typography>
            <Rating value={form.rating} onChange={(_, v) => setForm((f) => ({ ...f, rating: v || 1 }))} size="large" />
            <Typography variant="caption" color="text.secondary" display="block">{RATING_LABELS[form.rating]}</Typography>
          </Box>
          <TextField label="Comment (optional)" multiline minRows={2} value={form.comment} onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))} />
        </Box>
      </FormDialog>
    </>
  );
}
