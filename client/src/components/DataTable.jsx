import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';
import LinearProgress from '@mui/material/LinearProgress';
import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';
import ErrorState from './ErrorState';

/**
 * columns: [{ key, label, render(row), align, width }]
 * Pass `pagination` ({page,limit,total}) with onPageChange/onLimitChange for server-side paging.
 */
export default function DataTable({ columns, rows, loading, error, onRetry, pagination, onPageChange, onLimitChange, emptyTitle, emptyMessage, emptyAction, rowKey = '_id', dense = false }) {
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  const firstLoad = loading && !rows.length;
  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
      {loading && !firstLoad && <LinearProgress aria-label="Refreshing" />}
      {firstLoad ? <LoadingSpinner /> : !rows.length ? (
        <EmptyState title={emptyTitle} message={emptyMessage} action={emptyAction} />
      ) : (
        <TableContainer sx={{ opacity: loading ? 0.6 : 1, transition: 'opacity .15s' }}>
          <Table size={dense ? 'small' : 'medium'}>
            <TableHead>
              <TableRow>{columns.map((c) => <TableCell key={c.key} align={c.align} sx={{ width: c.width }}>{c.label}</TableCell>)}</TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, i) => (
                <TableRow key={row[rowKey] || i} hover>
                  {columns.map((c) => <TableCell key={c.key} align={c.align}>{c.render ? c.render(row) : row[c.key] ?? '-'}</TableCell>)}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {pagination && rows.length > 0 && (
        <TablePagination
          component="div" count={pagination.total} page={pagination.page - 1} rowsPerPage={pagination.limit}
          rowsPerPageOptions={[10, 25, 50]} onPageChange={(_, p) => onPageChange(p + 1)} onRowsPerPageChange={(e) => onLimitChange(Number(e.target.value))}
        />
      )}
    </Paper>
  );
}
