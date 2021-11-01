import {getSigFn} from "../getSpeedFixFn";
import * as Fs from "fs";
import * as Path from "path";

jest.setTimeout(5 * 60 * 1000);
test('getFnName', async () => {
  // const playerUrl = 'https://www.youtube.com/s/player/9216d1f7/player_ias.vflset/en_US/base.js';

  const path = Path.join(__dirname, "./p/base.js");
  const code = Fs.readFileSync(path).toString();

  const fn = getSigFn(code);

  console.log(fn('laksjdlada'));
});
