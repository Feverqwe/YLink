mono.onReady(function() {
    mono.onMessage.addListener(function(msg, response) {
        console.log('myApp msg: ' + JSON.stringify(msg));
        if (msg.action === 'getVideoLink') {
            // response({action: 'test ok'});
        }
    });
    mono.sendMessage({
        action: 'ready'
    });
});