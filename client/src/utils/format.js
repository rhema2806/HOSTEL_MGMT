export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '-');
export const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-');
export const inputDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
export const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
export const titleCase = (s) => String(s ?? '').replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
export const todayISO = () => new Date().toLocaleDateString('en-CA');
export const monthISO = (offset = 0) => { const d = new Date(); d.setMonth(d.getMonth() + offset, 1); return d.toLocaleDateString('en-CA').slice(0, 7); };
export const roleLabel = (r) => ({ admin: 'Administrator', warden: 'Warden', mess_manager: 'Mess Manager', student: 'Student' }[r] || r);

export function downloadCsv(filename, rows) {
  if (!rows?.length) return;
  const cols = Object.keys(rows[0]);
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [cols.map(esc).join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}
