const router = require('express').Router();
const c = require('../controllers/leave.controller');
const { authenticate, authorize, requireStudent } = require('../middleware/auth');
const { validate } = require('../validators');

router.use(authenticate, authorize('admin', 'warden', 'student'));
router.get('/', c.list);
router.post('/', requireStudent, validate({ startDate: { required: true, type: 'date' }, endDate: { required: true, type: 'date' }, reason: { required: true, maxLength: 500 }, destination: { maxLength: 200 }, contact: { type: 'phone' } }), c.create);
router.get('/:id', c.get);
router.patch('/:id/decision', authorize('admin', 'warden'), validate({ status: { required: true, type: 'enum', values: ['approved', 'rejected'] }, remarks: { maxLength: 500 } }), c.decide);
router.patch('/:id/cancel', requireStudent, c.cancel);

module.exports = router;
