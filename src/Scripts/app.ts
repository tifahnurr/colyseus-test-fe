import PhaserConfig  from './Config/PhaserConfig';
import { Game } from "phaser";

export class PhaserGame extends Game {}
declare global {
  interface Window {
    game?: PhaserGame;
  }
}

window.onload = () => {
  window.game?.destroy(false);
  window.game = new PhaserGame(PhaserConfig);
};