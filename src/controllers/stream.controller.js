const multiparty = require('multiparty');
const path = require('path');
const fs = require('fs');
const uuid = require('node-uuid');
require('dotenv').config({path: '.env'});
const mongoose = require('mongoose');
const User = require('../models/db/User');
const WebCrypto = require("@trust/webcrypto");
const bodyParser = require('body-parser');

class ChannelStatus {
    constructor() {
        this.name = '';
        this.uuid = '';
        this.dir = '';
        this.isOnAir = false;
        this.currentSeq = 0;
        this.storedSec = 0;
        this.filePrefix = '';
        this.watchers = [];
    }

    set currentSec(val) {
        this.currentSecValue = val;
        this.watchers.forEach((watcher) => {
            console.log("Trying to stream: " + this.currentSecValue);
            if (watcher.ready) {
                streamFile(watcher.response, this.filePrefix + '_' + this.currentSecValue + '.webm', watcher);
            }
        });
    }

    get currentSec() {
        return this.currentSecValue;
    }
}
var channels = {}; // channel status has

const port = process.env.PORT || 8000;
const serverURL = 'localhost:' + port;

// make mongoose use ES6 promises
mongoose.Promise = global.Promise;

// connect to mongodb
mongoose.connect(process.env.DB, {
    useNewUrlParser: true
});



function startChannel(name) {
    var channelStatus = channels[name];
    if (!channelStatus) {
        channelStatus = new ChannelStatus();
    } else if (channelStatus.isOnAir) {
        return null;
    }

    channelStatus.name = name;
    channelStatus.uuid = uuid.v1();
    channelStatus.dir = path.join(__dirname, 'src/data/mov', 'd_' + name + '_' + channelStatus.uuid);
    channelStatus.filePrefix = path.join(channelStatus.dir, 'v_' + channelStatus.name);
    channels[name] = channelStatus;

    // make directory
    fs.mkdir(channelStatus.dir, function (err) {
        if (err) {
            console.log('mkdir:' + channelStatus.dir + ' err=' + err);
        }
    });

    return channelStatus;
}

function getChannelStatus(name) {
    var channelStatus = channels[name];
    return channelStatus;
}

function streamFile(res, fileName, watcher) {
    watcher.ready = false;
    if (fs.existsSync(fileName)) {
        var readStream = fs.createReadStream(fileName);
        readStream.on('error', (err) => {
            console.log(err);
        });
        readStream.on('end', () => {
            console.log("done streaming");
            readStream.unpipe(res);
            watcher.ready = true;
        });

        readStream.pipe(res);
        //Remove a listener so the response stays open
        readStream.removeListener('end', readStream.listeners('end')[2]);
    }
}

function writeWebM(filename, buf, endPosition) {
    //console.log('writeWebMCluster() ' + filename);
    var writeStream = fs.createWriteStream(filename);
    var bufToWrite = buf.slice(0, endPosition);
    writeStream.write(bufToWrite);
    writeStream.end();
}

