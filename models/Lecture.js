const mongoose = require('mongoose');

const lectureSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true
    },
    dayOfWeek: {
      type: String,
      enum: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
      required: true
    },
    startTime: {
      type: String,
      required: true
    },
    endTime: {
      type: String,
      required: true
    },
    room: {
      type: String,
      default: '',
      trim: true
    },
    instructor: {
      type: String,
      default: '',
      trim: true
    },
    type: {
      type: String,
      enum: ['Lecture', 'Lab', 'Tutorial'],
      default: 'Lecture'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Lecture', lectureSchema);