import {
  COLS,
  HOUSE_W,
  LAWN_RIGHT,
  ROWS,
  TILE_W,
  colFromX,
  tileAt,
  tileCenterX,
  tileCenterY,
} from '../data/layout.js';
import { PLANTS } from '../data/plants.js';
import { ENEMIES } from '../data/enemies.js';
import { ITEMS } from '../data/items.js';
import { buildSpawns } from '../data/levels.js';

let uid = 1;
const nextId = () => uid++;

export class BattleSim {
  constructor(level, audio, opts = {}) {
    this.level = level;
    this.audio = audio;
    this.debug = typeof location !== 'undefined' && /[?&]debug=1/.test(location.search);
    this.autoDew = opts.autoDew !== false;
    this.reset();
  }

  reset() {
    uid = 1;
    this.time = 0;
    this.sun = this.debug ? 999 : this.level.startSun;
    this.selected = null;
    this.shovel = false;
    this.pendingItem = null;
    this.plants = [];
    this.enemies = [];
    this.projectiles = [];
    this.dews = [];
    this.pickups = [];
    this.particles = [];
    this.itemSlots = [];
    this.sweepers = Array.from({ length: ROWS }, () => ({
      ready: true,
      active: false,
      x: HOUSE_W - 64,
    }));
    this.spawns = buildSpawns(this.level);
    if (this.debug) this.spawns = this.spawns.map((s) => ({ ...s, t: s.t * 0.45 }));
    this.spawnIndex = 0;
    this.hover = null;
    this.ghost = null;
    this.pointer = { x: 0, y: 0 };
    this.toast = { text: this.level.intro, life: 4.2 };
    this.shake = 0;
    this.skyTimer = 5;
    this.itemDropIndex = 0;
    this.killed = 0;
    this.planted = 0;
    this.dewsCollected = 0;
    this.cooldowns = Object.fromEntries(this.level.plants.map((id) => [id, 0]));
    this.status = 'playing';
    this.paused = false;
    this.hugeAnnounced = false;
    this.seenEnemies = new Set();
    this.seenPlants = new Set(this.level.plants);
  }

  showToast(text, life = 2.6) {
    this.toast = { text, life };
  }

  selectPlant(id) {
    if (!PLANTS[id] || !this.level.plants.includes(id)) return;
    this.shovel = false;
    this.pendingItem = null;
    if (this.selected === id) {
      this.selected = null;
      return;
    }
    if (this.cooldowns[id] > 0 || this.sun < PLANTS[id].cost) {
      this.audio?.deny();
      return;
    }
    this.selected = id;
  }

  toggleShovel() {
    this.shovel = !this.shovel;
    this.selected = null;
    this.pendingItem = null;
  }

  selectItem(index) {
    const slot = this.itemSlots[index];
    if (!slot) return;
    const def = ITEMS[slot];
    this.shovel = false;
    this.selected = null;
    if (def.targeting === 'instant') {
      this.sun += def.sun;
      this.itemSlots.splice(index, 1);
      this.audio?.sun();
      this.showToast(`+${def.sun} 灵露`);
      return;
    }
    this.pendingItem = this.pendingItem === slot ? null : slot;
  }

  pointerMove(x, y) {
    this.pointer.x = x;
    this.pointer.y = y;
    this.hover = tileAt(x, y);
    if (this.selected && this.hover && this.canPlant(this.selected, this.hover.row, this.hover.col)) {
      this.ghost = { type: this.selected, row: this.hover.row, col: this.hover.col };
    } else {
      this.ghost = null;
    }
  }

  click(x, y) {
    if (this.status !== 'playing') return;
    this.pointer.x = x;
    this.pointer.y = y;

    for (let i = this.dews.length - 1; i >= 0; i--) {
      const d = this.dews[i];
      if (Math.hypot(d.x - x, d.y - y) < 32) {
        this.collectDew(i);
        return;
      }
    }
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      if (Math.hypot(p.x - x, p.y - y) < 34) {
        this.collectPickup(i);
        return;
      }
    }

    const tile = tileAt(x, y);

    if (this.pendingItem) {
      this.useItemAt(this.pendingItem, tile, x, y);
      return;
    }

    if (!tile) {
      this.selected = null;
      this.shovel = false;
      return;
    }

    if (this.shovel) {
      this.doShovel(tile.row, tile.col);
      return;
    }