function str2ab(str) { // string to array buffer
    var buf = new ArrayBuffer(str.length*2); // 2 bytes for each char
    var bufView = new Uint16Array(buf);
    for (var i=0, strLen=str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return buf;
}


module.exports = {
    online: (req, res)=> {
        res.send(JSON.stringify(channels));
    },
    index: (req, res) => {
        console.log('get /');
        res.render('index', {
            title: 'Express Sample'
        })
    },
    watch: (req, res) => {
        var channel = req.params.channel;
        var channelStatus = getChannelStatus(channel);
        if (!channelStatus) {
            console.error('ERROR. channel:' + channel + ' not onAir');
            res.writeHead(404, {
                'content-type': 'text/plain'
            });
            res.end('not found');
            return;
        }
        var streamUuid = uuid.v1() + '--' + channelStatus.storedSec;
        console.log('get /watch/' + channel + ' uuid=' + streamUuid);
        res.render('watch', {
            title: 'watch ' + channel,
            channel: channel,
            uuid: streamUuid,
            server: serverURL
        });
    },
    stream: (req, res) => {
        var channel = req.params.channel;
        console.log('get /stream/' + channel);
        var channelStatus = getChannelStatus(channel);
        if (!channelStatus) {
            console.error('ERROR. channel:' + channel + ' not onAir');
            res.writeHead(404, {
                'content-type': 'text/plain'
            });
            res.end('not found');
            return;
        }
    
        res.writeHead(200, {
            'Content-Type': 'video/webm',
            'Cache-Control': 'no-cache, no-store'
        });
    
    
        var filename = channelStatus.filePrefix + '_' + 0 + '.webm';
        var watcher = {
            response: res,
            ready: false
        };
    
        console.log("Streaming header")
        streamFile(res, filename, channelStatus.watchers[channelStatus.watchers.push(watcher) - 1]);
    
        res.on('close', function () {
            console.log('Close'); // close event fired, when browser window closes
            channelStatus.watchers.splice(channelStatus.watchers.indexOf(watcher), 1);
        });
        res.on('end', function () {
            console.log('End');
            channelStatus.watchers.splice(channelStatus.watchers.indexOf(watcher), 1);
        });
    
        return;
    },
    goLife: (req, res) => {
        var channel = req.params.channel;
        var channelStatus = startChannel(channel);
        if (!channelStatus) {
            console.error('ERROR. channel:' + channel + ' already onAir');
        }
    
        res.render('golive', {
            title: 'GoLive ' + channel,
            channel: channel
        });
    },
    upload: (req, res) => {
        var channel = req.params.channel;
        var channelStatus = getChannelStatus(channel);
        if (!channelStatus) {
            res.writeHead(500, {
                'content-type': 'text/plain'
            });
            res.end('Server Error');
            return;
        }
    
        channel.isOnAir = true;
        const signature = req.query["sign"];
    
        console.log("Signature is " + signature);
        console.log("Channelname is " + channel);
    
        User.findOne({name: channel})
            .then((user) => {
                const webcrypto = new WebCrypto();
    
                webcrypto.subtle.importKey(
                    "jwk", //can be "jwk" (public or private), "spki" (public only), or "pkcs8" (private only)
                    user["publicKey"],
                    {   //these are the algorithm options
                        name: "ECDSA",
                        namedCurve: "P-256", //can be "P-256", "P-384", or "P-521"
                    },
                    true, //whether the key is extractable (i.e. can be used in exportKey)
                    ["verify"] //"verify" for public key import, "sign" for private key imports
                ).then(function(publicKey){
                    //returns a publicKey (or privateKey if you are importing a private key)
                    console.log("MIJN PUBLICKE IS ");
                    console.log(publicKey);
    
                    console.log('type(signature)');
                    console.log(typeof signature);
                    console.log(req.body);
                    console.log(btoa(req.body));
                    console.log(str2ab(btoa(req.body)));
    
                    return webcrypto.subtle.verify(
                        {
                            name: "ECDSA",
                            hash: {name: "SHA-256"},
                        },
                        publicKey,
                        signature,
                        str2ab(btoa(req.body))
                        );
                }).then((result) => {
                    console.log( "De result is");
                    console.log(result);
                }).catch(err => {
                    console.log(err);
                });
    
            });
    
        var form = new multiparty.Form({
            maxFieldsSize: 4096 * 1024
        });
        form.parse(req, function (err, fields, files) {
            if (err) {
                console.error('form parse error');
                console.error(err);
    
                res.writeHead(500, {
                    'content-type': 'text/plain'
                });
                res.end('Server Error');
                return;
            }
    
            console.log("fields");
            console.log(fields);
    
            var postIndex = fields.blob_index[0];
            var postSec = fields.blob_sec[0];
            var filename = channelStatus.filePrefix + '_' + postSec + '.webm';
            var buf = Buffer.from(fields.blob_base64[0], 'base64');
            writeWebM(filename, buf, buf.length);
            channelStatus.currentSeq = postIndex;
            channelStatus.currentSec = postSec;
            channelStatus.storedSec = postSec;
    
            res.writeHead(200, {
                'content-type': 'text/plain'
            });
            res.write('received upload:\n\n');
            res.end('upload index=' + postIndex + ' , sec=' + postSec);
    
        });
    }
}