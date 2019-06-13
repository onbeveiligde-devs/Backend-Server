//
// WMLS server.
//  using concat streaming with original logic for pipe
// 

var multiparty = require('multiparty')
var express = require('express');
var path = require('path');
var fs = require('fs');
var stream = require('stream');
var util = require('util');
var uuid = require('node-uuid');
var clusterIntervalSec = 5;

//var port = 8080;
var port = 8000;
var serverURL = 'loalhost:' + port;

// TODO
//  DONE. video cache disable
//  maybe DONE. unstable for stream. maybe file exist but not finish writing.
//  DONE. sound test
//  DONE. stop server streaming/appendFile on client disconnect
//  NOT: clean up old files when live started
//  DONE: or make directory when golive with channel name and time/uuid
//  DONE: make hash-id with start time

// STUDY
//  MediaSource API


function ChannelStatus() {
  //var self = this;
  var name = '';
  var uuid = '';
  var dir = '';
  var isOnAir = false;
  var currentSeq = 0;
  var currentSec = 0;
  var storedSec = 0;
  var filePrefix = '';
};
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
    console.log('mkdir:' + channelStatus.dir + ' err=' + err);
  });

  return channelStatus;
}

function getChannelStatus(name) {
  var channelStatus = channels[name];
  return channelStatus;
}



// ------------ application ------------

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
  //var streamUuid = uuid.v1() + '--' +  uuid.v4(); 
  var streamUuid = uuid.v1() + '--' + channelStatus.storedSec;
  console.log('get /watch/' + channel + ' uuid=' + streamUuid);
  res.render('watch', { title: 'watch ' + channel, channel: channel, uuid: streamUuid, server: serverURL });
});

