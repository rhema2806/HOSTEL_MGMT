const mongoose = require('mongoose');
const { PAYMENT_METHODS } = require('../utils/constants');

// V1 records payments manually. The `gateway` block is reserved for Razorpay (orderId / paymentId / signature).
const paymentSchema = new mongoose.Schema(
  {
    bill: { type: mongoose.Schema.Types.ObjectId, ref: 'MessBill', required: true, index: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    amount: { type: Number, required: true, min: [1, 'Payment amount must be greater than zero'] },
    method: { type: String, enum: PAYMENT_METHODS, default: 'cash' },
    reference: { type: String, trim: true },
    paidAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['success', 'failed', 'refunded'], default: 'success' },
    gateway: { provider: String, orderId: String, paymentId: String, signature: String },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
