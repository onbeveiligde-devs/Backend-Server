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
     * @param signature the signature of the log item. It is encrypted with the private key from the user
     */
    save(publicKey, data ,signature) {
        const log = new Log({
            publicKey: publicKey,
            data: data,
            signature: signature
        });

        log.save()
            .then((reply) => {
                //Shortens the public key for use in console.log (for readability purposes)
                let shortPubKey = publicKey.substring(0, 11);
                    console.log("NEW LOG ITEM: " + shortPubKey + " " + data)

            })
            .catch(err => {
                console.log('ERROR: Couldn\'t create log item!', err);
            });
    },
}