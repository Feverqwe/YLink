import Youtube from "./service/youtube";
import Twitch from "./service/twitch";
import Goodgame from "./service/goodgame";

class Services {
  constructor() {
    this.youtube = new Youtube();
    this.twitch = new Twitch();
    this.goodgame = new Goodgame();
  }
}

export default Services;