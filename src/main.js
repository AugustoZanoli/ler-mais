import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './config.js';
import BootScene from './scenes/BootScene.js';
import GameScene from './scenes/GameScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game-root',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#1a1410',
  pixelArt: true, // desativa suavização -> pixelart nítida
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT, // encaixa na tela mantendo proporção
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  dom: {
    createContainer: true // necessário pros inputs HTML do painel
  },
  scene: [BootScene, GameScene]
};

// eslint-disable-next-line no-new
new Phaser.Game(config);
