const mongoose = require('mongoose');

const blockSchema = new mongoose.Schema(
  {
    hostel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true, index: true },
    name: { type: String, required: [true, 'Block name is required'], trim: true },
    floors: { type: Number, min: 1, max: 30, default: 1 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
blockSchema.index({ hostel: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Block', blockSchema);
