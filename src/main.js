import Phaser from 'phaser';
import { VIEW_H, VIEW_W } from './data/layout.js';
import { BootScene, IdleScene } from './scenes/boot.js';
import { BattleScene } from './scenes/battle.js';
import { GameAudio } from './audio/synth.js';
import { bindApp } from './ui/app.js';

const audio = new GameAudio();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: VIEW_W,
  height: VIEW_H,
  backgroundColor: '#1e3a34',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  audio: { noAudio: true },
  scene: [BootScene, IdleScene, BattleScene],
});

game.audio = audio;
bindApp(game);
