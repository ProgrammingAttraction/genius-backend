const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    content: {
        type: String,
        required: true
    },
    student_ids: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student'
    }],
    student_names: [{
        type: String,
        trim: true
    }],
    image: {
        type: String // This will store the path to the image
    },
    date_posted: {
        type: Date,
        default: Date.now
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    is_active: {
        type: Boolean,
        default: true
    }
});

const Notice = mongoose.model('Notice', noticeSchema);

module.exports = Notice;