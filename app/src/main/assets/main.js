/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 335:
/***/ ((module) => {

// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.



// If obj.hasOwnProperty has been overridden, then calling
// obj.hasOwnProperty(prop) will break.
// See: https://github.com/joyent/node/issues/1707
function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

module.exports = function(qs, sep, eq, options) {
  sep = sep || '&';
  eq = eq || '=';
  var obj = {};

  if (typeof qs !== 'string' || qs.length === 0) {
    return obj;
  }

  var regexp = /\+/g;
  qs = qs.split(sep);

  var maxKeys = 1000;
  if (options && typeof options.maxKeys === 'number') {
    maxKeys = options.maxKeys;
  }

  var len = qs.length;
  // maxKeys <= 0 means that we should not limit keys count
  if (maxKeys > 0 && len > maxKeys) {
    len = maxKeys;
  }

  for (var i = 0; i < len; ++i) {
    var x = qs[i].replace(regexp, '%20'),
        idx = x.indexOf(eq),
        kstr, vstr, k, v;

    if (idx >= 0) {
      kstr = x.substr(0, idx);
      vstr = x.substr(idx + 1);
    } else {
      kstr = x;
      vstr = '';
    }

    k = decodeURIComponent(kstr);
    v = decodeURIComponent(vstr);

    if (!hasOwnProperty(obj, k)) {
      obj[k] = v;
    } else if (isArray(obj[k])) {
      obj[k].push(v);
    } else {
      obj[k] = [obj[k], v];
    }
  }

  return obj;
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};


/***/ }),

/***/ 795:
/***/ ((module) => {

// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.



var stringifyPrimitive = function(v) {
  switch (typeof v) {
    case 'string':
      return v;

    case 'boolean':
      return v ? 'true' : 'false';

    case 'number':
      return isFinite(v) ? v : '';

    default:
      return '';
  }
};

module.exports = function(obj, sep, eq, name) {
  sep = sep || '&';
  eq = eq || '=';
  if (obj === null) {
    obj = undefined;
  }

  if (typeof obj === 'object') {
    return map(objectKeys(obj), function(k) {
      var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
      if (isArray(obj[k])) {
        return map(obj[k], function(v) {
          return ks + encodeURIComponent(stringifyPrimitive(v));
        }).join(sep);
      } else {
        return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
      }
    }).join(sep);

  }

  if (!name) return '';
  return encodeURIComponent(stringifyPrimitive(name)) + eq +
         encodeURIComponent(stringifyPrimitive(obj));
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

function map (xs, f) {
  if (xs.map) return xs.map(f);
  var res = [];
  for (var i = 0; i < xs.length; i++) {
    res.push(f(xs[i], i));
  }
  return res;
}

var objectKeys = Object.keys || function (obj) {
  var res = [];
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) res.push(key);
  }
  return res;
};


/***/ }),

/***/ 735:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {



exports.decode = exports.parse = __webpack_require__(335);
exports.encode = exports.stringify = __webpack_require__(795);


/***/ }),

/***/ 710:
/***/ ((module) => {



class NonError extends Error {
	constructor(message) {
		super(NonError._prepareSuperMessage(message));
		Object.defineProperty(this, 'name', {
			value: 'NonError',
			configurable: true,
			writable: true
		});

		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, NonError);
		}
	}

	static _prepareSuperMessage(message) {
		try {
			return JSON.stringify(message);
		} catch {
			return String(message);
		}
	}
}

const commonProperties = [
	{property: 'name', enumerable: false},
	{property: 'message', enumerable: false},
	{property: 'stack', enumerable: false},
	{property: 'code', enumerable: true}
];

const isCalled = Symbol('.toJSON called');

const toJSON = from => {
	from[isCalled] = true;
	const json = from.toJSON();
	delete from[isCalled];
	return json;
};

