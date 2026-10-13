const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const { asyncHandler, ok, created, pick, toDay, todayStr, paginate, pageMeta } = require('../utils/helpers');
const { MEAL_TYPES } = require('../utils/constants');
const { Mess, MessMenu, MealAttendance, MessFeedback, Student } = require('../models');
const { assertMess, canAccessMess } = require('../services/scope.service');
const { notifyStudents } = require('../services/notification.service');

/** Resolves which mess a request refers to, enforcing scope. Students are always pinned to their own mess. */
async function resolveMess(req, messId) {
  if (req.user.role === 'student') {
    const s = req.student || (await Student.findOne({ user: req.user._id }));
    if (!s?.mess) throw ApiError.notFound('You are not assigned to a mess yet');
    return s.mess;
  }
  if (!messId) {
    if (req.user.role === 'mess_manager' && req.user.assignedMesses.length === 1) return req.user.assignedMesses[0];
    throw ApiError.badRequest('Select a mess');
  }
  assertMess(req.user, messId);
  return messId;
}

// ---- Mess info ----
const listMesses = asyncHandler(async (req, res) => {
  let filter = {};
  if (req.user.role === 'mess_manager') filter = { _id: { $in: req.user.assignedMesses } };
  if (req.user.role === 'student') { const s = await Student.findOne({ user: req.user._id }); filter = { _id: s?.mess || null }; }
  ok(res, await Mess.find(filter).populate('hostels', 'name').sort('name'));
});
const createMess = asyncHandler(async (req, res) => created(res, await Mess.create({ ...pick(req.body, ['name', 'location', 'hostels', 'mealRates', 'mealTimings']), createdBy: req.user._id, updatedBy: req.user._id })));
const updateMess = asyncHandler(async (req, res) => {
  const mess = await Mess.findById(req.params.id);
  if (!mess) throw ApiError.notFound('Mess not found');
  assertMess(req.user, mess._id);
  const fields = req.user.role === 'admin' ? ['name', 'location', 'hostels', 'mealRates', 'mealTimings', 'isActive'] : ['location', 'mealRates', 'mealTimings'];
  const data = pick(req.body, fields);
  if (data.mealRates) data.mealRates = { ...mess.mealRates.toObject(), ...data.mealRates };
  if (data.mealTimings) data.mealTimings = { ...mess.mealTimings.toObject(), ...data.mealTimings };
  Object.assign(mess, data, { updatedBy: req.user._id });
  await mess.save();
  ok(res, mess);
});
const removeMess = asyncHandler(async (req, res) => {
  const mess = await Mess.findById(req.params.id);
  if (!mess) throw ApiError.notFound('Mess not found');
  if (await Student.exists({ mess: mess._id, status: 'active' })) throw ApiError.conflict('Reassign the students of this mess before deleting it');
  mess.isActive = false; // keep menus, attendance and bills referencing it valid
  await mess.save();
  ok(res, { message: 'Mess deactivated' });
});

