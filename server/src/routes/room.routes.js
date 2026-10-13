const router = require('express').Router();
const c = require('../controllers/hostel.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../validators');

const rules = {
  block: { required: true, type: 'id' }, roomNumber: { required: true, maxLength: 20 }, floor: { required: true, type: 'int', min: 0, max: 30 },
  capacity: { required: true, type: 'int', min: 1, max: 12 }, roomType: { type: 'enum', values: ['standard', 'ac', 'deluxe'] },
  status: { type: 'enum', values: ['available', 'maintenance', 'closed'] },
};
router.use(authenticate, authorize('admin', 'warden'));
router.get('/', c.listRooms);
router.post('/', validate(rules), c.createRoom);
router.get('/:id', c.getRoom);
router.get('/:id/beds', c.getRoom);
router.patch('/:id', validate({ ...rules, block: { type: 'id' } }), c.updateRoom);
router.delete('/:id', c.removeRoom);

module.exports = router;
