import { createTheme } from '@mui/material/styles';

export const SIDEBAR_BG = '#16263A';

const theme = createTheme({
  palette: {
    primary: { main: '#1F4B6E' },
    secondary: { main: '#6B5B3E' },
    success: { main: '#2E7D5B' },
    warning: { main: '#A86A12' },
    error: { main: '#B03A2E' },
    info: { main: '#2F6690' },
    background: { default: '#F4F5F7', paper: '#FFFFFF' },
    text: { primary: '#1B2430', secondary: '#55606E' },
    divider: '#DDE1E7',
  },
  shape: { borderRadius: 6 },
  typography: {
    fontFamily: '"Public Sans", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h4: { fontWeight: 600, fontSize: '1.6rem' },
    h5: { fontWeight: 600, fontSize: '1.35rem' },
    h6: { fontWeight: 600, fontSize: '1.05rem' },
    subtitle1: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiPaper: { defaultProps: { elevation: 0 }, styleOverrides: { outlined: { borderColor: '#DDE1E7' } } },
    MuiCard: { defaultProps: { variant: 'outlined' } },
    MuiTextField: { defaultProps: { size: 'small', fullWidth: true } },
    MuiFormControl: { defaultProps: { size: 'small' } },
    MuiTableCell: { styleOverrides: { head: { backgroundColor: '#EEF1F5', fontWeight: 600, color: '#1B2430', whiteSpace: 'nowrap' } } },
    MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
    MuiDialog: { defaultProps: { fullWidth: true } },
  },
});

export default theme;
