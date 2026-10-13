const router = require('express').Router();
const c = require('../controllers/hostel.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../validators');

router.use(authenticate, authorize('admin', 'warden'));
router.get('/', c.list);
router.post('/', authorize('admin'), validate({ name: { required: true, maxLength: 80 }, type: { required: true, type: 'enum', values: ['boys', 'girls', 'co-ed'] } }), c.create);
router.get('/:id', c.get);
router.patch('/:id', authorize('admin'), validate({ name: { required: true }, type: { type: 'enum', values: ['boys', 'girls', 'co-ed'] }, isActive: { type: 'boolean' } }), c.update);
router.delete('/:id', authorize('admin'), c.remove);

module.exports = router;
