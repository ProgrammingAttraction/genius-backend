const mongoose = require('mongoose');

const diaryEntrySchema = new mongoose.Schema({
  day: {
    type: String,
    required: true,
    enum: ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday']
  },
  date: {
    type: Date,
    required: true
  },
  className: {
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
  topicCovered: {
    type: String,
    required: true
  },
  homework: {
    type: String,
    default: ''
  },
  note: {
    type: String,
    default: ''
  }
}, { timestamps: true });

const dailyDiarySchema = new mongoose.Schema({
  entries: [diaryEntrySchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
dailyDiarySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const DailyDiary = mongoose.model('DailyDiary', dailyDiarySchema);

module.exports = DailyDiary;