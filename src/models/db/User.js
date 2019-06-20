const mongoose = require('mongoose');
const {
    Schema
} = require('mongoose');

const UserSchema = new Schema({

    publicKey: { // base64 "wrapped" arraybuffer public key
        type: String,
        required: true,
        unique: true
    },

    name: {
        type: String,
        validate: {
            validator: (s) => s.length > 2,
            message: 'The name must be longer than 2 characters.'
        },
        unique: true
    },

    balance: {
        type: Number,
        default: 0
    }
});

module.exports = mongoose.model('User', UserSchema);