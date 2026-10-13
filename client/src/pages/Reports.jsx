import { useState } from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Paper from '@mui/material/Paper';
import DownloadIcon from '@mui/icons-material/DownloadOutlined';
import PageHeader from '../components/PageHeader';
import Section from '../components/Section';
import StatCard from '../components/StatCard';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import useFetch from '../hooks/useFetch';
import useList from '../hooks/useList';
import { useAuth } from '../context/AuthContext';
import { downloadCsv, fmtDate, monthISO, money, titleCase } from '../utils/format';
import { DEPARTMENTS } from '../utils/constants';

const TABS = { admin: ['hostel', 'mess', 'complaints', 'leaves'], warden: ['hostel', 'complaints', 'leaves'], mess_manager: ['mess'] };

export default function Reports() {
  const { role } = useAuth();
  const tabs = TABS[role] || [];
  const [tab, setTab] = useState(tabs[0]);
  return (
    <>
      <PageHeader title="Reports" subtitle="Filterable reports across hostel and mess operations" />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2.5 }}>
        {tabs.includes('hostel') && <Tab value="hostel" label="Hostel" />}
        {tabs.includes('mess') && <Tab value="mess" label="Mess" />}
        {tabs.includes('complaints') && <Tab value="complaints" label="Complaints" />}
        {tabs.includes('leaves') && <Tab value="leaves" label="Leave" />}
      </Tabs>
      {tab === 'hostel' && <HostelReports />}
      {tab === 'mess' && <MessReports />}
      {tab === 'complaints' && <ComplaintReports />}
      {tab === 'leaves' && <LeaveReports />}
    </>
  );
}

const Toolbar = ({ children }) => <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 2 }}>{children}</Box>;
const ExportBtn = ({ rows, name }) => <Button size="small" startIcon={<DownloadIcon />} disabled={!rows?.length} onClick={() => downloadCsv(`${name}.csv`, rows)}>Export CSV</Button>;

function HostelReports() {
  const { rows: hostels } = useList('/hostels', { limit: 100 });
  const [hostel, setHostel] = useState('');
  const [dept, setDept] = useState('');
  const [year, setYear] = useState('');
  const occ = useFetch('/reports/hostel/occupancy', { hostel: hostel || undefined }, [hostel]);
  const vac = useFetch('/reports/hostel/vacancies', { hostel: hostel || undefined }, [hostel]);
  const students = useFetch('/reports/hostel/students', { hostel: hostel || undefined, department: dept || undefined, year: year || undefined }, [hostel, dept, year]);

  return (
    <Box sx={{ display: 'grid', gap: 2.5 }}>
      <Toolbar>
        <TextField select size="small" label="Hostel" value={hostel} onChange={(e) => setHostel(e.target.value)} sx={{ minWidth: 180 }}><MenuItem value="">All</MenuItem>{hostels.map((h) => <MenuItem key={h._id} value={h._id}>{h.name}</MenuItem>)}</TextField>
      </Toolbar>
      <Section title="Occupancy by hostel" action={<ExportBtn rows={occ.data} name="hostel_occupancy" />}>
        {occ.loading ? <LoadingSpinner /> : occ.error ? <ErrorState message={occ.error} /> : !occ.data?.length ? <EmptyState title="No data" /> : (
          <Table size="small"><TableHead><TableRow>{['Hostel', 'Type', 'Rooms', 'Beds', 'Occupied', 'Vacant', 'Occupancy %'].map((h) => <TableCell key={h}>{h}</TableCell>)}</TableRow></TableHead>
            <TableBody>{occ.data.map((r) => <TableRow key={r.hostel}><TableCell>{r.hostel}</TableCell><TableCell>{r.type}</TableCell><TableCell>{r.rooms}</TableCell><TableCell>{r.beds}</TableCell><TableCell>{r.occupied}</TableCell><TableCell>{r.vacant}</TableCell><TableCell>{r.occupancyPercent}%</TableCell></TableRow>)}</TableBody>
          </Table>
        )}
      </Section>
      <Section title="Vacant rooms" action={<ExportBtn rows={vac.data} name="vacant_rooms" />}>
        {vac.loading ? <LoadingSpinner /> : !vac.data?.length ? <EmptyState title="No vacant rooms" /> : (
          <Table size="small"><TableHead><TableRow>{['Hostel', 'Block', 'Room', 'Floor', 'Capacity', 'Occupied', 'Vacant'].map((h) => <TableCell key={h}>{h}</TableCell>)}</TableRow></TableHead>
            <TableBody>{vac.data.map((r, i) => <TableRow key={i}><TableCell>{r.hostel}</TableCell><TableCell>{r.block}</TableCell><TableCell>{r.room}</TableCell><TableCell>{r.floor}</TableCell><TableCell>{r.capacity}</TableCell><TableCell>{r.occupied}</TableCell><TableCell>{r.vacant}</TableCell></TableRow>)}</TableBody>
          </Table>
        )}
      </Section>
      <Section title="Student list" action={<ExportBtn rows={students.data} name="student_list" />}>
        <Toolbar>
          <TextField select size="small" label="Department" value={dept} onChange={(e) => setDept(e.target.value)} sx={{ minWidth: 180 }}><MenuItem value="">All</MenuItem>{DEPARTMENTS.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}</TextField>
          <TextField select size="small" label="Year" value={year} onChange={(e) => setYear(e.target.value)} sx={{ minWidth: 120 }}><MenuItem value="">All</MenuItem>{[1, 2, 3, 4].map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}</TextField>
        </Toolbar>
        {students.loading ? <LoadingSpinner /> : !students.data?.length ? <EmptyState title="No students found" /> : (
          <Paper variant="outlined" sx={{ maxHeight: 420, overflow: 'auto' }}>
            <Table size="small" stickyHeader><TableHead><TableRow>{['Student ID', 'Name', 'Department', 'Year', 'Hostel', 'Room', 'Bed'].map((h) => <TableCell key={h}>{h}</TableCell>)}</TableRow></TableHead>
              <TableBody>{students.data.map((s) => <TableRow key={s.studentId}><TableCell>{s.studentId}</TableCell><TableCell>{s.name}</TableCell><TableCell>{s.department}</TableCell><TableCell>{s.year}</TableCell><TableCell>{s.hostel}</TableCell><TableCell>{s.room}</TableCell><TableCell>{s.bed}</TableCell></TableRow>)}</TableBody>
            </Table>
          </Paper>
        )}
      </Section>
    </Box>
  );
}

