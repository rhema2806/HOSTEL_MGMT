const ApiError = require('../utils/ApiError');
const { Student, RoomAllocation } = require('../models');

/** Student ids that currently hold an active bed in any of the given hostels. */
const studentIdsInHostels = (hostelIds) => RoomAllocation.distinct('student', { status: 'active', hostel: { $in: hostelIds } });

/**
 * Mongo filter on Student limiting rows to what `user` may see.
 * Wardens see students in their hostels plus students not yet allocated anywhere (so they can be onboarded).
 */
async function visibleStudentFilter(user) {
  if (user.role === 'admin') return {};
  if (user.role === 'warden') {
    const elsewhere = await RoomAllocation.distinct('student', { status: 'active', hostel: { $nin: user.assignedHostels } });
    return { _id: { $nin: elsewhere } };
  }
  if (user.role === 'mess_manager') return { mess: { $in: user.assignedMesses } };
  return { _id: null };
}

async function assertStudentAccess(user, student) {
  if (user.role === 'admin') return;
  if (user.role === 'student') {
    if (String(student.user) !== String(user._id)) throw ApiError.forbidden('You can only access your own records');
    return;
  }
  const visible = await Student.exists({ $and: [{ _id: student._id }, await visibleStudentFilter(user)] });
  if (!visible) throw ApiError.forbidden('This student is outside your assigned scope');
}

const currentAllocation = (studentId) =>
  RoomAllocation.findOne({ student: studentId, status: 'active' })
    .populate('hostel', 'name type').populate('block', 'name').populate('room', 'roomNumber floor capacity roomType');

module.exports = { studentIdsInHostels, visibleStudentFilter, assertStudentAccess, currentAllocation };
