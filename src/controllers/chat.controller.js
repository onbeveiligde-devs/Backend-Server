const Chat = require('../models/db/Chat');
const User = require('../models/db/User');
const Hal = require('hal');
const crypto = require('./crypto');

module.exports = {
    list: function (req, res) {
        Chat.find()
            .then(messages => {
                let resource = new Hal.Resource({
                    "messages": messages
                }, req.url);

                messages.forEach(chat => {
                    let str = req.url;
                    if (str.substr(-1) != '/') str += '/';
                    str += chat._id;
                    resource.link(chat._id, str);
                });

                res.send(resource);
            })
            .catch(err => {
                console.log('can not get a list of messages. ', err);
                res.status(200);
                res.send(new Hal.Resource({
                    message: 'can not get a list of messages.',
                    errors: err
                }, req.url));
            });
    },

    allByUserId: function (req, res) {
        Chat.find({ user: req.params.user })
            .then(messages => {
                let resource = new Hal.Resource({
                    "messages": messages
                }, req.url);

                messages.forEach(chat => {
                    let str = req.url;
                    if (str.substr(-1) != '/') str += '/';
                    str += chat._id;
                    resource.link(chat.user, str);
                });

                res.send(resource);
            })
            .catch(err => {
                console.log('can not get a list of messages. ', err);
                res.status(200);
                res.send(new Hal.Resource({
                    message: 'can not get a list of messages.',
                    errors: err
                }, req.url));
            });
    },

    create: function (req, res) {

        // Check if user exists
        User.findById(req.params.user)
            .then(user => {
                if(!user) {
                    res.status(404).send(new Hal.Resource({
                        message: 'can not create chat.',
                        errors: err
                    }, req.url));
                    return;
                }

                console.log('uid = ' + user._id);
                console.log('aut = ' + req.body.author);

                // Check if author exists
                User.findById(req.body.author)
                    .then(author => {
                        if(!author) {
                            res.status(404).send(new Hal.Resource({
                                message: 'can not create chat.',
                                errors: err
                            }, req.url));
                            return;
                        }

                        // Check HASH in format "message-timestamp"
                        console.log(req.body.message + '-' + req.body.timestamp);
                        console.log(author);
                        crypto.verify(req.body.message + '-' + req.body.timestamp, req.body.sign, author.publicKey)
                            .then(success => {
                                console.log('message verified = ' + success);

                                let chat = new Chat({
                                    user: user._id,
                                    author: author._id,
                                    message: req.body.message,
                                    timestamp: new Date(req.body.timestamp * 1000),
                                    sign: req.body.sign});
                                chat.save()
                                    .then(chat => {
                                        res.status(200).json(chat);
                                    }).catch(err => {
                                        res.status(500).send(new Hal.Resource({
                                            message: 'can not create chat.',
                                            errors: err
                                        }, req.url));
                                    })
                            })
                            .catch(err => {
                                console.log(err);
                                res.status(404).send(new Hal.Resource({
                                    message: 'can not create chat.',
                                    errors: 'Could not verify signature'
                                }, req.url));
                                return;
                            });
                    })
                    .catch(err => {
                        console.log(err);
                        res.status(500).send(new Hal.Resource({
                            message: 'can not create chat.',
                            errors: err
                        }, req.url));
                        return;
                    })

            })
            .catch(err => {
                res.status(500).send(new Hal.Resource({
                    message: 'can not create chat.',
                    errors: err
                }, req.url));
            });
    }
};