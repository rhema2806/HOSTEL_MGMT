const jwt = require('jsonwebtoken');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const { asyncHandler } = require('../utils/helpers');
const { User, Student } = require('../models');

const ALLOWED_WHEN_PASSWORD_CHANGE_PENDING = ['/api/auth/me', '/api/auth/change-password', '/api/auth/logout'];

/** Verifies the bearer token and loads the current user from the database on every request. */
const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw ApiError.unauthorized();

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch (err) {
    throw ApiError.unauthorized(err.name === 'TokenExpiredError' ? 'Session expired. Please sign in again' : 'Invalid token');
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw ApiError.unauthorized('This account is no longer active');
  if (user.passwordChangedAt && payload.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)) {
    throw ApiError.unauthorized('Password was changed. Please sign in again');
  }
  if (user.mustChangePassword && !ALLOWED_WHEN_PASSWORD_CHANGE_PENDING.includes(req.originalUrl.split('?')[0])) {
    const e = ApiError.forbidden('You must change your temporary password before continuing');
    e.code = 'PASSWORD_CHANGE_REQUIRED';
    throw e;
  }
  req.user = user;
  next();
});

/** Role gate. Usage: authorize('admin', 'warden') */
const authorize = (...roles) => (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (!roles.includes(req.user.role)) return next(ApiError.forbidden(`This action is not available to the ${req.user.role.replace('_', ' ')} role`));
  next();
};

/** For student-only routes: loads the student profile that belongs to the token, never one supplied by the client. */
const requireStudent = asyncHandler(async (req, _res, next) => {
  if (req.user.role !== 'student') throw ApiError.forbidden('This action is only available to students');
  const student = await Student.findOne({ user: req.user._id });
  if (!student) throw ApiError.forbidden('No student profile is linked to this account');
  req.student = student;
  next();
});

module.exports = { authenticate, authorize, requireStudent };
