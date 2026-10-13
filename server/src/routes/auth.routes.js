const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const c = require('../controllers/auth.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, passwordRule } = require('../validators');
const { ROLES } = require('../utils/constants');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Try again in 15 minutes' },
});

router.post('/login', loginLimiter, validate({ email: { required: true, type: 'email' }, password: { required: true } }), c.login);
router.post('/logout', authenticate, c.logout);
router.get('/me', authenticate, c.me);
router.post('/change-password', authenticate, validate({ currentPassword: { required: true }, newPassword: { required: true, ...passwordRule } }), c.changePassword);
// Registration is not public: only an administrator can create staff accounts.
router.post('/register', authenticate, authorize(ROLES.ADMIN), validate({
  name: { required: true, maxLength: 100 }, email: { required: true, type: 'email' },
  role: { required: true, type: 'enum', values: [ROLES.ADMIN, ROLES.WARDEN, ROLES.MESS_MANAGER, ROLES.STUDENT] },
  password: { ...passwordRule },
}), c.register);

module.exports = router;
