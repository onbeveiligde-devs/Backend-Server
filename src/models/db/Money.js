const mongoose = require('mongoose');
const {
    Schema
} = require('mongoose');

const MoneySchema = new Schema({
    id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Money',
        unique: true
    },

    ownerCertificate: {
        type: String,
        unique: true,
        required: [true, 'Certificate is required.'],
        validate: {
            validator: (s) => s.length > 4,
            message: 'Certificate must be longer than 1024 characters.'
        }
    },

    balance: {
        type: Number
    },

    balanceHash: {
        type: String,
        required: [true, 'The encripted hash is required.'],
        validate: {
            validator: (s) => s.length > 1,
            message: 'Certificate must be longer than 1024 characters.'
        }
    },
});

module.exports = mongoose.model('Money', MoneySchema);