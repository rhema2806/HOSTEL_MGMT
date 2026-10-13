const ApiError = require('../utils/ApiError');
const { asyncHandler, ok, created, paginate, pageMeta } = require('../utils/helpers');
const { RoomAllocation, Student } = require('../models');
const { hostelFilter, assertHostel } = require('../services/scope.service');
const service = require('../services/allocation.service');

const populate = (q) => q.populate('student', 'name studentId department year').populate('hostel', 'name').populate('block', 'name').populate('room', 'roomNumber floor capacity');

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip, sort } = paginate(req.query, ['createdAt', 'checkInDate']);
  const filter = { ...hostelFilter(req.user) };
  const q = req.query;
  if (q.hostel) { assertHostel(req.user, q.hostel); filter.hostel = q.hostel; }
  if (q.room) filter.room = q.room;
  if (q.student) filter.student = q.student;
  filter.status = q.status || 'active';
  if (q.status === 'all') delete filter.status;
  const [rows, total] = await Promise.all([populate(RoomAllocation.find(filter)).sort(sort).skip(skip).limit(limit), RoomAllocation.countDocuments(filter)]);
  ok(res, rows, pageMeta(page, limit, total));
});

/** Student view: own bed, roommates and allocation history. The student comes from the token. */
const mine = asyncHandler(async (req, res) => {
  const current = await populate(RoomAllocation.findOne({ student: req.student._id, status: 'active' }));
  let roommates = [];
  if (current) {
    const others = await RoomAllocation.find({ room: current.room._id, status: 'active', student: { $ne: req.student._id } }).populate('student', 'name department year phone');
    roommates = others.map((o) => ({ bedNumber: o.bedNumber, name: o.student.name, department: o.student.department, year: o.student.year }));
  }
  const history = await populate(RoomAllocation.find({ student: req.student._id }).sort('-createdAt'));
  ok(res, { current, roommates, history });
});

const allocate = asyncHandler(async (req, res) => {
  const a = await service.allocate({ ...req.body, actor: req.user });
  created(res, await populate(RoomAllocation.findById(a._id)));
});
const transfer = asyncHandler(async (req, res) => {
  const a = await service.transfer({ ...req.body, actor: req.user });
  created(res, await populate(RoomAllocation.findById(a._id)));
});
const vacate = asyncHandler(async (req, res) => {
  const a = await service.vacate({ allocationId: req.params.id, actor: req.user, remarks: req.body.remarks });
  ok(res, a);
});

module.exports = { list, mine, allocate, transfer, vacate };
