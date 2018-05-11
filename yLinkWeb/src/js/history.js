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
      const now = Math.trunc(Date.now() / 1000);

      const item = this.history[key];
      if (!item) {
        const err = new Error('CACHE_NOT_FOUND');
        err.code = 'CACHE_NOT_FOUND';
        throw err;
      }

      if (item.expire < now) {
        const err = new Error('CACHE_EXPIRED');
        err.code = 'CACHE_EXPIRED';
        throw err;
      }

      return item.data;
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

export default History;