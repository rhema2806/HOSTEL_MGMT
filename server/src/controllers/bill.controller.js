const ApiError = require('../utils/ApiError');
const { asyncHandler, ok, created, paginate, pageMeta, pick, toDay, escapeRegex } = require('../utils/helpers');
const { MessBill, Student, Payment } = require('../models');
const billing = require('../services/billing.service');
const { assertMess } = require('../services/scope.service');
const { studentIdsInHostels } = require('../services/studentScope.service');
const { notifyStudents } = require('../services/notification.service');

const populate = (q) => q.populate('student', 'name studentId department year').populate('mess', 'name');

/** Ensures the actor may see/modify this bill. Students: own only. Warden: read-only within hostels. Manager: own messes. */
async function assertBillAccess(user, bill, { write = false } = {}) {
  if (user.role === 'admin') return;
  if (user.role === 'student') {
    const s = await Student.findOne({ user: user._id }).select('_id');
    if (!s || String(s._id) !== String(bill.student?._id || bill.student)) throw ApiError.forbidden('You can only access your own bills');
    if (write) throw ApiError.forbidden('Students cannot modify bills');
    return;
  }
  if (user.role === 'mess_manager') return assertMess(user, bill.mess?._id || bill.mess);
  if (user.role === 'warden') {
    if (write) throw ApiError.forbidden('Wardens have read-only access to mess bills');
    const ids = await studentIdsInHostels(user.assignedHostels);
    if (!ids.some((i) => String(i) === String(bill.student?._id || bill.student))) throw ApiError.forbidden('This student is outside your assigned hostels');
  }
}

const list = asyncHandler(async (req, res) => {
  await billing.refreshOverdue();
  const { page, limit, skip, sort } = paginate(req.query, ['month', 'finalAmount', 'dueDate', 'createdAt'], '-month');
  const q = req.query;
  const filter = {};
  const and = [];
  if (req.user.role === 'student') filter.student = (await Student.findOne({ user: req.user._id }))?._id;
  if (req.user.role === 'mess_manager') filter.mess = { $in: req.user.assignedMesses };
  if (req.user.role === 'warden') and.push({ student: { $in: await studentIdsInHostels(req.user.assignedHostels) } });
  if (q.month) filter.month = q.month;
  if (q.status) filter.status = q.status;
  if (q.mess && req.user.role !== 'student') { if (req.user.role !== 'warden') assertMess(req.user, q.mess); filter.mess = q.mess; }
  if (q.student && req.user.role !== 'student') filter.student = q.student;
  if (q.hostel && req.user.role !== 'student') and.push({ student: { $in: await studentIdsInHostels([q.hostel]) } });
  if (q.search && req.user.role !== 'student') {
    const rx = new RegExp(escapeRegex(q.search), 'i');
    and.push({ student: { $in: (await Student.find({ $or: [{ name: rx }, { studentId: rx }] }).select('_id')).map((s) => s._id) } });
  }
  const finalFilter = and.length ? { $and: [filter, ...and] } : filter;
  const [rows, total] = await Promise.all([populate(MessBill.find(finalFilter)).sort(sort).skip(skip).limit(limit), MessBill.countDocuments(finalFilter)]);
  ok(res, rows, pageMeta(page, limit, total));
});

const get = asyncHandler(async (req, res) => {
  const bill = await populate(MessBill.findById(req.params.id));
  if (!bill) throw ApiError.notFound('Bill not found');
  await assertBillAccess(req.user, bill);
  const payments = await Payment.find({ bill: bill._id }).populate('recordedBy', 'name').sort('-paidAt');
  ok(res, { ...bill.toObject(), payments });
});

const generate = asyncHandler(async (req, res) => {
  assertMess(req.user, req.body.mess);
  const summary = await billing.generateBills({ messId: req.body.mess, month: req.body.month, dueDate: req.body.dueDate, otherCharges: req.body.otherCharges, actor: req.user });
  created(res, summary);
});

const update = asyncHandler(async (req, res) => {
  const bill = await MessBill.findById(req.params.id);
  if (!bill) throw ApiError.notFound('Bill not found');
  await assertBillAccess(req.user, bill, { write: true });
  const d = pick(req.body, ['otherCharges', 'discount', 'remarks']);
  if (req.body.dueDate) d.dueDate = toDay(req.body.dueDate);
  Object.assign(bill, d, { updatedBy: req.user._id });
  billing.recalc(bill);
  if (bill.paidAmount > bill.finalAmount) throw ApiError.conflict(`The new total (${bill.finalAmount}) is lower than the amount already paid (${bill.paidAmount})`);
  await bill.save();
  await notifyStudents([bill.student], { title: 'Mess bill updated', type: 'bill', link: '/my-bills', message: `Your ${bill.month} mess bill was updated. New total: ${bill.finalAmount}.` });
  ok(res, bill);
});

const addPayment = asyncHandler(async (req, res) => {
  const bill = await MessBill.findById(req.params.id);
  if (!bill) throw ApiError.notFound('Bill not found');
  await assertBillAccess(req.user, bill, { write: true });
  const payment = await billing.recordPayment({ bill, amount: req.body.amount, method: req.body.method || 'cash', reference: req.body.reference, actor: req.user });
  created(res, { payment, bill });
});

const remove = asyncHandler(async (req, res) => {
  const bill = await MessBill.findById(req.params.id);
  if (!bill) throw ApiError.notFound('Bill not found');
  if (await Payment.exists({ bill: bill._id })) throw ApiError.conflict('Bills with recorded payments cannot be deleted');
  await bill.deleteOne();
  ok(res, { message: 'Bill deleted' });
});

module.exports = { list, get, generate, update, addPayment, remove };
