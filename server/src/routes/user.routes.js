const router = require('express').Router();
const c = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, passwordRule } = require('../validators');
const { ROLES } = require('../utils/constants');

router.use(authenticate, authorize(ROLES.ADMIN));
router.get('/', c.list);
router.get('/:id', c.get);
router.patch('/:id', validate({
  name: { required: true, maxLength: 100 }, email: { type: 'email' },
  role: { type: 'enum', values: [ROLES.ADMIN, ROLES.WARDEN, ROLES.MESS_MANAGER] },
  isActive: { type: 'boolean' }, assignedHostels: { type: 'array' }, assignedMesses: { type: 'array' },
}), c.update);
router.post('/:id/reset-password', validate({ password: { ...passwordRule } }), c.resetPassword);
router.delete('/:id', c.remove);

module.exports = router;
