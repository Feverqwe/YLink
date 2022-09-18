import {getSigFn} from "../getSpeedFixFn";
import * as Fs from "fs";
import * as Path from "path";
import getClientInfo from "../getClientInfo";

const fetch = require('node-fetch');
global.fetch = fetch;

jest.setTimeout(5 * 60 * 1000);
test('getCurrentPlayer', async () => {
  const {playerUrl} = await getClientInfo();

  console.log('playerUrl', playerUrl.toString());

  const body = await fetch(playerUrl).then((r: any) => r.text());

  const path = Path.join(__dirname, "./p/base.js");

  await Fs.promises.mkdir(Path.dirname(path), {recursive: true});

  await Fs.promises.writeFile(path, body);

  console.log('done');
});

test('getSigFn', async () => {
  // const playerUrl = 'https://www.youtube.com/s/player/9216d1f7/player_ias.vflset/en_US/base.js';

  const path = Path.join(__dirname, "./p/base.js");
  const code = Fs.readFileSync(path).toString();

  const fn = getSigFn(code);

  console.log(fn('laksjdlada'));
});

test('getCurrentSigFn', async () => {
  const {playerUrl} = await getClientInfo();

  console.log('playerUrl', playerUrl.toString());

  const body = await fetch(playerUrl).then((r: any) => r.text());

  const code = body.toString();

  const fn = getSigFn(code);

  console.log(fn('laksjdlada'));
});
