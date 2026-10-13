import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import { titleCase } from '../utils/format';

/** options: array of strings, or [{ value, label }]. Empty value means "All". */
export default function FilterSelect({ label, value, onChange, options, allLabel = 'All', sx, ...rest }) {
  return (
    <TextField select label={label} value={value ?? ''} onChange={(e) => onChange(e.target.value)} sx={{ minWidth: 150, width: { xs: '100%', sm: 'auto' }, ...sx }} {...rest}>
      <MenuItem value="">{allLabel}</MenuItem>
      {options.map((o) => {
        const v = typeof o === 'object' ? o.value : o;
        const l = typeof o === 'object' ? o.label : titleCase(o);
        return <MenuItem key={v} value={v}>{l}</MenuItem>;
      })}
    </TextField>
  );
}
