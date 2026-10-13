import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import Section from '../../components/Section';
import KeyValue from '../../components/KeyValue';
import { Stats, Cell, MenuBlock } from './parts';
import { money, titleCase } from '../../utils/format';

export default function MessDashboard({ data: d }) {
  return (
    <>
      <PageHeader title="Mess overview" subtitle={d.messes.map((m) => m.name).join(', ') || 'No mess assigned to your account yet'} />
      <Stats>
        <Cell><StatCard label="Meals served today" value={d.mealsServed} to="/attendance" /></Cell>
        <Cell><StatCard label="Students in mess" value={d.totalStudents} /></Cell>
        <Cell><StatCard label="Average rating" value={d.feedback.average ?? '-'} hint={`${d.feedback.responses} responses, last ${d.feedback.periodDays} days`} to="/feedback" /></Cell>
        <Cell><StatCard label="Overdue bills" value={d.billing.overdue} to="/bills" tone={d.billing.overdue ? 'error' : undefined} /></Cell>
      </Stats>
      <Grid container spacing={2.5}>
        <Grid item xs={12} md={7}>
          <Section title="Today's menu" action={<Button size="small" component={Link} to="/menu">Edit menus</Button>}>
            {d.todayMenus.length ? d.todayMenus.map((m) => (<div key={m._id} style={{ marginBottom: 16 }}><Typography variant="subtitle2" sx={{ mb: 1 }}>{m.mess.name}</Typography><MenuBlock menu={m} /></div>)) : <MenuBlock menu={null} />}
          </Section>
        </Grid>
        <Grid item xs={12} md={5}>
          <Section title="Pending tasks">
            {d.pendingTasks.length ? <List dense disablePadding>{d.pendingTasks.map((t) => <ListItem key={t} disableGutters divider><ListItemText primary={t} /></ListItem>)}</List> : <Typography variant="body2" color="text.secondary">Nothing pending. Menus are published and no bills are overdue.</Typography>}
          </Section>
        </Grid>
        <Grid item xs={12} md={6}>
          <Section title="Today's attendance by meal" action={<Button size="small" component={Link} to="/attendance">Record</Button>}>
            <KeyValue items={d.attendanceToday.map((a) => [titleCase(a.mealType), `${a.served} served`])} />
          </Section>
        </Grid>
        <Grid item xs={12} md={6}>
          <Section title="Billing" action={<Button size="small" component={Link} to="/bills">Open</Button>}>
            <KeyValue items={[['Billed', money(d.billing.billed)], ['Collected', money(d.billing.collected)], ['Outstanding', money(d.billing.outstanding)], ['Bills awaiting payment', d.billing.pending], ['Bills fully paid', d.billing.paid]]} />
          </Section>
        </Grid>
      </Grid>
    </>
  );
}
