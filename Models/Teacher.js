const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const teacherSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  fatherName: {
    type: String,
    required: true
  },
  motherName: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
    required: true
  },
  education: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  mobile: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^\d{11}$/.test(v);
      },
      message: props => `${props.value} is not a valid phone number!`
    }
  },
  email: {
    type: String,
    required: true,
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
    required: true,
    minlength: 6
  },
  profilePic: {
    type: String,
    default: ''
  },
  nidNumber: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: function(v) {
        // Basic validation for NID (adjust according to your country's NID format)
        return /^[0-9]{10,17}$/.test(v);
      },
      message: props => `${props.value} is not a valid NID number!`
    }
  },
  nidPhoto: {
    type: String,
    required: true,
    default: ''
  },
  emergencyContact: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^\d{11}$/.test(v);
      },
      message: props => `${props.value} is not a valid emergency contact number!`
    }
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

// Hash password before saving
teacherSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Method to compare passwords
teacherSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const Teacher = mongoose.model('Teacher', teacherSchema);

module.exports = Teacher;