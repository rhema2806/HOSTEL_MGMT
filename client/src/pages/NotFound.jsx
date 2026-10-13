import { Link } from 'react-router-dom';
import Button from '@mui/material/Button';
import EmptyState from '../components/EmptyState';

export default function NotFound() {
  return <EmptyState title="Page not found" message="The page you are looking for does not exist or has moved." action={<Button component={Link} to="/" variant="contained">Go to dashboard</Button>} />;
}
