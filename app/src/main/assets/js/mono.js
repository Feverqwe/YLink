var mono = (typeof mono !== 'undefined') ? mono : undefined;

(function(base, factory) {
  "use strict";
  if (mono && mono.isLoaded) {
    return;
  }

  var _mono = mono;
  var fn = function(addon) {
    return factory(_mono, addon);
  };

  if (typeof window !== "undefined") {
    mono = base(fn);
    return;
  }
}(function base(factory) {
  if (['interactive', 'complete'].indexOf(document.readyState) !== -1) {
    return factory();
  }

  var base = {
    isLoaded: true,
    onReadyStack: [],
    onReady: function() {
      base.onReadyStack.push([this, arguments]);
    }
  };

  var onLoad = function() {
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
  var browserApi = function() {
    "use strict";
    var emptyFn = function() {};

    /**
     * @param {Function} fn
     * @returns {Function}
     */
    var onceFn = function(fn) {
      return function(msg) {
        if (fn) {
          fn(msg);
          fn = null;
        }
      };
    };

    /**
     * @returns {Number}
     */
    var getTime = function() {
      return parseInt(Date.now() / 1000);
    };

    var msgTools = {
      id: 0,
      idPrefix: Math.floor(Math.random() * 1000),
      /**
       * @returns {String}
       */
      getId: function() {
        return this.idPrefix + '_' + (++this.id);
      },
      /**
       * @typedef {Object} Source
       * @property {Function} postMessage
       */
      /**
       * @param {string} id
       * @param {string} pageId
       * @returns {Function}
       */
      asyncSendResponse: function(id, pageId) {
        return function(message) {
          message.responseId = id;

          monoBridge.sendMessage(JSON.stringify(message));
        };
      },
      listenerList: [],
      /**
       * @typedef {Object} MonoMsg
       * @property {boolean} mono
       * @property {string} [hook]
       * @property {string} idPrefix
       * @property {string} [callbackId]
       * @property {string} [responseId]
       * @property {string} from
       * @property {boolean} hasCallback
       * @property {*} data
       */
      /**
       * @param {Object} event
       * @param {MonoMsg} event.detail
       */
      listener: function(event) {
        var _this = msgTools;
        if (event.detail[0] !== '<') {
          return;
        }

        var sendResponse = null;
        var message = JSON.parse(event.detail.substr(1));
        if (message && message.mono && !message.responseId && message.idPrefix !== _this.idPrefix) {
          if (!message.hasCallback) {
            sendResponse = emptyFn;
          } else {
            sendResponse = _this.asyncSendResponse(message.callbackId, message.from);
          }

          var responseFn = onceFn(function(msg) {
            var message = _this.wrap(msg);
            sendResponse(message);
            sendResponse = null;
          });

          _this.listenerList.forEach(function(fn) {
            if (message.hook === fn.hook) {
              fn(message.data, responseFn);
            }
          });
        }
      },
      async: {},
      /**
       * @param {Object} event
       * @param {MonoMsg} event.detail
       */
      asyncListener: function(event) {
        var _this = msgTools;
        if (event.detail[0] !== '<') {
          return;
        }

        var message = JSON.parse(event.detail.substr(1));
        if (message && message.mono && message.responseId && message.idPrefix !== _this.idPrefix) {
          var item = _this.async[message.responseId];
          var fn = item && item.fn;
          if (fn) {
            delete _this.async[message.responseId];
            if (!Object.keys(_this.async).length) {
              _this.removeMessageListener(_this.asyncListener);
            }

            fn(message.data);
          }
        }

        _this.gc();
      },
      /**
       * @param {*} [msg]
       * @returns {MonoMsg}
       */
      wrap: function(msg) {
        return {
          mono: true,
          data: msg,
          idPrefix: this.idPrefix
        };
      },
      /**
       * @param {string} id
       * @param {Function} responseCallback
       */
      wait: function(id, responseCallback) {
        this.async[id] = {
          fn: responseCallback,
          time: getTime()
        };

        this.addMessageListener(this.asyncListener);

        this.gc();
      },
      messageListeners: [],
      /**
       * @param {Function} callback
       */
      addMessageListener: function(callback) {
        var listeners = this.messageListeners;
        if (listeners.indexOf(callback) === -1) {
          window.addEventListener('monoMessage', callback);
          listeners.push(callback);
        }
      },
      /**
       * @param {Function} callback
       */
      removeMessageListener: function(callback) {
        var listeners = this.messageListeners;
        var pos = listeners.indexOf(callback);
        if (pos !== -1) {
          window.removeEventListener('monoMessage', callback);
          listeners.splice(pos, 1);
        }
      },
      gcTimeout: 0,
      gc: function() {
        var now = getTime();
        if (this.gcTimeout < now) {
          var expire = 180;
          var async = this.async;
          this.gcTimeout = now + expire;
          Object.keys(async).forEach(function(responseId) {
            if (async [responseId].time + expire < now) {
              delete async [responseId];
            }
          });

          if (!Object.keys(async).length) {
            this.removeMessageListener(this.asyncListener);
          }
        }
      }
    };

    var api = {
      isApp: true,
      /**
       * @param {*} msg
       * @param {Function} [responseCallback]
       * @param {String} [hook]
       */
      sendMessage: function(msg, responseCallback, hook) {
        var message = msgTools.wrap(msg);
        hook && (message.hook = hook);

        var hasCallback = !!responseCallback;
        message.hasCallback = hasCallback;
        if (hasCallback) {
          message.callbackId = msgTools.getId();
          msgTools.wait(message.callbackId, responseCallback);
        }

        monoBridge.sendMessage(JSON.stringify(message));
      },
      onMessage: {
        /**
         * @param {Function} callback
         * @param {Object} [details]
         */
        addListener: function(callback, details) {
          details = details || {};
          details.hook && (callback.hook = details.hook);

          if (msgTools.listenerList.indexOf(callback) === -1) {
            msgTools.listenerList.push(callback);
          }

          msgTools.addMessageListener(msgTools.listener);
        },
        /**
         * @param {Function} callback
         */
        removeListener: function(callback) {
          var pos = msgTools.listenerList.indexOf(callback);
          if (pos !== -1) {
            msgTools.listenerList.splice(pos, 1);
          }

          if (!msgTools.listenerList.length) {
            msgTools.removeMessageListener(msgTools.listener);
          }
        }
      }
    };

    var initLocalStorage = function() {
      var wrapLocalStorage = function() {
        var readItem = function(value) {
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

        var writeItem = function(value) {
          return JSON.stringify({
            w: value
          });
        };

        var storage = {
          /**
           * @param {String|[String]|Object|null|undefined} [keys]
           * @param {Function} callback
           */
          get: function(keys, callback) {
            var items = {};
            var defaultItems = {};

            var _keys = [];
            if (keys === undefined || keys === null) {
              _keys = Object.keys(localStorage);
            } else
            if (Array.isArray(keys)) {
              _keys = keys;
            } else
            if (typeof keys === 'object') {
              _keys = Object.keys(keys);
              defaultItems = keys;
            } else {
              _keys = [keys];
            }

            _keys.forEach(function(key) {
              var value = readItem(localStorage.getItem(key));
              if (value === undefined) {
                value = defaultItems[key];
              }
              if (value !== undefined) {
                items[key] = value;
              }
            });

            setTimeout(function() {
              callback(items);
            }, 0);
          },
          /**
           * @param {Object} items
           * @param {Function} [callback]
           */
          set: function(items, callback) {
            Object.keys(items).forEach(function(key) {
              if (items[key] !== undefined) {
                localStorage.setItem(key, writeItem(items[key]));
              }
            });

            callback && setTimeout(function() {
              callback();
            }, 0);
          },
          /**
           * @param {String|[String]} [keys]
           * @param {Function} [callback]
           */
          remove: function(keys, callback) {
            var _keys = [];
            if (Array.isArray(keys)) {
              _keys = keys;
            } else {
              _keys = [keys];
            }

            _keys.forEach(function(key) {
              localStorage.removeItem(key);
            });

            callback && setTimeout(function() {
              callback();
            }, 0);
          },
          /**
           * @param {Function} [callback]
           */
          clear: function(callback) {
            localStorage.clear();

            callback && setTimeout(function() {
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
  mono.onReady = function(cb) {
    return cb();
  };

  /**
   * @param {string} head
   * @returns {Object}
   */
  mono.parseXhrHeader = function(head) {
    head = head.split(/\r?\n/);
    var headers = {};
    head.forEach(function(line) {
      "use strict";
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
  mono.request = function(obj, origCb) {
    "use strict";
    var result = {};
    var cb = function(e, body) {
      cb = null;
      if (request.timeoutTimer) {
        clearTimeout(request.timeoutTimer);
      }

      var err = null;
      if (e) {
        err = String(e.message || e) || 'ERROR';
      }
      origCb && origCb(err, getResponse(body), body);
    };

    var getResponse = function(body) {
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

    if (obj.cache === false && ['GET','HEAD'].indexOf(method) !== -1) {
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
      request.timeoutTimer = setTimeout(function() {
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

    var readyCallback = xhr.onload = function() {
      var status = xhrSuccessStatus[xhr.status] || xhr.status;
      try {
        if (status >= 200 && status < 300 || status === 304) {
          var body = xhr.responseText;
          if (request.json) {
            body = JSON.parse(body);
          } else
          if (request.xml) {
            body = (new DOMParser()).parseFromString(body, "text/xml");
          } else
          if (typeof body !== 'string') {
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

    var errorCallback = xhr.onerror = function() {
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
      setTimeout(function() {
        cb && cb(e);
      });
    }

    result.abort = function() {
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
    "use strict";
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

  mono.param = function(obj) {
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
      itemsList.push(encodeURIComponent(key)+'='+encodeURIComponent(obj[key]));
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
  mono.parseUrl = function(url, details) {
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

  //@insert

  return mono;
}));