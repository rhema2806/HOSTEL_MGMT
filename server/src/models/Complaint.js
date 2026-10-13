const mongoose = require('mongoose');
const { COMPLAINT_CATEGORIES, COMPLAINT_STATUS, PRIORITIES } = require('../utils/constants');

const complaintSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    hostel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', index: true }, // snapshot at filing time, used for warden scope
    mess: { type: mongoose.Schema.Types.ObjectId, ref: 'Mess', index: true },     // snapshot at filing time, used for mess-manager scope
    category: { type: String, enum: COMPLAINT_CATEGORIES, required: [true, 'Category is required'], index: true },
    title: { type: String, required: [true, 'Title is required'], trim: true, maxlength: 120 },
    description: { type: String, required: [true, 'Description is required'], trim: true, maxlength: 2000 },
    priority: { type: String, enum: PRIORITIES, default: 'medium' },
    status: { type: String, enum: COMPLAINT_STATUS, default: 'pending', index: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolution: { type: String, trim: true, maxlength: 1000 },
    statusHistory: [
      { status: String, note: String, by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, at: { type: Date, default: Date.now }, _id: false },
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Complaint', complaintSchema);
