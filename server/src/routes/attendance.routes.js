const router = require('express').Router();
const c = require('../controllers/mess.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../validators');
const { MEAL_TYPES } = require('../utils/constants');

router.use(authenticate);
router.get('/', c.listAttendance); // students see only their own; staff are scoped to their mess
router.get('/roster', authorize('admin', 'mess_manager'), c.roster);
router.post('/', authorize('admin', 'mess_manager'), validate({ student: { required: true, type: 'id' }, date: { required: true, type: 'date' }, mealType: { required: true, type: 'enum', values: MEAL_TYPES }, status: { type: 'enum', values: ['present', 'absent'] } }), c.markOne);
router.post('/bulk', authorize('admin', 'mess_manager'), validate({ date: { required: true, type: 'date' }, mealType: { required: true, type: 'enum', values: MEAL_TYPES }, records: { required: true, type: 'array' } }), c.markBulk);

module.exports = router;
