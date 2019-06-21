const mongoose = require('mongoose');
const {
    Schema
} = require('mongoose');
const Log = require('../models/db/Log');

module.exports = {
    /**
     * Creates a new log item in the database.
     *
     * @param publicKey the public key of the user carrying out the action / event
     * @param data the type of action / event that is happening (ie: FOLLOWS <public key>, STARTS_STREAM, STOPS_STREAM)
     * @param sign the signature of the log item.
     */
    save(publicKey, data ,sign) {
        const log = new Log({
            publicKey: publicKey,
            data: data,
            sign: sign
        });

        log.save()
            .then((reply) => {
                    // public key is shortened for readability purposes, the full public key is
                    // still stored in the database
                    console.log("NEW LOG ITEM: " + publicKey.substring(0, 11) + " " + data)

            })
            .catch(err => {
                console.log('ERROR: Couldn\'t create log item!', err);
            });
    },
}