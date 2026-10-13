const router = require('express').Router();
const c = require('../controllers/dashboard.controller');
const { authenticate, requireStudent } = require('../middleware/auth');

router.get('/', authenticate, (req, res, next) => (req.user.role === 'student' ? requireStudent(req, res, next) : next()), c.get);

module.exports = router;
