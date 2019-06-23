const ChannelStatus = require('../stream/ChannelStatus');

export default function (name, channels) {
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
