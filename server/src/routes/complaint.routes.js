const router = require('express').Router();
const c = require('../controllers/complaint.controller');
const { authenticate, authorize, requireStudent } = require('../middleware/auth');
const { validate } = require('../validators');
const { COMPLAINT_CATEGORIES, COMPLAINT_STATUS, PRIORITIES } = require('../utils/constants');

router.use(authenticate);
router.get('/', c.list);
router.post('/', requireStudent, validate({ category: { required: true, type: 'enum', values: COMPLAINT_CATEGORIES }, title: { required: true, maxLength: 120 }, description: { required: true, maxLength: 2000 }, priority: { type: 'enum', values: PRIORITIES } }), c.create);
router.get('/:id', c.get);
router.patch('/:id', authorize('admin', 'warden', 'mess_manager'), validate({ status: { type: 'enum', values: COMPLAINT_STATUS }, priority: { type: 'enum', values: PRIORITIES }, assignedTo: { type: 'id' }, resolution: { maxLength: 1000 } }), c.update);
router.delete('/:id', authorize('admin'), c.remove);

module.exports = router;
