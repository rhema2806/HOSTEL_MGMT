const mongoose = require('mongoose');
const { MEAL_TYPES } = require('../utils/constants');

const feedbackSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    mess: { type: mongoose.Schema.Types.ObjectId, ref: 'Mess', required: true, index: true },
    date: { type: Date, required: true },
    mealType: { type: String, enum: MEAL_TYPES, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);
feedbackSchema.index({ student: 1, date: 1, mealType: 1 }, { unique: true });
feedbackSchema.index({ mess: 1, date: 1 });

module.exports = mongoose.model('MessFeedback', feedbackSchema);
