import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import useList from '../hooks/useList';
import api from '../services/api';
import { fmtDateTime } from '../utils/format';

export default function Notifications() {
  const navigate = useNavigate();
  const { rows, extra, loading, error, setPage, pagination, reload } = useList('/notifications', {});

  const readAll = async () => { await api.patch('/notifications/read-all'); reload(); };
  const open = async (n) => { if (!n.read) await api.patch(`/notifications/${n._id}/read`); reload(); if (n.link) navigate(n.link); };

  return (
    <>
      <PageHeader title="Notifications" subtitle={`${extra?.unread || 0} unread`} actions={<Button variant="outlined" onClick={readAll} disabled={!extra?.unread}>Mark all as read</Button>} />
      {loading ? <LoadingSpinner /> : error ? <ErrorState message={error} onRetry={reload} /> : !rows.length ? <EmptyState title="No notifications" /> : (
        <Paper variant="outlined">
          <List disablePadding>
            {rows.map((n) => (
              <ListItemButton key={n._id} onClick={() => open(n)} sx={{ bgcolor: n.read ? 'transparent' : 'action.hover', borderBottom: 1, borderColor: 'divider' }}>
                <ListItemText primary={n.title} secondary={<>{n.message}<br />{fmtDateTime(n.createdAt)}</>} primaryTypographyProps={{ fontWeight: n.read ? 400 : 700 }} secondaryTypographyProps={{ component: 'span' }} />
              </ListItemButton>
            ))}
          </List>
        </Paper>
      )}
      {pagination.pages > 1 && (
        <Button sx={{ mt: 2 }} onClick={() => setPage(pagination.page + 1)} disabled={pagination.page >= pagination.pages}>Load more</Button>
      )}
    </>
  );
}
