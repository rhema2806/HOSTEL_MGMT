const env = require('../config/env');
const ApiError = require('./ApiError');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const ok = (res, data, extra = {}, status = 200) => res.status(status).json({ success: true, data, ...extra });
const created = (res, data, extra = {}) => ok(res, data, extra, 201);

/** Parses ?page, ?limit, ?sort=field:asc into safe values. */
function paginate(query, allowedSort = ['createdAt'], defaultSort = '-createdAt') {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 100);
  let sort = defaultSort;
  if (query.sort) {
    const [field, dir] = String(query.sort).split(':');
    if (allowedSort.includes(field)) sort = `${dir === 'asc' ? '' : '-'}${field}`;
  }
  return { page, limit, skip: (page - 1) * limit, sort };
}

const pageMeta = (page, limit, total) => ({
  pagination: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) },
});

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Returns today's calendar date (YYYY-MM-DD) in the configured timezone. */
function todayStr(tz = env.timezone) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

/** 'YYYY-MM-DD' -> Date at UTC midnight. Dates are stored this way so they never shift with timezone. */
function toDay(value) {
  if (value instanceof Date) return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ''));
  if (!m) throw ApiError.badRequest('Invalid date. Use the format YYYY-MM-DD');
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (d.getUTCMonth() !== +m[2] - 1) throw ApiError.badRequest(`"${value}" is not a real calendar date`);
  return d;
}

/** 'YYYY-MM' -> { start, end } (end exclusive) */
function monthRange(month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(month || ''))) throw ApiError.badRequest('Month must be in the format YYYY-MM');
  const [y, m] = month.split('-').map(Number);
  return { start: new Date(Date.UTC(y, m - 1, 1)), end: new Date(Date.UTC(y, m, 1)) };
}

const isObjectId = (v) => /^[a-f\d]{24}$/i.test(String(v || ''));

const pick = (obj, keys) => keys.reduce((acc, k) => (obj[k] !== undefined ? { ...acc, [k]: obj[k] } : acc), {});

module.exports = { asyncHandler, ok, created, paginate, pageMeta, escapeRegex, todayStr, toDay, monthRange, isObjectId, pick };
