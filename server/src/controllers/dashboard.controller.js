const mongoose = require('mongoose');
const { asyncHandler, ok, toDay, todayStr } = require('../utils/helpers');
const { User, Hostel, Room, RoomAllocation, Student, MessMenu, MealAttendance, MessBill, MessFeedback, Complaint, LeaveRequest, Notice, Notification, Mess, Payment } = require('../models');
const { refreshOverdue } = require('../services/billing.service');

const oid = (v) => new mongoose.Types.ObjectId(String(v));

async function occupancyFor(hostelIds) {
  const roomMatch = { status: { $ne: 'closed' }, ...(hostelIds && { hostel: { $in: hostelIds } }) };
  const [rooms, occupied] = await Promise.all([
    Room.aggregate([{ $match: roomMatch }, { $group: { _id: null, rooms: { $sum: 1 }, beds: { $sum: '$capacity' } } }]),
    RoomAllocation.countDocuments({ status: 'active', ...(hostelIds && { hostel: { $in: hostelIds } }) }),
  ]);
  const totalRooms = rooms[0]?.rooms || 0;
  const totalBeds = rooms[0]?.beds || 0;
  return { totalRooms, totalBeds, occupiedBeds: occupied, vacantBeds: Math.max(totalBeds - occupied, 0), occupancyPercent: totalBeds ? Math.round((occupied / totalBeds) * 1000) / 10 : 0 };
}

const recentNotices = (filter = {}) => Notice.find({ publishDate: { $lte: new Date() }, ...filter }).sort('-publishDate').limit(5).select('title category publishDate');

async function feedbackSummary(messIds) {
  const since = new Date(Date.now() - 30 * 86400000);
  const r = await MessFeedback.aggregate([{ $match: { ...(messIds && { mess: { $in: messIds } }), date: { $gte: since } } }, { $group: { _id: null, avg: { $avg: '$rating' }, n: { $sum: 1 } } }]);
  return { average: r[0] ? Math.round(r[0].avg * 100) / 100 : null, responses: r[0]?.n || 0, periodDays: 30 };
}

async function billStats(messIds) {
  await refreshOverdue();
  const rows = await MessBill.aggregate([{ $match: messIds ? { mess: { $in: messIds } } : {} }, { $group: { _id: '$status', count: { $sum: 1 }, billed: { $sum: '$finalAmount' }, paid: { $sum: '$paidAmount' } } }]);
  const c = (s) => rows.find((r) => r._id === s)?.count || 0;
  const billed = rows.reduce((a, r) => a + r.billed, 0);
  const collected = rows.reduce((a, r) => a + r.paid, 0);
  return { pending: c('pending') + c('partially_paid'), overdue: c('overdue'), paid: c('paid'), billed, collected, outstanding: billed - collected };
}

const student = async (req, res) => {
  const s = req.student;
  const alloc = await RoomAllocation.findOne({ student: s._id, status: 'active' }).populate('hostel', 'name').populate('block', 'name').populate('room', 'roomNumber floor');
  const today = toDay(todayStr());
  const now = new Date();
  const or = [{ 'audience.type': 'all' }, { 'audience.type': 'year', 'audience.year': s.year }, { 'audience.type': 'department', 'audience.department': s.department }];
  if (alloc) or.push({ 'audience.type': 'hostel', 'audience.hostel': alloc.hostel._id });
  if (s.mess) or.push({ 'audience.type': 'mess', 'audience.mess': s.mess });
  const [menu, bill, leave, complaints, unread, notices, mess] = await Promise.all([
    s.mess ? MessMenu.findOne({ mess: s.mess, date: today }) : null,
    MessBill.findOne({ student: s._id }).sort('-month'),
    LeaveRequest.findOne({ student: s._id, status: 'pending' }).sort('-createdAt'),
    Complaint.countDocuments({ student: s._id, status: { $in: ['pending', 'in_progress'] } }),
    Notification.countDocuments({ recipient: req.user._id, read: false }),
    Notice.find({ $and: [{ $or: or }, { publishDate: { $lte: now } }, { $or: [{ expiryDate: null }, { expiryDate: { $gte: now } }] }] }).sort('-publishDate').limit(5).select('title category publishDate'),
    s.mess ? Mess.findById(s.mess).select('name mealTimings') : null,
  ]);
  ok(res, {
    role: 'student',
    student: { name: s.name, studentId: s.studentId, department: s.department, year: s.year },
    accommodation: alloc ? { hostel: alloc.hostel.name, block: alloc.block.name, room: alloc.room.roomNumber, floor: alloc.room.floor, bed: alloc.bedNumber } : null,
    mess, todayMenu: menu, currentBill: bill, pendingLeave: leave, activeComplaints: complaints, unreadNotifications: unread, recentNotices: notices,
  });
};

