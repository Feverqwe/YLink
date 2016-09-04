var debug = function () {
    var args = [].slice.call(arguments);
    args.unshift('myApp');
    console.log.apply(console, [args.join(', ')]);
};

var main = {
    getYtLinks: (function () {
        var dy = {
            auto: 0,
            tiny: 144,
            light: 144,
            small: 240,
            medium: 360,
            large: 480,
            hd720: 720,
            hd1080: 1080,
            hd1440: 1440,
            hd2160: 2160,
            hd2880: 2880,
            highres: 4320
        };
        var getQuality = function (quality) {
            return dy[quality];
        };

        var getDashQuality = function(a, b) {
            var qualityList = {
                144: 144,
                240: 240,
                360: 360,
                480: 480,
                720: 720,
                1080: 1080,
                1440: 1440,
                '4K': 2160,
                '5K': 2880,
                '8K': 4320
            };

            var quality;
            var g = Math.max(a, b);
            a = Math.min(a, b);
            for (var qualityName in qualityList) {
                var value = qualityList[qualityName];
                if (g >= Math.floor(16 * value / 9) || a >= value) {
                    quality = qualityName;
                } else {
                    return quality;
                }
            }
            return quality;
        };

        var readFmt = function (links, fmt) {
            fmt.forEach(function(item) {
                if (item.stream) {
                    return;
                }

                if (!item.url) {
                    return;
                }

                var url = item.url;
                if(!/(\?|&)s(ig(nature)?)?=/i.test(url)) {
                    if(item.sig) {
                        url += '&signature=' + item.sig;
                    } else
                    if(item.signature) {
                        url += '&signature=' + item.signature;
                    } else
                    if(item.s) {
                        debug('Is protected video!');
                        return;
                    }
                }

                url = url.replace(/(\?|&)sig=/i, '$1signature=').replace(/\\u0026/ig, '&');

                var itag = url.match(/(?:\?|&)itag=(\d+)/i);
                itag = itag && itag[1] || item.itag;
                if (!itag) {
                    debug("iTag is not found!");
                    return;
                }

                if (item.projection_type) {
                    debug("Skip projection!");
                    return;
                }

                var linkItem = {};

                linkItem.itag = itag;

                if (item.fps) {
                    linkItem.fps = item.fps;
                }

                if (item.size && /^\d+x\d+$/.test(item.size)) {
                    var wh = item.size.split('x');
                    linkItem.quality = getDashQuality(wh[0], wh[1]);
                }

                if (item.bitrate) {
                    linkItem.bitrate = parseInt(item.bitrate);
                }

                if (item.type) {
                    linkItem.type = item.type;
                    var codecs = item.type.match(/codecs="([^"]+)"/);
                    if (codecs) {
                        linkItem.codecs = codecs[1];
                    }
                    var mime = /^(\w+\/\w+)/.exec(item.type);
                    if (mime) {
                        linkItem.mime = mime[1];
                    }
                }

                linkItem.quality = getQuality(item.quality);
                if (!linkItem.quality) {
                    debug("Empty quality!", item);
                }

                linkItem.url = url;

                links.push(linkItem);
            });
        };
        return function (config) {
            var _this = this;
            return Promise.try(function () {
                var fmtMap = config.fmt_url_map || config.url_encoded_fmt_stream_map || [];
                var adaptiveFmts = config.adaptive_fmts || [];

                var links = [];
                fmtMap && readFmt(links, fmtMap);
                adaptiveFmts && readFmt(links, adaptiveFmts);

                return links;
            });
        };
    })(),
    getYtMeta: (function () {
        var videoInfoToObj = function(data) {
            "use strict";
            var decodeParams = function(data) {
                ['url_encoded_fmt_stream_map', 'adaptive_fmts', 'fmt_url_map'].forEach(function(key) {
                    if (data[key]) {
                        data[key] = data[key].split(',').map(function(item) {
                            return dataStrToObj(item);
                        });
                    }
                });
            };

            var dataStrToObj = function(data) {
                data = mono.parseUrl(data, {params: true});
                decodeParams(data);
                return data;
            };

            return dataStrToObj(data);
        };

        return function (id) {
            var _this = this;
            var url = 'https://www.youtube.com/get_video_info?' + mono.param({
                    video_id: id,
                    eurl: 'https://www.youtube.com/watch?v=' + id,
                    el: 'info'
                });
            return mono.requestPromise({
                url: url
            }).then(function (response) {
                return videoInfoToObj(response.body);
            });
        };
    })(),
    getTwitchVideoUrl: (function () {
        var getToken = function (info, type) {
            var url = 'https://api.twitch.tv';
            if (type === 'live') {
                url += '/api/channels/'+info.channel;
            } else {
                url += '/api/vods/' + info.id;
            }
            url += '/access_token.json';

            return mono.requestPromise({
                url: url,
                json: true
            }).then(function (response) {
                var json = response.body;
                return {
                    sig: json.sig,
                    token: json.token
                }
            });
        };
        var getHlsStreams = function (info, type, _params) {
            var url = 'http://usher.twitch.tv';
            if (type === 'live') {
                url += '/api/channel/hls/' + info.channel + '.m3u8';
            } else {
                url += '/vod/' + info.id;
            }

            var params = {
                player: 'twitchweb',
                p: parseInt(Math.random() * 1000000),
                type: 'any',
                allow_source: true,
                allow_audio_only: true,
                allow_spectre: false
            };
            mono.extend(params, _params);

            url += '?' + mono.param(params);

            return url;
        };
        return function (info) {
            var promise = null;
            if (info.id) {
                if (info.videoType === 'v') {
                    promise = getToken(info, 'video').then(function (auth) {
                        debug('auth: ' + JSON.stringify(auth));

                        return getHlsStreams(info, 'video', {
                            nauthsig: auth.sig,
                            nauth: auth.token
                        });
                    });
                } else {
                    // todo: implement me!
                    throw new Error("Video type " + info.videoType + " not supported!");
                }
            } else {
                promise = getToken(info, 'live').then(function (auth) {
                    debug('auth: ' + JSON.stringify(auth));

                    return getHlsStreams(info, 'live', {
                        sig: auth.sig,
                        token: auth.token
                    });
                });
            }
            return promise;
        };
    })(),
    getUrlInfo: function (url) {
        var result = {};

        [
            /\/\/(?:[^\/]+\.)?youtu\.be\/([\w\-]+)/,
            /\/\/(?:[^\/]+\.)?youtube\.com\/.+[?&]v=([\w\-]+)/,
            /\/\/(?:[^\/]+\.)?youtube\.com\/(?:.+\/)?(?:v|embed)\/([\w\-]+)/
        ].some(function (re) {
            var m = re.exec(url);
            if (m) {
                result.type = 'youtube';
                result.id = m[1];
                return true;
            }
        });

        [
            /(\/\/(?:[^\/]+\.)?twitch\.tv\/(\w+)(?:\/(v)\/(\d+))?)/
        ].some(function (re) {
            var m = re.exec(url);
            if (m) {
                result.type = 'twitch';
                result.url = m[1];
                result.channel = m[2];
                result.videoType = m[3];
                result.id = m[4];
                return true;
            }
        });

        return result;
    },
    addLinkInHistory: function (info, historyData) {
        var history = {};
        try {
            history = JSON.parse(localStorage.getItem('history')) || {};
        } catch (e) {}

        var now = parseInt(Date.now() / 1000);
        Object.keys(history).forEach(function (key) {
            var item = history[key];
            if (item.expire < now) {
                delete history[key];
            }
        });

        history[JSON.stringify(info)] = {expire: now + 86400, data: historyData};

        localStorage.setItem("history", JSON.stringify(history));

        return Promise.resolve();
    },
    getLinkFromHistory: function (info) {
        var history = {};
        try {
            history = JSON.parse(localStorage.getItem('history')) || {};
        } catch (e) {}

        var now = parseInt(Date.now() / 1000);

        var promise = null;
        var item = history[JSON.stringify(info)];
        if (!item || item.expire < now) {
            promise = Promise.reject();
        } else {
            promise = new Promise(function (resolve, reject) {
                mono.sendMessage({
                    action: 'confirm',
                    message: 'Open link from history?'
                }, function (response) {
                    debug('confirm response', JSON.stringify(response));
                    if (response.result) {
                        resolve();
                    } else {
                        reject();
                    }
                })
            }).then(function () {
                return Promise.resolve(item.data)
            });
        }

        return promise;
    },
    onGetLink: function (info, item, fromHistory) {
        var promise = null;
        if (!fromHistory) {
            promise = this.addLinkInHistory(info, item);
        } else {
            promise = Promise.resolve();
        }

        return promise.then(function () {
            mono.sendMessage({
                action: 'setStatus',
                text: item.quality ? 'Found ' + item.quality : 'Found!'
            });

            mono.sendMessage({
                action: 'openUrl',
                url: item.url,
                mime: item.mime
            });
        });
    },
    service: {
        youtube: function (info) {
            var _this = main;

            return _this.getYtMeta(info.id).then(function (config) {
                return _this.getYtLinks(config).then(function (links) {
                    links.sort(function (a, b) {
                        return a.quality > b.quality ? -1 : 1;
                    });
                    if (!links.length) {
                        throw new Error("Links is not found!");
                    }

                    var item = links[0];

                    return item;
                }).then(function (item) {
                    return _this.onGetLink(info, item);
                });
            });
        },
        twitch: function (info) {
            var _this = main;

            return _this.getTwitchVideoUrl(info).then(function (url) {
                return {
                    url: url,
                    quality: '',
                    mime: 'video/m3u8'
                };
            }).then(function (item) {
                return _this.onGetLink(info, item);
            });
        }
    },
    getVideoLink: function (msg) {
        var _this = this;
        return Promise.try(function () {
            var url = msg.url;
            if (!url) {
                throw new Error("Url is empty!");
            }

            var info = _this.getUrlInfo(url);
            debug('info: ' + JSON.stringify(info));
            if (!info.type) {
                throw new Error("VideoId is not found!");
            }

            return _this.getLinkFromHistory(info).then(function (item) {
                return _this.onGetLink(info, item, true);
            }).catch(function () {
                return _this.service[info.type](info);
            });
        });
    },
    ready: function () {
        var _this = this;
        mono.onMessage.addListener(function(msg, response) {
            debug('msg: ' + JSON.stringify(msg));

            if (_this[msg.action]) {
                _this[msg.action](msg).catch(function (e) {
                    console.error('myApp error! ' + e.message);
                    mono.sendMessage({
                        action: 'setStatus',
                        text: e.message
                    });
                });
            }
        });
        mono.sendMessage({
            action: 'ready'
        });
    },
    prepare: function () {
        var _this = this;
        var script = document.createElement('script');
        script.src = './lib/require.min.js';
        script.addEventListener('load', function () {
            requirejs.config({
                baseUrl: "./lib",
                paths: {
                    bluebird: 'bluebird.min'
                }
            });
            require(['bluebird'], function (_Promise) {
                window.Promise = _Promise;

                _this.ready();
            });
        });
        document.head.appendChild(script);
    }
};

mono.onReady(function() {
    main.prepare();
});