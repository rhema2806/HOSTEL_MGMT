import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import IconButton from '@mui/material/IconButton';
import Badge from '@mui/material/Badge';
import Popover from '@mui/material/Popover';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import api from '../services/api';
import { fmtDateTime } from '../utils/format';

/** Bell icon with unread count (polled every minute) and a short list of recent notifications. */
export default function NotificationPanel() {
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState([]);
  const [anchor, setAnchor] = useState(null);
  const navigate = useNavigate();

  const loadCount = useCallback(() => api.get('/notifications/unread-count').then((r) => setUnread(r.data.unread)).catch(() => {}), []);
  useEffect(() => { loadCount(); const t = setInterval(loadCount, 60000); return () => clearInterval(t); }, [loadCount]);

  const open = async (e) => {
    setAnchor(e.currentTarget);
    try { const r = await api.get('/notifications', { params: { limit: 8 } }); setItems(r.data); setUnread(r.unread); } catch { /* keep the previous list */ }
  };
  const readOne = async (n) => {
    if (!n.read) { await api.patch(`/notifications/${n._id}/read`).catch(() => {}); loadCount(); }
    setAnchor(null);
    if (n.link) navigate(n.link);
  };
  const readAll = async () => { await api.patch('/notifications/read-all'); setItems((l) => l.map((n) => ({ ...n, read: true }))); setUnread(0); };

  return (
    <>
      <IconButton color="inherit" onClick={open} aria-label={`Notifications, ${unread} unread`}>
        <Badge badgeContent={unread} color="error" max={99}><NotificationsNoneIcon /></Badge>
      </IconButton>
      <Popover open={!!anchor} anchorEl={anchor} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }} slotProps={{ paper: { sx: { width: { xs: 'calc(100vw - 24px)', sm: 380 }, maxHeight: 480 } } }}>
        <Box sx={{ px: 2, py: 1.25, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1">Notifications</Typography>
          <Button size="small" onClick={readAll} disabled={!unread}>Mark all as read</Button>
        </Box>
        <Divider />
        {items.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>You have no notifications.</Typography>
        ) : (
          <List disablePadding>
            {items.map((n) => (
              <ListItemButton key={n._id} onClick={() => readOne(n)} sx={{ alignItems: 'flex-start', bgcolor: n.read ? 'transparent' : 'action.hover' }}>
                <ListItemText primary={n.title} secondary={<>{n.message}<br />{fmtDateTime(n.createdAt)}</>} primaryTypographyProps={{ fontWeight: n.read ? 400 : 700, variant: 'body2' }} secondaryTypographyProps={{ variant: 'caption', component: 'span' }} />
              </ListItemButton>
            ))}
          </List>
        )}
        <Divider />
        <Box sx={{ p: 1, textAlign: 'center' }}><Button size="small" onClick={() => { setAnchor(null); navigate('/notifications'); }}>View all</Button></Box>
      </Popover>
    </>
  );
}
