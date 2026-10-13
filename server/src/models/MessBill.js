const mongoose = require('mongoose');
const { BILL_STATUS } = require('../utils/constants');

const billSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    mess: { type: mongoose.Schema.Types.ObjectId, ref: 'Mess', required: true, index: true },
    month: { type: String, required: true, match: /^\d{4}-(0[1-9]|1[0-2])$/ },
    totalMeals: { type: Number, default: 0, min: 0 },
    mealBreakdown: { breakfast: { type: Number, default: 0 }, lunch: { type: Number, default: 0 }, snacks: { type: Number, default: 0 }, dinner: { type: Number, default: 0 } },
    mealCharges: { type: Number, default: 0, min: 0 },
    otherCharges: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    finalAmount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: BILL_STATUS, default: 'pending', index: true },
    remarks: { type: String, trim: true, maxlength: 300 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
billSchema.index({ student: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('MessBill', billSchema);
