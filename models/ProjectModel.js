const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    year: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ""
    },
    align: {
        type: String,
        default: "left"
    },
    // Keep single `image` for backward compatibility, and add `images` array
    image: {
        type: String
    },
    images: {
        type: [String],
        default: []
    },
    // Single video for backward-compatibility and multiple videos support
    video: {
        type: String,
    },
    videos: {
        type: [String],
        default: []
    },
    active: {
        type: Boolean,
        default: true,
        index: true
    },
    position: {
        type: Number,
        default: 0,
        index: true
    },
    link: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Project', projectSchema);