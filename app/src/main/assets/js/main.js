mono.onReady(function() {
    mono.onMessage.addListener(function(msg, response) {
        if (msg.action === 'getVideoLink') {
            // response({action: 'test ok'});
        }
    });
    mono.sendMessage({
        action: 'ready'
    });
});