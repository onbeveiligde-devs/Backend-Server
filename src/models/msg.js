const mongoose = require('mongoose');
const {
    Schema
} = require('mongoose');
const Chat = require('../models/db/Chat');

module.exports = {
    save(data, done) {
        const chat = new Chat({
            certificateSubject: data.certificateSubject,
            certificateAuthor: data.certificateAuthor,
            messageHash: data.messageHash,
            message: data.message
        });
        chat.save()
            .then((reply) => {
                done({
                    ok: !chat.isNew,
                    message: 'message saved',
                    data: reply
                });
            })
            .catch(err => {
                console.log('can not create chat. ', err);
                done({
                    ok: false,
                    message: 'can not create chat',
                    data: err
                });
            });
        done((true));
    },

    /** 
     * @param subject = the certificate of the transparent person
     * @returns Array with the history of messages
     */
    load(subject, done) {
        Chat.find({
            certificateSubject: subject
        }).then(messages => {
                done({
                    ok: true,
                    data: messages
                });
            })
            .catch(err => {
                console.log('can not get a list of messages. ', err);
                done({
                    ok: false,
                    message: 'can not get a list of messages.',
                    data: err
                });
            });
    }
}