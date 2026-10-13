const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const { asyncHandler, ok, created, paginate, pageMeta, escapeRegex, pick } = require('../utils/helpers');
const { Hostel, Block, Room, RoomAllocation } = require('../models');
const { hostelFilter, assertHostel } = require('../services/scope.service');
const allocationService = require('../services/allocation.service');

const oid = (id) => new mongoose.Types.ObjectId(String(id));

/** Occupancy per hostel: beds come from room capacity (rooms that are closed do not count). */
async function hostelStats(hostelIds) {
  const match = { hostel: { $in: hostelIds.map(oid) }, status: { $ne: 'closed' } };
  const [rooms, occupied] = await Promise.all([
    Room.aggregate([{ $match: match }, { $group: { _id: '$hostel', totalRooms: { $sum: 1 }, totalBeds: { $sum: '$capacity' } } }]),
    RoomAllocation.aggregate([{ $match: { status: 'active', hostel: { $in: hostelIds.map(oid) } } }, { $group: { _id: '$hostel', occupiedBeds: { $sum: 1 } } }]),
  ]);
  const r = new Map(rooms.map((x) => [String(x._id), x]));
  const o = new Map(occupied.map((x) => [String(x._id), x.occupiedBeds]));
  return (id) => {
    const totalRooms = r.get(String(id))?.totalRooms || 0;
    const totalBeds = r.get(String(id))?.totalBeds || 0;
    const occupiedBeds = o.get(String(id)) || 0;
    return { totalRooms, totalBeds, occupiedBeds, vacantBeds: Math.max(totalBeds - occupiedBeds, 0), occupancyPercent: totalBeds ? Math.round((occupiedBeds / totalBeds) * 1000) / 10 : 0 };
  };
}

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip, sort } = paginate(req.query, ['name', 'createdAt'], 'name');
  const filter = { ...(req.user.role === 'admin' ? {} : { _id: { $in: req.user.assignedHostels } }) };
  if (req.query.search) filter.name = new RegExp(escapeRegex(req.query.search), 'i');
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
  const [items, total] = await Promise.all([Hostel.find(filter).sort(sort).skip(skip).limit(limit), Hostel.countDocuments(filter)]);
  const stat = await hostelStats(items.map((h) => h._id));
  ok(res, items.map((h) => ({ ...h.toObject(), stats: stat(h._id) })), pageMeta(page, limit, total));
});

const get = asyncHandler(async (req, res) => {
  const hostel = await Hostel.findById(req.params.id);
  if (!hostel) throw ApiError.notFound('Hostel not found');
  assertHostel(req.user, hostel._id);
  const [stat, blocks] = await Promise.all([hostelStats([hostel._id]), Block.find({ hostel: hostel._id }).sort('name')]);
  ok(res, { ...hostel.toObject(), stats: stat(hostel._id), blocks });
});

const create = asyncHandler(async (req, res) => {
  const hostel = await Hostel.create({ ...pick(req.body, ['name', 'type', 'address', 'contactPhone']), createdBy: req.user._id, updatedBy: req.user._id });
  created(res, hostel);
});

const update = asyncHandler(async (req, res) => {
  const hostel = await Hostel.findById(req.params.id);
  if (!hostel) throw ApiError.notFound('Hostel not found');
  if (req.body.isActive === false && (await RoomAllocation.exists({ hostel: hostel._id, status: 'active' }))) {
    throw ApiError.conflict('Cannot deactivate a hostel that still has students allocated. Vacate or transfer them first');
  }
  Object.assign(hostel, pick(req.body, ['name', 'type', 'address', 'contactPhone', 'isActive']), { updatedBy: req.user._id });
  await hostel.save();
  ok(res, hostel);
});

