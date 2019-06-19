function bindVideo() {
    var video = document.getElementById('video');

    if (Hls.isSupported()) {
        var hls = new Hls();

        hls.attachMedia(video);
        hls.on(Hls.Events.MEDIA_ATTACHED, function () {
            console.log("video and hls.js are now bound together!")
        })
    } else {
        console.log("ERROR: Could not bind video and hls.js!")
    }
}