    if (this.selected) this.tryPlant(this.selected, tile.row, tile.col);
  }

  canPlant(type, row, col) {
    const def = PLANTS[type];
    if (!def) return false;
    if (!this.level.spawnRows.includes(row)) return false;
    if (def.ground) return !this.groundAt(row, col);
    return !this.plantAt(row, col);
  }

  plantAt(row, col) {
    return this.plants.find((p) => p.row === row && p.col === col && !PLANTS[p.type].ground);
  }

  groundAt(row, col) {
    return this.plants.find((p) => p.row === row && p.col === col && PLANTS[p.type].ground);
  }

  tryPlant(type, row, col) {
    const def = PLANTS[type];
    if (!def) return false;
    if (this.cooldowns[type] > 0 || this.sun < def.cost) {
      this.audio?.deny();
      return false;
    }
    if (!this.canPlant(type, row, col)) {
      this.audio?.deny();
      return false;
    }
    this.sun -= def.cost;
    this.cooldowns[type] = def.cooldown;
    this.planted += 1;
    this.plants.push({
      id: nextId(),
      type,
      row,
      col,
      hp: def.hp,
      maxHp: def.hp,
      age: 0,
      fireCd: 0.28,
      produceCd: def.firstProduce || 0,
      fuse: def.fuse || 0,
      hurtFlash: 0,
      recoil: 0,
    });
    this.audio?.plant();
    this.burst(tileCenterX(col), tileCenterY(row) + 22, '#7ed957', 7);
    this.selected = null;
    this.ghost = null;
    return true;
  }

  doShovel(row, col) {
    const top = this.plantAt(row, col);
    const ground = this.groundAt(row, col);
    const target = top || ground;
    if (!target) {
      this.audio?.deny();
      this.shovel = false;
      return;
    }
    this.plants = this.plants.filter((p) => p.id !== target.id);
    this.audio?.shovel();
    this.burst(tileCenterX(col), tileCenterY(row), '#c4e38a', 8);
    this.shovel = false;
  }

  useItemAt(kind, tile) {
    const def = ITEMS[kind];
    const idx = this.itemSlots.indexOf(kind);
    if (idx < 0) return;
    if (kind === 'thunder') {
      if (!tile) {
        this.audio?.deny();
        return;
      }
      this.explodeAt(tileCenterX(tile.col), tile.row, tile.col, def.damage);
      this.itemSlots.splice(idx, 1);
      this.pendingItem = null;
      this.showToast('雷火符！');
      return;
    }
    if (kind === 'nectar') {
      if (!tile) {
        this.audio?.deny();
        return;
      }
      const plant = this.plantAt(tile.row, tile.col) || this.groundAt(tile.row, tile.col);
      if (!plant || PLANTS[plant.type].ground) {
        this.audio?.deny();
        return;
      }
      plant.hp = Math.min(plant.maxHp, plant.hp + def.heal);
      this.burst(tileCenterX(plant.col), tileCenterY(plant.row), '#b8f0c2', 10);
      this.audio?.sun();
      this.itemSlots.splice(idx, 1);
      this.pendingItem = null;
      this.showToast(`${plant.type === 'wardstone' ? '镇宅石' : PLANTS[plant.type].name}被甘露滋润了`);
    }
  }

  collectDew(i) {
    const d = this.dews[i];
    this.sun += d.value;
    this.dewsCollected += 1;
    this.dews.splice(i, 1);
    this.audio?.sun();
    this.burst(d.x, d.y, '#ffd056', 8);
  }

  collectPickup(i) {
    const p = this.pickups[i];
    this.pickups.splice(i, 1);
    if (p.kind === 'ingot') {
      this.sun += ITEMS.ingot.sun;
      this.audio?.sun();
      this.showToast('+50 灵露');
      return;
    }
    if (this.itemSlots.length >= 3) {
      this.showToast('道具栏满了');
      this.audio?.deny();
      return;
    }
    this.itemSlots.push(p.kind);
    this.audio?.plant();
    this.showToast(`获得${ITEMS[p.kind].name}`);
  }

  toggleAutoDew() {
    this.autoDew = !this.autoDew;
    this.showToast(this.autoDew ? '灵露会自动飞过来' : '改回手动点灵露', 1.8);
  }

  spawnDew(x, y, falling = false) {
    this.dews.push({
      id: nextId(),
      x,
      y,
      vy: falling ? 52 : -42,
      targetY: falling ? 90 + Math.random() * 300 : y - 38,
      falling,
      homing: false,
      born: this.time,
      life: 13,
      value: 25,
    });
  }

  spawnEnemy(type, row) {
    const def = ENEMIES[type];
    if (!def) return;
    this.seenEnemies.add(type);
    this.enemies.push({
      id: nextId(),
      type,
      row,
      x: LAWN_RIGHT + 48,
      hp: def.hp,
      armor: def.armor || 0,
      maxArmor: def.armor || 0,
      stripped: false,
      slow: 0,
      burn: 0,
      burnDps: 0,
      rage: 0,
      vaulted: false,
      vaulting: 0,
      eating: null,
      walk: Math.random() * 10,
      groan: 3 + Math.random() * 6,
    });
  }

  rightmostPlant(row, x) {
    let best = null;
    for (const p of this.plants) {
      if (p.row !== row || PLANTS[p.type].ground) continue;
      const px = tileCenterX(p.col);
      if (x <= px + 36 && x >= px - 16) {
        if (!best || p.col > best.col) best = p;
      }
    }
    return best;
  }

  update(dt) {
    if (this.status !== 'playing' || this.paused) return;
    this.time += dt;
    this.shake = Math.max(0, this.shake - dt * 4);
    if (this.toast.life > 0) this.toast.life -= dt;

    for (const id of Object.keys(this.cooldowns)) {
      this.cooldowns[id] = Math.max(0, this.cooldowns[id] - dt);
    }

    while (this.spawnIndex < this.spawns.length && this.time >= this.spawns[this.spawnIndex].t) {
      const s = this.spawns[this.spawnIndex++];
      this.spawnEnemy(s.type, s.row);
      if (this.spawnIndex === 1) this.showToast('妖怪来了！', 2);
      if (s.huge && !this.hugeAnnounced) {
        this.hugeAnnounced = true;
        this.showToast('一大波妖怪接近！', 3.2);
        this.audio?.wave();
        this.shake = 1;
      }
    }

    const drops = this.level.itemDrops || [];
    while (this.itemDropIndex < drops.length && this.time >= drops[this.itemDropIndex]) {
      this.itemDropIndex += 1;
      const kinds = ['thunder', 'nectar', 'ingot'];
      const kind = kinds[Math.floor(Math.random() * kinds.length)];
      const x = HOUSE_W + 50 + Math.random() * (COLS * TILE_W - 100);
      this.pickups.push({
        id: nextId(),
        kind,
        x,
        y: 12,
        vy: 46,
        targetY: 70 + Math.random() * 360,
        life: 14,
      });
    }

    this.skyTimer -= dt;
    if (this.skyTimer <= 0) {
      this.skyTimer = 8.4 + Math.random() * 3.2;
      const x = HOUSE_W + 40 + Math.random() * (COLS * TILE_W - 80);
      this.spawnDew(x, 10, true);
    }

    this.updatePlants(dt);
    this.updateProjectiles(dt);
    this.updateEnemies(dt);
    this.updateSweepers(dt);
    this.updateDews(dt);
    this.updatePickups(dt);
    this.updateParticles(dt);
    this.checkEnd();
  }

  updatePlants(dt) {
    for (const p of this.plants) {
      const def = PLANTS[p.type];
      p.age += dt;
      p.hurtFlash = Math.max(0, p.hurtFlash - dt);
      p.recoil = Math.max(0, p.recoil - dt * 4);

      if (def.sunValue) {
        p.produceCd -= dt;
        if (p.produceCd <= 0) {
          p.produceCd = def.produceEvery;
          this.spawnDew(tileCenterX(p.col), tileCenterY(p.row) - 8, false);
        }
      }

      if (def.fireEvery) {
        p.fireCd -= dt;
        const rows = def.triple
          ? [p.row - 1, p.row, p.row + 1].filter((r) => r >= 0 && r < ROWS)
          : [p.row];
        const hasTarget = this.enemies.some(
          (z) => rows.includes(z.row) && z.x > tileCenterX(p.col) - 12 && z.hp > 0,
        );
        if (p.fireCd <= 0 && hasTarget) {
          p.fireCd = def.fireEvery;
          p.recoil = 1;
          const shots = def.shots || 1;
          for (const row of rows) {
            for (let s = 0; s < shots; s++) {
              this.projectiles.push({
                id: nextId(),
                x: tileCenterX(p.col) + 26,
                y: tileCenterY(row) - 10 + (shots === 2 ? (s === 0 ? -8 : 8) : 0),
                row,
                vx: 320,
                damage: def.damage,
                slow: def.slow || 0,
                slowTime: def.slowTime || 0,
                ignited: false,
                burn: 0,
                burnTime: 0,
                kind: def.projectile || 'arrow',
              });
            }
          }
          this.audio?.shoot();
        }
      }

      if (def.fuse) {
        p.fuse -= dt;
        if (p.fuse <= 0) {
          this.explodeAt(tileCenterX(p.col), p.row, p.col, def.damage);
          p.hp = 0;
        }
      }
    }
    this.plants = this.plants.filter((p) => p.hp > 0);
  }

  explodeAt(x, row, col, damage) {
    for (const z of this.enemies) {
      const zCol = colFromX(z.x);
      if (Math.abs(z.row - row) <= 1 && Math.abs(zCol - col) <= 1) {
        this.hurtEnemy(z, damage);
      }
    }
    this.burst(x, tileCenterY(row), '#ff7a6b', 22);
    this.burst(x, tileCenterY(row), '#ffd056', 12);
    this.audio?.boom();
    this.shake = 1.15;
  }

  updateProjectiles(dt) {
    const remain = [];
    for (const proj of this.projectiles) {
      if (!proj.ignited) {
        for (const p of this.plants) {
          if (!PLANTS[p.type].ignite || p.row !== proj.row) continue;
          const px = tileCenterX(p.col);
          if (proj.x >= px - 18 && proj.x <= px + 22) {
            proj.ignited = true;
            proj.damage *= 1.75;
            proj.burn = 16;
            proj.burnTime = 2.8;
            proj.kind = 'fire';
          }
        }
      }
      proj.x += proj.vx * dt;
      let hit = false;
      for (const z of this.enemies) {
        if (z.row !== proj.row || z.hp <= 0) continue;
        if (proj.x >= z.x - 22 && proj.x <= z.x + 18) {
          this.hurtEnemy(z, proj.damage);
          if (proj.slow) z.slow = Math.max(z.slow, proj.slowTime);
          if (proj.burn) {
            z.burn = Math.max(z.burn, proj.burnTime);
            z.burnDps = Math.max(z.burnDps, proj.burn);
          }
          this.audio?.hit();
          this.burst(proj.x, proj.y, proj.ignited ? '#ff6b3d' : '#e7c07a', 4);
          hit = true;
          break;
        }
      }
      if (!hit && proj.x < LAWN_RIGHT + 80) remain.push(proj);
    }
    this.projectiles = remain;
    this.reapEnemies();
  }

  hurtEnemy(z, dmg) {
    const def = ENEMIES[z.type];
    if (z.armor > 0) {
      const used = Math.min(z.armor, dmg);
      z.armor -= used;
      dmg -= used;
      if (z.armor <= 0) z.stripped = true;
    }
    z.hp -= dmg;
    if (def.rageOnHit) z.rage = def.rageOnHit;
  }

  reapEnemies() {
    this.enemies = this.enemies.filter((z) => {
      if (z.hp > 0) return true;
      this.killed += 1;
      this.burst(z.x, tileCenterY(z.row), '#8d7aa8', 10);
      return false;
    });
  }

  updateEnemies(dt) {
    for (const z of this.enemies) {
      const def = ENEMIES[z.type];
      z.slow = Math.max(0, z.slow - dt);
      z.burn = Math.max(0, z.burn - dt);
      z.rage = Math.max(0, z.rage - dt);
      z.walk += dt;
      z.vaulting = Math.max(0, z.vaulting - dt);
      z.groan -= dt;
      if (z.groan <= 0) {
        z.groan = 5 + Math.random() * 8;
        if (Math.random() < 0.4) this.audio?.groan();
      }

      if (z.burn > 0) {
        z.hp -= z.burnDps * dt;
        if (Math.random() < dt * 8) this.burst(z.x, tileCenterY(z.row) - 8, '#ff6b3d', 2);
      }

      const ground = this.plants.find(
        (p) => p.row === z.row && PLANTS[p.type].ground && Math.abs(z.x - tileCenterX(p.col)) < TILE_W * 0.42,
      );
      if (ground) {
        this.hurtEnemy(z, PLANTS[ground.type].dps * dt);
        if (Math.random() < dt * 6) this.burst(z.x, tileCenterY(z.row) + 22, '#c9a227', 2);
      }

      if (z.vaulting > 0) {
        z.eating = null;
        z.x -= 210 * dt;
        continue;
      }

      const victim = this.rightmostPlant(z.row, z.x);
      if (victim && def.vault && !z.vaulted) {
        z.vaulted = true;
        z.vaulting = 0.42;
        z.eating = null;
        this.burst(z.x, tileCenterY(z.row) - 20, '#efe6d2', 6);
        continue;
      }

      if (victim) {
        z.eating = victim.id;
        victim.hp -= def.dps * dt;
        victim.hurtFlash = 0.16;
        if (victim.hp <= 0) this.burst(tileCenterX(victim.col), tileCenterY(victim.row), '#c4e38a', 8);
      } else {
        z.eating = null;
        let speed = def.speed;
        if (z.slow > 0) speed *= 0.5;
        if (z.stripped && def.stripSpeed) speed *= def.stripSpeed;
        if (z.rage > 0 && def.rageSpeed) speed *= def.rageSpeed;
        z.x -= speed * dt;
      }
    }
    this.plants = this.plants.filter((p) => p.hp > 0);
    this.reapEnemies();
  }

  updateSweepers(dt) {
    for (let row = 0; row < ROWS; row++) {
      const m = this.sweepers[row];
      if (m.active) {
        m.x += 460 * dt;
        for (const z of this.enemies) {
          if (z.row === row && z.x < m.x + 30) z.hp = 0;
        }
        if (m.x > LAWN_RIGHT + 40) m.active = false;
      }
    }
    this.reapEnemies();

    for (const z of this.enemies) {
      if (z.x > HOUSE_W - 10) continue;
      const m = this.sweepers[z.row];
      if (m.ready) {
        m.ready = false;
        m.active = true;
        this.audio?.mower();
        this.showToast('桃符扫出阵！', 1.8);
      } else if (!m.active && this.status === 'playing') {
        this.status = 'lost';
        this.audio?.lose();
        this.showToast('祠堂失守了…', 4);
      }
    }
  }

  updateDews(dt) {
    const toCollect = [];
    for (let i = 0; i < this.dews.length; i++) {
      const d = this.dews[i];
      d.life -= dt;
      if (d.life <= 0) continue;
      if (this.autoDew && !d.homing && this.time - d.born > 0.4) {
        d.homing = true;
        d.falling = false;
      }
      if (d.homing) {
        const tx = 58;
        const ty = 6;
        d.x += (tx - d.x) * Math.min(1, dt * 8.5);
        d.y += (ty - d.y) * Math.min(1, dt * 8.5);
        if (Math.hypot(d.x - tx, d.y - ty) < 18) toCollect.push(i);
        continue;
      }
      if (d.falling) {
        if (d.y < d.targetY) d.y += d.vy * dt;
      } else if (d.vy < 80) {
        d.vy += 180 * dt;
        d.y += d.vy * dt;
        if (d.y > d.targetY && d.vy > 0) {
          d.vy *= -0.35;
          d.y = d.targetY;
        }
      }
    }
    for (let i = toCollect.length - 1; i >= 0; i--) this.collectDew(toCollect[i]);
    this.dews = this.dews.filter((d) => d.life > 0);
  }

  updatePickups(dt) {
    const remain = [];
    for (const p of this.pickups) {
      p.life -= dt;
      if (p.life <= 0) continue;
      if (p.y < p.targetY) p.y += p.vy * dt;
      remain.push(p);
    }
    this.pickups = remain;
  }

  burst(x, y, color, n = 6) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 40 + Math.random() * 90;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 20,
        r: 2 + Math.random() * 3,
        color,
        life: 0.35 + Math.random() * 0.25,
        max: 0.6,
      });
    }
  }

  updateParticles(dt) {
    this.particles = this.particles.filter((p) => {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 80 * dt;
      return p.life > 0;
    });
  }

  checkEnd() {
    if (this.status !== 'playing') return;
    const sweeping = this.sweepers.some((m) => m.active);
    const fusing = this.plants.some((p) => PLANTS[p.type].fuse && p.fuse > 0);
    if (this.spawnIndex >= this.spawns.length && this.enemies.length === 0 && !sweeping && !fusing) {
      this.status = 'won';
      this.audio?.win();
      this.showToast('今夜，花圃守住了。', 4);
    }
  }

  progress() {
    const last = this.spawns[this.spawns.length - 1];
    if (!last) return 1;
    return Math.min(1, this.time / last.t);
  }

  hugeAt() {
    const first = this.spawns.find((s) => s.huge);
    const last = this.spawns[this.spawns.length - 1];
    if (!first || !last) return 0.75;
    return first.t / last.t;
  }
}


