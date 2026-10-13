const ApiError = require('../utils/ApiError');
const { Student, Room, RoomAllocation } = require('../models');
const { assertHostel } = require('./scope.service');
const { notifyStudents } = require('./notification.service');

async function loadTarget(studentId, roomId, bedNumber, actor) {
  const student = await Student.findById(studentId);
  if (!student) throw ApiError.notFound('Student not found');
  if (student.status !== 'active') throw ApiError.badRequest('Only active students can be allocated a bed');

  const room = await Room.findById(roomId).populate('hostel', 'name isActive').populate('block', 'name');
  if (!room) throw ApiError.notFound('Room not found');
  assertHostel(actor, room.hostel._id);
  if (room.status !== 'available') throw ApiError.conflict(`Room ${room.roomNumber} is ${room.status} and cannot take new students`);
  if (!room.hostel.isActive) throw ApiError.conflict('This hostel is deactivated');

  const bed = Number(bedNumber);
  if (!Number.isInteger(bed) || bed < 1 || bed > room.capacity) {
    throw ApiError.badRequest(`Bed number must be between 1 and ${room.capacity} for room ${room.roomNumber}`);
  }
  const occupied = await RoomAllocation.countDocuments({ room: room._id, status: 'active' });
  if (occupied >= room.capacity) throw ApiError.conflict(`Room ${room.roomNumber} is already at full capacity`);
  const taken = await RoomAllocation.findOne({ room: room._id, bedNumber: bed, status: 'active' });
  if (taken) throw ApiError.conflict(`Bed ${bed} in room ${room.roomNumber} is already occupied`);
  return { student, room, bed };
}

/** Translates unique-index violations (race conditions) into meaningful messages. */
function translateDuplicate(err) {
  if (err.code === 11000) {
    if (err.keyPattern && err.keyPattern.student) return ApiError.conflict('This student already has an active bed allocation');
    return ApiError.conflict('That bed has just been taken by another allocation');
  }
  return err;
}

async function allocate({ studentId, roomId, bedNumber, remarks, actor }) {
  const existing = await RoomAllocation.findOne({ student: studentId, status: 'active' });
  if (existing) throw ApiError.conflict('This student already has an active bed. Use "change room" to move them');
  const { student, room, bed } = await loadTarget(studentId, roomId, bedNumber, actor);
  let allocation;
  try {
    allocation = await RoomAllocation.create({
      student: student._id, hostel: room.hostel._id, block: room.block._id, room: room._id,
      bedNumber: bed, remarks, createdBy: actor._id, updatedBy: actor._id,
    });
  } catch (err) { throw translateDuplicate(err); }
  await notifyStudents([student._id], {
    title: 'Room allocated', type: 'allocation', link: '/my-room',
    message: `You have been allocated bed ${bed} in room ${room.roomNumber} (${room.block.name}, ${room.hostel.name}).`,
  });
  return allocation;
}

async function transfer({ studentId, roomId, bedNumber, remarks, actor }) {
  const current = await RoomAllocation.findOne({ student: studentId, status: 'active' });
  if (!current) throw ApiError.notFound('This student has no active allocation to change');
  assertHostel(actor, current.hostel);
  if (String(current.room) === String(roomId) && current.bedNumber === Number(bedNumber)) {
    throw ApiError.badRequest('The student is already in that bed');
  }
  const { student, room, bed } = await loadTarget(studentId, roomId, bedNumber, actor);

  // Standalone MongoDB has no multi-document transactions, so: close old, create new, roll back on failure.
  current.status = 'transferred';
  current.checkOutDate = new Date();
  current.updatedBy = actor._id;
  await current.save();
  let allocation;
  try {
    allocation = await RoomAllocation.create({
      student: student._id, hostel: room.hostel._id, block: room.block._id, room: room._id,
      bedNumber: bed, remarks, createdBy: actor._id, updatedBy: actor._id,
    });
  } catch (err) {
    current.status = 'active';
    current.checkOutDate = undefined;
    await current.save();
    throw translateDuplicate(err);
  }
  await notifyStudents([student._id], {
    title: 'Room changed', type: 'allocation', link: '/my-room',
    message: `You have been moved to bed ${bed} in room ${room.roomNumber} (${room.block.name}, ${room.hostel.name}).`,
  });
  return allocation;
}

async function vacate({ allocationId, actor, remarks }) {
  const allocation = await RoomAllocation.findById(allocationId);
  if (!allocation) throw ApiError.notFound('Allocation not found');
  assertHostel(actor, allocation.hostel);
  if (allocation.status !== 'active') throw ApiError.conflict('This allocation is already closed');
  allocation.status = 'vacated';
  allocation.checkOutDate = new Date();
  allocation.updatedBy = actor._id;
  if (remarks) allocation.remarks = remarks;
  await allocation.save();
  await notifyStudents([allocation.student], { title: 'Bed vacated', type: 'allocation', message: 'Your hostel bed allocation has been closed (check-out recorded).', link: '/my-room' });
  return allocation;
}

/** Beds are computed: 1..capacity, each with its active occupant if any. */
async function bedsForRoom(room) {
  const active = await RoomAllocation.find({ room: room._id, status: 'active' }).populate('student', 'name studentId department year');
  const byBed = new Map(active.map((a) => [a.bedNumber, a]));
  return Array.from({ length: room.capacity }, (_, i) => {
    const a = byBed.get(i + 1);
    return { bedNumber: i + 1, occupied: !!a, allocationId: a?._id, student: a?.student || null, checkInDate: a?.checkInDate };
  });
}

module.exports = { allocate, transfer, vacate, bedsForRoom };
