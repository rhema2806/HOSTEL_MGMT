import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import HomeWorkIcon from '@mui/icons-material/HomeWorkOutlined';
import { useAuth } from '../context/AuthContext';
import { SIDEBAR_BG } from '../theme';
import { validateForm } from '../utils/validate';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const v = validateForm(form, { email: { label: 'Email', required: true, email: true }, password: { label: 'Password', required: true } });
    setErrors(v);
    if (Object.keys(v).length) return;
    setBusy(true); setError('');
    try {
      await login(form.email.trim(), form.password);
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: { xs: 'column', md: 'row' } }}>
      <Box sx={{ flex: { md: 1 }, bgcolor: SIDEBAR_BG, color: '#fff', p: { xs: 3, md: 8 }, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <HomeWorkIcon sx={{ fontSize: 40, mb: 2 }} />
        <Typography variant="h4" component="h1" sx={{ maxWidth: 460 }}>Hostel and Mess Management</Typography>
        <Typography sx={{ mt: 1.5, color: '#A9B8C8', maxWidth: 440 }}>
          Rooms, mess menus, bills, leave and complaints for students, wardens and mess staff, in one place.
        </Typography>
      </Box>
      <Box sx={{ flex: { md: 1 }, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3, bgcolor: 'background.default' }}>
        <Paper variant="outlined" component="form" onSubmit={submit} noValidate sx={{ p: { xs: 2.5, sm: 4 }, width: '100%', maxWidth: 420 }}>
          <Typography variant="h5" component="h2" sx={{ mb: 0.5 }}>Sign in</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>Use the email and password issued by your hostel office.</Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <TextField label="Email" type="email" autoComplete="username" autoFocus value={form.email} onChange={set('email')} error={!!errors.email} helperText={errors.email} sx={{ mb: 2 }} />
          <TextField label="Password" type={show ? 'text' : 'password'} autoComplete="current-password" value={form.password} onChange={set('password')} error={!!errors.password} helperText={errors.password} sx={{ mb: 3 }}
            InputProps={{ endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} edge="end" size="small">{show ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}</IconButton></InputAdornment> }} />
          <Button type="submit" variant="contained" size="large" fullWidth disabled={busy}>{busy ? 'Signing in' : 'Sign in'}</Button>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>Forgot your password? Ask the administrator to reset it.</Typography>
        </Paper>
      </Box>
    </Box>
  );
}