const remove = asyncHandler(async (req, res) => {
  const hostel = await Hostel.findById(req.params.id);
  if (!hostel) throw ApiError.notFound('Hostel not found');
  if (await RoomAllocation.exists({ hostel: hostel._id, status: 'active' })) throw ApiError.conflict('Cannot delete a hostel that still has students allocated');
  const hasRooms = await Room.exists({ hostel: hostel._id });
  if (hasRooms) { hostel.isActive = false; await hostel.save(); return ok(res, { message: 'Hostel has rooms or history, so it was deactivated instead of deleted' }); }
  await Block.deleteMany({ hostel: hostel._id });
  await hostel.deleteOne();
  ok(res, { message: 'Hostel deleted' });
});

// ---- Blocks ----
const listBlocks = asyncHandler(async (req, res) => {
  const filter = { ...hostelFilter(req.user) };
  if (req.query.hostel) { assertHostel(req.user, req.query.hostel); filter.hostel = req.query.hostel; }
  ok(res, await Block.find(filter).populate('hostel', 'name').sort('hostel name'));
});
const createBlock = asyncHandler(async (req, res) => {
  const hostel = await Hostel.findById(req.body.hostel);
  if (!hostel) throw ApiError.badRequest('Hostel not found');
  created(res, await Block.create({ ...pick(req.body, ['hostel', 'name', 'floors']), createdBy: req.user._id, updatedBy: req.user._id }));
});
const updateBlock = asyncHandler(async (req, res) => {
  const block = await Block.findById(req.params.id);
  if (!block) throw ApiError.notFound('Block not found');
  if (req.body.floors && (await Room.exists({ block: block._id, floor: { $gt: Number(req.body.floors) } }))) throw ApiError.conflict('Rooms exist on floors above the new floor count');
  Object.assign(block, pick(req.body, ['name', 'floors', 'isActive']), { updatedBy: req.user._id });
  await block.save();
  ok(res, block);
});
const removeBlock = asyncHandler(async (req, res) => {
  const block = await Block.findById(req.params.id);
  if (!block) throw ApiError.notFound('Block not found');
  if (await Room.exists({ block: block._id })) throw ApiError.conflict('Remove or move all rooms in this block first');
  await block.deleteOne();
  ok(res, { message: 'Block deleted' });
});

// ---- Rooms ----
const roomWithOccupancy = async (rooms) => {
  const counts = await RoomAllocation.aggregate([{ $match: { status: 'active', room: { $in: rooms.map((r) => r._id) } } }, { $group: { _id: '$room', n: { $sum: 1 } } }]);
  const m = new Map(counts.map((c) => [String(c._id), c.n]));
  return rooms.map((r) => { const occ = m.get(String(r._id)) || 0; return { ...r.toObject(), occupied: occ, vacant: Math.max(r.capacity - occ, 0) }; });
};

const listRooms = asyncHandler(async (req, res) => {
  const { page, limit, skip, sort } = paginate(req.query, ['roomNumber', 'floor', 'capacity', 'createdAt'], 'roomNumber');
  const filter = { ...hostelFilter(req.user) };
  const q = req.query;
  if (q.hostel) { assertHostel(req.user, q.hostel); filter.hostel = q.hostel; }
  if (q.block) filter.block = q.block;
  if (q.floor !== undefined && q.floor !== '') filter.floor = Number(q.floor);
  if (q.status) filter.status = q.status;
  if (q.search) filter.roomNumber = new RegExp(escapeRegex(q.search), 'i');
  if (q.vacancy === 'vacant' || q.vacancy === 'full') {
    // Resolve via occupancy counts over the already-scoped rooms.
    const all = await Room.find(filter).select('capacity');
    const counts = await RoomAllocation.aggregate([{ $match: { status: 'active', room: { $in: all.map((r) => r._id) } } }, { $group: { _id: '$room', n: { $sum: 1 } } }]);
    const m = new Map(counts.map((c) => [String(c._id), c.n]));
    const ids = all.filter((r) => ((m.get(String(r._id)) || 0) < r.capacity) === (q.vacancy === 'vacant')).map((r) => r._id);
    filter._id = { $in: ids };
  }
  const [rows, total] = await Promise.all([
    Room.find(filter).populate('hostel', 'name').populate('block', 'name').sort(sort).skip(skip).limit(limit),
    Room.countDocuments(filter),
  ]);
  ok(res, await roomWithOccupancy(rows), pageMeta(page, limit, total));
});

