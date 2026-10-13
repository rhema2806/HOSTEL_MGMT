import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';

export default function EmptyState({ title = 'Nothing here yet', message, action }) {
  return (
    <Box sx={{ textAlign: 'center', py: 6, px: 2, color: 'text.secondary' }}>
      <InboxOutlinedIcon sx={{ fontSize: 40, mb: 1, opacity: 0.6 }} />
      <Typography variant="subtitle1" color="text.primary">{title}</Typography>
      {message && <Typography variant="body2" sx={{ mt: 0.5, maxWidth: 420, mx: 'auto' }}>{message}</Typography>}
      {action && <Box sx={{ mt: 2 }}>{action}</Box>}
    </Box>
  );
}