const destroyCircular = ({
	from,
	seen,
	to_,
	forceEnumerable,
	maxDepth,
	depth
}) => {
	const to = to_ || (Array.isArray(from) ? [] : {});

	seen.push(from);

	if (depth >= maxDepth) {
		return to;
	}

	if (typeof from.toJSON === 'function' && from[isCalled] !== true) {
		return toJSON(from);
	}

	for (const [key, value] of Object.entries(from)) {
		if (typeof Buffer === 'function' && Buffer.isBuffer(value)) {
			to[key] = '[object Buffer]';
			continue;
		}

		if (typeof value === 'function') {
			continue;
		}

		if (!value || typeof value !== 'object') {
			to[key] = value;
			continue;
		}

		if (!seen.includes(from[key])) {
			depth++;

			to[key] = destroyCircular({
				from: from[key],
				seen: seen.slice(),
				forceEnumerable,
				maxDepth,
				depth
			});
			continue;
		}

		to[key] = '[Circular]';
	}

	for (const {property, enumerable} of commonProperties) {
		if (typeof from[property] === 'string') {
			Object.defineProperty(to, property, {
				value: from[property],
				enumerable: forceEnumerable ? true : enumerable,
				configurable: true,
				writable: true
			});
		}
	}

	return to;
};

const serializeError = (value, options = {}) => {
	const {maxDepth = Number.POSITIVE_INFINITY} = options;

	if (typeof value === 'object' && value !== null) {
		return destroyCircular({
			from: value,
			seen: [],
			forceEnumerable: true,
			maxDepth,
			depth: 0
		});
	}

	// People sometimes throw things besides Error objects…
	if (typeof value === 'function') {
		// `JSON.stringify()` discards functions. We do too, unless a function is thrown directly.
		return `[Function: ${(value.name || 'anonymous')}]`;
	}

	return value;
};

const deserializeError = (value, options = {}) => {
	const {maxDepth = Number.POSITIVE_INFINITY} = options;

	if (value instanceof Error) {
		return value;
	}

	if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
		const newError = new Error(); // eslint-disable-line unicorn/error-message
		destroyCircular({
			from: value,
			seen: [],
			to_: newError,
			maxDepth,
			depth: 0
		});
		return newError;
	}

	return new NonError(value);
};

module.exports = {
	serializeError,
	deserializeError
};


/***/ }),

/***/ 925:
/***/ (function(__unused_webpack_module, exports) {


var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
function getClientInfo() {
    return __awaiter(this, void 0, void 0, function () {
        var response, html, m, key, version, playerUrl;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetch('https://www.youtube.com/')];
                case 1:
                    response = _a.sent();
                    if (!response.ok) {
                        throw new Error('Incorrect status code ' + response.status);
                    }
                    return [4 /*yield*/, response.text()];
                case 2:
                    html = _a.sent();
                    m = /"INNERTUBE_API_KEY":("[^"]+")/.exec(html);
                    key = m && JSON.parse(m[1]);
                    m = /"INNERTUBE_CLIENT_VERSION":("[^"]+")/.exec(html);
                    version = m && JSON.parse(m[1]);
                    if (!key || !version) {
                        throw new Error('Client info not found');
                    }
                    m = /"jsUrl":("[^"]+")/.exec(html);
                    if (m) {
                        playerUrl = JSON.parse(m[1]);
                        playerUrl = new URL(playerUrl, response.url);
                    }
                    if (!playerUrl) {
                        throw new Error('playerUrl is empty');
                    }
                    return [2 /*return*/, { key: key, version: version, playerUrl: playerUrl }];
            }
        });
    });
}
exports["default"] = getClientInfo;


/***/ }),