function MessReports() {
  const { rows: messes } = useList('/messes', { limit: 50 });
  const [mess, setMess] = useState('');
  const [month, setMonth] = useState(monthISO(-1));
  const daily = useFetch('/reports/mess/daily-attendance', { mess: mess || undefined }, [mess]);
  const monthly = useFetch('/reports/mess/monthly-usage', { mess: mess || undefined, month }, [mess, month]);
  const billing = useFetch('/reports/mess/billing', { mess: mess || undefined, month }, [mess, month]);
  const feedback = useFetch('/reports/mess/feedback', { mess: mess || undefined }, [mess]);

  return (
    <Box sx={{ display: 'grid', gap: 2.5 }}>
      <Toolbar>
        {messes.length > 1 && <TextField select size="small" label="Mess" value={mess} onChange={(e) => setMess(e.target.value)} sx={{ minWidth: 180 }}><MenuItem value="">All</MenuItem>{messes.map((m) => <MenuItem key={m._id} value={m._id}>{m.name}</MenuItem>)}</TextField>}
        <TextField label="Month" type="month" size="small" value={month} onChange={(e) => setMonth(e.target.value)} InputLabelProps={{ shrink: true }} />
      </Toolbar>
      <Section title="Today's attendance by meal">
        {daily.loading ? <LoadingSpinner /> : (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1.5 }}>
            {daily.data?.map((r) => <StatCard key={r.mealType} label={titleCase(r.mealType)} value={r.present} hint={`${r.absent} absent`} />)}
          </Box>
        )}
      </Section>
      <Section title="Billing summary" action={<ExportBtn rows={billing.data?.byStatus} name="mess_billing" />}>
        {billing.loading ? <LoadingSpinner /> : billing.data && (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5 }}>
            <StatCard label="Billed" value={money(billing.data.totals.billed)} />
            <StatCard label="Collected" value={money(billing.data.totals.collected)} />
            <StatCard label="Outstanding" value={money(billing.data.totals.outstanding)} tone="warning" />
          </Box>
        )}
      </Section>
      <Section title="Monthly meal usage" action={<ExportBtn rows={monthly.data} name="monthly_meal_usage" />}>
        {monthly.loading ? <LoadingSpinner /> : !monthly.data?.length ? <EmptyState title="No attendance recorded for this month" /> : (
          <Paper variant="outlined" sx={{ maxHeight: 420, overflow: 'auto' }}>
            <Table size="small" stickyHeader><TableHead><TableRow>{['Student ID', 'Name', 'Breakfast', 'Lunch', 'Snacks', 'Dinner', 'Total'].map((h) => <TableCell key={h}>{h}</TableCell>)}</TableRow></TableHead>
              <TableBody>{monthly.data.map((r) => <TableRow key={r.studentId}><TableCell>{r.studentId}</TableCell><TableCell>{r.name}</TableCell><TableCell>{r.breakfast}</TableCell><TableCell>{r.lunch}</TableCell><TableCell>{r.snacks}</TableCell><TableCell>{r.dinner}</TableCell><TableCell>{r.total}</TableCell></TableRow>)}</TableBody>
            </Table>
          </Paper>
        )}
      </Section>
      <Section title="Feedback summary" action={<ExportBtn rows={feedback.data} name="feedback_summary" />}>
        {feedback.loading ? <LoadingSpinner /> : !feedback.data?.length ? <EmptyState title="No feedback recorded" /> : (
          <Table size="small"><TableHead><TableRow><TableCell>Date</TableCell><TableCell>Meal</TableCell><TableCell>Average rating</TableCell><TableCell>Responses</TableCell></TableRow></TableHead>
            <TableBody>{feedback.data.map((r, i) => <TableRow key={i}><TableCell>{fmtDate(r.date)}</TableCell><TableCell>{titleCase(r.mealType)}</TableCell><TableCell>{r.average}</TableCell><TableCell>{r.responses}</TableCell></TableRow>)}</TableBody>
          </Table>
        )}
      </Section>
    </Box>
  );
}

