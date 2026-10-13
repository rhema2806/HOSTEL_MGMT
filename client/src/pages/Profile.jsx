import { useState } from 'react';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import PageHeader from '../components/PageHeader';
import Section from '../components/Section';
import KeyValue from '../components/KeyValue';
import FormDialog from '../components/FormDialog';
import { PasswordForm } from './ChangePassword';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import { fmtDate, inputDate, roleLabel } from '../utils/format';
import { validateForm } from '../utils/validate';

const EDITABLE = ['phone', 'dob', 'address', 'guardianName', 'guardianPhone', 'emergencyContact'];

export default function Profile() {
  const { user, student, allocation, role, refresh } = useAuth();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const startEdit = () => { setForm(Object.fromEntries(EDITABLE.map((k) => [k, k === 'dob' ? inputDate(student[k]) : student[k] || '']))); setErrors({}); setError(''); setEditing(true); };
  const save = async () => {
    const v = validateForm(form, { phone: { label: 'Phone', phone: true }, guardianPhone: { label: 'Guardian phone', phone: true }, emergencyContact: { label: 'Emergency contact', phone: true } });
    setErrors(v);
    if (Object.keys(v).length) return;
    setBusy(true); setError('');
    try {
      await api.patch('/students/me', Object.fromEntries(Object.entries(form).filter(([, val]) => val !== '')));
      await refresh(); toast.success('Profile updated'); setEditing(false);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <>
      <PageHeader title="My account" subtitle={roleLabel(role)} actions={student && <Button variant="outlined" onClick={startEdit}>Edit contact details</Button>} />
      <Grid container spacing={2.5}>
        <Grid item xs={12} md={7}>
          <Section title={student ? 'Student profile' : 'Account details'}>
            <KeyValue items={student ? [
              ['Name', student.name], ['Student ID', student.studentId], ['Email', student.email], ['Phone', student.phone],
              ['Department', student.department], ['Year', student.year], ['Section', student.section], ['Date of birth', fmtDate(student.dob)],
              ['Guardian', student.guardianName], ['Guardian phone', student.guardianPhone], ['Emergency contact', student.emergencyContact], ['Admission date', fmtDate(student.admissionDate)],
              ['Mess', student.mess?.name], ['Hostel', allocation ? `${allocation.hostel.name}, ${allocation.block.name}` : 'Not allocated'], ['Room / bed', allocation ? `${allocation.room.roomNumber} / Bed ${allocation.bedNumber}` : '-'], ['Address', student.address],
            ] : [['Name', user.name], ['Email', user.email], ['Phone', user.phone], ['Role', roleLabel(role)], ['Last sign-in', user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('en-IN') : '-']]} />
          </Section>
        </Grid>
        <Grid item xs={12} md={5}>
          <Section title="Change password"><PasswordForm /></Section>
        </Grid>
      </Grid>
      <FormDialog open={editing} title="Edit contact details" onClose={() => setEditing(false)} onSubmit={save} busy={busy} error={error}>
        <Box sx={{ display: 'grid', gap: 2 }}>
          <TextField label="Phone" value={form.phone || ''} onChange={set('phone')} error={!!errors.phone} helperText={errors.phone} />
          <TextField label="Date of birth" type="date" value={form.dob || ''} onChange={set('dob')} InputLabelProps={{ shrink: true }} />
          <TextField label="Guardian name" value={form.guardianName || ''} onChange={set('guardianName')} />
          <TextField label="Guardian phone" value={form.guardianPhone || ''} onChange={set('guardianPhone')} error={!!errors.guardianPhone} helperText={errors.guardianPhone} />
          <TextField label="Emergency contact" value={form.emergencyContact || ''} onChange={set('emergencyContact')} error={!!errors.emergencyContact} helperText={errors.emergencyContact} />
          <TextField label="Address" multiline minRows={2} value={form.address || ''} onChange={set('address')} />
        </Box>
      </FormDialog>
    </>
  );
}
