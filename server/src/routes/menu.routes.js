const router = require('express').Router();
const c = require('../controllers/mess.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../validators');

router.use(authenticate);
router.get('/', c.listMenus);
router.get('/today', c.todayMenu);
router.put('/', authorize('admin', 'mess_manager'), validate({ mess: { required: true, type: 'id' }, date: { required: true, type: 'date' } }), c.upsertMenu);
router.delete('/:id', authorize('admin', 'mess_manager'), c.removeMenu);

module.exports = router;
