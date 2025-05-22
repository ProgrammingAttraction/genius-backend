const mongoose = require('mongoose');

const examEntrySchema = new mongoose.Schema({
  examType: {
    type: String,
    required: true,
    enum: ['Midterm', 'Final', 'Quiz', 'Practical']
  },
  day: {
    type: String,
    required: true,
    enum: ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday']
  },
  date: {
    type: Date,
    required: true
  },
  timeStart: {
    type: String,
    required: true
  },
  timeEnd: {
    type: String,
    required: true
  },
  subjectName: {
    type: String,
    required: true
  },
  className: {
    type: String,
    required: true
  },
  roomNumber: {
    type: String,
    required: true
  },
  supervisor: {
    type: String,
    required: true
  }
});

const examRoutineSchema = new mongoose.Schema({
  examRoutine: [examEntrySchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ExamRoutine', examRoutineSchema);