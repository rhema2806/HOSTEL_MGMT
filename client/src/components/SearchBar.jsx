import { useEffect, useState } from 'react';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import useDebounce from '../hooks/useDebounce';

/** Debounced search input: calls onSearch only after the user pauses typing. */
export default function SearchBar({ onSearch, placeholder = 'Search', value = '', sx }) {
  const [text, setText] = useState(value);
  const debounced = useDebounce(text);
  useEffect(() => { onSearch(debounced); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [debounced]);
  return (
    <TextField
      value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} inputProps={{ 'aria-label': placeholder }}
      sx={{ minWidth: 220, maxWidth: 360, ...sx }}
      InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
    />
  );
}
