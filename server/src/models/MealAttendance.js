const mongoose = require('mongoose');
const { MEAL_TYPES } = require('../utils/constants');

const attendanceSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    mess: { type: mongoose.Schema.Types.ObjectId, ref: 'Mess', required: true },
    date: { type: Date, required: true },
    mealType: { type: String, enum: MEAL_TYPES, required: true },
    status: { type: String, enum: ['present', 'absent'], default: 'present' },
    markedAt: { type: Date, default: Date.now },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    method: { type: String, enum: ['manual', 'qr'], default: 'manual' }, // 'qr' reserved for the later QR feature
  },
  { timestamps: true }
);
attendanceSchema.index({ student: 1, date: 1, mealType: 1 }, { unique: true });
attendanceSchema.index({ mess: 1, date: 1, mealType: 1 });

module.exports = mongoose.model('MealAttendance', attendanceSchema);