/***/ 182:
/***/ (function(__unused_webpack_module, exports) {


var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getSigFn = void 0;
var debug = console.error.bind(console, 'app:getSpeedFixFn');
function getSpeedFixFn(playerUrl) {
    return __awaiter(this, void 0, void 0, function () {
        var response, code, sigFn;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetch(playerUrl)];
                case 1:
                    response = _a.sent();
                    return [4 /*yield*/, response.text()];
                case 2:
                    code = _a.sent();
                    sigFn = getSigFn(code);
                    return [2 /*return*/, function (url) {
                            var uri = new URL(url);
                            var n = uri.searchParams.get('n');
                            var status = null;
                            if (n) {
                                status = true;
                                uri.searchParams.set('n', sigFn(n));
                            }
                            return { status: status, url: uri.toString() };
                        }];
            }
        });
    });
}
var codeData = function () {
    var __result__ = {};
    var navigator = {};
    var location = { hostname: 'a' };
    var document = { location: location, domain: 'a' };
    try {
        /* @ts-ignore */
        Object.assign(this, { document: document, location: location, navigator: navigator });
    }
    catch (err) { }
    var XMLHttpRequest = /** @class */ (function () {
        function class_1() {
        }
        class_1.prototype.fetch = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
        };
        ;
        return class_1;
    }());
};
var afterCodeData = function () {
    try {
        var a = new Map();
        Object.assign(a, {
            u: 'local',
            D: 'true',
        });
        a.set('n', 'true');
        /* @ts-ignore */
        _yt_player.YB.prototype.get.call(a);
    }
    catch (err) {
        console.error('run error', err);
    }
    /* @ts-ignore */
    if (Array.isArray(__result__.sigFn)) {
        /* @ts-ignore */
        __result__.sigFn = __result__.sigFn[0];
    }
};
var getFnBody = function (fn) {
    var str = fn.toString();
    var start = str.indexOf('{') + 1;
    var end = str.lastIndexOf('}');
    return str.slice(start, end);
};
function getSigFn(code) {
    var m = /\.get\("n"\)\)&&\(b=([a-zA-Z0-9$]+)(?:\[\d+\])?\([a-zA-Z0-9]\)/.exec(code);
    if (!m) {
        throw new Error('Sig fn name not found');
    }
    var fragment = m[0], variable = m[1];
    var newFragment = fragment.replace(variable, "(__result__.sigFn=".concat(variable, ")"));
    code = code
        .replace(fragment, newFragment);
    // console.log({newFragment});
    var pre = getFnBody(codeData);
    // console.log(pre);
    var fn = new Function('', "".concat(pre.replace(/\n/g, ' '), "\n").concat(code, ";\n").concat(getFnBody(afterCodeData), "\nreturn __result__.sigFn;"))();
    if (typeof fn !== "function") {
        throw new Error('Sig fn is not found');
    }
    return fn;
}
exports.getSigFn = getSigFn;
exports["default"] = getSpeedFixFn;


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {

// UNUSED EXPORTS: default

// EXTERNAL MODULE: ./node_modules/serialize-error/index.js
var serialize_error = __webpack_require__(710);
;// CONCATENATED MODULE: ./src/transport.js
const debug = console.error.bind(console, 'app:frameWorker');


const emptyFn = () => {};
const once = (cb) => (...args) => {
  cb && cb(...args);
  cb = null;
};

const promiseCallbackMap = new WeakMap();

class Transport {
  /**
   * @param {{onMessage:function(function),postMessage:function(*)}} transport
   * @param {Object} actions
   **/
  constructor(transport, actions) {
    this.transportId = Math.trunc(Math.random() * 1000);
    this.callbackIndex = 0;
    this.transport = transport;
    this.actions = actions;

    this.cbMap = new Map();

    this.onMessage = this.onMessage.bind(this);

    this.transport.onMessage(this.onMessage);
  }

  /**
   * @param {*} msg
   * @param {{event:Object}} options
   * @param {function(*)} response
   * @return {boolean}
   * @private
   */
  listener(msg, response) {
    switch (msg.action) {
      case 'callFn': {
        this.responseFn(msg, response);
        return true;
      }
    }
  }

  /**
   * @param {{responseId: string, message:*, callbackId: string}} msg
   */
  onMessage(msg) {
    const cbMap = this.cbMap;
    if (msg.responseId) {
      const callback = cbMap.get(msg.responseId);
      if (callback) {
        callback(msg.message);
      } else {
        debug('Callback is not found', msg);
      }
    } else {
      let response;
      if (msg.callbackId) {
        response = once(message => {
          this.transport.postMessage({
            responseId: msg.callbackId,
            message: message
          });
        });
      } else {
        response = emptyFn;
      }

      let result = null;
      try {
        result = this.listener(msg.message, response)
      } catch (err) {
        debug('Call listener error', err);
      }
      if (result !== true) {
        response();
      }
    }
  }

  /**
   * @param {*} message
   * @param {function} [callback]
   */
  sendMessage(message, callback) {
    const cbMap = this.cbMap;
    const msg = {
      message: message
    };

    if (callback) {
      msg.callbackId = this.transportId + '_' + (++this.callbackIndex);
      const wrappedCallback = message => {
        cbMap.delete(msg.callbackId);
        callback(message);
      };
      cbMap.set(msg.callbackId, wrappedCallback);
      if (promiseCallbackMap.has(callback)) {
        promiseCallbackMap.delete(callback);
        promiseCallbackMap.set(wrappedCallback, true);
      }
    }

    try {
      this.transport.postMessage(msg);
    } catch (err) {
      cbMap.delete(msg.callbackId);
      throw err;
    }
  }

  /**
   * @param {*} msg
   * @return {Promise}
   * @private
   */
  waitPromise(msg) {
    return new Promise((resolve, reject) => {
      const cb = response => {
        if (!response) {
          return reject(new Error('Response is empty'));
        } else
        if (response.err) {
          return reject((0,serialize_error.deserializeError)(response.err));
        } else {
          return resolve(response.result);
        }
      };
      promiseCallbackMap.set(cb, true);
      this.sendMessage(msg, cb);
    });
  }

  /**
   * @param {string} fnName
   * @param {*[]} argsArray
   * @return {Promise}
   */
  callFn(fnName, argsArray = []) {
    const self = this;
    return self.waitPromise({
      action: 'callFn',
      fn: fnName,
      args: argsArray
    });
  }

  /**
   * @param {Promise} promise
   * @param {Function} response
   * @return {boolean}
   * @private
   */
  responsePromise(promise, response) {
    promise.then(result => {
      response({result: result});
    }, err => {
      response({err: (0,serialize_error.serializeError)(err)});
    }).catch(function (err) {
      debug('responsePromise error', err);
    });
    return true;
  }

  /**
   * @param {string} path
   * @return {{scope: Object, endPoint: *}}
   * @private
   */
  resolvePath(path) {
    const parts = path.split('.');
    const endPoint = parts.pop();
    let scope = this.actions;
    while (parts.length) {
      scope = scope[parts.shift()];
    }
    return {scope, endPoint};
  }

  /**
   * @param {{fn:string,args:*[]}} msg
   * @param {Function} response
   * @return {boolean}
   * @private
   */
  responseFn(msg, response) {
    const promise = Promise.resolve().then(() => {
      const {scope, endPoint: fn} = this.resolvePath(msg.fn);
      return scope[fn].apply(scope, msg.args);
    });
    return this.responsePromise(promise, response);
  }

  destroy() {
    this.cbMap.forEach(cb => {
      if (promiseCallbackMap.has(cb)) {
        cb({err: (0,serialize_error.serializeError)(new Error('Destroyed'))});
      } else {
        cb();
      }
    });
  }
}

/* harmony default export */ const transport = (Transport);

// EXTERNAL MODULE: ./src/service/youtube/getSpeedFixFn.ts
var getSpeedFixFn = __webpack_require__(182);
var getSpeedFixFn_default = /*#__PURE__*/__webpack_require__.n(getSpeedFixFn);
// EXTERNAL MODULE: ./src/service/youtube/getClientInfo.ts
var getClientInfo = __webpack_require__(925);
var getClientInfo_default = /*#__PURE__*/__webpack_require__.n(getClientInfo);
;// CONCATENATED MODULE: ./src/service/youtube.js



const youtube_debug = console.error.bind(console, 'app:youtube');
const qs = __webpack_require__(735);

class Youtube {
  getInfo(url) {
    let result = null;
    [
      /\/\/(?:[^\/]+\.)?youtu\.be\/([\w\-]+)/,
      /\/\/(?:[^\/]+\.)?youtube\.com\/.+[?&]v=([\w\-]+)/,
      /\/\/(?:[^\/]+\.)?youtube\.com\/(?:.+\/)?(?:v|embed)\/([\w\-]+)/
    ].some((re) => {
      const m = re.exec(url);
      if (m) {
        result = {};
        result.type = 'youtube';
        result.id = m[1];
        return true;
      }
    });
    return result;
  }

  async getLinks(info) {
    const {playerResponse, speedFixFn} = await getYtMeta(info.id);
    const links = getYtLinks(playerResponse, speedFixFn);
    links.sort((a, b) => {
      return a.height > b.height ? -1 : 1;
    });
    links.sort((a, b) => {
      return a.bitrate > b.bitrate ? -1 : 1;
    });
    links.sort((a, b) => {
      return a.typeIndex > b.typeIndex ? -1 : 1;
    });
    if (!links.length) {
      throw new Error("Links is not found!");
    }

    return links;
  }
}

async function getYtMeta(id) {
  const {key, version, playerUrl} = await getClientInfo_default()();

  const speedFixFn = await getSpeedFixFn_default()(playerUrl).catch((err) => {
    youtube_debug('getSpeedFixFn error: %o', err);
    return () => {
      throw new Error('getSpeedFixFn fail');
    };
  });

  const url = 'https://www.youtube.com/youtubei/v1/player?' + qs.stringify({key});

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      videoId: id,
      context: {
        client: {
          hl: 'en',
          clientName: 'WEB',
          clientVersion: version,
        },
      },
      playbackContext: {
        contentPlaybackContext: {
          referer: 'https://www.youtube.com/embed/' + encodeURIComponent(id),
        }
      },
    })
  });

  const playerResponse = await response.json();

  return {playerResponse, speedFixFn};
}

