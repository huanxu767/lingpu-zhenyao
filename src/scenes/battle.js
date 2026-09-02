import Phaser from 'phaser';
import { BattleSim } from '../battle/sim.js';
import { loadSave } from '../battle/save.js';
import { getLevel } from '../data/levels.js';
import { PLANTS } from '../data/plants.js';
import { ENEMIES } from '../data/enemies.js';
import {
  COLS,
  HOUSE_W,
  LAWN_RIGHT,
  ROWS,
  TILE_H,
  TILE_W,
  TOP,
  VIEW_H,
  VIEW_W,
  tileCenterX,
  tileCenterY,
} from '../data/layout.js';

export class BattleScene extends Phaser.Scene {
  constructor() {
    super('battle');
  }

  init(data) {
    this.levelId = data.levelId || 1;
    this.ended = false;
  }

  create() {
    this.level = getLevel(this.levelId);
    this.sim = new BattleSim(this.level, this.game.audio, { autoDew: loadSave().autoDew !== false });
    this.plantMap = new Map();
    this.enemyMap = new Map();
    this.projMap = new Map();
    this.dewMap = new Map();
    this.pickMap = new Map();
    this.sweeperSprites = [];

    this.world = this.add.graphics();
    this.fx = this.add.graphics();
    this.drawWorld();

    for (let row = 0; row < ROWS; row++) {
      const spr = this.add.image(HOUSE_W - 64, tileCenterY(row) + 10, 'tex-sweeper');
      spr.setDisplaySize(70, 46);
      spr.setDepth(2);
      this.sweeperSprites.push(spr);
    }

    this.hoverRect = this.add.rectangle(0, 0, TILE_W - 8, TILE_H - 10, 0xf0d36a, 0.18);
    this.hoverRect.setStrokeStyle(2, 0xf0d36a, 0.7);
    this.hoverRect.setVisible(false);
    this.hoverRect.setDepth(3);

    this.ghostSpr = this.add.image(0, 0, 'plant-dewlotus');
    this.ghostSpr.setAlpha(0.4);
    this.ghostSpr.setVisible(false);
    this.ghostSpr.setDepth(6);

    this.input.on('pointermove', (p) => this.sim.pointerMove(p.x, p.y));
    this.input.on('pointerdown', (p) => {
      this.game.audio?.resume();
      this.sim.click(p.x, p.y);
    });

    if (this.sim.debug) window.__sim = this.sim;
    this.game.events.emit('battle-ready', { sim: this.sim, level: this.level });
  }

  drawWorld() {
    const g = this.world;
    g.clear();
    g.fillGradientStyle(0xf2c888, 0xf2c888, 0x7ec8c0, 0x5ea8b0, 1);
    g.fillRect(0, 0, VIEW_W, 90);
    g.fillStyle(0x4d7a3a, 1);
    g.fillRect(0, 70, VIEW_W, VIEW_H);

    g.fillStyle(0x6b3a28, 1);
    g.fillRect(0, 0, HOUSE_W, VIEW_H);
    g.fillStyle(0x8a4a30, 1);
    g.fillRect(0, 0, 56, VIEW_H);
    g.fillStyle(0xc23a2b, 1);
    g.fillRect(10, 28, 18, VIEW_H);
    g.fillRect(40, 28, 18, VIEW_H);
    g.fillStyle(0x8a1f18, 1);
    g.fillRect(0, 0, HOUSE_W, 26);
    g.fillTriangle(0, 26, HOUSE_W / 2, 2, HOUSE_W, 26);
    g.fillStyle(0xe6a23a, 1);
    g.fillCircle(19, 52, 7);
    g.fillCircle(49, 72, 7);
    g.fillStyle(0xc23a2b, 1);
    g.fillCircle(19, 52, 5);
    g.fillCircle(49, 72, 5);
    g.fillStyle(0x4a2818, 1);
    g.fillRoundedRect(78, VIEW_H / 2 - 48, 52, 96, 8);

    for (let r = 0; r < ROWS; r++) {
      const active = this.level.spawnRows.includes(r);
      for (let c = 0; c < COLS; c++) {
        const even = (r + c) % 2 === 0;
        const color = active
          ? even ? 0x7cb86a : 0x5fa056
          : even ? 0x3f5c38 : 0x334e2f;
        g.fillStyle(color, 1);
        g.fillRect(HOUSE_W + c * TILE_W, TOP + r * TILE_H, TILE_W, TILE_H);
      }
    }
    g.lineStyle(1, 0x2a2118, 0.12);
    for (let c = 0; c <= COLS; c++) {
      const x = HOUSE_W + c * TILE_W;
      g.lineBetween(x, TOP, x, TOP + ROWS * TILE_H);
    }
    for (let r = 0; r <= ROWS; r++) {
      const y = TOP + r * TILE_H;
      g.lineBetween(HOUSE_W, y, LAWN_RIGHT, y);
    }

    g.fillGradientStyle(0x2a3340, 0x1a1e28, 0x2a3340, 0x11141c, 0.95);
    g.fillRect(LAWN_RIGHT, 0, VIEW_W - LAWN_RIGHT, VIEW_H);
    g.fillStyle(0x3d4a3a, 1);
    for (let i = 0; i < 5; i++) {
      const gx = LAWN_RIGHT + 28 + (i % 3) * 48;
      const gy = 90 + i * 90;
      g.fillEllipse(gx, gy, 40, 18);
      g.fillStyle(0x6b7280, 1);
      g.fillRoundedRect(gx - 8, gy - 36, 16, 32, 3);
      g.fillStyle(0x3d4a3a, 1);
    }
    g.fillStyle(0xcfd8c8, 0.15);
    g.fillEllipse(LAWN_RIGHT + 90, 200, 120, 80);
    g.fillEllipse(LAWN_RIGHT + 70, 420, 140, 90);
  }

