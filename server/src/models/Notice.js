const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Title is required'], trim: true, maxlength: 150 },
    description: { type: String, required: [true, 'Description is required'], trim: true, maxlength: 4000 },
    category: { type: String, enum: ['general', 'hostel', 'mess', 'maintenance', 'event', 'urgent'], default: 'general' },
    audience: {
      type: { type: String, enum: ['all', 'hostel', 'year', 'department', 'mess'], default: 'all', required: true },
      hostel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel' },
      mess: { type: mongoose.Schema.Types.ObjectId, ref: 'Mess' },
      year: Number,
      department: String,
    },
    publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    publishDate: { type: Date, default: Date.now, index: true },
    expiryDate: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notice', noticeSchema);
