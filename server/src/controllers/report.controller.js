const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const { asyncHandler, ok, toDay, monthRange, todayStr } = require('../utils/helpers');
const { MEAL_TYPES } = require('../utils/constants');
const { Hostel, Room, RoomAllocation, Student, MealAttendance, MessBill, MessFeedback, Complaint, LeaveRequest } = require('../models');
const { assertHostel, assertMess } = require('../services/scope.service');
const { refreshOverdue } = require('../services/billing.service');

const oid = (v) => new mongoose.Types.ObjectId(String(v));
const hostelScopeIds = (user, requested) => {
  if (requested) { assertHostel(user, requested); return [oid(requested)]; }
  return user.role === 'admin' ? null : user.assignedHostels.map(oid);
};
const messScopeIds = (user, requested) => {
  if (requested) { assertMess(user, requested); return [oid(requested)]; }
  return user.role === 'admin' ? null : user.assignedMesses.map(oid);
};
const dateRange = (q, field = 'createdAt') => (q.from || q.to ? { [field]: { ...(q.from && { $gte: toDay(q.from) }), ...(q.to && { $lt: new Date(toDay(q.to).getTime() + 86400000) }) } } : {});

// ---------- Hostel ----------
const occupancy = asyncHandler(async (req, res) => {
  const ids = hostelScopeIds(req.user, req.query.hostel);
  const match = { status: { $ne: 'closed' }, ...(ids && { hostel: { $in: ids } }) };
  const [rooms, occ, hostels] = await Promise.all([
    Room.aggregate([{ $match: match }, { $group: { _id: '$hostel', rooms: { $sum: 1 }, beds: { $sum: '$capacity' } } }]),
    RoomAllocation.aggregate([{ $match: { status: 'active', ...(ids && { hostel: { $in: ids } }) } }, { $group: { _id: '$hostel', occupied: { $sum: 1 } } }]),
    Hostel.find(ids ? { _id: { $in: ids } } : {}).select('name type'),
  ]);
  const rows = hostels.map((h) => {
    const r = rooms.find((x) => String(x._id) === String(h._id)) || { rooms: 0, beds: 0 };
    const o = occ.find((x) => String(x._id) === String(h._id))?.occupied || 0;
    return { hostel: h.name, type: h.type, rooms: r.rooms, beds: r.beds, occupied: o, vacant: Math.max(r.beds - o, 0), occupancyPercent: r.beds ? Math.round((o / r.beds) * 1000) / 10 : 0 };
  });
  ok(res, rows);
});

const vacancies = asyncHandler(async (req, res) => {
  const ids = hostelScopeIds(req.user, req.query.hostel);
  const rooms = await Room.find({ status: 'available', ...(ids && { hostel: { $in: ids } }) }).populate('hostel', 'name').populate('block', 'name').sort('roomNumber');
  const counts = await RoomAllocation.aggregate([{ $match: { status: 'active', room: { $in: rooms.map((r) => r._id) } } }, { $group: { _id: '$room', n: { $sum: 1 } } }]);
  const m = new Map(counts.map((c) => [String(c._id), c.n]));
  ok(res, rooms.map((r) => ({ hostel: r.hostel.name, block: r.block.name, room: r.roomNumber, floor: r.floor, capacity: r.capacity, occupied: m.get(String(r._id)) || 0, vacant: r.capacity - (m.get(String(r._id)) || 0) })).filter((r) => r.vacant > 0));
});

const studentList = asyncHandler(async (req, res) => {
  const { department, year, hostel, status } = req.query;
  const ids = hostelScopeIds(req.user, hostel);
  const filter = {};
  if (department) filter.department = department;
  if (year) filter.year = Number(year);
  if (status) filter.status = status;
  if (ids) filter._id = { $in: await RoomAllocation.distinct('student', { status: 'active', hostel: { $in: ids } }) };
  const students = await Student.find(filter).sort('studentId').limit(2000);
  const allocs = await RoomAllocation.find({ status: 'active', student: { $in: students.map((s) => s._id) } }).populate('hostel', 'name').populate('room', 'roomNumber');
  const m = new Map(allocs.map((a) => [String(a.student), a]));
  ok(res, students.map((s) => { const a = m.get(String(s._id)); return { studentId: s.studentId, name: s.name, department: s.department, year: s.year, phone: s.phone, hostel: a?.hostel?.name || '', room: a?.room?.roomNumber || '', bed: a?.bedNumber || '', status: s.status }; }));
});

// ---------- Mess ----------
const dailyAttendance = asyncHandler(async (req, res) => {
  const mess = messScopeIds(req.user, req.query.mess);
  const day = toDay(req.query.date || todayStr());
  const rows = await MealAttendance.aggregate([
    { $match: { date: day, ...(mess && { mess: { $in: mess } }) } },
    { $group: { _id: { meal: '$mealType', status: '$status' }, n: { $sum: 1 } } },
  ]);
  ok(res, MEAL_TYPES.map((m) => ({ mealType: m, present: rows.find((r) => r._id.meal === m && r._id.status === 'present')?.n || 0, absent: rows.find((r) => r._id.meal === m && r._id.status === 'absent')?.n || 0 })));
});

