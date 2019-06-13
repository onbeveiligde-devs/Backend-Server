const multiparty = require('multiparty')
const express = require('express');
const path = require('path');
const fs = require('fs');
const uuid = require('node-uuid');
const clusterIntervalSec = 5;

const port = process.env.PORT || 8000;
const serverURL = 'loalhost:' + port;

const https = require('https');

const httpOptions =  {
    key: fs.readFileSync("keys/privatekey.pem"),
    cert: fs.readFileSync("keys/certificate.pem")
};

class ChannelStatus {
  constructor(){
    this.name = '';
    this.uuid = '';
    this.dir = '';
    this.isOnAir = false;
    this.currentSeq = 0;
    this.currentSec = 0;
    this.storedSec = 0;
    this.filePrefix = '';
  }
}
var channels = {}; // channel status has

function startChannel(name) {
  var channelStatus = channels[name];
  if (!channelStatus) {
    // create new channel
    channelStatus = new ChannelStatus();
  }
  else if (channelStatus.isOnAir) {
    // already onAir
    return null;
  }

  channelStatus.name = name;
  channelStatus.uuid = uuid.v1();
  channelStatus.dir = path.join(__dirname, 'mov', 'd_' + name + '_' + channelStatus.uuid);
  channelStatus.filePrefix = path.join(channelStatus.dir, 'v_' + channelStatus.name);
  channelStatus.isOnAir = true;
  channelStatus.currentSeq = 0;
  channelStatus.currentSec = 0;
  channelStatus.storedSec = 0;
  channels[name] = channelStatus;

  // make directory
  fs.mkdir(channelStatus.dir, function (err) {
    if (err){
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
  res.render('index', { title: 'Express Sample' });
});
app.get('/watch/:channel', function (req, res) {
  var channel = req.params.channel;
  var channelStatus = getChannelStatus(channel);
  if (!channelStatus) {
    console.error('ERROR. channel:' + channel + ' not onAir');
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
    return;
  }
  var streamUuid = uuid.v1() + '--' + channelStatus.storedSec;
  console.log('get /watch/' + channel + ' uuid=' + streamUuid);
  res.render('watch', { title: 'watch ' + channel, channel: channel, uuid: streamUuid, server: serverURL });
});

app.get('/stream/:channel', function (req, res) { 
  var channel = req.params.channel;
  console.log('get /stream/' + channel);
  var channelStatus = getChannelStatus(channel);
  if (!channelStatus) {
    console.error('ERROR. channel:' + channel + ' not onAir');
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
    return;
  }

  var streamPosSec = Number(channelStatus.storedSec);
  var headerAppended = false;
  var sleepCount = 0;
  var sleepCountMax = 10;
  function appendFile(res) {
    var filename;
    if (!headerAppended) {
      filename = channelStatus.filePrefix + '_' + 0 + '.webm';
    }
    else {
      filename = channelStatus.filePrefix + '_' + streamPosSec + '.webm';
    }

    if (fs.existsSync(filename)) {
      console.log('file EXIST:' + filename);
      sleepCount = 0;
      // --- create read stream ---
      var readStream = fs.createReadStream(filename);
      readStream.on('error', onError);
      readStream.on('end', function () {
        readStream.unpipe(res);
        if (!headerAppended) {
          headerAppended = true;
        }
        else {
          streamPosSec += clusterIntervalSec;
        }
        appendFile(res);
      });

      var listeners = readStream.listeners('end');
      var count = listeners.length;
      readStream.pipe(res);
      listeners = readStream.listeners('end');
      var listener = listeners[count];
      readStream.removeListener('end', listener);
    }
    else {
      sleepCount++;
      if (sleepCount > sleepCountMax) {
        console.error('TOO MANY times to sleep.');
        res.end();
        return;
      }

      var tryInterval = 1000; // mili sec
      setTimeout(appendFile, tryInterval, res);
    }
  }


  res.on('close', function () {
    console.log('CLOSE on response stream');  // close event fired, when browser window closes
  });
  res.on('end', function () {
    console.log('!!!!! END on response stream');
  });

  res.writeHead(200, { 'Content-Type': 'video/webm', 'Cache-Control': 'no-cache, no-store' });
  appendFile(res);
  return;

  function onError(err) {
    console.error('ERROR on readStream, ', err);
  }
});
app.get('/golive/:channel', function (req, res) {
  var channel = req.params.channel;
  var channelStatus = startChannel(channel);
  if (!channelStatus) {
    console.error('ERROR. channel:' + channel + ' already onAir');
  }

  res.render('golive', { title: 'GoLive ' + channel, channel: channel });
});
app.post('/upload/:channel', function (req, res) {
  var channel = req.params.channel;
  var channelStatus = getChannelStatus(channel);
  if (!channelStatus) {
    console.error('ERROR. channel:' + channel + ' not ready for onAir');
  }

  var form = new multiparty.Form({ maxFieldsSize: 4096 * 1024 });
  form.parse(req, function (err, fields, files) {
    if (err) {
      console.error('form parse error');
      console.error(err);

      res.writeHead(500, { 'content-type': 'text/plain' });
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

    res.writeHead(200, { 'content-type': 'text/plain' });
    res.write('received upload:\n\n');
    res.end('upload index=' + postIndex + ' , sec=' + postSec);

  });
});

https.createServer(httpOptions, app).listen(port, '0.0.0.0');
console.log('server listen start port ' + port);

function writeWebM(filename, buf, endPosition) {
  console.log('writeWebMCluster() ' + filename);
  var writeStream = fs.createWriteStream(filename);
  var bufToWrite = buf.slice(0, endPosition);
  writeStream.write(bufToWrite);
  writeStream.end();
}



