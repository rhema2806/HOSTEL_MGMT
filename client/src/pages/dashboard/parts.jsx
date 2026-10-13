import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import { Link } from 'react-router-dom';
import Grid from '@mui/material/Grid';
import { fmtDate } from '../../utils/format';
import { titleCase } from '../../utils/format';

export const Stats = ({ children }) => <Grid container spacing={2} sx={{ mb: 2.5 }}>{children}</Grid>;
export const Cell = ({ children, xs = 6, sm = 4, md = 3 }) => <Grid item xs={xs} sm={sm} md={md}>{children}</Grid>;

export function OccupancyBar({ occupied, total, percent }) {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
        <Typography variant="body2">{occupied} of {total} beds occupied</Typography>
        <Typography variant="body2" fontWeight={600}>{percent}%</Typography>
      </Box>
      <LinearProgress variant="determinate" value={Math.min(percent, 100)} sx={{ height: 8, borderRadius: 4 }} aria-label={`Occupancy ${percent} percent`} />
    </Box>
  );
}

export function NoticeList({ notices }) {
  if (!notices?.length) return <Typography variant="body2" color="text.secondary">No recent notices.</Typography>;
  return (
    <List dense disablePadding>
      {notices.map((n) => (
        <ListItem key={n._id} disableGutters divider>
          <ListItemText primary={<Link to="/notices" style={{ color: 'inherit', textDecoration: 'none', fontWeight: 600 }}>{n.title}</Link>} secondary={`${titleCase(n.category)} · ${fmtDate(n.publishDate)}`} />
        </ListItem>
      ))}
    </List>
  );
}

export function MenuBlock({ menu }) {
  if (!menu) return <Typography variant="body2" color="text.secondary">Today's menu has not been published yet.</Typography>;
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }, gap: 2 }}>
      {['breakfast', 'lunch', 'snacks', 'dinner'].map((m) => (
        <Box key={m}>
          <Typography variant="subtitle2">{titleCase(m)}</Typography>
          <Typography variant="body2" color="text.secondary">{menu.meals[m]?.length ? menu.meals[m].join(', ') : 'Not set'}</Typography>
        </Box>
      ))}
    </Box>
  );
}
