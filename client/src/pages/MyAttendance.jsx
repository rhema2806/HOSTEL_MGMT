import TextField from '@mui/material/TextField';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import FilterBar from '../components/FilterBar';
import FilterSelect from '../components/FilterSelect';
import StatusBadge from '../components/StatusBadge';
import useList from '../hooks/useList';
import { fmtDate, titleCase } from '../utils/format';
import { MEAL_TYPES } from '../utils/constants';

export default function MyAttendance() {
  const { rows, pagination, loading, error, setFilter, setPage, setLimit, reload } = useList('/meal-attendance', {});
  const columns = [
    { key: 'date', label: 'Date', render: (r) => fmtDate(r.date) },
    { key: 'mealType', label: 'Meal', render: (r) => titleCase(r.mealType) },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> },
    { key: 'markedAt', label: 'Marked at', render: (r) => new Date(r.markedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) },
  ];
  return (
    <>
      <PageHeader title="My meal attendance" subtitle="Your recorded attendance history" />
      <FilterBar>
        <FilterSelect label="Meal" options={MEAL_TYPES.map((m) => ({ value: m, label: titleCase(m) }))} onChange={(v) => setFilter({ mealType: v })} value="" />
        <TextField label="From" type="date" size="small" onChange={(e) => setFilter({ from: e.target.value })} InputLabelProps={{ shrink: true }} />
        <TextField label="To" type="date" size="small" onChange={(e) => setFilter({ to: e.target.value })} InputLabelProps={{ shrink: true }} />
      </FilterBar>
      <DataTable columns={columns} rows={rows} loading={loading} error={error} onRetry={reload} pagination={pagination} onPageChange={setPage} onLimitChange={setLimit} emptyTitle="No attendance records yet" />
    </>
  );
}
