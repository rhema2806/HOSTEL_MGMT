const router = require('express').Router();
const c = require('../controllers/notice.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../validators');

const rules = { title: { required: true, maxLength: 150 }, description: { required: true, maxLength: 4000 }, category: { type: 'enum', values: ['general', 'hostel', 'mess', 'maintenance', 'event', 'urgent'] }, expiryDate: { type: 'date' } };
router.use(authenticate);
router.get('/', c.list);
router.post('/', authorize('admin', 'warden', 'mess_manager'), validate(rules), c.create);
router.patch('/:id', authorize('admin', 'warden', 'mess_manager'), validate(rules), c.update);
router.delete('/:id', authorize('admin', 'warden', 'mess_manager'), c.remove);

module.exports = router;
