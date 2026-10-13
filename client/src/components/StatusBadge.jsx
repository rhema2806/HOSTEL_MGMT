import Chip from '@mui/material/Chip';
import { titleCase } from '../utils/format';

const COLORS = {
  success: ['paid', 'approved', 'resolved', 'active', 'present', 'available', 'success', 'published'],
  warning: ['pending', 'partially_paid', 'maintenance', 'medium'],
  info: ['in_progress', 'transferred'],
  error: ['rejected', 'overdue', 'absent', 'closed', 'inactive', 'urgent', 'high', 'failed'],
};

export default function StatusBadge({ value, label }) {
  const color = Object.keys(COLORS).find((c) => COLORS[c].includes(value)) || 'default';
  return <Chip size="small" color={color} variant={color === 'default' ? 'outlined' : 'filled'} label={label || titleCase(value)} sx={color === 'default' ? {} : { opacity: 0.92 }} />;
}