function ComplaintReports() {
  const byCategory = useFetch('/reports/complaints/by-category');
  const trends = useFetch('/reports/complaints/trends');
  return (
    <Box sx={{ display: 'grid', gap: 2.5 }}>
      <Section title="Complaints by category" action={<ExportBtn rows={byCategory.data} name="complaints_by_category" />}>
        {byCategory.loading ? <LoadingSpinner /> : !byCategory.data?.length ? <EmptyState title="No complaints recorded" /> : (
          <Table size="small"><TableHead><TableRow>{['Category', 'Pending', 'In progress', 'Resolved', 'Rejected', 'Total'].map((h) => <TableCell key={h}>{h}</TableCell>)}</TableRow></TableHead>
            <TableBody>{byCategory.data.map((r) => <TableRow key={r.category}><TableCell>{titleCase(r.category)}</TableCell><TableCell>{r.pending}</TableCell><TableCell>{r.in_progress}</TableCell><TableCell>{r.resolved}</TableCell><TableCell>{r.rejected}</TableCell><TableCell>{r.total}</TableCell></TableRow>)}</TableBody>
          </Table>
        )}
      </Section>
      <Section title="Monthly trend" action={<ExportBtn rows={trends.data} name="complaint_trends" />}>
        {trends.loading ? <LoadingSpinner /> : !trends.data?.length ? <EmptyState title="No data" /> : (
          <Table size="small"><TableHead><TableRow><TableCell>Month</TableCell><TableCell>Raised</TableCell><TableCell>Resolved</TableCell></TableRow></TableHead>
            <TableBody>{trends.data.map((r) => <TableRow key={r.month}><TableCell>{r.month}</TableCell><TableCell>{r.raised}</TableCell><TableCell>{r.resolved}</TableCell></TableRow>)}</TableBody>
          </Table>
        )}
      </Section>
    </Box>
  );
}

function LeaveReports() {
  const { rows: hostels } = useList('/hostels', { limit: 100 });
  const [hostel, setHostel] = useState('');
  const [status, setStatus] = useState('');
  const { data, loading } = useFetch('/reports/leaves', { hostel: hostel || undefined, status: status || undefined }, [hostel, status]);
  return (
    <Box sx={{ display: 'grid', gap: 2.5 }}>
      <Toolbar>
        <TextField select size="small" label="Hostel" value={hostel} onChange={(e) => setHostel(e.target.value)} sx={{ minWidth: 180 }}><MenuItem value="">All</MenuItem>{hostels.map((h) => <MenuItem key={h._id} value={h._id}>{h.name}</MenuItem>)}</TextField>
        <TextField select size="small" label="Status" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 150 }}><MenuItem value="">All</MenuItem>{['pending', 'approved', 'rejected', 'cancelled'].map((s) => <MenuItem key={s} value={s}>{titleCase(s)}</MenuItem>)}</TextField>
      </Toolbar>
      {loading ? <LoadingSpinner /> : data && (
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1.5, mb: 1 }}>
            {data.summary.map((s) => <StatCard key={s.status} label={titleCase(s.status)} value={s.count} />)}
          </Box>
          <Section title="Requests" action={<ExportBtn rows={data.rows} name="leave_requests" />}>
            {!data.rows.length ? <EmptyState title="No leave requests" /> : (
              <Paper variant="outlined" sx={{ maxHeight: 420, overflow: 'auto' }}>
                <Table size="small" stickyHeader><TableHead><TableRow>{['Student ID', 'Name', 'Hostel', 'From', 'To', 'Status'].map((h) => <TableCell key={h}>{h}</TableCell>)}</TableRow></TableHead>
                  <TableBody>{data.rows.map((r, i) => <TableRow key={i}><TableCell>{r.studentId}</TableCell><TableCell>{r.name}</TableCell><TableCell>{r.hostel}</TableCell><TableCell>{r.startDate}</TableCell><TableCell>{r.endDate}</TableCell><TableCell>{titleCase(r.status)}</TableCell></TableRow>)}</TableBody>
                </Table>
              </Paper>
            )}
          </Section>
        </>
      )}
    </Box>
  );
}
