import getSpeedFixFn from "./youtube/getSpeedFixFn";
import getClientInfo from "./youtube/getClientInfo";

const debug = require('debug')('app:youtube');
const qs = require('querystring-es3');

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
  const {key, version, playerUrl} = await getClientInfo();

  const speedFixFn = await getSpeedFixFn(playerUrl).catch((err) => {
    debug('getSpeedFixFn error: %o', err);
    return null;
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
    links.push({
      type: 'video',
      typeIndex: 2,
      width: format.width,
      height: format.height,
      quality: format.qualityLabel,
      url: fixUrl(format.url),
      title: format.qualityLabel,
    });
  });
  adaptiveFormats && adaptiveFormats.forEach((format) => {
    if (!format.url) return;
    if (!/^audio\//.test(format.mimeType)) return;
    const bitrate = Math.round(format.bitrate / 1000);
    const bitrateLabel = 'Audio ' + bitrate + 'kbps';
    links.push({
      type: 'audio',
      typeIndex: 0,
      bitrate,
      quality: bitrateLabel,
      url: fixUrl(format.url),
      title: bitrateLabel,
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
    if (!speedFixFn) return url;
    return speedFixFn(url);
  }
}

export default Youtube;
