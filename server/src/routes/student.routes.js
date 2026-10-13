const router = require('express').Router();
const c = require('../controllers/student.controller');
const { authenticate, authorize, requireStudent } = require('../middleware/auth');
const { validate, passwordRule } = require('../validators');
const { DEPARTMENTS } = require('../utils/constants');

const rules = {
  studentId: { required: true, maxLength: 20 }, name: { required: true, maxLength: 100 }, email: { required: true, type: 'email' },
  phone: { type: 'phone' }, dob: { type: 'date' }, gender: { required: true, type: 'enum', values: ['male', 'female', 'other'] },
  department: { required: true, type: 'enum', values: DEPARTMENTS }, year: { required: true, type: 'int', min: 1, max: 6 },
  guardianPhone: { type: 'phone' }, emergencyContact: { type: 'phone' }, admissionDate: { type: 'date' },
  status: { type: 'enum', values: ['active', 'inactive', 'alumni'] }, mess: { type: 'id' }, password: { ...passwordRule },
};

router.use(authenticate);
router.patch('/me', requireStudent, validate({ phone: { type: 'phone' }, dob: { type: 'date' }, guardianPhone: { type: 'phone' }, emergencyContact: { type: 'phone' } }), c.updateMe);
router.get('/', authorize('admin', 'warden', 'mess_manager'), c.list);
router.post('/', authorize('admin', 'warden'), validate(rules), c.create);
router.get('/:id', c.get); // scope and ownership are checked inside the controller
router.patch('/:id', authorize('admin', 'warden'), validate(rules), c.update);
router.delete('/:id', authorize('admin', 'warden'), c.remove);

module.exports = router;