function getYtLinks(playerResponse, speedFixFn) {
  const links = [];
  const {formats, adaptiveFormats, dashManifestUrl, hlsManifestUrl} = playerResponse.streamingData;
  formats && formats.forEach((format) => {
    if (!format.url) return;
    const {status, url} = fixUrl(format.url);
    let title = format.qualityLabel;
    if (status === false) {
      title += ' slow';
    }
    links.push({
      type: 'video',
      typeIndex: 2,
      width: format.width,
      height: format.height,
      quality: format.qualityLabel,
      url,
      title,
    });
  });
  adaptiveFormats && adaptiveFormats.forEach((format) => {
    if (!format.url) return;
    if (!/^audio\//.test(format.mimeType)) return;
    const bitrate = Math.round(format.bitrate / 1000);
    const bitrateLabel = 'Audio ' + bitrate + 'kbps';
    const {status, url} = fixUrl(format.url);
    let title = bitrateLabel;
    if (status === false) {
      title += ' slow';
    }
    links.push({
      type: 'audio',
      typeIndex: 0,
      bitrate,
      quality: bitrateLabel,
      url,
      title,
    });
  });
  if (dashManifestUrl) {
    const qualityLabel = 'DASH';
    links.push({
      type: 'stream',
      typeIndex: 1,
      quality: qualityLabel,
      url: dashManifestUrl,
      title: qualityLabel,
    });
  }
  if (hlsManifestUrl) {
    const qualityLabel = 'HLS';
    links.push({
      type: 'stream',
      typeIndex: 1,
      quality: qualityLabel,
      url: hlsManifestUrl,
      title: qualityLabel,
    });
  }
  return links;

  function fixUrl(url) {
    try {
      return speedFixFn(url);
    } catch (err) {
      return {status: false, url};
    }
  }
}

/* harmony default export */ const youtube = (Youtube);

;// CONCATENATED MODULE: ./src/service/twitch.js
const twitch_debug = console.error.bind(console, 'app:twitch');
const twitch_qs = __webpack_require__(735);

const getToken = function (info, type) {
  let url = 'https://api.twitch.tv';
  if (type === 'live') {
    url += '/api/channels/' + info.channel;
  } else {
    url += '/api/vods/' + info.id;
  }
  url += '/access_token.json';

  twitch_debug('request token', url);
  return fetch(url, {
    headers: {
      'Client-ID': 'jzkbprff40iqj646a697cyrvl0zt2m6'
    },
  }).then(r => r.json()).then(function (json) {
    twitch_debug('token', json);
    return {
      sig: json.sig,
      token: json.token
    }
  });
};
const getHlsStreams = function (info, type, _params) {
  let url = 'http://usher.twitch.tv';
  if (type === 'live') {
    url += '/api/channel/hls/' + info.channel + '.m3u8';
  } else {
    url += '/vod/' + info.id;
  }

  const params = {
    player: 'twitchweb',
    p: Math.trunc(Math.random() * 1000000),
    type: 'any',
    allow_source: true,
    allow_audio_only: true,
    allow_spectre: false
  };
  Object.assign(params, _params);

  url += '?' + twitch_qs.stringify(params);

  return url;
};

const getTwitchVideoUrl = info => {
  let promise = null;
  if (info.id) {
    if (info.videoType === 'v') {
      promise = getToken(info, 'video').then(function (auth) {
        twitch_debug('auth: ' + JSON.stringify(auth));

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
      twitch_debug('auth: ' + JSON.stringify(auth));

      return getHlsStreams(info, 'live', {
        sig: auth.sig,
        token: auth.token
      });
    });
  }
  return promise;
};

class Twitch {
  getInfo(url) {
    const asVideo = () => {
      return Promise.resolve().then(() => {
        const reList = [
          /\/\/(?:[^\/]+\.)?twitch\.tv\/videos\/(\d+)/
        ];
        const next = () => {
          const re = reList.shift();
          if (!re) {
            return null;
          }
          const m = re.exec(url);
          if (m) {
            const id = m[1];
            return fetch(url).then(r => r.text()).then(text => {
              let result = null;
              const mChannel = /twitch:\/\/stream\/([^'"]+)/.exec(text);
              if (mChannel) {
                result = {};
                result.type = 'twitch';
                result.channel = mChannel[1];
                result.videoType = 'v';
                result.id = id;
              }
              return result;
            }).catch(err => {
              twitch_debug('fetch error', url, err);
            });
          } else {
            return next();
          }
        };
        return next();
      });
    };
    const asStream = () => {
      let result = null;
      [
        /\/\/(?:[^\/]+\.)?twitch\.tv\/(\w+)(?:\/(v)\/(\d+))?/
      ].some(function (re) {
        const m = re.exec(url);
        if (m) {
          result = {};
          result.type = 'twitch';
          result.channel = m[1];
          result.videoType = m[2];
          result.id = m[3];
          return true;
        }
      });
      return result;
    };
    return asVideo().then(result => {
      if (!result) {
        return asStream();
      }
      return result;
    });
  }
  getLinks(info) {
    return getTwitchVideoUrl(info).then(function (url) {
      return {
        url: url,
        quality: '',
        mime: 'video/m3u8'
      };
    });
  }
}

/* harmony default export */ const twitch = (Twitch);

;// CONCATENATED MODULE: ./src/service/goodgame.js
const goodgame_debug = console.error.bind(console, 'app:goodgame');

const HLS_URL_FORMAT = "https://hlss.goodgame.ru/hls/{0}{1}.m3u8";
const QUALITIES_SUFFIX = {
  "1080": "",
  "720": "_720",
  "480": "_480",
  "240": "_240"
};
const streamIdRe = /"channel_id":"(\d+)"/;

const getStreamId = function (url) {
  goodgame_debug('getStreamId', url);
  return fetch(url, {
    headers: {
      Referer: url
    }
  }).then(r => r.text()).then(function (text) {
    const m = streamIdRe.exec(text);
    const streamId = m && m[1];
    if (!streamId) {
      throw new Error("Stream id is not found!");
    }

    return streamId;
  });
};

const getValidLink = function (links) {
  return Promise.all(links.map((item) => {
    return fetch(item.url, {
      method: 'HEAD'
    }).then((response) => {
      return item;
    }, (err) => {
      goodgame_debug('Request link error: %O', err);
      return null;
    });
  })).then((results) => {
    const r = results.filter(item => !!item);
    if (!r.length) {
      throw new Error("Stream checking error!");
    }
    return r;
  });
};


const getGoodGameVideoUrl = info => {
  return getStreamId(info.url).then(function (stream_id) {
    goodgame_debug('stream_id', stream_id);

    const links = Object.keys(QUALITIES_SUFFIX).map(function (quality) {
      const suffix = QUALITIES_SUFFIX[quality];
      return {
        url: HLS_URL_FORMAT.replace('{0}', stream_id).replace('{1}', suffix),
        quality: parseInt(quality, 10),
        mime: 'video/m3u8',
        title: quality,
      };
    }).sort(function (a, b) {
      return a.quality > b.quality ? -1 : 1;
    });
    return getValidLink(links);
  });
};

class Goodgame {
  getInfo(url) {
    let result = null;
    [
      /(\/\/(?:[^\/]+\.)?goodgame\.ru\/channel\/(\w+))/
    ].some(function (re) {
      const m = re.exec(url);
      if (m) {
        result = {};
        result.type = 'goodgame';
        result.id = m[2];
        result.url = 'https:' + m[1];
        return true;
      }
    });
    return result;
  }
  getLinks(info) {
    return getGoodGameVideoUrl(info).then(function (linkItem) {
      return linkItem;
    });
  }
}

/* harmony default export */ const goodgame = (Goodgame);

;// CONCATENATED MODULE: ./src/services.js




class Services {
  constructor() {
    this.youtube = new youtube();
    this.twitch = new twitch();
    this.goodgame = new goodgame();
  }
}

/* harmony default export */ const services = (Services);
;// CONCATENATED MODULE: ./src/history.js
class History {
  constructor() {
    this.history = this.getHistory();
  }
  getHistory() {
    let history = null;
    try {
      history = JSON.parse(localStorage.getItem('history'));
    } catch (err) {
      // pass
    }
    return history || {};
  }
  get(key) {
    return Promise.resolve().then(() => {
      let result = null;

      const now = Math.trunc(Date.now() / 1000);
      const item = this.history[key];
      if (item && item.expire > now) {
        result = item.data;
      }

      return result;
    });
  }
  set(key, value) {
    return Promise.resolve().then(() => {
      const history = this.history;

      const now = Math.trunc(Date.now() / 1000);
      Object.keys(history).forEach(function (key) {
        const item = history[key];
        if (item.expire < now) {
          delete history[key];
        }
      });

      history[key] = {expire: now + 86400, data: value};

      localStorage.setItem('history', JSON.stringify(history));
    });
  }
}

/* harmony default export */ const src_history = (History);
;// CONCATENATED MODULE: ./src/index.js




const src_debug = console.error.bind(console, 'app:index');

class Index {
  constructor() {
    this.history = null;
    this.transport = null;
    this.services = null;
    this.callFn = null;
    this.init();
  }
  init() {
    this.history = new src_history();
    this.services = new services();
    this.transport = new transport({
      postMessage: function (msg) {
        parent.postMessage(JSON.stringify(msg), '*');
      },
      onMessage: function (cb) {
        window.onmessage = function (e) {
          cb(JSON.parse(e.data));
        };
      }
    }, this.api);
    this.callFn = this.transport.callFn.bind(this.transport);
    this.callFn('ready');
  }
  async onGetLink(info, items) {
    let item;
    if (!Array.isArray(items)) {
      item = items;
    } else {
      const keys = items.map(i => i.title);
      item = await this.callFn('choose', [{
        title: 'Choose link',
        list: keys
      }]).then((index) => {
        if (typeof index === "number") {
          return items[index];
        } else {
          return null;
        }
      });
    }

    if (!item) {
      this.callFn('setStatus', [`Empty choose`]);
      return;
    }

    this.callFn('setStatus', [`${info.type}: ${item.quality ? 'Found ' + item.quality : 'Found!'}`]);

    this.callFn('openUrl', [{
      url: item.url,
      mime: item.mime
    }]);
  }
  getInfo(url) {
    return Promise.resolve().then(() => {
      const services = Object.keys(this.services);
      const next = () => {
        const name = services.shift();
        if (!name) {
          throw new Error('Service is not found');
        }
        return Promise.resolve().then(() => {
          return this.services[name].getInfo(url);
        }).then(info => {
          if (info) {
            return info;
          } else {
            return next();
          }
        }, err => {
          src_debug(`getInfo error ${name}`, err);
          return next();
        });
      };
      return next();
    });
  }
  get api() {
    return {
      getVideoLink: url => {
        return this.getInfo(url).then(info => {
          this.callFn('setStatus', ['Service: ' + info.type]);

          return this.history.get(JSON.stringify(info)).then(links => {
            if (links) {
              return this.callFn('confirm', [{
                message: 'Open link from history?'
              }]).then(result => {
                if (result) {
                  return links;
                } else {
                  return null;
                }
              });
            }
          }).then(links => {
            if (!links) {
              this.callFn('setStatus', [`${info.type}: Request links`]);
              return this.services[info.type].getLinks(info).then(links => {
                this.history.set(JSON.stringify(info), links);
                return links;
              });
            } else {
              return links;
            }
          }).then(links => {
            return this.onGetLink(info, links);
          });
        }).catch(err => {
          this.callFn('setStatus', [`Error: ${err.message}`]);
        });
      }
    }
  }
}

/* harmony default export */ const src = (window.app = new Index());

})();

/******/ })()
;