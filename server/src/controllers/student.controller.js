const crypto = require('crypto');
const ApiError = require('../utils/ApiError');
const { asyncHandler, ok, created, paginate, pageMeta, escapeRegex, pick, toDay } = require('../utils/helpers');
const { User, Student, RoomAllocation, Room, Mess } = require('../models');
const { visibleStudentFilter, assertStudentAccess, studentIdsInHostels, currentAllocation } = require('../services/studentScope.service');
const allocationService = require('../services/allocation.service');

const PROFILE_FIELDS = ['name', 'email', 'phone', 'dob', 'gender', 'department', 'year', 'section', 'guardianName', 'guardianPhone', 'emergencyContact', 'address', 'photoUrl', 'mess', 'admissionDate', 'status'];
const SELF_EDITABLE = ['phone', 'address', 'emergencyContact', 'guardianName', 'guardianPhone', 'photoUrl', 'dob'];

async function attachAllocations(students) {
  const allocs = await RoomAllocation.find({ student: { $in: students.map((s) => s._id) }, status: 'active' })
    .populate('hostel', 'name').populate('block', 'name').populate('room', 'roomNumber floor');
  const map = new Map(allocs.map((a) => [String(a.student), a]));
  return students.map((s) => ({ ...s.toObject(), allocation: map.get(String(s._id)) || null }));
}

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip, sort } = paginate(req.query, ['name', 'studentId', 'department', 'year', 'createdAt'], 'name');
  const q = req.query;
  const and = [await visibleStudentFilter(req.user)];
  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search), 'i');
    and.push({ $or: [{ name: rx }, { studentId: rx }, { email: rx }, { department: rx }] });
  }
  if (q.department) and.push({ department: q.department });
  if (q.year) and.push({ year: Number(q.year) });
  if (q.status) and.push({ status: q.status });
  if (q.mess) and.push({ mess: q.mess });
  if (q.unallocated === 'true') and.push({ _id: { $nin: await RoomAllocation.distinct('student', { status: 'active' }) } });

  // Hostel / room filters resolve through active allocations.
  const allocFilter = { status: 'active' };
  let useAlloc = false;
  if (q.hostel) { allocFilter.hostel = q.hostel; useAlloc = true; }
  if (q.room) { allocFilter.room = q.room; useAlloc = true; }
  if (q.roomNumber) {
    const rooms = await Room.find({ roomNumber: new RegExp(`^${escapeRegex(q.roomNumber)}`, 'i') }).select('_id');
    allocFilter.room = { $in: rooms.map((r) => r._id) };
    useAlloc = true;
  }
  if (useAlloc) and.push({ _id: { $in: await RoomAllocation.distinct('student', allocFilter) } });

  const filter = { $and: and };
  const [rows, total] = await Promise.all([
    Student.find(filter).populate('mess', 'name').sort(sort).skip(skip).limit(limit),
    Student.countDocuments(filter),
  ]);
  ok(res, await attachAllocations(rows), pageMeta(page, limit, total));
});

const get = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id).populate('mess', 'name');
  if (!student) throw ApiError.notFound('Student not found');
  await assertStudentAccess(req.user, student);
  const [allocation, history] = await Promise.all([
    currentAllocation(student._id),
    RoomAllocation.find({ student: student._id }).populate('hostel', 'name').populate('room', 'roomNumber').sort('-createdAt').limit(20),
  ]);
  ok(res, { ...student.toObject(), allocation, allocationHistory: history });
});

const create = asyncHandler(async (req, res) => {
  const body = pick(req.body, PROFILE_FIELDS);
  if (body.mess && !(await Mess.exists({ _id: body.mess }))) throw ApiError.badRequest('Selected mess does not exist');
  let password = req.body.password;
  let temporaryPassword;
  if (!password) { password = crypto.randomBytes(6).toString('base64url') + '9a'; temporaryPassword = password; }

  const user = await User.create({ name: body.name, email: body.email, phone: body.phone, role: 'student', password, mustChangePassword: true, createdBy: req.user._id, updatedBy: req.user._id });
  try {
    const student = await Student.create({ ...body, studentId: req.body.studentId, user: user._id, createdBy: req.user._id, updatedBy: req.user._id });
    created(res, student, temporaryPassword ? { temporaryPassword } : {});
  } catch (err) {
    await User.deleteOne({ _id: user._id }); // keep users and students in step
    throw err;
  }
});

const update = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) throw ApiError.notFound('Student not found');
  await assertStudentAccess(req.user, student);
  const body = pick(req.body, PROFILE_FIELDS);
  if (body.mess && !(await Mess.exists({ _id: body.mess }))) throw ApiError.badRequest('Selected mess does not exist');
  Object.assign(student, body, { updatedBy: req.user._id });
  await student.save();
  const userUpdate = pick(body, ['name', 'email', 'phone']);
  if (body.status) userUpdate.isActive = body.status === 'active';
  if (Object.keys(userUpdate).length) await User.updateOne({ _id: student.user }, userUpdate, { runValidators: true });
  if (body.status && body.status !== 'active') {
    const active = await RoomAllocation.findOne({ student: student._id, status: 'active' });
    if (active) await allocationService.vacate({ allocationId: active._id, actor: req.user, remarks: 'Student no longer active' }).catch(() => {});
  }
  ok(res, student);
});

/** Students may edit only a short list of contact fields on their own profile. */
const updateMe = asyncHandler(async (req, res) => {
  Object.assign(req.student, pick(req.body, SELF_EDITABLE), { updatedBy: req.user._id });
  await req.student.save();
  if (req.body.phone) await User.updateOne({ _id: req.user._id }, { phone: req.body.phone });
  ok(res, req.student);
});

/** Soft delete: deactivates the student and login, closes the bed allocation, keeps history intact. */
const remove = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) throw ApiError.notFound('Student not found');
  await assertStudentAccess(req.user, student);
  student.status = 'inactive';
  student.updatedBy = req.user._id;
  await student.save();
  await User.updateOne({ _id: student.user }, { isActive: false });
  const active = await RoomAllocation.findOne({ student: student._id, status: 'active' });
  if (active) await allocationService.vacate({ allocationId: active._id, actor: req.user, remarks: 'Student deactivated' });
  ok(res, { message: 'Student deactivated and bed released' });
});

module.exports = { list, get, create, update, updateMe, remove, studentIdsInHostels };
