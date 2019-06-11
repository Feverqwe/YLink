const debug = require('debug')('youtube');
const qs = require('querystring');

const videoInfoToObj = data => {
  const decodeParams = function (data) {
    ['url_encoded_fmt_stream_map', 'adaptive_fmts', 'fmt_url_map'].forEach(function (key) {
      if (data[key]) {
        data[key] = data[key].split(',').map(function (item) {
          return dataStrToObj(item);
        });
      }
    });
  };

  const dataStrToObj = function (data) {
    data = qs.parse(data);
    decodeParams(data);
    return data;
  };

  return dataStrToObj(data);
};

const getYtMeta = id => {
  const url = 'https://www.youtube.com/get_video_info?' + qs.stringify({
    video_id: id,
    eurl: 'https://www.youtube.com/watch?v=' + id,
    el: 'detailpage'
  });
  return fetch(url).then(r => r.text()).then(text => {
    return videoInfoToObj(text);
  });
};

const getQuality = function (quality) {
  const dy = {
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
  return dy[quality];
};

const getDashQuality = function (a, b) {
  const qualityList = {
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

  let quality;
  const g = Math.max(a, b);
  a = Math.min(a, b);
  for (let qualityName in qualityList) {
    const value = qualityList[qualityName];
    if (g >= Math.floor(16 * value / 9) || a >= value) {
      quality = qualityName;
    } else {
      return quality;
    }
  }
  return quality;
};

const readFmt = function (links, fmt) {
  fmt.forEach(function (item) {
    if (item.stream) {
      return;
    }

    if (!item.url) {
      return;
    }

    let url = item.url;
    if (!/(\?|&)s(ig(nature)?)?=/i.test(url)) {
      if (item.sig) {
        url += '&sig=' + item.sig;
      } else if (item.signature) {
        url += '&sig=' + item.signature;
      } else if (item.s) {
        debug('Is protected video!');
        return;
      }
    }

    url = url.replace(/(\?|&)signature=/i, '$1sig=').replace(/\\u0026/ig, '&');

    let itag = url.match(/(?:\?|&)itag=(\d+)/i);
    itag = itag && itag[1] || item.itag;
    if (!itag) {
      debug("iTag is not found!");
      return;
    }

    if (item.projection_type) {
      debug("Skip projection!");
      return;
    }

    const linkItem = {};

    linkItem.itag = itag;

    if (item.fps) {
      linkItem.fps = item.fps;
    }

    if (item.size && /^\d+x\d+$/.test(item.size)) {
      const wh = item.size.split('x');
      linkItem.quality = getDashQuality(wh[0], wh[1]);
    }

    if (item.bitrate) {
      linkItem.bitrate = parseInt(item.bitrate, 10);
    }

    if (item.type) {
      linkItem.type = item.type;
      const codecs = item.type.match(/codecs="([^"]+)"/);
      if (codecs) {
        linkItem.codecs = codecs[1];
      }
      const mime = /^(\w+\/\w+)/.exec(item.type);
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

const getYtLinks = config => {
  return Promise.resolve().then(() => {
    const fmtMap = config.fmt_url_map || config.url_encoded_fmt_stream_map || [];
    const adaptiveFmts = config.adaptive_fmts || [];

    const links = [];
    fmtMap && readFmt(links, fmtMap);
    adaptiveFmts && readFmt(links, adaptiveFmts);

    return links;
  });
};

class Youtube {
  getInfo(url) {
    let result = null;
    [
      /\/\/(?:[^\/]+\.)?youtu\.be\/([\w\-]+)/,
      /\/\/(?:[^\/]+\.)?youtube\.com\/.+[?&]v=([\w\-]+)/,
      /\/\/(?:[^\/]+\.)?youtube\.com\/(?:.+\/)?(?:v|embed)\/([\w\-]+)/
    ].some(function (re) {
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
  getLinks(info) {
    return getYtMeta(info.id).then(function (config) {
      return getYtLinks(config).then(function (links) {
        links.sort(function (a, b) {
          return a.quality > b.quality ? -1 : 1;
        });
        if (!links.length) {
          throw new Error("Links is not found!");
        }

        const item = links[0];

        return item;
      });
    });
  }
}

export default Youtube;