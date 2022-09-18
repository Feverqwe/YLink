const debug = require('debug')('app:getSpeedFixFn');

async function getSpeedFixFn(playerUrl: string) {
  const response = await fetch(playerUrl);
  const code = await response.text();

  const sigFn = getSigFn(code);

  return (url: string) => {
    const uri = new URL(url);
    const n = uri.searchParams.get('n');
    let status = null;
    if (n) {
      status = true;
      uri.searchParams.set('n', sigFn(n));
    }
    return {status, url: uri.toString()};
  }
}

const codeData = function () {
  const __result__ = {};
  const navigator = {};
  const location = {hostname: 'a'};
  const document = {location, domain: 'a'};
  /* @ts-ignore */
  Object.assign(this, {document, location, navigator});
  const XMLHttpRequest = class {
    fetch(...args: any[]) {

    };
  };
};

const afterCodeData = function () {
  try {
    const a = new Map();
    Object.assign(a, {
      u: 'local',
      D: 'true',
    });
    a.set('n', 'true');
    /* @ts-ignore */
    _yt_player.YB.prototype.get.call(a);
  }catch(_e){}
  /* @ts-ignore */
  if (Array.isArray(__result__.sigFn)) {
    /* @ts-ignore */
    __result__.sigFn = __result__.sigFn[0];
  }
};

const getFnBody = (fn: () => void) => {
  const str = fn.toString();
  const start = str.indexOf('{') + 1;
  const end = str.lastIndexOf('}');
  return str.slice(start, end);
};

export function getSigFn(code: string) {
  const m = /\.get\("n"\)\)&&\(b=([a-zA-Z0-9$]+)(?:\[\d+\])?\([a-zA-Z0-9]\)/.exec(code);
  if (!m) {
    throw new Error('Sig fn name not found');
  }

  let [fragment, variable] = m;

  const newFragment = fragment.replace(variable, `(__result__.sigFn=${variable})`);

  code = code
    .replace(fragment, newFragment);

  // console.log({newFragment});

  const pre = getFnBody(codeData);

  // console.log(pre);

  const fn = new Function('', `${pre.replace(/\n/g, ' ')}
${code};
${getFnBody(afterCodeData)}
return __result__.sigFn;`)();

  if (typeof fn !== "function") {
    throw new Error('Sig fn is not found');
  }

  return fn;
}

export default getSpeedFixFn;
