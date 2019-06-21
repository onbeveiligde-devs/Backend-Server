const mongoose = require('mongoose');
const {
    Schema
} = require('mongoose');

const LogSchema = new Schema({

    publicKey: {
        type: String,
        required: [true, 'Certificate is required.'],
    },

    data: {
        required: [true, "Data is required."],
        type: String,
    },

    sign: {
        type: String,
        required: [true, 'The encrypted hash with format "message-timestamp" is required'],
        validate: {
            validator: (s) => s.length >= 2,
            message: 'Hash must be 256 characters'
        }
    },

    timestamp: {
        type: Date,
        default: Date.now()
    },
});

module.exports = mongoose.model('Log', LogSchema);