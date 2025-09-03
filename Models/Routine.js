const mongoose = require('mongoose');

const routineEntrySchema = new mongoose.Schema({
  day: {
    type: String,
    required: true
  },
  period: {
    type: String,
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
  teacherName: {
    type: String,
    required: true
  },
  className: {
    type: String,
    required: true
  },
  createdBy:{
    type: String,
  },
  teacher_id:{
     type: String,
  }
});

const routineSchema = new mongoose.Schema({
  routine: [routineEntrySchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Routine', routineSchema);
