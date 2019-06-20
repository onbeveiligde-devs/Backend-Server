const mongoose = require('mongoose');
const {
    Schema
} = require('mongoose');

const ChatSchema = new Schema({

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    message: {
        type: String,
        required: [true, 'Message is required'],
        validate: {
            validator: (s) => s.length >= 1,
            message: 'The message must be between 1 and 1024 characters'
        }
    },

    timestamp: {
        type: Date,
        default: Date.now
    },

    hash: {
        type: String,
        required: [true, 'The encrypted hash with format "timestamp-message" is required'],
        validate: {
            validator: (s) => s.length === 256,
            message: 'Hash must be 256 characters'
        }
    }
});

module.exports = mongoose.model('Chat', ChatSchema);