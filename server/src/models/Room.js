const mongoose = require('mongoose');

// Beds are not stored separately: they are numbered 1..capacity and occupied through RoomAllocation.
const roomSchema = new mongoose.Schema(
  {
    hostel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true, index: true },
    block: { type: mongoose.Schema.Types.ObjectId, ref: 'Block', required: true, index: true },
    roomNumber: { type: String, required: [true, 'Room number is required'], trim: true },
    floor: { type: Number, required: [true, 'Floor is required'], min: 0, max: 30 },
    capacity: { type: Number, required: [true, 'Capacity is required'], min: 1, max: 12 },
    roomType: { type: String, enum: ['standard', 'ac', 'deluxe'], default: 'standard' },
    status: { type: String, enum: ['available', 'maintenance', 'closed'], default: 'available', index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
roomSchema.index({ block: 1, roomNumber: 1 }, { unique: true });

module.exports = mongoose.model('Room', roomSchema);
