const debug = require('debug')('app:youtube');
const qs = require('querystring');

const getYtMeta = (id) => {
  const url = 'https://www.youtube.com/get_video_info?' + qs.stringify({
    video_id: id,
    eurl: 'https://www.youtube.com/watch?v=' + id,
    el: 'detailpage',
    html5: 1,
  });

  return fetch(url).then(r => r.text()).then((body) => {
    return JSON.parse(qs.parse(body).player_response);
  });
};

const getYtLinks = (playerResponse) => {
  const links = [];
  playerResponse.streamingData.formats.forEach((format) => {
    if (!format.url) return;
    links.push({
      width: format.width,
      height: format.height,
      quality: format.qualityLabel,
      url: format.url,
    });
  });
  return links;
};

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
      if (!links.length) {
        throw new Error("Links is not found!");
      }

      const item = links[0];

      return item;
    });
  }
}

export default Youtube;
