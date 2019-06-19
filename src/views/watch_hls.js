function bindVideo() {

    if (Hls.isSupported()) {
        var video = document.getElementById('video');
        var hls = new Hls();

        hls.attachMedia(video);

        hls.on(Hls.Events.MEDIA_ATTACHED, function () {
            console.log("video and hls.js are now bound together!")
            hls.loadSource("https://video-dev.github.io/streams/x36xhzz/x36xhzz.m3u8"); //SOURCE_HERE needs to be replaced with actual source

            hls.on(Hls.Events.MANIFEST_PARSED, function (event, data) {
                console.log("Manifest loaded, found " + data.levels.length + " quality level");
            });
        });

        video.play();

    } else {
        console.log("ERROR: Could not bind video and hls.js!")
    }
}