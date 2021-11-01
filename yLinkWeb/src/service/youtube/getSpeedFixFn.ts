const debug = require('debug')('app:getSpeedFixFn');

async function getSpeedFixFn(playerUrl: string) {
  const response = await fetch(playerUrl);
  const code = await response.text();

  const sigFn = getSigFn(code);

  return (url: string) => {
    const uri = new URL(url);
    try {
      const n = uri.searchParams.get('n');
      if (n) {
        uri.searchParams.set('n', sigFn(n));
      }
    } catch (err) {
      debug('User sig fn error: %O', err);
    }
    return uri.toString();
  }
}

export function getSigFn(code: string) {
  const m = /\([$\w]+=([$\w]+)\([$\w]+\),[$\w]+\.set\("n",/.exec(code);
  if (!m) {
    throw new Error('Sig fn name not found');
  }
  const name = m[1];

  code = code.replace(new RegExp(`([;\\n]${name})(=function)`, ''), "$1=__result__.sigFn$2");

  const fn = new Function('', `
  const __result__ = {};
  const navigator = {};
  const location = {hostname:'a'};
  const document = {location,domain:'a'};
  const window = {document,location};
  ${code};
  return __result__.sigFn;
`)();

  if (typeof fn !== "function") {
    throw new Error('Sig fn is not found');
  }

  return fn;
}

export default getSpeedFixFn;