// ---- Menus ----
const listMenus = asyncHandler(async (req, res) => {
  const mess = await resolveMess(req, req.query.mess);
  const from = toDay(req.query.from || todayStr());
  const to = req.query.to ? toDay(req.query.to) : new Date(from.getTime() + 6 * 86400000);
  if (to < from) throw ApiError.badRequest('"to" date cannot be before "from" date');
  if ((to - from) / 86400000 > 62) throw ApiError.badRequest('Date range too large (max 62 days)');
  ok(res, await MessMenu.find({ mess, date: { $gte: from, $lte: to } }).sort('date'));
});
const todayMenu = asyncHandler(async (req, res) => {
  const mess = await resolveMess(req, req.query.mess);
  ok(res, await MessMenu.findOne({ mess, date: toDay(todayStr()) }));
});
/** Create or update the menu for a mess and date. */
const upsertMenu = asyncHandler(async (req, res) => {
  assertMess(req.user, req.body.mess);
  if (!(await Mess.exists({ _id: req.body.mess }))) throw ApiError.badRequest('Mess not found');
  const meals = {};
  for (const m of MEAL_TYPES) {
    const v = req.body.meals?.[m];
    if (v !== undefined && !Array.isArray(v)) throw ApiError.badRequest(`${m} must be a list of dishes`);
    meals[m] = (v || []).map((x) => String(x).trim()).filter(Boolean);
  }
  const date = toDay(req.body.date);
  const menu = await MessMenu.findOneAndUpdate(
    { mess: req.body.mess, date },
    { $set: { meals, notes: req.body.notes, updatedBy: req.user._id }, $setOnInsert: { createdBy: req.user._id } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );
  ok(res, menu);
});
const removeMenu = asyncHandler(async (req, res) => {
  const menu = await MessMenu.findById(req.params.id);
  if (!menu) throw ApiError.notFound('Menu not found');
  assertMess(req.user, menu.mess);
  await menu.deleteOne();
  ok(res, { message: 'Menu deleted' });
});

// ---- Meal attendance ----
const assertNotFuture = (day) => { if (day > toDay(todayStr())) throw ApiError.badRequest('Attendance cannot be recorded for a future date'); };

/** Mess students with their mark (if any) for one date and meal. Drives the attendance screen. */
const roster = asyncHandler(async (req, res) => {
  const { date, mealType } = req.query;
  if (!MEAL_TYPES.includes(mealType)) throw ApiError.badRequest(`mealType must be one of: ${MEAL_TYPES.join(', ')}`);
  const mess = await resolveMess(req, req.query.mess);
  const day = toDay(date || todayStr());
  const [students, marks] = await Promise.all([
    Student.find({ mess, status: 'active' }).select('name studentId department year').sort('studentId'),
    MealAttendance.find({ mess, date: day, mealType }).select('student status'),
  ]);
  const m = new Map(marks.map((x) => [String(x.student), x.status]));
  ok(res, students.map((s) => ({ ...s.toObject(), status: m.get(String(s._id)) || null })));
});

/** Idempotent bulk marking. The unique index (student, date, mealType) guarantees no duplicates even under concurrency. */
const markBulk = asyncHandler(async (req, res) => {
  const { date, mealType, records } = req.body;
  const mess = await resolveMess(req, req.body.mess);
  if (!MEAL_TYPES.includes(mealType)) throw ApiError.badRequest(`mealType must be one of: ${MEAL_TYPES.join(', ')}`);
  if (!Array.isArray(records) || !records.length) throw ApiError.badRequest('Provide at least one attendance record');
  const day = toDay(date);
  assertNotFuture(day);
  const valid = new Set((await Student.find({ mess, status: 'active', _id: { $in: records.map((r) => r.student) } }).select('_id')).map((s) => String(s._id)));
  const bad = records.filter((r) => !valid.has(String(r.student)));
  if (bad.length) throw ApiError.badRequest(`${bad.length} student(s) do not belong to this mess or are inactive`);
  const ops = records.map((r) => ({
    updateOne: {
      filter: { student: r.student, date: day, mealType },
      update: { $set: { status: r.status === 'absent' ? 'absent' : 'present', mess, recordedBy: req.user._id, markedAt: new Date() } },
      upsert: true,
    },
  }));
  const result = await MealAttendance.bulkWrite(ops, { ordered: false });
  ok(res, { saved: records.length, inserted: result.upsertedCount, updated: result.modifiedCount });
});

/** Single record. Unlike the bulk endpoint, a duplicate is rejected with 409. */
const markOne = asyncHandler(async (req, res) => {
  const { student, date, mealType, status } = req.body;
  const mess = await resolveMess(req, req.body.mess);
  const day = toDay(date);
  assertNotFuture(day);
  if (!(await Student.exists({ _id: student, mess, status: 'active' }))) throw ApiError.badRequest('Student does not belong to this mess');
  try {
    created(res, await MealAttendance.create({ student, mess, date: day, mealType, status: status || 'present', recordedBy: req.user._id }));
  } catch (err) {
    if (err.code === 11000) throw ApiError.conflict('Attendance for this student, date and meal is already recorded');
    throw err;
  }
});

const listAttendance = asyncHandler(async (req, res) => {
  const { page, limit, skip, sort } = paginate(req.query, ['date', 'createdAt'], '-date');
  const filter = {};
  if (req.user.role === 'student') filter.student = (await Student.findOne({ user: req.user._id }))?._id;
  else { filter.mess = await resolveMess(req, req.query.mess); if (req.query.student) filter.student = req.query.student; }
  if (req.query.mealType) filter.mealType = req.query.mealType;
  if (req.query.date) filter.date = toDay(req.query.date);
  else if (req.query.from || req.query.to) filter.date = { ...(req.query.from && { $gte: toDay(req.query.from) }), ...(req.query.to && { $lte: toDay(req.query.to) }) };
  const [rows, total] = await Promise.all([
    MealAttendance.find(filter).populate('student', 'name studentId').sort(sort).skip(skip).limit(limit),
    MealAttendance.countDocuments(filter),
  ]);
  ok(res, rows, pageMeta(page, limit, total));
});

// ---- Feedback ----
const submitFeedback = asyncHandler(async (req, res) => {
  const s = req.student;
  if (!s.mess) throw ApiError.badRequest('You are not assigned to a mess yet');
  const day = toDay(req.body.date || todayStr());
  assertNotFuture(day);
  if (!MEAL_TYPES.includes(req.body.mealType)) throw ApiError.badRequest('Invalid meal type');
  try {
    created(res, await MessFeedback.create({ student: s._id, mess: s.mess, date: day, mealType: req.body.mealType, rating: req.body.rating, comment: req.body.comment }));
  } catch (err) {
    if (err.code === 11000) throw ApiError.conflict('You have already given feedback for this meal');
    throw err;
  }
});
const listFeedback = asyncHandler(async (req, res) => {
  const { page, limit, skip, sort } = paginate(req.query, ['date', 'rating', 'createdAt'], '-date');
  const filter = {};
  if (req.user.role === 'student') filter.student = (await Student.findOne({ user: req.user._id }))?._id;
  else filter.mess = await resolveMess(req, req.query.mess);
  if (req.query.mealType) filter.mealType = req.query.mealType;
  if (req.query.rating) filter.rating = Number(req.query.rating);
  if (req.query.from || req.query.to) filter.date = { ...(req.query.from && { $gte: toDay(req.query.from) }), ...(req.query.to && { $lte: toDay(req.query.to) }) };
  const [rows, total] = await Promise.all([
    MessFeedback.find(filter).populate('student', 'name studentId').sort(sort).skip(skip).limit(limit),
    MessFeedback.countDocuments(filter),
  ]);
  ok(res, rows, pageMeta(page, limit, total));
});
const feedbackSummary = asyncHandler(async (req, res) => {
  const mess = await resolveMess(req, req.query.mess);
  const match = { mess: new mongoose.Types.ObjectId(String(mess)) };
  if (req.query.from || req.query.to) match.date = { ...(req.query.from && { $gte: toDay(req.query.from) }), ...(req.query.to && { $lte: toDay(req.query.to) }) };
  const [byMeal, dist] = await Promise.all([
    MessFeedback.aggregate([{ $match: match }, { $group: { _id: '$mealType', average: { $avg: '$rating' }, count: { $sum: 1 } } }]),
    MessFeedback.aggregate([{ $match: match }, { $group: { _id: '$rating', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
  ]);
  const total = dist.reduce((a, d) => a + d.count, 0);
  const avg = total ? dist.reduce((a, d) => a + d._id * d.count, 0) / total : 0;
  ok(res, {
    overallAverage: Math.round(avg * 100) / 100, totalResponses: total,
    byMeal: MEAL_TYPES.map((m) => { const x = byMeal.find((b) => b._id === m); return { mealType: m, average: x ? Math.round(x.average * 100) / 100 : null, count: x?.count || 0 }; }),
    distribution: [1, 2, 3, 4, 5].map((r) => ({ rating: r, count: dist.find((d) => d._id === r)?.count || 0 })),
  });
});

module.exports = { listMesses, createMess, updateMess, removeMess, listMenus, todayMenu, upsertMenu, removeMenu, roster, markBulk, markOne, listAttendance, submitFeedback, listFeedback, feedbackSummary, resolveMess };
