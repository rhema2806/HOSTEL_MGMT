import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { Link as RouterLink } from 'react-router-dom';

/** A single figure with a label. Optional link makes the whole card a navigation target. */
export default function StatCard({ label, value, hint, to, tone }) {
  const color = { warning: 'warning.main', error: 'error.main', success: 'success.main' }[tone] || 'text.primary';
  return (
    <Paper variant="outlined" component={to ? RouterLink : 'div'} to={to} sx={{ p: 2, display: 'block', textDecoration: 'none', color: 'inherit', height: '100%', '&:hover': to ? { borderColor: 'primary.main' } : undefined }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="h4" component="p" sx={{ color, mt: 0.5, lineHeight: 1.2 }}>{value ?? '-'}</Typography>
      {hint && <Box sx={{ mt: 0.5 }}><Typography variant="caption" color="text.secondary">{hint}</Typography></Box>}
    </Paper>
  );
}
