const ApiError = require('../utils/ApiError');

const isAdmin = (u) => u.role === 'admin';
const ids = (arr) => (arr || []).map(String);

/** Mongo filter limiting a query on a `hostel` field to what the user may see. Admin: everything. */
const hostelFilter = (user, field = 'hostel') => (isAdmin(user) ? {} : { [field]: { $in: user.assignedHostels || [] } });
const messFilter = (user, field = 'mess') => (isAdmin(user) ? {} : { [field]: { $in: user.assignedMesses || [] } });

const canAccessHostel = (user, hostelId) => isAdmin(user) || ids(user.assignedHostels).includes(String(hostelId));
const canAccessMess = (user, messId) => isAdmin(user) || ids(user.assignedMesses).includes(String(messId));

function assertHostel(user, hostelId) {
  if (!canAccessHostel(user, hostelId)) throw ApiError.forbidden('This hostel is outside your assigned scope');
}
function assertMess(user, messId) {
  if (!canAccessMess(user, messId)) throw ApiError.forbidden('This mess is outside your assigned scope');
}

module.exports = { hostelFilter, messFilter, canAccessHostel, canAccessMess, assertHostel, assertMess };
