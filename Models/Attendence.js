const mongoose = require('mongoose');

const studentAttendanceSchema = new mongoose.Schema({
  studentId: {
    type:String,
    required: true
  },
  present: {
    type: Boolean,
    default: false
  },
  absent: {
    type: Boolean,
    default: false
  },
  late: {
    type: Boolean,
    default: false
  },
  remarks: {
    type: String,
    trim: true,
    maxlength: 200
  }
});

const attendanceSchema = new mongoose.Schema({
  classId: {
  type:String,
    required: true
  },
  sectionId: {
  type:String,
  default:"Nothing"
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    default: Date.now
  },
  students: [studentAttendanceSchema], // Array of student attendance records
  createdBy: {
   type:String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for unique attendance per class/section/date
attendanceSchema.index({ classId: 1, sectionId: 1, date: 1 }, { unique: true });

// Index for faster student attendance queries
attendanceSchema.index({ 'students.studentId': 1 });

// Middleware to update the updatedAt field
attendanceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to check for existing attendance
attendanceSchema.statics.checkExisting = async function(classId, sectionId, date) {
  return await this.findOne({
    classId,
    sectionId: sectionId || null,
    date: new Date(date)
  });
};

// Method to add or update student attendance
attendanceSchema.methods.updateStudentAttendance = function(studentId, status) {
  const studentAtt = this.students.find(s => s.studentId.equals(studentId));
  
  if (studentAtt) {
    // Update existing record
    studentAtt.present = status.present;
    studentAtt.absent = status.absent;
    studentAtt.late = status.late;
  } else {
    // Add new record
    this.students.push({
      studentId,
      ...status
    });
  }
};

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;