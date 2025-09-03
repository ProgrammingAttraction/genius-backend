const mongoose = require('mongoose');

// Notification subdocument schema
const notificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    trim: true
  },
  message: {
    type: String,
    required: [true, 'Notification message is required'],
    trim: true
  },
  type: {
    type: String,
    enum: ['info', 'success', 'warning', 'error'],
    default: 'info'
  },
  link: {
    type: String // Optional URL for redirection
  },
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const studentSchema = new mongoose.Schema({
  id: {
    type: String,
    required: [true, 'Student ID is required'],
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  fatherName: {
    type: String,
    required: [true, "Father's name is required"],
    trim: true
  },
  motherName: {
    type: String,
    required: [true, "Mother's name is required"],
    trim: true
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true
  },
  gender: {
    type: String,
    required: [true, 'Gender is required'],
  },
  birthdate: {
    type: Date,
    required: [true, 'Birth date is required']
  },
 
  mobile: {
    type: String,
    required: [true, 'Mobile number is required'],
    validate: {
      validator: function(v) {
        return /^\d{11}$/.test(v);
      },
      message: props => `${props.value} is not a valid mobile number!`
    }
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: props => `${props.value} is not a valid email!`
    }
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  classRoll: {
    type: String,
    required: [true, 'Class roll is required']
  },
  studentClass: {
    type: String,
    required: [true, 'Class is required']
  },
  section: {
    type: String,
    required: [true, 'Section is required']
  },
  profilePic: {
    type: String,
    required: [true, 'Profile picture is required']
  },
  attendance: [{
    date: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      required: true,
      enum: ['present', 'absent', 'late', 'excused']
    }
  }],
  performance: {
    averageScore: {
      type: Number,
      min: 0,
      max: 100
    },
    lastExamScore: {
      type: Number,
      min: 0,
      max: 100
    },
    overallGrade: {
      type: String,
      enum: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F']
    }
  },
  educationStatus: {
    type: String,
    enum: ['active', 'inactive', 'graduated', 'transferred', 'suspended'],
    default: 'active'
  },
  notifications: [notificationSchema], // ✅ New embedded field for notifications

  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  group:{
    type: String,
  },
  religion:{
     type: String,
    required:true
  }
});

// Automatically update `updatedAt` on save
studentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;
