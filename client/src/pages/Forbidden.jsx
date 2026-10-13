import { Link } from 'react-router-dom';
import Button from '@mui/material/Button';
import EmptyState from '../components/EmptyState';

export default function Forbidden() {
  return <EmptyState title="You do not have access to this page" message="Your role does not include this area. Contact the administrator if you think this is a mistake." action={<Button component={Link} to="/" variant="contained">Go to dashboard</Button>} />;
}
