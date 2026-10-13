const router = require('express').Router();
const c = require('../controllers/bill.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../validators');
const { PAYMENT_METHODS } = require('../utils/constants');

router.use(authenticate);
router.get('/', c.list);
router.post('/generate', authorize('admin', 'mess_manager'), validate({ mess: { required: true, type: 'id' }, month: { required: true }, dueDate: { required: true, type: 'date' }, otherCharges: { type: 'number', min: 0 } }), c.generate);
router.get('/:id', c.get);
router.patch('/:id', authorize('admin', 'mess_manager'), validate({ otherCharges: { type: 'number', min: 0 }, discount: { type: 'number', min: 0 }, dueDate: { type: 'date' } }), c.update);
router.post('/:id/payments', authorize('admin', 'mess_manager'), validate({ amount: { required: true, type: 'number', min: 1 }, method: { type: 'enum', values: PAYMENT_METHODS } }), c.addPayment);
router.delete('/:id', authorize('admin'), c.remove);

module.exports = router;
