import('whatwg-fetch');
import Transport from "./transport";
import Services from "./services";
import History from "./history";

const debug = require('debug')('app:index');

class Index {
  constructor() {
    this.history = null;
    this.transport = null;
    this.services = null;
    this.callFn = null;
    this.init();
  }
  init() {
    this.history = new History();
    this.services = new Services();
    this.transport = new Transport({
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
          debug(`getInfo error ${name}`, err);
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

export default window.app = new Index();
