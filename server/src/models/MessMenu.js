const mongoose = require('mongoose');

const items = { type: [{ type: String, trim: true, maxlength: 80 }], default: [] };

const menuSchema = new mongoose.Schema(
  {
    mess: { type: mongoose.Schema.Types.ObjectId, ref: 'Mess', required: true },
    date: { type: Date, required: true },
    meals: { breakfast: items, lunch: items, snacks: items, dinner: items },
    notes: { type: String, trim: true, maxlength: 300 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
menuSchema.index({ mess: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('MessMenu', menuSchema);
