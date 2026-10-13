const ApiError = require('../utils/ApiError');
const { asyncHandler, ok, created, paginate, pageMeta, escapeRegex, toDay } = require('../utils/helpers');
const { Complaint, Student, User, RoomAllocation } = require('../models');
const { hostelFilter, canAccessHostel, canAccessMess } = require('../services/scope.service');
const { notifyStudents, notifyStaff } = require('../services/notification.service');

/** Which complaints a role may see. Wardens: their hostels. Mess managers: food complaints in their messes. */
const scopeFilter = async (user) => {
  if (user.role === 'admin') return {};
  if (user.role === 'warden') return hostelFilter(user);
  if (user.role === 'mess_manager') return { category: 'food', mess: { $in: user.assignedMesses } };
  const s = await Student.findOne({ user: user._id }).select('_id');
  return { student: s?._id || null };
};

const populate = (q) => q.populate('student', 'name studentId').populate('assignedTo', 'name role').populate('hostel', 'name');

async function loadAccessible(req) {
  const c = await Complaint.findById(req.params.id);
  if (!c) throw ApiError.notFound('Complaint not found');
  const { role } = req.user;
  if (role === 'student') {
    const s = await Student.findOne({ user: req.user._id }).select('_id');
    if (!s || String(s._id) !== String(c.student)) throw ApiError.forbidden('You can only view your own complaints');
  } else if (role === 'warden') {
    if (!c.hostel || !canAccessHostel(req.user, c.hostel)) throw ApiError.forbidden('This complaint is outside your assigned hostels');
  } else if (role === 'mess_manager') {
    if (c.category !== 'food' || !c.mess || !canAccessMess(req.user, c.mess)) throw ApiError.forbidden('Mess managers can only access food complaints from their mess');
  }
  return c;
}

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip, sort } = paginate(req.query, ['createdAt', 'priority', 'status', 'category']);
  const q = req.query;
  const filter = await scopeFilter(req.user);
  if (q.category) filter.category = q.category;
  if (q.status) filter.status = q.status;
  if (q.priority) filter.priority = q.priority;
  if (q.hostel && req.user.role !== 'student' && req.user.role !== 'mess_manager') { if (canAccessHostel(req.user, q.hostel)) filter.hostel = q.hostel; }
  if (q.search) filter.title = new RegExp(escapeRegex(q.search), 'i');
  if (q.from || q.to) filter.createdAt = { ...(q.from && { $gte: toDay(q.from) }), ...(q.to && { $lt: new Date(toDay(q.to).getTime() + 86400000) }) };
  const [rows, total] = await Promise.all([populate(Complaint.find(filter)).sort(sort).skip(skip).limit(limit), Complaint.countDocuments(filter)]);
  ok(res, rows, pageMeta(page, limit, total));
});

const get = asyncHandler(async (req, res) => {
  const c = await loadAccessible(req);
  await populate(c.populate('statusHistory.by', 'name'));
  ok(res, c);
});

const create = asyncHandler(async (req, res) => {
  const s = req.student;
  if (s.status !== 'active') throw ApiError.forbidden('Inactive students cannot file complaints');
  const alloc = await RoomAllocation.findOne({ student: s._id, status: 'active' }).select('hostel');
  const complaint = await Complaint.create({
    student: s._id, hostel: alloc?.hostel, mess: s.mess, category: req.body.category, title: req.body.title, description: req.body.description,
    priority: req.body.priority || 'medium', statusHistory: [{ status: 'pending', note: 'Complaint submitted', by: req.user._id }], createdBy: req.user._id, updatedBy: req.user._id,
  });
  if (complaint.category === 'food') await notifyStaff('mess_manager', { mess: s.mess }, { title: 'New food complaint', message: complaint.title, type: 'complaint', link: '/complaints' });
  else if (alloc) await notifyStaff('warden', { hostel: alloc.hostel }, { title: 'New complaint', message: `${complaint.category}: ${complaint.title}`, type: 'complaint', link: '/complaints' });
  created(res, complaint);
});

const update = asyncHandler(async (req, res) => {
  const c = await loadAccessible(req);
  const { status, assignedTo, resolution, priority } = req.body;
  if (['resolved', 'rejected'].includes(c.status) && status && status !== c.status) throw ApiError.conflict(`A ${c.status} complaint cannot be reopened. Ask the student to file a new one`);
  if (assignedTo) {
    const assignee = await User.findOne({ _id: assignedTo, isActive: true, role: { $in: ['warden', 'mess_manager', 'admin'] } });
    if (!assignee) throw ApiError.badRequest('Assignee must be an active staff member');
    c.assignedTo = assignee._id;
  }
  if (priority) c.priority = priority;
  if (resolution !== undefined) c.resolution = resolution;
  let statusChanged = false;
  if (status && status !== c.status) {
    if (['resolved', 'rejected'].includes(status) && !(resolution || c.resolution)) throw ApiError.badRequest(`Add a ${status === 'resolved' ? 'resolution' : 'reason'} before marking the complaint ${status.replace('_', ' ')}`);
    c.status = status;
    c.statusHistory.push({ status, note: resolution || req.body.note, by: req.user._id });
    statusChanged = true;
  }
  c.updatedBy = req.user._id;
  await c.save();
  if (statusChanged) {
    await notifyStudents([c.student], { title: `Complaint ${c.status.replace('_', ' ')}`, type: 'complaint', link: '/my-complaints', message: `Your complaint "${c.title}" is now ${c.status.replace('_', ' ')}.${c.resolution ? ` Note: ${c.resolution}` : ''}` });
  }
  ok(res, c);
});

const remove = asyncHandler(async (req, res) => {
  const c = await Complaint.findById(req.params.id);
  if (!c) throw ApiError.notFound('Complaint not found');
  await c.deleteOne();
  ok(res, { message: 'Complaint deleted' });
});

module.exports = { list, get, create, update, remove };
