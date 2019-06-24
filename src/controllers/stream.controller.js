const multiparty = require('multiparty');
const path = require('path');
const fs = require('fs');
const uuid = require('node-uuid');
require('dotenv').config({
    path: '.env'
});
const User = require('../models/db/User');
const crypto = require('../models/crypto');
const util = require('util');

class ChannelStatus {
    constructor() {
        this.name = '';
        this.uuid = '';
        this.dir = '';
        this.isOnAir = false;
        this.currentSeq = 0;
        this.storedSec = 0;
        this.lastChunk = Date.now();
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
let channels = {}; // channel status has

const port = process.env.PORT || 8000;
const serverURL = 'localhost:' + port;

setInterval(function() {
    console.log('Checking all channels on last chunk');
    for(key in channels) {
        if(channels.hasOwnProperty(key)) {
            let channel = channels[key];
            console.log('Checking ' + channel.name);
            if(Date.now() > (channel.lastChunk + 15000)) {
                console.log('User is NOT live anymore, last chunk was ' + (Date.now() - channel.lastChunk) + 'ms ago');
                channel.isOnAir = false;
            } else {
                console.log('User is still live, last chunk was ' + (Date.now() - channel.lastChunk) + 'ms ago');
            }
        }
    }
}, 5000);

function startChannel(name) {
    var channelStatus = channels[name];
    if (!channelStatus) {
        channelStatus = new ChannelStatus();
    } else if (channelStatus.isOnAir) {
        return null;
    }

    channelStatus.name = name;
    channelStatus.uuid = uuid.v1();
    channelStatus.dir = path.join(__dirname, '../data/mov', 'd_' + name + '_' + channelStatus.uuid);
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

module.exports = {
    online: (req, res) => {
        let responseObj = {
            streams: []
        };
        for (key in channels) {
            if (channels.hasOwnProperty(key)) {
                let channel = channels[key];
                responseObj.streams.push({
                    name: channel.name,
                    uuid: channel.uuid,
                    isOnAir: channel.isOnAir,
                    watcherCount: channel.watchers.length
                });
            }
        }
        res.json(responseObj);
        //res.send(util.inspect(channels));
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
    goLive: (req, res) => {
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
        console.log('uploaded video chunk');
        var channel = req.params.channel;
        var channelStatus = getChannelStatus(channel);
        if (!channelStatus) {
            channelStatus = startChannel(channel);
        }

        channelStatus.isOnAir = true;
        channelStatus.lastChunk = Date.now();
        const signature = req.headers["signature"];

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

            const signedData = {
                base64: fields["blob_base64"][0], // used [0], because field values are an array
                index: fields["blob_index"][0],
                name: fields["blob_name"][0],
                second: fields["blob_sec"][0]
            };

            User.findById(channel)
                .then(async user => {
                    if(!user)
                        return;
                    let data = fields["blob_base64"][0] + fields["blob_name"][0] + fields["blob_index"][0] + fields["blob_sec"][0];
                    console.log('Data must be "' + data + '"');
                    let verified = await crypto.verify(data, fields['sign'], user.publicKey);
                    console.log('Verified = ' + verified);
                    if(!verified)
                        return;
                    console.log("This video stream is succesfully verified.");
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
                    console.log()
                });
        });
    }
};