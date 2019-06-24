const socketio = require('socket.io');
const Chat = require('../models/db/Chat');
const User = require('../models/db/User');
const crypto = require('../models/crypto');

module.exports = {
    start: function (app) {
        console.log('listen to sockets...');
        const io = socketio(app); // setup stream socket

        // socket connection
        io.on('connection', function (socket) { // connected with socket
            module.exports.message(socket, io);
            module.exports.online(socket, io);
            module.exports.offline(socket, io);
        });
    },

    online: function (socket, io) {
        socket.on('HITOSERV', function (data) { // received from client
            console.log('try to say hi from ' + socket.handshake.address);

            if (typeof (data) !== 'undefined' &&
                typeof (data._id) !== 'undefined' &&
                typeof (data.sign) !== 'undefined'
            ) {
                // Check if author exists
                User.findById(data._id)
                    .then(author => {
                        if (!author) {
                            console.log('author does not exists for ' + socket.handshake.address);
                            io.emit('ERRTOCLIENT', {
                                message: 'author does not exists for ' + socket.handshake.address,
                                errors: 404
                            }); // send to client
                            return;
                        }
                        crypto.verify(data._id, data.sign, author.publicKey)
                            .then(success => {
                                console.log('hi clients', data);
                                io.emit('ONLINE', data); // send to client
                            })
                            .catch(err => {
                                console.log(err);
                                res.status(404).send({
                                    message: 'Could not verify signature'
                                });
                                return;
                            });
                    }).catch(err => {
                        io.emit('ERRTOCLIENT', {
                            message: 'error for ' + socket.handshake.address,
                            errors: err
                        }); // send to client
                        return;
                    })
            } else {
                console.log('hi undefined', data);
            }
        });
    },

    offline: function (socket, io) {
        socket.on('BYETOSERV', function (data) { // received from client
            console.log('bye server from ' + socket.handshake.address);

            if (typeof (data) !== 'undefined' &&
                typeof (data._id) !== 'undefined' &&
                typeof (data.sign) !== 'undefined'
            ) {
                // Check if author exists
                User.findById(data._id)
                    .then(author => {
                        if (!author) {
                            console.log('author does not exists for ' + socket.handshake.address);
                            io.emit('ERRTOCLIENT', {
                                message: 'author does not exists for ' + socket.handshake.address,
                                errors: 404
                            }); // send to client
                            return;
                        }
                        crypto.verify(data._id, data.sign, author.publicKey)
                            .then(success => {
                                console.log('bye clients', data);
                                io.emit('OFFLINE', data); // send to client
                            })
                            .catch(err => {
                                console.log(err);
                                res.status(404).send({
                                    message: 'Could not verify signature'
                                });
                                return;
                            });
                    }).catch(err => {
                        io.emit('ERRTOCLIENT', {
                            message: 'error for ' + socket.handshake.address,
                            errors: err
                        }); // send to client
                        return;
                    })

            } else {
                console.log('bye undefined');
            }
        });
    },

    message: function (socket, io) {
        socket.on('MSGTOSERV', function (data) { // received from client
            console.log('try to save message from ' + socket.handshake.address);

            if (typeof (data) !== 'undefined' &&
                typeof (data.message) !== 'undefined' &&
                typeof (data.author) !== 'undefined' &&
                typeof (data.subject) !== 'undefined' &&
                typeof (data.timestamp) !== 'undefined' &&
                typeof (data.sign) !== 'undefined'
            ) {
                // Check if user exists
                User.findById(data.subject)
                    .then(user => {
                        if (!user) {
                            console.log('user does not exists for ' + socket.handshake.address, [data, user]);
                            io.emit('ERRTOCLIENT', {
                                message: 'user does not exists for ' + socket.handshake.address,
                                errors: 404
                            }); // send to client
                            return;
                        }

                        console.log('uid = ' + user._id);
                        console.log('aut = ' + data.author);

                        // Check if author exists
                        User.findById(data.author)
                            .then(author => {
                                if (!author) {
                                    console.log('author does not exists for ' + socket.handshake.address);
                                    io.emit('ERRTOCLIENT', {
                                        message: 'author does not exists for ' + socket.handshake.address,
                                        errors: 404
                                    }); // send to client
                                    return;
                                }

                                // Check HASH in format "userObjectId-message-timestamp"
                                console.log(data.user + '-' + data.message + '-' + data.timestamp);
                                crypto.verify(data.user + '-' + data.message + '-' + data.timestamp, data.sign, author.publicKey)
                                    .then(success => {
                                        console.log('message verified = ' + success);
                                        if(!success) {
                                            io.emit('ERRTOCLIENT', {
                                                message: 'Message could not be verified',
                                                errors: {}
                                            });
                                            return;
                                        }
                                        let chat = new Chat({
                                            user: user._id,
                                            author: author._id,
                                            message: data.message,
                                            timestamp: new Date(data.timestamp),
                                            sign: data.sign
                                        });
                                        chat.save()
                                            .then(chat => {
                                                console.log('message saved from ' + socket.handshake.address + '. Try to load it...');
                                                io.emit('MSGTOCLIENT', {
                                                    id: chat._id,
                                                    user: chat.user,
                                                    author: author._id,
                                                    authorName: author.name,
                                                    authorPublicKey: author.publicKey,
                                                    message: chat.message,
                                                    timestamp: data.timestamp,
                                                    sign: chat.sign
                                                }); // send to client
                                                console.log('message loaded and send to ' + socket.handshake.address);
                                            }).catch(err => {
                                                console.log('can not create chat for ' + socket.handshake.address, err);
                                                io.emit('ERRTOCLIENT', {
                                                    message: 'can not create chat for ' + socket.handshake.address,
                                                    errors: err
                                                }); // send to client
                                            })
                                    })
                                    .catch(err => {
                                        console.log(err);
                                        res.status(404).send({
                                            message: 'Could not verify signature'
                                        });
                                        return;
                                    });
                            })
                            .catch(err => {
                                console.log('can not create chat for ' + socket.handshake.address, err);
                                io.emit('ERRTOCLIENT', {
                                    message: 'can not create chat for ' + socket.handshake.address,
                                    errors: err
                                }); // send to client
                                return;
                            })

                    })
                    .catch(err => {
                        console.log('can not create chat for ' + socket.handshake.address, err);
                        io.emit('ERRTOCLIENT', {
                            message: 'can not create chat for ' + socket.handshake.address,
                            errors: err
                        }); // send to client
                    });
            } else {
                console.log('fields required ' + socket.handshake.address);
                io.emit('ERRTOCLIENT', {
                    message: 'fields required',
                    fields: {
                        message: 'message',
                        author: 'user._id',
                        subject: 'subject',
                        timestamp: Date.now(),
                        sign: this.message + '-' + this.timestamp
                    }
                }); // send to client
            }
        });
    }
}