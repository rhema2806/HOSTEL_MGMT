import Box from '@mui/material/Box';

export default function FilterBar({ children }) {
  return <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 2, alignItems: 'center' }}>{children}</Box>;
}
