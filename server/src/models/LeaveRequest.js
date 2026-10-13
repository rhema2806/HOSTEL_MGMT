const mongoose = require('mongoose');
const { LEAVE_STATUS } = require('../utils/constants');

const leaveSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    hostel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', index: true },
    startDate: { type: Date, required: [true, 'Start date is required'] },
    endDate: { type: Date, required: [true, 'End date is required'] },
    reason: { type: String, required: [true, 'Reason is required'], trim: true, maxlength: 500 },
    destination: { type: String, trim: true, maxlength: 200 },
    contact: { type: String, trim: true },
    status: { type: String, enum: LEAVE_STATUS, default: 'pending', index: true },
    remarks: { type: String, trim: true, maxlength: 500 },
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    decidedAt: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
leaveSchema.pre('validate', function checkDates(next) {
  if (this.startDate && this.endDate && this.endDate < this.startDate) this.invalidate('endDate', 'End date cannot be before start date');
  next();
});

module.exports = mongoose.model('LeaveRequest', leaveSchema);
