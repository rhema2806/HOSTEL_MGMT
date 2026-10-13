const router = require('express').Router();
const c = require('../controllers/mess.controller');
const { authenticate, authorize, requireStudent } = require('../middleware/auth');
const { validate } = require('../validators');
const { MEAL_TYPES } = require('../utils/constants');

router.use(authenticate);
router.post('/', requireStudent, validate({ mealType: { required: true, type: 'enum', values: MEAL_TYPES }, rating: { required: true, type: 'int', min: 1, max: 5 }, date: { type: 'date' }, comment: { maxLength: 500 } }), c.submitFeedback);
router.get('/', c.listFeedback);
router.get('/summary', authorize('admin', 'mess_manager'), c.feedbackSummary);

module.exports = router;
