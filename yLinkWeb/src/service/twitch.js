const debug = require('debug')('app:twitch');
const qs = require('querystring-es3');

const getToken = function (info, type) {
  let url = 'https://api.twitch.tv';
  if (type === 'live') {
    url += '/api/channels/' + info.channel;
  } else {
    url += '/api/vods/' + info.id;
  }
  url += '/access_token.json';

  debug('request token', url);
  return fetch(url, {
    headers: {
      'Client-ID': 'jzkbprff40iqj646a697cyrvl0zt2m6'
    },
  }).then(r => r.json()).then(function (json) {
    debug('token', json);
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

  url += '?' + qs.stringify(params);

  return url;
};

const getTwitchVideoUrl = info => {
  let promise = null;
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
              debug('fetch error', url, err);
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

export default Twitch;
