const router = require('express').Router();
const c = require('../controllers/report.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
const hostelStaff = authorize('admin', 'warden');
const messStaff = authorize('admin', 'mess_manager');
router.get('/hostel/occupancy', hostelStaff, c.occupancy);
router.get('/hostel/vacancies', hostelStaff, c.vacancies);
router.get('/hostel/students', hostelStaff, c.studentList);
router.get('/mess/daily-attendance', messStaff, c.dailyAttendance);
router.get('/mess/monthly-usage', messStaff, c.monthlyUsage);
router.get('/mess/billing', messStaff, c.billing);
router.get('/mess/feedback', messStaff, c.feedbackSummary);
router.get('/complaints/by-category', hostelStaff, c.complaintsByCategory);
router.get('/complaints/trends', hostelStaff, c.complaintTrends);
router.get('/leaves', hostelStaff, c.leaves);

module.exports = router;
