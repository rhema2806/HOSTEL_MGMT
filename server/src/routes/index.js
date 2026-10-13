const router = require('express').Router();

router.get('/health', (_req, res) => res.json({ success: true, status: 'ok', time: new Date().toISOString() }));
router.use('/auth', require('./auth.routes'));
router.use('/users', require('./user.routes'));
router.use('/students', require('./student.routes'));
router.use('/hostels', require('./hostel.routes'));
router.use('/blocks', require('./block.routes'));
router.use('/rooms', require('./room.routes'));
router.use('/beds', require('./bed.routes'));
router.use('/allocations', require('./allocation.routes'));
router.use('/messes', require('./mess.routes'));
router.use('/menus', require('./menu.routes'));
router.use('/meal-attendance', require('./attendance.routes'));
router.use('/mess-bills', require('./bill.routes'));
router.use('/complaints', require('./complaint.routes'));
router.use('/leaves', require('./leave.routes'));
router.use('/notices', require('./notice.routes'));
router.use('/notifications', require('./notification.routes'));
router.use('/feedback', require('./feedback.routes'));
router.use('/reports', require('./report.routes'));
router.use('/dashboard', require('./dashboard.routes'));

module.exports = router;
