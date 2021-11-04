async function getClientInfo() {
  const response = await fetch('https://www.youtube.com/')
  if (!response.ok) {
    throw new Error('Incorrect status code ' + response.status);
  }
  const html = await response.text();

  let m;

  m = /"INNERTUBE_API_KEY":("[^"]+")/.exec(html);
  const key = m && JSON.parse(m[1]);
  m = /"INNERTUBE_CLIENT_VERSION":("[^"]+")/.exec(html);
  const version = m && JSON.parse(m[1]);
  if (!key || !version) {
    throw new Error('Client info not found');
  }

  let playerUrl;
  m = /"jsUrl":("[^"]+")/.exec(html);
  if (m) {
    playerUrl = JSON.parse(m[1]);
    playerUrl = new URL(playerUrl, response.url);
  }
  if (!playerUrl) {
    throw new Error('playerUrl is empty');
  }

  return {key, version, playerUrl};
}

export default getClientInfo;
