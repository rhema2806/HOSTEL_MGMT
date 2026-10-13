import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { validateForm } from '../utils/validate';

export function PasswordForm({ onDone }) {
  const { changePassword } = useAuth();
  const toast = useToast();
  const [f, setF] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const v = validateForm(f, { currentPassword: { label: 'Current password', required: true }, newPassword: { label: 'New password', required: true, minLength: 8 } });
    if (f.confirm !== f.newPassword) v.confirm = 'Passwords do not match';
    setErrors(v);
    if (Object.keys(v).length) return;
    setBusy(true); setError('');
    try {
      await changePassword(f.currentPassword, f.newPassword);
      toast.success('Password changed');
      setF({ currentPassword: '', newPassword: '', confirm: '' });
      onDone?.();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <Box component="form" onSubmit={submit} noValidate sx={{ display: 'grid', gap: 2 }}>
      {error && <Alert severity="error">{error}</Alert>}
      <TextField label="Current password" type="password" autoComplete="current-password" value={f.currentPassword} onChange={set('currentPassword')} error={!!errors.currentPassword} helperText={errors.currentPassword} />
      <TextField label="New password" type="password" autoComplete="new-password" value={f.newPassword} onChange={set('newPassword')} error={!!errors.newPassword} helperText={errors.newPassword || 'At least 8 characters'} />
      <TextField label="Confirm new password" type="password" autoComplete="new-password" value={f.confirm} onChange={set('confirm')} error={!!errors.confirm} helperText={errors.confirm} />
      <Button type="submit" variant="contained" disabled={busy} sx={{ justifySelf: 'start' }}>{busy ? 'Saving' : 'Change password'}</Button>
    </Box>
  );
}

/** Full-screen version shown to users who are still on a temporary password. */
export default function ChangePassword() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 4 }, width: '100%', maxWidth: 440 }}>
        <Typography variant="h5" component="h1">{user?.mustChangePassword ? 'Set a new password' : 'Change password'}</Typography>
        {user?.mustChangePassword && <Typography variant="body2" color="text.secondary" sx={{ my: 1.5 }}>You are using a temporary password. Choose a new one to continue.</Typography>}
        <Box sx={{ mt: 2 }}><PasswordForm onDone={() => navigate('/', { replace: true })} /></Box>
        <Button size="small" onClick={logout} sx={{ mt: 2 }}>Sign out</Button>
      </Paper>
    </Box>
  );
}
