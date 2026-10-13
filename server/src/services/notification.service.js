const { Notification, Student, User } = require('../models');

/** Best effort: a failed notification must never break the business operation that triggered it. */
async function notifyUsers(userIds, { title, message, type = 'system', link }) {
  try {
    const unique = [...new Set(userIds.filter(Boolean).map(String))];
    if (!unique.length) return;
    await Notification.insertMany(unique.map((recipient) => ({ recipient, title, message, type, link })));
  } catch (err) {
    console.error('Notification failed:', err.message);
  }
}

async function notifyStudents(studentIds, payload) {
  const students = await Student.find({ _id: { $in: studentIds } }).select('user');
  return notifyUsers(students.map((s) => s.user), payload);
}

async function notifyStaff(role, { hostel, mess } = {}, payload) {
  const filter = { role, isActive: true };
  if (hostel) filter.assignedHostels = hostel;
  if (mess) filter.assignedMesses = mess;
  const users = await User.find(filter).select('_id');
  return notifyUsers(users.map((u) => u._id), payload);
}

module.exports = { notifyUsers, notifyStudents, notifyStaff };
