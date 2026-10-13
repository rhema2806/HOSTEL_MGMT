const router = require('express').Router();
const c = require('../controllers/allocation.controller');
const { authenticate, authorize, requireStudent } = require('../middleware/auth');
const { validate } = require('../validators');

const body = { studentId: { required: true, type: 'id' }, roomId: { required: true, type: 'id' }, bedNumber: { required: true, type: 'int', min: 1 }, remarks: { maxLength: 300 } };

router.use(authenticate);
router.get('/me', requireStudent, c.mine);
router.get('/', authorize('admin', 'warden'), c.list);
router.post('/', authorize('admin', 'warden'), validate(body), c.allocate);
router.post('/transfer', authorize('admin', 'warden'), validate(body), c.transfer);
router.post('/:id/vacate', authorize('admin', 'warden'), c.vacate);

module.exports = router;
