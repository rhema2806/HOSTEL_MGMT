const ApiError = require('../utils/ApiError');
const { Student, Mess, MessBill, MealAttendance, Payment } = require('../models');
const { monthRange, toDay } = require('../utils/helpers');
const { MEAL_TYPES } = require('../utils/constants');
const { notifyStudents } = require('./notification.service');

const round = (n) => Math.round(n * 100) / 100;

/** Pure function: derives the status from amounts and due date. */
function deriveStatus(bill, now = new Date()) {
  const balance = round(bill.finalAmount - bill.paidAmount);
  if (balance <= 0) return 'paid';
  if (bill.dueDate < now) return 'overdue';
  return bill.paidAmount > 0 ? 'partially_paid' : 'pending';
}

function recalc(bill) {
  bill.finalAmount = Math.max(round(bill.mealCharges + bill.otherCharges - bill.discount), 0);
  bill.status = deriveStatus(bill);
}

/** Overdue is time-based, so refresh it before reading bills. */
async function refreshOverdue() {
  await MessBill.updateMany(
    { status: { $in: ['pending', 'partially_paid'] }, dueDate: { $lt: new Date() } },
    { $set: { status: 'overdue' } }
  );
}

async function generateBills({ messId, month, dueDate, otherCharges = 0, actor }) {
  const { start, end } = monthRange(month);
  const mess = await Mess.findById(messId);
  if (!mess) throw ApiError.notFound('Mess not found');
  const due = toDay(dueDate);
  if (due < start) throw ApiError.badRequest('Due date cannot be before the billing month');

  const students = await Student.find({ mess: mess._id, status: 'active' }).select('_id');
  if (!students.length) throw ApiError.badRequest('No active students are assigned to this mess');
  const studentIds = students.map((s) => s._id);

  const usage = await MealAttendance.aggregate([
    { $match: { student: { $in: studentIds }, date: { $gte: start, $lt: end }, status: 'present' } },
    { $group: { _id: { student: '$student', meal: '$mealType' }, count: { $sum: 1 } } },
  ]);
  const byStudent = new Map();
  for (const u of usage) {
    const key = String(u._id.student);
    if (!byStudent.has(key)) byStudent.set(key, {});
    byStudent.get(key)[u._id.meal] = u.count;
  }

  const existing = new Set((await MessBill.find({ student: { $in: studentIds }, month }).select('student')).map((b) => String(b.student)));
  const docs = [];
  for (const s of students) {
    if (existing.has(String(s._id))) continue;
    const counts = byStudent.get(String(s._id)) || {};
    const breakdown = {};
    let meals = 0;
    let charges = 0;
    for (const m of MEAL_TYPES) {
      breakdown[m] = counts[m] || 0;
      meals += breakdown[m];
      charges += breakdown[m] * (mess.mealRates[m] || 0);
    }
    const doc = { student: s._id, mess: mess._id, month, totalMeals: meals, mealBreakdown: breakdown, mealCharges: round(charges), otherCharges: Number(otherCharges) || 0, discount: 0, paidAmount: 0, dueDate: due, createdBy: actor._id, updatedBy: actor._id };
    doc.finalAmount = round(doc.mealCharges + doc.otherCharges);
    doc.status = deriveStatus(doc);
    docs.push(doc);
  }
  if (docs.length) await MessBill.insertMany(docs, { ordered: false });
  await notifyStudents(docs.map((d) => d.student), { title: `Mess bill for ${month}`, type: 'bill', link: '/my-bills', message: `Your mess bill for ${month} has been generated. Due date: ${due.toISOString().slice(0, 10)}.` });
  return { created: docs.length, skipped: students.length - docs.length, totalStudents: students.length };
}

async function recordPayment({ bill, amount, method, reference, actor }) {
  const amt = round(Number(amount));
  if (!(amt > 0)) throw ApiError.badRequest('Payment amount must be greater than zero');
  const balance = round(bill.finalAmount - bill.paidAmount);
  if (balance <= 0) throw ApiError.conflict('This bill is already fully paid');
  if (amt > balance) throw ApiError.badRequest(`Payment exceeds the outstanding balance of ${balance}`);

  const payment = await Payment.create({ bill: bill._id, student: bill.student, amount: amt, method, reference, recordedBy: actor._id });
  bill.paidAmount = round(bill.paidAmount + amt);
  bill.status = deriveStatus(bill);
  bill.updatedBy = actor._id;
  await bill.save();
  await notifyStudents([bill.student], { title: 'Payment recorded', type: 'payment', link: '/my-bills', message: `A payment of ${amt} was recorded for your ${bill.month} mess bill. Status: ${bill.status.replace('_', ' ')}.` });
  return payment;
}

module.exports = { deriveStatus, recalc, refreshOverdue, generateBills, recordPayment };
