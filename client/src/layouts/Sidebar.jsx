import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import { NavLink, useLocation } from 'react-router-dom';
import HomeWorkIcon from '@mui/icons-material/HomeWorkOutlined';
import { NAV } from '../routes/nav';
import { SIDEBAR_BG } from '../theme';

export const DRAWER_WIDTH = 252;

function Content({ role, onNavigate }) {
  const { pathname } = useLocation();
  return (
    <Box sx={{ height: '100%', bgcolor: SIDEBAR_BG, color: '#C9D3DF', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      <Box sx={{ px: 2.5, py: 2.25, display: 'flex', alignItems: 'center', gap: 1.25, color: '#fff' }}>
        <HomeWorkIcon />
        <Box>
          <Typography variant="subtitle1" sx={{ lineHeight: 1.15 }}>Hostel and Mess</Typography>
          <Typography variant="caption" sx={{ color: '#8FA1B5' }}>Management System</Typography>
        </Box>
      </Box>
      <Box component="nav" aria-label="Main" sx={{ flex: 1, pb: 2 }}>
        {(NAV[role] || []).map((group, gi) => (
          <List key={gi} dense subheader={group.title ? <Typography variant="caption" sx={{ display: 'block', px: 2.5, pt: 1.5, pb: 0.5, color: '#8FA1B5', fontWeight: 600 }}>{group.title}</Typography> : undefined}>
            {group.items.map((item) => {
              const active = item.to === '/' ? pathname === '/' : pathname.startsWith(item.to);
              return (
                <ListItemButton key={item.to} component={NavLink} to={item.to} end={item.to === '/'} onClick={onNavigate} selected={active}
                  sx={{ mx: 1, borderRadius: 1, color: 'inherit', '&.Mui-selected': { bgcolor: 'rgba(255,255,255,0.12)', color: '#fff' }, '&.Mui-selected:hover, &:hover': { bgcolor: 'rgba(255,255,255,0.08)' } }}>
                  <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}><item.icon fontSize="small" /></ListItemIcon>
                  <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 14, fontWeight: active ? 600 : 500 }} />
                </ListItemButton>
              );
            })}
          </List>
        ))}
      </Box>
    </Box>
  );
}

export default function Sidebar({ role, mobileOpen, onClose }) {
  return (
    <>
      <Drawer variant="temporary" open={mobileOpen} onClose={onClose} ModalProps={{ keepMounted: true }} sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, border: 0 } }}>
        <Content role={role} onNavigate={onClose} />
      </Drawer>
      <Drawer variant="permanent" open sx={{ display: { xs: 'none', md: 'block' }, width: DRAWER_WIDTH, flexShrink: 0, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, border: 0 } }}>
        <Content role={role} />
      </Drawer>
    </>
  );
}
