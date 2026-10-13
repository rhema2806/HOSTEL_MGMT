import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

/** Modal wrapper for forms. Shows backend error messages inline and blocks double submits. */
export default function FormDialog({ open, title, onClose, onSubmit, submitLabel = 'Save', busy = false, error, maxWidth = 'sm', children, hideActions = false }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth={maxWidth} fullScreen={fullScreen} aria-labelledby="form-dialog-title">
      <form onSubmit={(e) => { e.preventDefault(); onSubmit?.(); }} noValidate>
        <DialogTitle id="form-dialog-title">{title}</DialogTitle>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {children}
        </DialogContent>
        {!hideActions && (
          <DialogActions sx={{ px: 3, py: 1.5 }}>
            <Button onClick={onClose} disabled={busy}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={busy}>{busy ? 'Saving' : submitLabel}</Button>
          </DialogActions>
        )}
      </form>
    </Dialog>
  );
}
