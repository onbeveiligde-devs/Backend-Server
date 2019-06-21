const socketio = require('socket.io');
const Chat = require('../models/db/Chat');
const User = require('../models/db/User');
const crypto = require('../controllers/crypto');

module.exports = {
    start: function (app) {
        const io = socketio(app); // setup stream socket

        // socket connection
        io.on('connection', function (socket) { // connected with socket
            module.exports.hello(socket, io);
            module.exports.message(socket, io);
        });
    },

    hello: function (socket, io) {
        // console.log('socket id: ', socket.id) // connected with client
        let address = socket.handshake.address;
        console.log('New connection from ' + address + '. Browser: ', socket.handshake.headers['user-agent']);
        io.emit('NEWCONNECTION', address); // send to client
    },

    message: function (socket, io) {
        socket.on('MSGTOSERV', function (data) { // received from client
            console.log('try to save message from ' + socket.handshake.address);
            // Check if user exists
            User.findById(data.subject)
                .then(user => {
                    if (!user) {
                        console.log('user does not exists for ' + socket.handshake.address);
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

                            // Check HASH in format "message-timestamp"
                            console.log(data.message + '-' + data.timestamp);
                            console.log(author);
                            crypto.verify(data.message + '-' + data.timestamp, data.sign, author.publicKey)
                                .then(success => {
                                    console.log('message verified = ' + success);

                                    let chat = new Chat({
                                        user: user._id,
                                        author: author._id,
                                        message: data.message,
                                        timestamp: new Date(data.timestamp * 1000),
                                        sign: data.sign
                                    });
                                    chat.save()
                                        .then(chat => {
                                            console.log('message saved from ' + socket.handshake.address + '. Try to load it...');
                                            io.emit('MSGTOCLIENT', chat); // send to client
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
                                    console.log('can not create chat for ' + socket.handshake.address, err);
                                    io.emit('ERRTOCLIENT', {
                                        message: 'Could not verify signature for ' + socket.handshake.address,
                                        errors: err
                                    }); // send to client
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
        });
    }
}