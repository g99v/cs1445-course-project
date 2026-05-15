const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    code: {
      type: String,
      required: true,
      trim: true
    },
    color: {
      type: String,
      default: '#0d6efd'
    },
    semester: {
      type: String,
      default: '2nd Semester, 2026'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Course', courseSchema);