const mongoose = require('mongoose');
const {
    Schema
} = require('mongoose');

const ChatSchema = new Schema({

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, "User is required"]
    },

    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, "Author is required"]
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

    sign: {
        type: String,
        required: [true, 'The encrypted hash with format "message-timestamp" is required'],
        validate: {
            validator: (s) => s.length >= 2,
            message: 'Hash must be 256 characters'
        }
    }
});

module.exports = mongoose.model('Chat', ChatSchema);