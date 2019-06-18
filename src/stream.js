var multiparty = require('multiparty')
var express = require('express');
var path = require('path');
var fs = require('fs');
var uuid = require('node-uuid');

const port = process.env.PORT || 8000;
var serverURL = 'localhost:' + port;

const https = require('https');

const httpOptions = {
    key: fs.readFileSync("keys/privatekey.pem"),
    cert: fs.readFileSync("keys/certificate.pem")
};

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

function startChannel(name) {
    var channelStatus = channels[name];
    if (!channelStatus) {
        channelStatus = new ChannelStatus();
    } else if (channelStatus.isOnAir) {
        return null;
    }

    channelStatus.name = name;
    channelStatus.uuid = uuid.v1();
    channelStatus.dir = path.join(__dirname, 'mov', 'd_' + name + '_' + channelStatus.uuid);
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

var app = express();
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res) {
    console.log('get /');
    res.render('index', {
        title: 'Express Sample'
    });
});
app.get('/watch/:channel', function (req, res) {
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
});

app.get('/stream/:channel', function (req, res) {
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
});

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

app.get('/golive/:channel', function (req, res) {
    var channel = req.params.channel;
    var channelStatus = startChannel(channel);
    if (!channelStatus) {
        console.error('ERROR. channel:' + channel + ' already onAir');
    }

    res.render('golive', {
        title: 'GoLive ' + channel,
        channel: channel
    });
});
app.post('/upload/:channel', function (req, res) {
    var channel = req.params.channel;
    var channelStatus = getChannelStatus(channel);
    if (!channelStatus) {
        res.writeHead(500, {
            'content-type': 'text/plain'
        });
        res.end('Server Error');
        return;
    }

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

        var postIndex = fields.blob_index[0];
        var postSec = fields.blob_sec[0];
        var filename = channelStatus.filePrefix + '_' + postSec + '.webm';
        var buf = Buffer.from(fields.blob_base64[0], 'base64');
        writeWebM(filename, buf, buf.length);
        channelStatus.currentSeq = postIndex;
        channelStatus.currentSec = postSec;
        channelStatus.storedSec = postSec;

        // delete old cluster
        //  if (postSec >= 10) {
        //   var removeSec = postSec - clusterIntervalSec*2;
        //   var removeFilename =  channelStatus.filePrefix + '_'  + removeSec + '.webm';
        //   fs.unlink(removeFilename, function() {
        //    console.log('-- remove old cluster: ' + removeFilename);
        //   });
        //  }

        res.writeHead(200, {
            'content-type': 'text/plain'
        });
        res.write('received upload:\n\n');
        res.end('upload index=' + postIndex + ' , sec=' + postSec);

    });
});

app.listen(port, '0.0.0.0');
console.log('server listen start port ' + port);

function writeWebM(filename, buf, endPosition) {
    //console.log('writeWebMCluster() ' + filename);
    var writeStream = fs.createWriteStream(filename);
    var bufToWrite = buf.slice(0, endPosition);
    writeStream.write(bufToWrite);
    writeStream.end();
}
