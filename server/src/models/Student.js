const mongoose = require('mongoose');
const { DEPARTMENTS } = require('../utils/constants');

const studentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    studentId: { type: String, required: [true, 'Student ID is required'], unique: true, uppercase: true, trim: true },
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 100 },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    dob: Date,
    gender: { type: String, enum: ['male', 'female', 'other'], required: [true, 'Gender is required'] },
    department: { type: String, enum: DEPARTMENTS, required: [true, 'Department is required'], index: true },
    year: { type: Number, min: 1, max: 6, required: [true, 'Year is required'], index: true },
    section: { type: String, trim: true, uppercase: true, maxlength: 5 },
    guardianName: { type: String, trim: true },
    guardianPhone: { type: String, trim: true },
    emergencyContact: { type: String, trim: true },
    address: { type: String, trim: true, maxlength: 500 },
    photoUrl: { type: String, trim: true },
    mess: { type: mongoose.Schema.Types.ObjectId, ref: 'Mess', index: true },
    admissionDate: Date,
    status: { type: String, enum: ['active', 'inactive', 'alumni'], default: 'active', index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
studentSchema.index({ name: 'text', studentId: 'text' });

module.exports = mongoose.model('Student', studentSchema);
