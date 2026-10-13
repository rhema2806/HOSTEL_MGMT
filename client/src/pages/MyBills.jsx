import { useState } from 'react';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import FormDialog from '../components/FormDialog';
import KeyValue from '../components/KeyValue';
import useList from '../hooks/useList';
import useFetch from '../hooks/useFetch';
import { fmtDate, money } from '../utils/format';

export default function MyBills() {
  const { rows, pagination, loading, error, setPage, setLimit, reload } = useList('/mess-bills', { sort: 'month:desc' });
  const [detail, setDetail] = useState(null);
  const columns = [
    { key: 'month', label: 'Month' },
    { key: 'totalMeals', label: 'Meals', align: 'right' },
    { key: 'finalAmount', label: 'Amount', align: 'right', render: (r) => money(r.finalAmount) },
    { key: 'paidAmount', label: 'Paid', align: 'right', render: (r) => money(r.paidAmount) },
    { key: 'dueDate', label: 'Due date', render: (r) => fmtDate(r.dueDate) },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> },
    { key: 'actions', label: '', align: 'right', render: (r) => <Button size="small" onClick={() => setDetail(r)}>Details</Button> },
  ];
  return (
    <>
      <PageHeader title="My mess bills" subtitle="Monthly bills and payment status" />
      <DataTable columns={columns} rows={rows} loading={loading} error={error} onRetry={reload} pagination={pagination} onPageChange={setPage} onLimitChange={setLimit} emptyTitle="No bills yet" emptyMessage="Your mess bills will appear here once generated." />
      <BillDetail bill={detail} onClose={() => setDetail(null)} />
    </>
  );
}

function BillDetail({ bill, onClose }) {
  const { data } = useFetch(bill ? `/mess-bills/${bill._id}` : null, {}, [bill?._id]);
  return (
    <FormDialog open={!!bill} title={bill ? `Bill for ${bill.month}` : ''} onClose={onClose} hideActions maxWidth="sm">
      {data && (
        <Box sx={{ display: 'grid', gap: 2.5 }}>
          <KeyValue items={[['Total meals', data.totalMeals], ['Meal charges', money(data.mealCharges)], ['Other charges', money(data.otherCharges)], ['Discount', money(data.discount)], ['Final amount', money(data.finalAmount)], ['Paid', money(data.paidAmount)], ['Balance', money(data.finalAmount - data.paidAmount)], ['Due date', fmtDate(data.dueDate)], ['Status', <StatusBadge key="s" value={data.status} />]]} />
          <Typography variant="caption" color="text.secondary">Payments are recorded by the mess office. Contact them to make or confirm a payment.</Typography>
          <Button onClick={onClose} sx={{ justifySelf: 'start' }}>Close</Button>
        </Box>
      )}
    </FormDialog>
  );
}
