// models/Class.js
const mongoose = require('mongoose');

const classSchema = new mongoose.Schema(
  {
    className: {
      type: String,
      required: true,
      trim: true,
    },
    classTeacher: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

const Classmodel=mongoose.model('Class', classSchema);
module.exports = Classmodel;
