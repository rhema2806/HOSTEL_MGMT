import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export default function KeyValue({ items }) {
  return (
    <Box component="dl" sx={{ m: 0, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 1.5 }}>
      {items.filter(Boolean).map(([k, v]) => (
        <Box key={k}>
          <Typography component="dt" variant="caption" color="text.secondary">{k}</Typography>
          <Typography component="dd" variant="body2" sx={{ m: 0, wordBreak: 'break-word' }}>{v || '-'}</Typography>
        </Box>
      ))}
    </Box>
  );
}
