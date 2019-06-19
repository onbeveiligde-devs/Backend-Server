const socketio = require('socket.io');
const Chat = require('../models/db/Chat');
const auth = require('../models/auth');

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
            if (typeof (data.message) !== 'undefined' &&
                typeof (data.certificateAuthor) !== 'undefined' &&
                auth.verify(data.message, data.certificateAuthor)
            ) {
                const chat = new Chat(data);
                chat.save()
                    .then((reply) => {
                        console.log('message saved from ' + socket.handshake.address + '. Try to load it...');
                        io.emit('MSGTOCLIENT', reply); // send to client
                        console.log('message loaded and send to ' + socket.handshake.address);
                    })
                    .catch(err => {
                        console.log('can not create message for ' + socket.handshake.address, err);
                        io.emit('ERRTOCLIENT', {
                            message: 'can not create message for ' + socket.handshake.address,
                            data: err
                        }); // send to client
                    });
            } else {
                console.log('can not verify message for ' + socket.handshake.address, data);
                io.emit('ERRTOCLIENT', {
                    message: 'can not verify message for ' + socket.handshake.address,
                    data: data
                }); // send error to client
            }
        });
    }
}