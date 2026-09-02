import Phaser from 'phaser';
import { PLANTS, PLANT_ORDER } from '../data/plants.js';
import { ENEMY_ORDER } from '../data/enemies.js';
import { ITEM_ORDER } from '../data/items.js';
import { drawArrow, drawDew, drawItem, drawSweeper, makeCanvasTexture } from '../render/toon.js';

const assetUrl = (path) => `${import.meta.env.BASE_URL}assets/${path}`;

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload() {
    for (const id of PLANT_ORDER) {
      this.load.image(`plant-${id}`, assetUrl(`plants/${id}.png`));
    }
    for (const id of ENEMY_ORDER) {
      this.load.image(`enemy-${id}`, assetUrl(`enemies/${id}.png`));
    }
    this.load.image('tex-dew', assetUrl('ui/dew.png'));
    this.load.image('tex-sweeper', assetUrl('ui/sweeper.png'));
    this.load.image('tex-arrow', assetUrl('fx/arrow.png'));
    this.load.image('tex-nectar', assetUrl('ui/nectar.png'));
    this.load.image('tex-ingot', assetUrl('ui/ingot.png'));
    this.load.image('tex-thunder', assetUrl('ui/thunder.png'));
    this.load.on('loaderror', (file) => {
      console.warn('asset missing', file?.key);
    });
  }

  create() {
    bakeFallback(this, 'tex-dew', 64, 64, (ctx) => drawDew(ctx, 32, 28, 1.3));
    bakeFallback(this, 'tex-sweeper', 96, 64, (ctx) => drawSweeper(ctx, 48, 32));
    bakeFallback(this, 'tex-arrow', 48, 24, (ctx) => drawArrow(ctx, 24, 12, 'arrow'));
    bakeFallback(this, 'tex-frost', 48, 24, (ctx) => drawArrow(ctx, 24, 12, 'frost'));
    bakeFallback(this, 'tex-fire', 48, 24, (ctx) => drawArrow(ctx, 24, 12, 'fire'));
    if (!this.textures.exists('tex-frost')) {
      this.textures.addCanvas('tex-frost', makeCanvasTexture(48, 24, (ctx) => drawArrow(ctx, 24, 12, 'frost')));
    }
    if (!this.textures.exists('tex-fire')) {
      this.textures.addCanvas('tex-fire', makeCanvasTexture(48, 24, (ctx) => drawArrow(ctx, 24, 12, 'fire')));
    }
    for (const id of ITEM_ORDER) {
      bakeFallback(this, `tex-${id}`, 64, 64, (ctx) => drawItem(ctx, 32, 32, id));
    }
    for (const id of PLANT_ORDER) {
      if (!this.textures.exists(`plant-${id}`)) {
        this.textures.addCanvas(
          `plant-${id}`,
          makeCanvasTexture(128, 128, (ctx) => blob(ctx, PLANTS[id].color, PLANTS[id].name[0])),
        );
      }
    }
    for (const id of ENEMY_ORDER) {
      if (!this.textures.exists(`enemy-${id}`)) {
        this.textures.addCanvas(
          `enemy-${id}`,
          makeCanvasTexture(128, 160, (ctx) => blob(ctx, '#c9e8d8', '鬼')),
        );
      }
    }
    this.scene.start('idle');
  }
}

export class IdleScene extends Phaser.Scene {
  constructor() {
    super('idle');
  }

  create() {}
}

function bakeFallback(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) return;
  scene.textures.addCanvas(key, makeCanvasTexture(w, h, draw));
}

function blob(ctx, color, glyph) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(64, 70, 38, 44, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2a2118';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = '#2a2118';
  ctx.font = 'bold 36px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(glyph, 64, 68);
}
