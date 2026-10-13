import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';

export default function ErrorState({ message, onRetry }) {
  return (
    <Alert severity="error" sx={{ my: 2 }} action={onRetry && <Button color="inherit" size="small" onClick={onRetry}>Try again</Button>}>
      {message || 'Could not load this data.'}
    </Alert>
  );
}