const warden = async (req, res) => {
  const ids = req.user.assignedHostels.map(oid);
  const studentIds = await RoomAllocation.distinct('student', { status: 'active', hostel: { $in: ids } });
  const [occ, students, leaves, complaints, notices, activity] = await Promise.all([
    occupancyFor(ids),
    Student.countDocuments({ _id: { $in: studentIds }, status: 'active' }),
    LeaveRequest.countDocuments({ hostel: { $in: ids }, status: 'pending' }),
    Complaint.countDocuments({ hostel: { $in: ids }, status: 'pending' }),
    recentNotices({ $or: [{ 'audience.hostel': { $in: ids } }, { 'audience.type': 'all' }] }),
    Complaint.find({ hostel: { $in: ids } }).sort('-updatedAt').limit(5).populate('student', 'name').select('title status category updatedAt student'),
  ]);
  ok(res, { role: 'warden', hostels: await Hostel.find({ _id: { $in: ids } }).select('name'), totalStudents: students, ...occ, pendingLeaves: leaves, pendingComplaints: complaints, recentNotices: notices, recentActivity: activity });
};

const messManager = async (req, res) => {
  const ids = req.user.assignedMesses.map(oid);
  const today = toDay(todayStr());
  const [menus, att, bills, feedback, studentsCount, foodComplaints, messes] = await Promise.all([
    MessMenu.find({ mess: { $in: ids }, date: today }).populate('mess', 'name'),
    MealAttendance.aggregate([{ $match: { mess: { $in: ids }, date: today, status: 'present' } }, { $group: { _id: '$mealType', n: { $sum: 1 } } }]),
    billStats(ids),
    feedbackSummary(ids),
    Student.countDocuments({ mess: { $in: ids }, status: 'active' }),
    Complaint.countDocuments({ mess: { $in: ids }, category: 'food', status: { $in: ['pending', 'in_progress'] } }),
    Mess.find({ _id: { $in: ids } }).select('name'),
  ]);
  const byMeal = ['breakfast', 'lunch', 'snacks', 'dinner'].map((m) => ({ mealType: m, served: att.find((a) => a._id === m)?.n || 0 }));
  const missingMenu = messes.filter((m) => !menus.some((x) => String(x.mess._id) === String(m._id)));
  const tasks = [];
  missingMenu.forEach((m) => tasks.push(`Publish today's menu for ${m.name}`));
  if (foodComplaints) tasks.push(`${foodComplaints} open food complaint(s) to review`);
  if (bills.overdue) tasks.push(`${bills.overdue} overdue bill(s) to follow up`);
  ok(res, { role: 'mess_manager', messes, todayMenus: menus, attendanceToday: byMeal, mealsServed: byMeal.reduce((a, b) => a + b.served, 0), totalStudents: studentsCount, pendingTasks: tasks, feedback, billing: bills });
};

const admin = async (req, res) => {
  const [students, hostels, occ, complaints, leaves, bills, payments, users] = await Promise.all([
    Student.countDocuments({ status: 'active' }), Hostel.countDocuments({ isActive: true }), occupancyFor(null),
    Complaint.countDocuments({ status: 'pending' }), LeaveRequest.countDocuments({ status: 'pending' }), billStats(null),
    Payment.aggregate([{ $match: { status: 'success', paidAt: { $gte: new Date(Date.now() - 180 * 86400000) } } }, { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$paidAt' } }, total: { $sum: '$amount' } } }, { $sort: { _id: 1 } }]),
    User.countDocuments({ isActive: true }),
  ]);
  ok(res, { role: 'admin', totalStudents: students, totalHostels: hostels, ...occ, pendingComplaints: complaints, pendingLeaves: leaves, pendingBills: bills.pending + bills.overdue, billing: bills, collectionsByMonth: payments.map((p) => ({ month: p._id, total: p.total })), activeUsers: users });
};

const byRole = { student, warden, mess_manager: messManager, admin };
const get = asyncHandler((req, res) => byRole[req.user.role](req, res));

module.exports = { get };
