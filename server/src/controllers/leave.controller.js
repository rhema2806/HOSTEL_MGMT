const ApiError = require('../utils/ApiError');
const { asyncHandler, ok, created, paginate, pageMeta, toDay, todayStr } = require('../utils/helpers');
const { LeaveRequest, Student, RoomAllocation } = require('../models');
const { hostelFilter, canAccessHostel } = require('../services/scope.service');
const { notifyStudents, notifyStaff } = require('../services/notification.service');

const fmt = (d) => d.toISOString().slice(0, 10);
const populate = (q) => q.populate('student', 'name studentId department year').populate('hostel', 'name').populate('decidedBy', 'name');

async function loadAccessible(req) {
  const l = await LeaveRequest.findById(req.params.id);
  if (!l) throw ApiError.notFound('Leave request not found');
  if (req.user.role === 'student') {
    const s = await Student.findOne({ user: req.user._id }).select('_id');
    if (!s || String(s._id) !== String(l.student)) throw ApiError.forbidden('You can only access your own leave requests');
  } else if (req.user.role === 'warden' && (!l.hostel || !canAccessHostel(req.user, l.hostel))) {
    throw ApiError.forbidden('This leave request is outside your assigned hostels');
  }
  return l;
}

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip, sort } = paginate(req.query, ['createdAt', 'startDate', 'status']);
  const q = req.query;
  const filter = {};
  if (req.user.role === 'student') filter.student = (await Student.findOne({ user: req.user._id }))?._id || null;
  else Object.assign(filter, hostelFilter(req.user));
  if (q.status) filter.status = q.status;
  if (q.student && req.user.role !== 'student') filter.student = q.student;
  if (q.hostel && req.user.role !== 'student' && canAccessHostel(req.user, q.hostel)) filter.hostel = q.hostel;
  if (q.from) filter.endDate = { $gte: toDay(q.from) };
  if (q.to) filter.startDate = { $lte: toDay(q.to) };
  const [rows, total] = await Promise.all([populate(LeaveRequest.find(filter)).sort(sort).skip(skip).limit(limit), LeaveRequest.countDocuments(filter)]);
  ok(res, rows, pageMeta(page, limit, total));
});

const get = asyncHandler(async (req, res) => ok(res, await populate((await loadAccessible(req)).populate('student', 'name'))));

const create = asyncHandler(async (req, res) => {
  const s = req.student;
  if (s.status !== 'active') throw ApiError.forbidden('Inactive students cannot apply for leave');
  const start = toDay(req.body.startDate);
  const end = toDay(req.body.endDate);
  if (end < start) throw ApiError.badRequest('End date cannot be before start date');
  if (start < toDay(todayStr())) throw ApiError.badRequest('Start date cannot be in the past');
  if ((end - start) / 86400000 > 90) throw ApiError.badRequest('A single leave request cannot exceed 90 days');
  const overlap = await LeaveRequest.findOne({ student: s._id, status: { $in: ['pending', 'approved'] }, startDate: { $lte: end }, endDate: { $gte: start } });
  if (overlap) throw ApiError.conflict(`This overlaps with an existing ${overlap.status} leave (${fmt(overlap.startDate)} to ${fmt(overlap.endDate)})`);
  const alloc = await RoomAllocation.findOne({ student: s._id, status: 'active' }).select('hostel');
  const leave = await LeaveRequest.create({ student: s._id, hostel: alloc?.hostel, startDate: start, endDate: end, reason: req.body.reason, destination: req.body.destination, contact: req.body.contact, createdBy: req.user._id, updatedBy: req.user._id });
  if (alloc) await notifyStaff('warden', { hostel: alloc.hostel }, { title: 'New leave request', type: 'leave', link: '/leaves', message: `${s.name} requested leave from ${fmt(start)} to ${fmt(end)}.` });
  created(res, leave);
});

const decide = asyncHandler(async (req, res) => {
  const leave = await loadAccessible(req);
  if (leave.status !== 'pending') throw ApiError.conflict(`This request is already ${leave.status}`);
  const { status, remarks } = req.body;
  if (status === 'rejected' && !remarks) throw ApiError.badRequest('Add remarks explaining the rejection');
  leave.status = status;
  leave.remarks = remarks;
  leave.decidedBy = req.user._id;
  leave.decidedAt = new Date();
  leave.updatedBy = req.user._id;
  await leave.save();
  await notifyStudents([leave.student], { title: `Leave ${status}`, type: 'leave', link: '/my-leaves', message: `Your leave (${fmt(leave.startDate)} to ${fmt(leave.endDate)}) was ${status}.${remarks ? ` Remarks: ${remarks}` : ''}` });
  ok(res, leave);
});

/** Students can cancel their own pending request, or an approved one that has not started. */
const cancel = asyncHandler(async (req, res) => {
  const leave = await loadAccessible(req);
  const notStarted = leave.startDate > toDay(todayStr());
  if (!(leave.status === 'pending' || (leave.status === 'approved' && notStarted))) throw ApiError.conflict('Only pending requests, or approved leaves that have not started, can be cancelled');
  leave.status = 'cancelled';
  leave.updatedBy = req.user._id;
  await leave.save();
  ok(res, leave);
});

module.exports = { list, get, create, decide, cancel };
