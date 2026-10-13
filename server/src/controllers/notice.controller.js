const ApiError = require('../utils/ApiError');
const { asyncHandler, ok, created, paginate, pageMeta, toDay, pick } = require('../utils/helpers');
const { Notice, Student, RoomAllocation, User } = require('../models');
const { canAccessHostel, canAccessMess } = require('../services/scope.service');
const { notifyUsers } = require('../services/notification.service');

const populate = (q) => q.populate('publishedBy', 'name role').populate('audience.hostel', 'name').populate('audience.mess', 'name');

/** Notice filter that matches exactly the notices relevant to one student. */
async function relevanceFilter(student) {
  const alloc = await RoomAllocation.findOne({ student: student._id, status: 'active' }).select('hostel');
  const or = [{ 'audience.type': 'all' }, { 'audience.type': 'year', 'audience.year': student.year }, { 'audience.type': 'department', 'audience.department': student.department }];
  if (alloc) or.push({ 'audience.type': 'hostel', 'audience.hostel': alloc.hostel });
  if (student.mess) or.push({ 'audience.type': 'mess', 'audience.mess': student.mess });
  return { $or: or };
}

/** Writers may only target audiences inside their own scope. */
function assertAudience(user, audience = {}) {
  const t = audience.type || 'all';
  if (user.role === 'admin') return;
  if (user.role === 'warden') {
    if (t !== 'hostel' || !audience.hostel || !canAccessHostel(user, audience.hostel)) throw ApiError.forbidden('Wardens can publish notices only to a hostel they manage');
  } else if (user.role === 'mess_manager') {
    if (t !== 'mess' || !audience.mess || !canAccessMess(user, audience.mess)) throw ApiError.forbidden('Mess managers can publish notices only to a mess they manage');
  }
}
const normaliseAudience = (a = {}) => {
  const t = a.type || 'all';
  const out = { type: t };
  if (t === 'hostel') { if (!a.hostel) throw ApiError.badRequest('Select a hostel'); out.hostel = a.hostel; }
  if (t === 'mess') { if (!a.mess) throw ApiError.badRequest('Select a mess'); out.mess = a.mess; }
  if (t === 'year') { if (!a.year) throw ApiError.badRequest('Select a year'); out.year = Number(a.year); }
  if (t === 'department') { if (!a.department) throw ApiError.badRequest('Select a department'); out.department = a.department; }
  return out;
};

async function recipients(audience) {
  const base = { status: 'active' };
  let filter = base;
  if (audience.type === 'year') filter = { ...base, year: audience.year };
  if (audience.type === 'department') filter = { ...base, department: audience.department };
  if (audience.type === 'mess') filter = { ...base, mess: audience.mess };
  if (audience.type === 'hostel') filter = { ...base, _id: { $in: await RoomAllocation.distinct('student', { status: 'active', hostel: audience.hostel }) } };
  return (await Student.find(filter).select('user')).map((s) => s.user);
}

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip, sort } = paginate(req.query, ['publishDate', 'createdAt'], '-publishDate');
  const now = new Date();
  let filter;
  if (req.user.role === 'student') {
    const s = await Student.findOne({ user: req.user._id });
    filter = { $and: [await relevanceFilter(s), { publishDate: { $lte: now } }, { $or: [{ expiryDate: null }, { expiryDate: { $gte: now } }] }] };
  } else if (req.user.role === 'admin') filter = {};
  else filter = { $or: [{ publishedBy: req.user._id }, ...(req.user.role === 'warden' ? [{ 'audience.hostel': { $in: req.user.assignedHostels } }] : [{ 'audience.mess': { $in: req.user.assignedMesses } }])] };
  if (req.query.category) filter = { $and: [filter, { category: req.query.category }] };
  const [rows, total] = await Promise.all([populate(Notice.find(filter)).sort(sort).skip(skip).limit(limit), Notice.countDocuments(filter)]);
  ok(res, rows, pageMeta(page, limit, total));
});

async function loadWritable(req) {
  const n = await Notice.findById(req.params.id);
  if (!n) throw ApiError.notFound('Notice not found');
  if (req.user.role !== 'admin') assertAudience(req.user, n.audience.toObject ? n.audience.toObject() : n.audience);
  return n;
}

const create = asyncHandler(async (req, res) => {
  const audience = normaliseAudience(req.body.audience);
  assertAudience(req.user, audience);
  const publishDate = req.body.publishDate ? new Date(req.body.publishDate) : new Date();
  const expiryDate = req.body.expiryDate ? new Date(toDay(req.body.expiryDate).getTime() + 86399000) : undefined;
  if (expiryDate && expiryDate < publishDate) throw ApiError.badRequest('Expiry date cannot be before the publish date');
  const notice = await Notice.create({ ...pick(req.body, ['title', 'description', 'category']), audience, publishDate, expiryDate, publishedBy: req.user._id, createdBy: req.user._id, updatedBy: req.user._id });
  if (publishDate <= new Date()) await notifyUsers(await recipients(audience), { title: 'New notice', message: notice.title, type: 'notice', link: '/notices' });
  created(res, notice);
});

const update = asyncHandler(async (req, res) => {
  const n = await loadWritable(req);
  if (req.body.audience) { const a = normaliseAudience(req.body.audience); assertAudience(req.user, a); n.audience = a; }
  Object.assign(n, pick(req.body, ['title', 'description', 'category']), { updatedBy: req.user._id });
  if (req.body.expiryDate !== undefined) n.expiryDate = req.body.expiryDate ? new Date(toDay(req.body.expiryDate).getTime() + 86399000) : undefined;
  if (n.expiryDate && n.expiryDate < n.publishDate) throw ApiError.badRequest('Expiry date cannot be before the publish date');
  await n.save();
  ok(res, n);
});

const remove = asyncHandler(async (req, res) => { await (await loadWritable(req)).deleteOne(); ok(res, { message: 'Notice deleted' }); });

module.exports = { list, create, update, remove };
