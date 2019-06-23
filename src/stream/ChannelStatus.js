
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

module.exports = ChannelStatus;