const getRoom = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id).populate('hostel', 'name').populate('block', 'name');
  if (!room) throw ApiError.notFound('Room not found');
  assertHostel(req.user, room.hostel._id);
  const beds = await allocationService.bedsForRoom(room);
  const occupied = beds.filter((b) => b.occupied).length;
  ok(res, { ...room.toObject(), occupied, vacant: room.capacity - occupied, beds });
});

const createRoom = asyncHandler(async (req, res) => {
  const block = await Block.findById(req.body.block);
  if (!block) throw ApiError.badRequest('Block not found');
  assertHostel(req.user, block.hostel);
  if (Number(req.body.floor) > block.floors) throw ApiError.badRequest(`Block ${block.name} only has ${block.floors} floor(s)`);
  const room = await Room.create({ ...pick(req.body, ['roomNumber', 'floor', 'capacity', 'roomType', 'status']), block: block._id, hostel: block.hostel, createdBy: req.user._id, updatedBy: req.user._id });
  created(res, room);
});

const updateRoom = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) throw ApiError.notFound('Room not found');
  assertHostel(req.user, room.hostel);
  const occupants = await RoomAllocation.find({ room: room._id, status: 'active' }).select('bedNumber');
  if (req.body.capacity !== undefined) {
    const cap = Number(req.body.capacity);
    if (cap < occupants.length) throw ApiError.conflict(`Capacity cannot be below the ${occupants.length} students currently living in this room`);
    if (occupants.some((o) => o.bedNumber > cap)) throw ApiError.conflict('A student occupies a bed number above the new capacity. Move them first');
  }
  if (req.body.status && req.body.status !== 'available' && occupants.length) throw ApiError.conflict('Cannot close or put a room under maintenance while students are allocated');
  Object.assign(room, pick(req.body, ['roomNumber', 'floor', 'capacity', 'roomType', 'status']), { updatedBy: req.user._id });
  await room.save();
  ok(res, room);
});

const removeRoom = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) throw ApiError.notFound('Room not found');
  assertHostel(req.user, room.hostel);
  if (await RoomAllocation.exists({ room: room._id, status: 'active' })) throw ApiError.conflict('Cannot delete a room that has students allocated');
  if (await RoomAllocation.exists({ room: room._id })) { room.status = 'closed'; await room.save(); return ok(res, { message: 'Room has allocation history, so it was closed instead of deleted' }); }
  await room.deleteOne();
  ok(res, { message: 'Room deleted' });
});

/** Rooms with at least one free bed, including which bed numbers are free. Used by the allocation screen. */
const availableBeds = asyncHandler(async (req, res) => {
  const filter = { ...hostelFilter(req.user), status: 'available' };
  if (req.query.hostel) { assertHostel(req.user, req.query.hostel); filter.hostel = req.query.hostel; }
  if (req.query.block) filter.block = req.query.block;
  const rooms = await Room.find(filter).populate('block', 'name').populate('hostel', 'name').sort('roomNumber').limit(300);
  const allocs = await RoomAllocation.find({ status: 'active', room: { $in: rooms.map((r) => r._id) } }).select('room bedNumber');
  const taken = new Map();
  allocs.forEach((a) => { const k = String(a.room); taken.set(k, [...(taken.get(k) || []), a.bedNumber]); });
  const result = rooms.map((r) => {
    const t = taken.get(String(r._id)) || [];
    const freeBeds = Array.from({ length: r.capacity }, (_, i) => i + 1).filter((n) => !t.includes(n));
    return { _id: r._id, roomNumber: r.roomNumber, floor: r.floor, capacity: r.capacity, hostel: r.hostel, block: r.block, freeBeds };
  }).filter((r) => r.freeBeds.length);
  ok(res, result);
});

module.exports = { list, get, create, update, remove, listBlocks, createBlock, updateBlock, removeBlock, listRooms, getRoom, createRoom, updateRoom, removeRoom, availableBeds };
