const User = require('../models/db/User');
const Hal = require('hal');
const Log = require('../models/Log');
const crypto = require('../models/crypto');

module.exports = {
    list: function (req, res) {
        console.log('try to get a list of users. ');

        User.find()
            .then(users => {
                let resource = new Hal.Resource({
                    "users": users
                }, req.url);

                users.forEach(user => {
                    let str = req.url;
                    if (str.substr(-1) != '/') str += '/';
                    str += user._id;
                    resource.link(user._id, str);
                });

                res.send(resource);
            })
            .catch(err => {
                console.log('can not get a list of users. ', err);
                res.status(200);
                res.send(new Hal.Resource({
                    message: 'can not get a list of users.',
                    errors: err
                }, req.url));
            });
    },

    get: function (req, res) {
        console.log('try to get user. ', req.params);

        User.findById(req.params.id)
            .then(reply => {
                res.send(new Hal.Resource(reply._doc, req.url));
            })
            .catch(err => {
                console.log('can not get user. ', err);
                res.status(200);
                res.send(new Hal.Resource({
                    message: 'can not get user.',
                    errors: err
                }, req.url));
            });
    },

    getByKey: function (req, res) {
        console.log('try to get user by key. ', req.body.publicKey);
        User.findOne({
                publicKey: req.body.publicKey
            }).then(reply => {
                console.log('user with key found. ', reply);
                res.send({
                    user: reply,
                    success: reply != null
                });
            })
            .catch(err => {
                console.log('can not get user. ', err);
                res.status(404);
                res.send(new Hal.Resource({
                    message: 'can not get user.',
                    errors: err
                }, req.url));
            });
    },

    login: function(req, res) {
        console.log('login called');
        let sign = req.body.sign;
        let publicKey = req.body.publicKey;
        let command = req.body.command;

        // Check if the public key actually exists before verifying
        User.find({
            publicKey: publicKey
        })
            .then(list => {
                if(list.length < 1) {
                    res.status(404).json(new Hal.Resource({
                        error: 'Unregistered public key'
                    }));
                    return;
                }
                // Public key exists in database
                crypto.verify(command, sign, publicKey)
                    .then(success => {
                        res.status(success ? 200 : 400).json(new Hal.Resource({
                            success: success,
                            user: list[0]
                        }))
                    })
                    .catch(error => {
                        res.status(500).json(new Hal.Resource({
                            success: false,
                            error: error
                        }))
                    });
            })
            .catch(err => {
                console.error(err);
                res.status(500).json(new Hal.Resource({
                    error: err
                }));
            });
    },

    register: async function(req, res) {
        let publicKey = req.body.publicKey;
        let name = req.body.name;
        let signature = req.body.sign;

        let usersWithThatPublicKey = await User.find({$or: [{ publicKey: publicKey }, { name: name }]});
        if(usersWithThatPublicKey && usersWithThatPublicKey.length) {
            // public key or name taken
            res.status(400).json(new Hal.Resource({
                error: 'Public key or name not unique'
            }));
            return;
        }

        crypto.verify(name, signature, publicKey)
            .then(success => {
                console.log('verified name hash = ' + success);
                if(!success) {
                    res.status(400).json(new Hal.Resource({
                        error: 'Invalid signature'
                    }));
                    return;
                }

                let user = new User({
                    publicKey: publicKey,
                    name: name,
                    balance: 0
                });
                user.save()
                    .then(u => {
                        res.status(200).json(u);
                    })
                    .catch(err => {
                        res.status(500).json(new Hal.Resource({
                            error: err
                        }));
                    });

            })
            .catch(console.error);

    }
};