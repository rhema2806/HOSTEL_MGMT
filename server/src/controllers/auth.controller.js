const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const { asyncHandler, ok, created } = require('../utils/helpers');
const { User, Student } = require('../models');
const { currentAllocation } = require('../services/studentScope.service');

const signToken = (user) => jwt.sign({ sub: user._id, role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+password');
  // Same message for unknown email and wrong password so accounts cannot be enumerated.
  if (!user || !(await user.comparePassword(password))) throw ApiError.unauthorized('Invalid email or password');
  if (!user.isActive) throw ApiError.forbidden('This account has been deactivated. Contact the administrator');
  user.lastLoginAt = new Date();
  await user.save({ validateModifiedOnly: true });
  ok(res, { token: signToken(user), user: user.toJSON() });
});

const buildProfile = async (user) => {
  const out = { user: user.toJSON() };
  if (user.role === 'student') {
    const student = await Student.findOne({ user: user._id }).populate('mess', 'name');
    out.student = student;
    out.allocation = student ? await currentAllocation(student._id) : null;
  }
  return out;
};

const me = asyncHandler(async (req, res) => ok(res, await buildProfile(req.user)));

/** Admin only. Students are normally created from the Students module, which also creates the profile. */
const register = asyncHandler(async (req, res) => {
  const { name, email, role, phone, assignedHostels, assignedMesses } = req.body;
  if (role === 'student') throw ApiError.badRequest('Create students from the Students module so a student profile is created with the login');
  let password = req.body.password;
  let temporaryPassword;
  if (!password) { password = crypto.randomBytes(6).toString('base64url') + '9a'; temporaryPassword = password; }
  const user = await User.create({
    name, email, role, phone, password, mustChangePassword: true,
    assignedHostels: role === 'warden' ? assignedHostels || [] : [],
    assignedMesses: role === 'mess_manager' ? assignedMesses || [] : [],
    createdBy: req.user._id, updatedBy: req.user._id,
  });
  created(res, user, temporaryPassword ? { temporaryPassword } : {});
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword))) throw ApiError.badRequest('Current password is incorrect');
  if (currentPassword === newPassword) throw ApiError.badRequest('New password must be different from the current password');
  user.password = newPassword;
  user.mustChangePassword = false;
  await user.save();
  ok(res, { token: signToken(user), user: user.toJSON() });
});

// JWTs are stateless; the client discards the token. Endpoint exists for symmetry and future token deny-listing.
const logout = (_req, res) => ok(res, { message: 'Signed out' });

module.exports = { login, me, register, changePassword, logout, buildProfile };
