const Chat = require('../models/db/Chat');
const User = require('../models/db/User');
const Hal = require('hal');
const crypto = require('./crypto');

module.exports = {
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
                    resource.link(chat.subject, str);
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

        User.findById(req.body.user)
            .then(user => {
                if(!user) {
                    res.status(404).send(new Hal.Resource({
                        message: 'can not create chat.',
                        errors: err
                    }, req.url));
                }

                //TODO: hier was ik

                User.findById(req.body.)

            })
            .catch(err => {
                res.status(500).send(new Hal.Resource({
                    message: 'can not create chat.',
                    errors: err
                }, req.url));
            });

        const chat = new Chat(req.body);
        chat.save()
            .then((reply) => {
                let resource = new Hal.Resource({
                    created: !chat.isNew,
                    data: reply._doc
                }, req.url);

                let str = req.url;
                if (str.substr(-1) != '/') str += '/';
                str += chat._id;
                resource.link(chat._id, str);

                res.send(resource);
            })
            .catch(err => {
                console.log('can not create chat. ', err);
                res.status(200);
                res.send(new Hal.Resource({
                    message: 'can not create chat.',
                    errors: err
                }, req.url));
            });
    }
};