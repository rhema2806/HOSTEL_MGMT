const router = require('express').Router();
const c = require('../controllers/hostel.controller');
const { authenticate, authorize } = require('../middleware/auth');

// Beds are computed from room capacity and active allocations (see RoomAllocation).
router.get('/available', authenticate, authorize('admin', 'warden'), c.availableBeds);

module.exports = router;
