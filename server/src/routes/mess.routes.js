const router = require('express').Router();
const c = require('../controllers/mess.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../validators');

router.use(authenticate);
router.get('/', c.listMesses);
router.post('/', authorize('admin'), validate({ name: { required: true, maxLength: 80 } }), c.createMess);
router.patch('/:id', authorize('admin', 'mess_manager'), validate({ name: { required: true } }), c.updateMess);
router.delete('/:id', authorize('admin'), c.removeMess);

module.exports = router;
