var mono = (typeof mono !== 'undefined') ? mono : undefined;

(function (base, factory) {
    "use strict";
    if (mono && mono.isLoaded) {
        return;
    }

    var _mono = mono;
    var fn = function (addon) {
        return factory(_mono, addon);
    };

    if (typeof window !== "undefined") {
        mono = base(fn);
        return;
    }
}(function base(factory) {
    "use strict";
    if (['interactive', 'complete'].indexOf(document.readyState) !== -1) {
        return factory();
    }

    var base = {
        isLoaded: true,
        onReadyStack: [],
        onReady: function () {
            base.onReadyStack.push([this, arguments]);
        }
    };

    var onLoad = function () {
        document.removeEventListener('DOMContentLoaded', onLoad, false);
        window.removeEventListener('load', onLoad, false);

        mono = factory();

        var item;
        while (item = base.onReadyStack.shift()) {
            mono.onReady.apply(item[0], item[1]);
        }
    };

    document.addEventListener('DOMContentLoaded', onLoad, false);
    window.addEventListener('load', onLoad, false);

    return base;
}, function initMono(_mono, _addon) {
    "use strict";
    var browserApi = function () {
        var Transport = (function () {
            var emptyFn = function () {
            };
            var onceFn = function (cb) {
                return function () {
                    if (cb) {
                        cb.apply(null, arguments);
                        cb = null;
                    }
                };
            };
            var Transport = function (transport) {
                var callbackId = 0;
                var callbackIdCallback = {};

                this.onMessage = function (cb) {
                    transport.onMessage(function (msg) {
                        if (msg.responseId) {
                            return callbackIdCallback[msg.responseId](msg.message);
                        }

                        var response;
                        if (msg.callbackId) {
                            response = onceFn(function (message) {
                                transport.sendMessage({
                                    responseId: msg.callbackId,
                                    message: message
                                });
                            });
                        } else {
                            response = emptyFn;
                        }

                        var result = cb(msg.message, response);
                        if (result !== true) {
                            response();
                        }
                    });
                };
                this.sendMessage = function (message, callback) {
                    var msg = {
                        message: message
                    };
                    if (callback) {
                        msg.callbackId = ++callbackId;
                        callbackIdCallback[msg.callbackId] = function (message) {
                            delete callbackIdCallback[msg.callbackId];
                            callback(message);
                        };
                    }
                    transport.sendMessage(msg);
                };
            };
            return Transport;
        })();

        var transport = new Transport({
            sendMessage: function (msg) {
                parent.postMessage(JSON.stringify(msg), '*');
            },
            onMessage: function (cb) {
                window.onmessage = function (e) {
                    cb(e.data);
                };
            }
        });

        var api = {
            isApp: true,
            /**
             * @param {*} msg
             * @param {Function} [responseCallback]
             */
            sendMessage: transport.sendMessage.bind(transport),
            onMessage: transport.onMessage.bind(transport)
        };

        var initLocalStorage = function () {
            var wrapLocalStorage = function () {
                var readItem = function (value) {
                    var result = undefined;
                    if (typeof value === 'string') {
                        try {
                            result = JSON.parse(value).w;
                        } catch (e) {
                            console.error('localStorage item read error!', e, value);
                        }
                    }
                    return result;
                };

                var writeItem = function (value) {
                    return JSON.stringify({
                        w: value
                    });
                };

                var storage = {
                    /**
                     * @param {String|[String]|Object|null|undefined} [keys]
                     * @param {Function} callback
                     */
                    get: function (keys, callback) {
                        var items = {};
                        var defaultItems = {};

                        var _keys = [];
                        if (keys === undefined || keys === null) {
                            _keys = Object.keys(localStorage);
                        } else if (Array.isArray(keys)) {
                            _keys = keys;
                        } else if (typeof keys === 'object') {
                            _keys = Object.keys(keys);
                            defaultItems = keys;
                        } else {
                            _keys = [keys];
                        }

                        _keys.forEach(function (key) {
                            var value = readItem(localStorage.getItem(key));
                            if (value === undefined) {
                                value = defaultItems[key];
                            }
                            if (value !== undefined) {
                                items[key] = value;
                            }
                        });

                        setTimeout(function () {
                            callback(items);
                        }, 0);
                    },
                    /**
                     * @param {Object} items
                     * @param {Function} [callback]
                     */
                    set: function (items, callback) {
                        Object.keys(items).forEach(function (key) {
                            if (items[key] !== undefined) {
                                localStorage.setItem(key, writeItem(items[key]));
                            }
                        });

                        callback && setTimeout(function () {
                            callback();
                        }, 0);
                    },
                    /**
                     * @param {String|[String]} [keys]
                     * @param {Function} [callback]
                     */
                    remove: function (keys, callback) {
                        var _keys = [];
                        if (Array.isArray(keys)) {
                            _keys = keys;
                        } else {
                            _keys = [keys];
                        }

                        _keys.forEach(function (key) {
                            localStorage.removeItem(key);
                        });

                        callback && setTimeout(function () {
                            callback();
                        }, 0);
                    },
                    /**
                     * @param {Function} [callback]
                     */
                    clear: function (callback) {
                        localStorage.clear();

                        callback && setTimeout(function () {
                            callback();
                        }, 0);
                    }
                };

                return storage;
            };

            return wrapLocalStorage();
        };
        api.storage = initLocalStorage();
        return {
            api: api
        };
    };

    var mono = browserApi(_addon).api;
    mono.isLoaded = true;
    mono.onReady = function (cb) {
        return cb();
    };

    /**
     * @param {string} head
     * @returns {Object}
     */
    mono.parseXhrHeader = function (head) {
        var lines = head.split(/\r?\n/);
        var headers = {};
        lines.forEach(function (line) {
            var sep = line.indexOf(':');
            if (sep === -1) {
                return;
            }
            var key = line.substr(0, sep).trim().toLowerCase();
            var value = line.substr(sep + 1).trim();
            headers[key] = value;
        });
        return headers;
    };

    /**
     * @typedef {Object|string} requestDetails
     * @property {string} url
     * @property {string} [method] GET|POST
     * @property {string} [type] GET|POST
     * @property {string} [data]
     * @property {boolean} [cache]
     * @property {Object} [headers]
     * @property {string} [contentType]
     * @property {boolean} [json]
     * @property {boolean} [xml]
     * @property {number} [timeout]
     * @property {string} [mimeType]
     * @property {boolean} [withCredentials]
     * @property {boolean} [localXHR]
     */
    /**
     * @callback requestResponse
     * @param {string|null} err
     * @param {Object} res
     * @param {string|Object|Array} data
     */
    /**
     * @param {requestDetails} obj
     * @param {requestResponse} [origCb]
     * @returns {{abort: function}}
     */
    mono.request = function (obj, origCb) {
        var result = {};
        var cb = function (e, body) {
            cb = null;
            if (request.timeoutTimer) {
                clearTimeout(request.timeoutTimer);
            }

            var err = null;
            if (e) {
                err = e || 'ERROR';
            }
            origCb && origCb(err, getResponse(body), body);
        };

        var getResponse = function (body) {
            var response = {};

            response.statusCode = xhr.status;
            response.statusText = xhr.statusText;

            var headers = null;
            var allHeaders = xhr.getAllResponseHeaders();
            if (typeof allHeaders === 'string') {
                headers = mono.parseXhrHeader(allHeaders);
            }
            response.headers = headers || {};

            response.body = body;

            return response;
        };

        if (typeof obj !== 'object') {
            obj = {url: obj};
        }

        var url = obj.url;

        var method = obj.method || obj.type || 'GET';
        method = method.toUpperCase();

        var data = obj.data;
        if (typeof data !== "string") {
            data = mono.param(data);
        }

        if (data && method === 'GET') {
            url += (/\?/.test(url) ? '&' : '?') + data;
            data = undefined;
        }

        if (obj.cache === false && ['GET', 'HEAD'].indexOf(method) !== -1) {
            url += (/\?/.test(url) ? '&' : '?') + '_=' + Date.now();
        }

        obj.headers = obj.headers || {};

        if (data) {
            obj.headers["Content-Type"] = obj.contentType || obj.headers["Content-Type"] || 'application/x-www-form-urlencoded; charset=UTF-8';
        }

        var request = {};
        request.url = url;
        request.method = method;

        data && (request.data = data);
        obj.json && (request.json = true);
        obj.xml && (request.xml = true);
        obj.timeout && (request.timeout = obj.timeout);
        obj.mimeType && (request.mimeType = obj.mimeType);
        obj.withCredentials && (request.withCredentials = true);
        Object.keys(obj.headers).length && (request.headers = obj.headers);

        if (request.timeout > 0) {
            request.timeoutTimer = setTimeout(function () {
                cb && cb(new Error('ETIMEDOUT'));
                xhr.abort();
            }, request.timeout);
        }

        var xhrSuccessStatus = {
            0: 200,
            1223: 204
        };

        var xhr = new XMLHttpRequest();
        xhr.open(request.method, request.url, true);

        if (request.mimeType) {
            xhr.overrideMimeType(request.mimeType);
        }
        if (request.withCredentials) {
            xhr.withCredentials = true;
        }
        for (var key in request.headers) {
            xhr.setRequestHeader(key, request.headers[key]);
        }

        var readyCallback = xhr.onload = function () {
            var status = xhrSuccessStatus[xhr.status] || xhr.status;
            try {
                if (status >= 200 && status < 300 || status === 304) {
                    var body = xhr.responseText;
                    if (request.json) {
                        body = JSON.parse(body);
                    } else if (request.xml) {
                        body = (new DOMParser()).parseFromString(body, "text/xml");
                    } else if (typeof body !== 'string') {
                        console.error('Response is not string!', body);
                        throw new Error('Response is not string!');
                    }
                    return cb && cb(null, body);
                }
                throw new Error(xhr.status + ' ' + xhr.statusText);
            } catch (e) {
                return cb && cb(e);
            }
        };

        var errorCallback = xhr.onerror = function () {
            cb && cb(new Error(xhr.status + ' ' + xhr.statusText));
        };

        var stateChange = null;
        if (xhr.onabort !== undefined) {
            xhr.onabort = errorCallback;
        } else {
            stateChange = function () {
                if (xhr.readyState === 4) {
                    cb && setTimeout(function () {
                        return errorCallback();
                    });
                }
            };
        }

        if (stateChange) {
            xhr.onreadystatechange = stateChange;
        }

        try {
            xhr.send(request.data || null);
        } catch (e) {
            setTimeout(function () {
                cb && cb(e);
            });
        }

        result.abort = function () {
            cb = null;
            xhr.abort();
        };

        return result;
    };

    /**
     * @param {requestDetails} obj
     * @returns {Promise}
     */
    mono.requestPromise = function (obj) {
        return new Promise(function (resolve, reject) {
            var always = function (err, resp, data) {
                if (err) {
                    reject(err);
                } else {
                    resolve(resp, data);
                }
            };

            try {
                mono.request(obj, always);
            } catch (e) {
                reject(e);
            }
        });
    };

    mono.param = function (obj) {
        if (typeof obj === 'string') {
            return obj;
        }
        var itemsList = [];
        for (var key in obj) {
            if (!obj.hasOwnProperty(key)) {
                continue;
            }
            if (obj[key] === undefined || obj[key] === null) {
                obj[key] = '';
            }
            itemsList.push(encodeURIComponent(key) + '=' + encodeURIComponent(obj[key]));
        }
        return itemsList.join('&');
    };

    /**
     * @param {string} url
     * @param {Object} [details]
     * @param {boolean} [details.params] Input params only [false]
     * @param {string} [details.sep] Separator [&]
     * @param {boolean} [details.noDecode] Disable decode keys [false]
     * @returns {{}}
     */
    mono.parseUrl = function (url, details) {
        details = details || {};
        var query = null;
        if (!details.params && /\?/.test(url)) {
            query = url.match(/[^\?]+\?(.+)/)[1];
        } else {
            query = url;
        }
        var separator = details.sep || '&';
        var dblParamList = query.split(separator);
        var params = {};
        for (var i = 0, len = dblParamList.length; i < len; i++) {
            var item = dblParamList[i];
            var keyValue = item.split('=');
            var key = keyValue[0];
            var value = keyValue[1] || '';
            if (!details.noDecode) {
                try {
                    key = decodeURIComponent(key);
                } catch (err) {
                    key = unescape(key);
                }
                try {
                    params[key] = decodeURIComponent(value);
                } catch (err) {
                    params[key] = unescape(value);
                }
            } else {
                params[key] = value;
            }
        }
        return params;
    };

    mono.extend = function () {
        var obj = arguments[0];
        for (var i = 1, len = arguments.length; i < len; i++) {
            var item = arguments[i];
            for (var key in item) {
                if (item[key] !== undefined) {
                    obj[key] = item[key];
                }
            }
        }
        return obj;
    };

    //@insert

    return mono;
}));