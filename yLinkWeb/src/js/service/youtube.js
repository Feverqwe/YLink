import {fetch} from "whatwg-fetch";

const debug = require('debug')('app:youtube');
const qs = require('querystring');

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

  getLinks(info) {
    return getYtMeta(info.id).then((playerResponse) => {
      const links = getYtLinks(playerResponse);
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
    });
  }
}

async function getYtMeta(id) {
  const {key, version} = await getClientInfo();

  const url = 'https://www.youtube.com/youtubei/v1/player?' + qs.stringify({key});

  return fetch(url, {
    method: 'POST',
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      videoId: id,
      context: {
        client: {
          hl: 'en',
          clientName: 'ANDROID',
          clientVersion: version,
        },
      },
      playbackContext: {
        contentPlaybackContext: {
          referer: 'https://www.youtube.com/embed/' + encodeURIComponent(id),
        }
      },
    })
  }).then(r => r.json());
}

function getYtLinks(playerResponse) {
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
      url: format.url,
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
      url: format.url,
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
}

function getClientInfo() {
  return fetch('https://www.youtube.com/').then((response) => {
    if (!response.ok) {
      throw new Error('Incorrect status code ' + response.status);
    }
    return response.text();
  }).then((html) => {
    let m;

    m = /"INNERTUBE_API_KEY":("[^"]+")/.exec(html);
    const key = m && JSON.parse(m[1]);

    m = /"INNERTUBE_CLIENT_VERSION":("[^"]+")/.exec(html);
    const version = m && JSON.parse(m[1]);

    if (!key || !version) {
      throw new Error('Client info not found');
    }
    return {key, version};
  });
}

export default Youtube;
