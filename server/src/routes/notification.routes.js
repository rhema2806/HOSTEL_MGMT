const router = require('express').Router();
const c = require('../controllers/notification.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../validators');

router.use(authenticate);
router.get('/', c.list);
router.get('/unread-count', c.unreadCount);
router.patch('/read-all', c.markAllRead);
router.post('/broadcast', authorize('admin'), validate({ title: { required: true, maxLength: 120 }, message: { required: true, maxLength: 1000 }, roles: { type: 'array' } }), c.broadcast);
router.patch('/:id/read', c.markRead);
router.delete('/:id', c.remove);

module.exports = router;
