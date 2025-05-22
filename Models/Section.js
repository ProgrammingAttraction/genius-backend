// models/Section.js

const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
  sectionName: {
    type: String,
    required: true,
    trim: true,
  },
  sectionType: {
    type: String,
    required: true,
    trim: true,
  },
}, { timestamps: true });

const Section = mongoose.model('Section', sectionSchema);

module.exports = Section;
