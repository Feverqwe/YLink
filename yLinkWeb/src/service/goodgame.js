const debug = require('debug')('app:goodgame');

const HLS_URL_FORMAT = "https://hlss.goodgame.ru/hls/{0}{1}.m3u8";
const QUALITIES_SUFFIX = {
  "1080": "",
  "720": "_720",
  "480": "_480",
  "240": "_240"
};
const streamIdRe = /"channel_id":"(\d+)"/;

const getStreamId = function (url) {
  debug('getStreamId', url);
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
      debug('Request link error: %O', err);
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
    debug('stream_id', stream_id);

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

export default Goodgame;