app.get('/stream/:channel', function (req, res) { // this way is ok , with combined-stream
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

      var listners = readStream.listeners('end');
      var count = listners.length;

      console.log('-pipe readStream to res : ' + filename + ' -');
      readStream.pipe(res);

      listners = readStream.listeners('end');
      var listner = listners[count];
      readStream.removeListener('end', listner);
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
  //console.log('POSTED:: ', req.headers);
  //console.log('POSTED:: ');
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
    //console.log('receive channel=' + channel + ' index=' + postIndex + ' sec=' + postSec + ' filename=' + filename);

    var buf = new Buffer(fields.blob_base64[0], 'base64'); // decode
    var clusterPos = 0;
    // if(postIndex == 0){
    //   clusterPos = findCluster(buf, 0, buf.length);
    // }
    if (clusterPos > 0) {
      var headerFile = channelStatus.filePrefix + '.webh';
      writeWebmHeader(headerFile, buf, clusterPos);
    }
    else if (clusterPos < 0) {
      console.error('cluster NOT found. BAD blob');
      res.writeHead(500, { 'content-type': 'text/plain' });
      res.end('Server Error');
      return;
    }

    writeWebmCluster(filename, buf, clusterPos, buf.length);
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

app.listen(port);
console.log('server listen start port ' + port);

function writeWebmHeader(filename, buf, endPosition) {
  console.log('writeWebmHeader()');
  var wstream = fs.createWriteStream(filename);
  var bufToWrite = buf.slice(0, endPosition);
  wstream.write(bufToWrite);
  wstream.end();
}

function writeWebmCluster(filename, buf, startPosition, endPosition) {
  console.log('writeWebmCluster()');
  var wstream = fs.createWriteStream(filename);
  var bufToWrite = buf.slice(startPosition, endPosition);
  wstream.write(bufToWrite);
  wstream.end();
}


// ============
var tagDictionary = setupTagDictionary();


function findCluster(buffer, position, maxLength) {
  while (position < maxLength) {
    // -- ADDRESS --
    //console.log('ADDR 0x' + addrHex(position));

    // -- TAG --
    var result = scanWebmTag(buffer, position);
    if (!result) {
      console.error('TAG scan end. Cluster not found');
      break;
    }
    var tagName = tagDictionary[result.str];
    if (tagName === 'Cluster') {
      console.log('find Clunster: pos=' + position);
      return position;
    }

    //console.log('tag=' + tagName + ' , continue reading');
    position += result.size;

    // --- DATA SIZE ---
    result = scanDataSize(buffer, position);
    if (!result) {
      console.error('DATA SIZE scan end');
      break;
    }
    position += result.size;

    // ---- DATA ----
    if (result.value >= 0) {
      position += result.value;
    }
    else {
      console.log(' DATA SIZE ffffffff.. cont.');
    }

    // -- check EOF ---
    if (position == maxLength) {
      console.log(' reached END---');
      break;
    }
    else if (position > maxLength) {
      console.log(' --OVER END---' + ' pos=' + position + ' max=' + maxLength);
      break;
    }
  }

  return -1; // ERROR
}


function addrHex(pos) {
  var str = '00000000' + pos.toString(16);
  var len = str.length;
  return str.substring(len - 8).toUpperCase();
}

function byteToHex(b) {
  var str = '0' + b.toString(16);
  var len = str.length;
  return str.substring(len - 2).toUpperCase();
}

function spacer(level) {
  var str = '          ';
  str = str.substring(0, level);
  return str;
}

function setupTagDictionary() {
  // T - Element Type - The form of data the element contains.
  //   m: Master, u: unsigned int, i: signed integer, s: string, 8: UTF-8 string, b: binary, f: float, d: date

  var tagDict = new Array();
  tagDict['[1A][45][DF][A3]'] = 'EBML'; // EBML 0	[1A][45][DF][A3] m
  tagDict['[42][86]'] = 'EBMLVersion'; //EBMLVersion	1	[42][86] u
  tagDict['[42][F7]'] = 'EBMLReadVersion'; // EBMLReadVersion	1	[42][F7] u
  tagDict['[42][F2]'] = 'EBMLMaxIDLength'; // EBMLMaxIDLength	1	[42][F2] u
  tagDict['[42][F3]'] = 'EBMLMaxSizeLength'; // EBMLMaxSizeLength	1	[42][F3] u
  tagDict['[42][82]'] = 'DocType'; // DocType	1	[42][82] s
  tagDict['[42][87]'] = 'DocTypeVersion'; // DocTypeVersion	1	[42][87] u
  tagDict['[42][85]'] = 'DocTypeReadVersion'; // DocTypeReadVersion	1	[42][85] u

  tagDict['[EC]'] = 'Void'; // Void	g	[EC] b
  tagDict['[BF]'] = 'CRC-32'; // CRC-32	g	[BF] b
  tagDict['[1C][53][BB][6B]'] = 'Cues'; // Cues	1	[1C][53][BB][6B] m

  tagDict['[18][53][80][67]'] = 'Segment';  // Segment	0	[18][53][80][67] m
  tagDict['[11][4D][9B][74]'] = 'SeekHead'; // SeekHead	1	[11][4D][9B][74] m
  tagDict['[4D][BB]'] = 'Seek'; // Seek	2	[4D][BB] m
  tagDict['[53][AB]'] = 'SeekID'; // SeekID	3	[53][AB] b
  tagDict['[53][AC]'] = 'SeekPosition'; // SeekPosition	3	[53][AC] u

  tagDict['[15][49][A9][66]'] = 'Info'; // Info	1	[15][49][A9][66] m 

  tagDict['[16][54][AE][6B]'] = 'Tracks'; // Tracks	1	[16][54][AE][6B] m

  tagDict['[1F][43][B6][75]'] = 'Cluster'; // Cluster	1	[1F][43][B6][75] m
  tagDict['[E7]'] = 'Timecode'; // Timecode	2	[E7] u
  tagDict['[A3]'] = 'SimpleBlock'; // SimpleBlock	2	[A3] b

  return tagDict;
}

function scanWebmTag(buff, pos) {
  var tagSize = 0;
  //var followByte;
  var firstByte = buff.readUInt8(pos);
  var firstMask = 0xff;

  if (firstByte & 0x80) {
    tagSize = 1;
  }
  else if (firstByte & 0x40) {
    tagSize = 2;
  }
  else if (firstByte & 0x20) {
    tagSize = 3;
  }
  else if (firstByte & 0x10) {
    tagSize = 4;
  }
  else {
    console.log('ERROR: bad TAG byte');
    return null;
  }

  var decodeRes = decodeBytes(buff, pos, tagSize, firstByte, firstMask);
  return decodeRes;
}


function scanDataSize(buff, pos) {
  var dataSizeSize = 0;
  //var followByte;
  var firstByte = buff.readUInt8(pos);
  var firstMask;

  if (firstByte & 0x80) {
    dataSizeSize = 1;
    firstMask = 0x7f;
  }
  else if (firstByte & 0x40) {
    dataSizeSize = 2;
    firstMask = 0x3f;
  }
  else if (firstByte & 0x20) {
    dataSizeSize = 3;
    firstMask = 0x1f;
  }
  else if (firstByte & 0x10) {
    dataSizeSize = 4;
    firstMask = 0x0f;
  }
  else if (firstByte & 0x08) {
    dataSizeSize = 5;
    firstMask = 0x07;
  }
  else if (firstByte & 0x04) {
    dataSizeSize = 6;
    firstMask = 0x03;
  }
  else if (firstByte & 0x02) {
    dataSizeSize = 7;
    firstMask = 0x01;
  }
  else if (firstByte & 0x01) {
    dataSizeSize = 8;
    firstMask = 0x00;
  }
  else {
    console.log('ERROR: bad DATA byte');
    return null;
  }

  var decodeRes = decodeBytes(buff, pos, dataSizeSize, firstByte, firstMask);
  return decodeRes;
}

function scanDataValueU(buff, pos, size) {
  var uVal = 0;
  var byteVal;
  for (var i = 0; i < size; i++) {
    byteVal = buff.readUInt8(pos + i);
    //console.log('scanDataValueU pos=' + pos + ' i=' + i + ' byte=' + byteToHex(byteVal));
    uVal = (uVal << 8) + byteVal;
  }

  return uVal;
}

function decodeBytes(buff, pos, size, firstByte, firstMask) {
  var value = firstByte & firstMask;
  var str = ('[' + byteToHex(firstByte) + ']');
  var followByte;
  for (var i = 1; i < size; i++) {
    followByte = buff.readUInt8(pos + i);
    str += '[';
    str += byteToHex(followByte);
    str += ']';
    value = (value << 8) + followByte;
  }

  var res = {};
  res.str = str;
  res.size = size;
  res.value = value;

  return res;
}