const monthlyUsage = asyncHandler(async (req, res) => {
  const { start, end } = monthRange(req.query.month);
  const mess = messScopeIds(req.user, req.query.mess);
  const rows = await MealAttendance.aggregate([
    { $match: { status: 'present', date: { $gte: start, $lt: end }, ...(mess && { mess: { $in: mess } }) } },
    { $group: { _id: { student: '$student', meal: '$mealType' }, n: { $sum: 1 } } },
  ]);
  const students = await Student.find({ _id: { $in: [...new Set(rows.map((r) => String(r._id.student)))] } }).select('name studentId');
  const info = new Map(students.map((s) => [String(s._id), s]));
  const per = {};
  rows.forEach((r) => { const k = String(r._id.student); per[k] = per[k] || { studentId: info.get(k)?.studentId, name: info.get(k)?.name, breakfast: 0, lunch: 0, snacks: 0, dinner: 0, total: 0 }; per[k][r._id.meal] = r.n; per[k].total += r.n; });
  ok(res, Object.values(per).sort((a, b) => String(a.studentId).localeCompare(String(b.studentId))));
});

const billing = asyncHandler(async (req, res) => {
  await refreshOverdue();
  const mess = messScopeIds(req.user, req.query.mess);
  const match = { ...(mess && { mess: { $in: mess } }), ...(req.query.month && { month: req.query.month }) };
  const rows = await MessBill.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 }, billed: { $sum: '$finalAmount' }, collected: { $sum: '$paidAmount' } } }]);
  const t = rows.reduce((a, r) => ({ count: a.count + r.count, billed: a.billed + r.billed, collected: a.collected + r.collected }), { count: 0, billed: 0, collected: 0 });
  ok(res, { byStatus: rows.map((r) => ({ status: r._id, count: r.count, billed: r.billed, collected: r.collected })), totals: { ...t, outstanding: t.billed - t.collected } });
});

const feedbackSummary = asyncHandler(async (req, res) => {
  const mess = messScopeIds(req.user, req.query.mess);
  const match = { ...(mess && { mess: { $in: mess } }), ...dateRange(req.query, 'date') };
  const rows = await MessFeedback.aggregate([{ $match: match }, { $group: { _id: { date: '$date', meal: '$mealType' }, average: { $avg: '$rating' }, responses: { $sum: 1 } } }, { $sort: { '_id.date': -1 } }, { $limit: 200 }]);
  ok(res, rows.map((r) => ({ date: r._id.date.toISOString().slice(0, 10), mealType: r._id.meal, average: Math.round(r.average * 100) / 100, responses: r.responses })));
});

// ---------- Complaints ----------
const complaintScope = (user, q) => {
  const f = {};
  if (user.role === 'warden') f.hostel = { $in: user.assignedHostels.map(oid) };
  if (q.hostel) { assertHostel(user, q.hostel); f.hostel = oid(q.hostel); }
  return { ...f, ...dateRange(q) };
};
const complaintsByCategory = asyncHandler(async (req, res) => {
  const rows = await Complaint.aggregate([{ $match: complaintScope(req.user, req.query) }, { $group: { _id: { category: '$category', status: '$status' }, n: { $sum: 1 } } }]);
  const cats = [...new Set(rows.map((r) => r._id.category))].sort();
  ok(res, cats.map((c) => { const g = (s) => rows.find((r) => r._id.category === c && r._id.status === s)?.n || 0; return { category: c, pending: g('pending'), in_progress: g('in_progress'), resolved: g('resolved'), rejected: g('rejected'), total: g('pending') + g('in_progress') + g('resolved') + g('rejected') }; }));
});
const complaintTrends = asyncHandler(async (req, res) => {
  const rows = await Complaint.aggregate([{ $match: complaintScope(req.user, req.query) }, { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, raised: { $sum: 1 }, resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } } } }, { $sort: { _id: 1 } }]);
  ok(res, rows.map((r) => ({ month: r._id, raised: r.raised, resolved: r.resolved })));
});

// ---------- Leaves ----------
const leaves = asyncHandler(async (req, res) => {
  const f = {};
  if (req.user.role === 'warden') f.hostel = { $in: req.user.assignedHostels.map(oid) };
  if (req.query.hostel) { assertHostel(req.user, req.query.hostel); f.hostel = oid(req.query.hostel); }
  if (req.query.status) f.status = req.query.status;
  Object.assign(f, dateRange(req.query, 'startDate'));
  const [summary, rows] = await Promise.all([
    LeaveRequest.aggregate([{ $match: f }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    LeaveRequest.find(f).populate('student', 'name studentId department year').populate('hostel', 'name').sort('-startDate').limit(500),
  ]);
  ok(res, { summary: summary.map((s) => ({ status: s._id, count: s.n })), rows: rows.map((l) => ({ studentId: l.student?.studentId, name: l.student?.name, department: l.student?.department, hostel: l.hostel?.name, startDate: l.startDate.toISOString().slice(0, 10), endDate: l.endDate.toISOString().slice(0, 10), status: l.status, reason: l.reason })) });
});

module.exports = { occupancy, vacancies, studentList, dailyAttendance, monthlyUsage, billing, feedbackSummary, complaintsByCategory, complaintTrends, leaves };
