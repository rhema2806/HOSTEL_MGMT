const ApiError = require('../utils/ApiError');
const { asyncHandler, ok, paginate, pageMeta } = require('../utils/helpers');
const { Notification, User } = require('../models');
const { notifyUsers } = require('../services/notification.service');

// Every query is filtered by req.user._id, so users can only ever touch their own notifications.
const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const filter = { recipient: req.user._id };
  if (req.query.unread === 'true') filter.read = false;
  const [rows, total, unread] = await Promise.all([
    Notification.find(filter).sort('-createdAt').skip(skip).limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: req.user._id, read: false }),
  ]);
  ok(res, rows, { ...pageMeta(page, limit, total), unread });
});
const unreadCount = asyncHandler(async (req, res) => ok(res, { unread: await Notification.countDocuments({ recipient: req.user._id, read: false }) }));
const markRead = asyncHandler(async (req, res) => {
  const n = await Notification.findOneAndUpdate({ _id: req.params.id, recipient: req.user._id }, { read: true, readAt: new Date() }, { new: true });
  if (!n) throw ApiError.notFound('Notification not found');
  ok(res, n);
});
const markAllRead = asyncHandler(async (req, res) => {
  const r = await Notification.updateMany({ recipient: req.user._id, read: false }, { read: true, readAt: new Date() });
  ok(res, { updated: r.modifiedCount });
});
const remove = asyncHandler(async (req, res) => {
  const r = await Notification.deleteOne({ _id: req.params.id, recipient: req.user._id });
  if (!r.deletedCount) throw ApiError.notFound('Notification not found');
  ok(res, { message: 'Notification deleted' });
});
const broadcast = asyncHandler(async (req, res) => {
  const roles = req.body.roles?.length ? req.body.roles : ['student', 'warden', 'mess_manager', 'admin'];
  const users = await User.find({ role: { $in: roles }, isActive: true }).select('_id');
  await notifyUsers(users.map((u) => u._id), { title: req.body.title, message: req.body.message, type: 'system' });
  ok(res, { sentTo: users.length });
});

module.exports = { list, unreadCount, markRead, markAllRead, remove, broadcast };