  update(_, delta) {
    if (!this.sim) return;
    const dt = Math.min(delta / 1000, 0.05);
    this.game.audio?.tickBgm(dt);
    this.sim.update(dt);
    this.sync();
    this.game.events.emit('battle-tick', this.sim);
    if (!this.ended && (this.sim.status === 'won' || this.sim.status === 'lost')) {
      this.ended = true;
      this.time.delayedCall(700, () => {
        this.game.events.emit('battle-end', {
          won: this.sim.status === 'won',
          levelId: this.levelId,
          sim: this.sim,
        });
      });
    }
  }

  sync() {
    const sim = this.sim;
    this.cameras.main.setScroll(Math.sin(sim.shake * 12) * sim.shake * 6, 0);

    if (sim.hover) {
      this.hoverRect.setVisible(true);
      this.hoverRect.setPosition(tileCenterX(sim.hover.col), tileCenterY(sim.hover.row));
    } else this.hoverRect.setVisible(false);

    if (sim.ghost) {
      this.ghostSpr.setVisible(true);
      this.ghostSpr.setTexture(`plant-${sim.ghost.type}`);
      this.ghostSpr.setPosition(tileCenterX(sim.ghost.col), tileCenterY(sim.ghost.row) + 8);
      fitSprite(this.ghostSpr, PLANTS[sim.ghost.type]?.ground ? 86 : 92);
    } else this.ghostSpr.setVisible(false);

    syncMap(this, this.plantMap, sim.plants, (p) => {
      const spr = this.add.image(tileCenterX(p.col), tileCenterY(p.row) + 8, `plant-${p.type}`);
      fitSprite(spr, PLANTS[p.type].ground ? 78 : 92);
      spr.setDepth(PLANTS[p.type].ground ? 4 : 8 + p.row);
      spr.setOrigin(0.5, 0.72);
      return spr;
    }, (spr, p) => {
      spr.setPosition(tileCenterX(p.col) - p.recoil * 6, tileCenterY(p.row) + 8 + Math.sin(p.age * 2.4) * 2);
      spr.setTint(p.hurtFlash > 0 ? 0xffdddd : 0xffffff);
      const pulse = PLANTS[p.type].fuse ? 1 + Math.sin(p.fuse * 18) * 0.08 : 1;
      const size = (PLANTS[p.type].ground ? 78 : 92) * pulse;
      spr.setScale(fitScale(spr, size));
    });

    syncMap(this, this.enemyMap, sim.enemies, (z) => {
      const spr = this.add.image(z.x, tileCenterY(z.row) + 12, `enemy-${z.type}`);
      const boss = ENEMIES[z.type].boss;
      fitSprite(spr, boss ? 128 : 100);
      spr.setDepth(9 + z.row);
      spr.setOrigin(0.5, 0.82);
      spr.setFlipX(false);
      return spr;
    }, (spr, z) => {
      const bob = z.eating ? Math.sin(z.walk * 10) * 2 : Math.sin(z.walk * 6) * 3;
      const jump = z.vaulting > 0 ? -28 * Math.sin((z.vaulting / 0.42) * Math.PI) : 0;
      spr.setPosition(z.x, tileCenterY(z.row) + 12 + bob + jump);
      spr.setTint(z.slow > 0 ? 0xaadfff : z.burn > 0 ? 0xffaa88 : 0xffffff);
      spr.setAlpha(z.type === 'wraith' ? 0.92 : 1);
    });

    syncMap(this, this.projMap, sim.projectiles, (proj) => {
      const key = proj.kind === 'frost' ? 'tex-frost' : proj.kind === 'fire' ? 'tex-fire' : 'tex-arrow';
      const spr = this.add.image(proj.x, proj.y, key);
      spr.setDisplaySize(36, 18);
      spr.setDepth(12);
      return spr;
    }, (spr, proj) => {
      const key = proj.kind === 'frost' ? 'tex-frost' : proj.kind === 'fire' ? 'tex-fire' : 'tex-arrow';
      if (spr.texture.key !== key) spr.setTexture(key);
      spr.setPosition(proj.x, proj.y);
    });

    syncMap(this, this.dewMap, sim.dews, (d) => {
      const spr = this.add.image(d.x, d.y, 'tex-dew');
      spr.setDisplaySize(40, 44);
      spr.setDepth(20);
      return spr;
    }, (spr, d) => spr.setPosition(d.x, d.y + Math.sin(sim.time * 4 + d.id) * 2));

    syncMap(this, this.pickMap, sim.pickups, (p) => {
      const spr = this.add.image(p.x, p.y, `tex-${p.kind}`);
      spr.setDisplaySize(46, 46);
      spr.setDepth(20);
      return spr;
    }, (spr, p) => spr.setPosition(p.x, p.y));

    for (let i = 0; i < ROWS; i++) {
      const m = sim.sweepers[i];
      const spr = this.sweeperSprites[i];
      const onLane = this.level.spawnRows.includes(i);
      spr.setVisible(onLane && (m.ready || m.active));
      spr.setPosition(m.active ? m.x : HOUSE_W - 64, tileCenterY(i) + 10);
    }

    this.fx.clear();
    for (const p of sim.particles) {
      this.fx.fillStyle(Phaser.Display.Color.HexStringToColor(p.color).color, Math.max(0, p.life / 0.5));
      this.fx.fillCircle(p.x, p.y, p.r);
    }
    for (const z of sim.enemies) {
      const def = ENEMIES[z.type];
      const total = def.hp + (def.armor || 0);
      const left = Math.max(0, z.hp) + z.armor;
      const ratio = Math.max(0, Math.min(1, left / total));
      if (ratio < 0.999) {
        const x = z.x - 22;
        const y = tileCenterY(z.row) - (def.boss ? 58 : 48);
        this.fx.fillStyle(0x2a2118, 0.7);
        this.fx.fillRect(x, y, 44, 6);
        this.fx.fillStyle(z.armor > 0 ? 0xc9a227 : 0xc23a2b, 1);
        this.fx.fillRect(x + 1, y + 1, 42 * ratio, 4);
      }
    }
  }
}

function fitSprite(spr, size) {
  const scale = fitScale(spr, size);
  spr.setScale(scale);
}

function fitScale(spr, size) {
  const src = Math.max(spr.width, spr.height) || 128;
  return size / src;
}

function syncMap(scene, map, list, make, update) {
  const seen = new Set();
  for (const item of list) {
    seen.add(item.id);
    let spr = map.get(item.id);
    if (!spr) {
      spr = make(item);
      map.set(item.id, spr);
    }
    update(spr, item);
  }
  for (const [id, spr] of map) {
    if (!seen.has(id)) {
      spr.destroy();
      map.delete(id);
    }
  }
}
