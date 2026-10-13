const mongoose = require('mongoose');

const allocationSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    hostel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true, index: true },
    block: { type: mongoose.Schema.Types.ObjectId, ref: 'Block', required: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    bedNumber: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ['active', 'vacated', 'transferred'], default: 'active', index: true },
    checkInDate: { type: Date, default: Date.now },
    checkOutDate: Date,
    remarks: { type: String, trim: true, maxlength: 300 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Database-level guarantees, independent of application code and safe under concurrent requests.
allocationSchema.index({ student: 1 }, { unique: true, partialFilterExpression: { status: 'active' }, name: 'one_active_bed_per_student' });
allocationSchema.index({ room: 1, bedNumber: 1 }, { unique: true, partialFilterExpression: { status: 'active' }, name: 'one_active_student_per_bed' });

module.exports = mongoose.model('RoomAllocation', allocationSchema);
