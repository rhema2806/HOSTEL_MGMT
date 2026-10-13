const router = require('express').Router();
const c = require('../controllers/hostel.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../validators');

router.use(authenticate, authorize('admin', 'warden'));
router.get('/', c.listBlocks);
router.post('/', authorize('admin'), validate({ hostel: { required: true, type: 'id' }, name: { required: true, maxLength: 30 }, floors: { type: 'int', min: 1, max: 30 } }), c.createBlock);
router.patch('/:id', authorize('admin'), validate({ name: { required: true }, floors: { type: 'int', min: 1, max: 30 }, isActive: { type: 'boolean' } }), c.updateBlock);
router.delete('/:id', authorize('admin'), c.removeBlock);

module.exports = router;
