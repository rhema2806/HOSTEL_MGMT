import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

/** Titled panel used for dashboard and detail sections. */
export default function Section({ title, action, children, sx, padded = true }) {
  return (
    <Paper variant="outlined" sx={{ height: '100%', ...sx }}>
      {(title || action) && (
        <Box sx={{ px: 2, py: 1.25, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle1" component="h2">{title}</Typography>
          {action}
        </Box>
      )}
      <Box sx={{ p: padded ? 2 : 0 }}>{children}</Box>
    </Paper>
  );
}
