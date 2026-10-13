const crypto = require('crypto');
const ApiError = require('../utils/ApiError');
const { asyncHandler, ok, paginate, pageMeta, escapeRegex } = require('../utils/helpers');
const { User, Student } = require('../models');

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip, sort } = paginate(req.query, ['name', 'email', 'role', 'createdAt']);
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
  if (req.query.search) { const rx = new RegExp(escapeRegex(req.query.search), 'i'); filter.$or = [{ name: rx }, { email: rx }]; }
  const [items, total] = await Promise.all([
    User.find(filter).populate('assignedHostels', 'name').populate('assignedMesses', 'name').sort(sort).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);
  ok(res, items, pageMeta(page, limit, total));
});

const get = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).populate('assignedHostels', 'name').populate('assignedMesses', 'name');
  if (!user) throw ApiError.notFound('User not found');
  ok(res, user);
});

const update = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  const isSelf = String(user._id) === String(req.user._id);
  const { name, email, phone, role, isActive, assignedHostels, assignedMesses } = req.body;

  if (role !== undefined && role !== user.role) {
    if (isSelf) throw ApiError.badRequest('You cannot change your own role');
    if (role === 'student' || user.role === 'student') throw ApiError.badRequest('Student accounts cannot be converted to or from staff roles');
    user.role = role;
  }
  if (isActive === false && isSelf) throw ApiError.badRequest('You cannot deactivate your own account');
  if (name !== undefined) user.name = name;
  if (email !== undefined) user.email = email;
  if (phone !== undefined) user.phone = phone;
  if (isActive !== undefined) user.isActive = isActive;
  if (assignedHostels !== undefined) user.assignedHostels = user.role === 'warden' ? assignedHostels : [];
  if (assignedMesses !== undefined) user.assignedMesses = user.role === 'mess_manager' ? assignedMesses : [];
  if (user.role !== 'warden') user.assignedHostels = [];
  if (user.role !== 'mess_manager') user.assignedMesses = [];
  user.updatedBy = req.user._id;
  await user.save();
  ok(res, user);
});

const resetPassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('+password');
  if (!user) throw ApiError.notFound('User not found');
  const temporaryPassword = req.body.password || crypto.randomBytes(6).toString('base64url') + '9a';
  user.password = temporaryPassword;
  user.mustChangePassword = true;
  user.updatedBy = req.user._id;
  await user.save();
  ok(res, { message: 'Password reset. The user must change it at next sign-in', temporaryPassword });
});

/** Deactivates rather than deletes so historical records keep valid references. */
const remove = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  if (String(user._id) === String(req.user._id)) throw ApiError.badRequest('You cannot deactivate your own account');
  user.isActive = false;
  user.updatedBy = req.user._id;
  await user.save();
  if (user.role === 'student') await Student.updateOne({ user: user._id }, { status: 'inactive' });
  ok(res, { message: 'User deactivated' });
});

module.exports = { list, get, update, resetPassword, remove };
