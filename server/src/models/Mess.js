const mongoose = require('mongoose');

const messSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Mess name is required'], unique: true, trim: true },
    location: { type: String, trim: true },
    hostels: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Hostel' }],
    mealRates: {
      breakfast: { type: Number, default: 30, min: 0 },
      lunch: { type: Number, default: 60, min: 0 },
      snacks: { type: Number, default: 20, min: 0 },
      dinner: { type: Number, default: 55, min: 0 },
    },
    mealTimings: {
      breakfast: { type: String, default: '07:30 - 09:00' },
      lunch: { type: String, default: '12:30 - 14:00' },
      snacks: { type: String, default: '16:30 - 17:30' },
      dinner: { type: String, default: '19:30 - 21:00' },
    },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Mess', messSchema);
