import { PLANTS, PLANT_ORDER } from '../data/plants.js';
import { ENEMIES, ENEMY_ORDER } from '../data/enemies.js';
import { ITEMS } from '../data/items.js';
import { LEVELS } from '../data/levels.js';
import { beatLevel, loadSave, markSeen, resetSave, setAutoDew, setMuted } from '../battle/save.js';

const assetUrl = (path) => `${import.meta.env.BASE_URL}assets/${path}`;

export function bindApp(game) {
  const hud = document.getElementById('hud');
  const footer = document.getElementById('wave-footer');
  const stage = document.getElementById('stage');
  const seedBar = document.getElementById('seed-bar');
  const itemBar = document.getElementById('item-bar');
  const sunCount = document.getElementById('sun-count');
  const shovelBtn = document.getElementById('btn-shovel');
  const autoDewBtn = document.getElementById('btn-autodew');
  const pauseBtn = document.getElementById('btn-pause');
  const muteBtn = document.getElementById('btn-mute');
  const toastEl = document.getElementById('toast');
  const waveFill = document.getElementById('wave-fill');
  const waveFlag = document.getElementById('wave-flag');
  const waveLabel = document.getElementById('wave-label');
  const title = document.getElementById('title-screen');
  const almanac = document.getElementById('almanac-screen');
  const levels = document.getElementById('level-screen');
  const pause = document.getElementById('pause-screen');
  const result = document.getElementById('result-screen');

  let sim = null;
  let currentLevelId = 1;
  let save = loadSave();

  game.audio.setMuted(save.muted);
  syncMute();
  syncAutoDew();

  function show(which) {
    title.classList.toggle('hidden', which !== 'title');
    almanac.classList.toggle('hidden', which !== 'almanac');
    levels.classList.toggle('hidden', which !== 'levels');
    pause.classList.toggle('hidden', which !== 'pause');
    result.classList.toggle('hidden', which !== 'result');
  }

  function setBattleUi(on) {
    hud.classList.toggle('hidden', !on);
    footer.classList.toggle('hidden', !on);
    stage.classList.toggle('in-battle', on);
  }

  function overlay(name) {
    setBattleUi(false);
    show(name);
  }

  document.getElementById('btn-start').addEventListener('click', () => {
    game.audio.resume();
    openLevels();
  });
  document.getElementById('btn-almanac').addEventListener('click', () => {
    game.audio.resume();
    renderAlmanac();
    overlay('almanac');
  });
  document.getElementById('btn-almanac-back').addEventListener('click', () => overlay('title'));
  document.getElementById('btn-levels-back').addEventListener('click', () => overlay('title'));
  document.getElementById('btn-reset').addEventListener('click', () => {
    if (confirm('清空本地进度？已解锁的关卡会重新锁上。')) {
      save = resetSave();
      openLevels();
    }
  });

  document.getElementById('btn-resume').addEventListener('click', () => resumeBattle());
  document.getElementById('btn-retry-pause').addEventListener('click', () => startLevel(currentLevelId));
  document.getElementById('btn-quit').addEventListener('click', () => quitToTitle());
  document.getElementById('btn-retry').addEventListener('click', () => startLevel(currentLevelId));
  document.getElementById('btn-next').addEventListener('click', () => {
    const next = Math.min(8, currentLevelId + 1);
    startLevel(next);
  });
  document.getElementById('btn-result-menu').addEventListener('click', () => quitToTitle());

  shovelBtn.addEventListener('click', () => {
    game.audio.resume();
    sim?.toggleShovel();
    refreshHud();
  });
  autoDewBtn.addEventListener('click', () => toggleAutoDew());
  pauseBtn.addEventListener('click', () => pauseBattle());
  muteBtn.addEventListener('click', () => {
    save = setMuted(!loadSave().muted);
    game.audio.setMuted(save.muted);
    syncMute();
  });

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.key === 'm' || e.key === 'M') {
      muteBtn.click();
      return;
    }
    if (e.key === 'q' || e.key === 'Q') {
      if (sim && sim.status === 'playing' && !sim.paused) toggleAutoDew();
      return;
    }
    if (!sim || sim.status !== 'playing') {
      if (e.key === 'Escape' && !pause.classList.contains('hidden')) resumeBattle();
      return;
    }
    if (e.key === 'Escape') {
      if (sim.paused) resumeBattle();
      else pauseBattle();
      return;
    }
    if (sim.paused) return;
    if (e.key === 's' || e.key === 'S' || e.key === 'x' || e.key === 'X') sim.toggleShovel();
    const num = Number(e.key);
    if (num >= 1 && num <= 9) {
      const id = sim.level.plants[num - 1];
      if (id) sim.selectPlant(id);
    }
    refreshHud();
  });

  game.events.on('battle-ready', (payload) => {
    sim = payload.sim;
    currentLevelId = payload.level.id;
    save = markSeen(payload.level.plants, []);
    buildSeedBar();
    setBattleUi(true);
    show(null);
    game.audio.startBgm();
    refreshHud();
  });

  game.events.on('battle-tick', () => refreshHud());

  game.events.on('battle-end', ({ won, levelId, sim: ended }) => {
    game.audio.stopBgm();
    const seenEnemies = [...ended.seenEnemies];
    if (won) save = beatLevel(levelId, [...ended.seenPlants], seenEnemies);
    else save = markSeen([...ended.seenPlants], seenEnemies);
    document.getElementById('result-title').textContent = won ? '今夜守住了' : '祠堂失守';
    document.getElementById('result-blurb').textContent = won
      ? `${LEVELS[levelId - 1].name}的雾气散了。仙草还在夜里轻轻摇。`
      : '游魂摸到了门廊。再种一次，把桃符扫留给真正的危局。';
    document.getElementById('result-stat').textContent =
      `击退 ${ended.killed} · 种植 ${ended.planted} · 灵露 ${ended.dewsCollected} · 用时 ${formatTime(ended.time)}`;
    document.getElementById('btn-next').classList.toggle('hidden', !won || levelId >= 8);
    setBattleUi(false);
    show('result');
  });

  function openLevels() {
    renderLevels();
    overlay('levels');
  }

  function startLevel(id) {
    currentLevelId = id;
    sim = null;
    game.scene.stop('battle');
    game.scene.stop('idle');
    game.scene.start('battle', { levelId: id });
    pause.classList.add('hidden');
    result.classList.add('hidden');
  }

  function pauseBattle() {
    if (!sim || sim.status !== 'playing') return;
    sim.paused = true;
    pause.classList.remove('hidden');
  }

  function resumeBattle() {
    if (sim) sim.paused = false;
    pause.classList.add('hidden');
  }

  function quitToTitle() {
    if (sim) sim.paused = false;
    sim = null;
    game.audio.stopBgm();
    game.scene.stop('battle');
    game.scene.start('idle');
    setBattleUi(false);
    overlay('title');
  }

  function buildSeedBar() {
    seedBar.innerHTML = '';
    sim.level.plants.forEach((id, i) => {
      const def = PLANTS[id];
      const btn = document.createElement('button');
      btn.className = 'seed';
      btn.type = 'button';
      btn.dataset.plant = id;
      btn.title = `${def.desc}（${i + 1}）`;
      btn.innerHTML = `
        <span class="seed-art" style="background-image:url('${assetUrl(`plants/${id}.png`)}')"></span>
        <span class="seed-name">${def.name}</span>
        <span class="seed-cost">${def.cost}</span>
        <span class="seed-cd" hidden aria-hidden="true"></span>
        <span class="seed-key">${i + 1}</span>
      `;
      btn.addEventListener('click', () => {
        game.audio.resume();
        sim.selectPlant(id);
        refreshHud();
      });
      seedBar.appendChild(btn);
    });
  }

  function refreshHud() {
    if (!sim) return;
    sunCount.textContent = Math.floor(sim.sun);
    shovelBtn.classList.toggle('active', sim.shovel);
    syncAutoDew();
    document.querySelectorAll('.seed').forEach((btn) => {
      const id = btn.dataset.plant;
      const def = PLANTS[id];
      const cd = sim.cooldowns[id] || 0;
      const cdEl = btn.querySelector('.seed-cd');
      const ready = cd <= 0 && sim.sun >= def.cost;
      btn.classList.toggle('selected', sim.selected === id);
      btn.classList.toggle('ready', ready);
      btn.classList.toggle('poor', sim.sun < def.cost);
      btn.classList.toggle('cooling', cd > 0);
      if (cd > 0) {
        const pct = Math.min(100, (cd / (def.cooldown || 1)) * 100);
        cdEl.hidden = false;
        cdEl.style.setProperty('--cd', `${pct}%`);
      } else {
        cdEl.hidden = true;
        cdEl.style.removeProperty('--cd');
      }
    });
    const slotKey = `${sim.itemSlots.join(',')}|${sim.pendingItem || ''}`;
    if (itemBar.dataset.key !== slotKey) {
      itemBar.dataset.key = slotKey;
      itemBar.innerHTML = '';
      sim.itemSlots.forEach((kind, i) => {
        const btn = document.createElement('button');
        btn.className = `item-slot${sim.pendingItem === kind ? ' selected' : ''}`;
        btn.type = 'button';
        btn.title = ITEMS[kind].desc;
        btn.innerHTML = `<span class="item-art ${kind}"></span><span>${ITEMS[kind].name}</span>`;
        btn.addEventListener('click', () => {
          sim.selectItem(i);
          refreshHud();
        });
        itemBar.appendChild(btn);
      });
    }
    const p = sim.progress();
    waveFill.style.width = `${p * 100}%`;
    waveFlag.style.left = `${sim.hugeAt() * 100}%`;
    waveLabel.textContent = sim.hugeAnnounced ? '大波' : LEVELS[sim.level.id - 1].name;
    if (sim.toast.life > 0) {
      toastEl.textContent = sim.toast.text;
      toastEl.classList.remove('hidden');
    } else toastEl.classList.add('hidden');
  }

  function renderLevels() {
    save = loadSave();
    const grid = document.getElementById('level-grid');
    grid.innerHTML = '';
    LEVELS.forEach((lv) => {
      const locked = lv.id > save.unlockedLevel;
      const btn = document.createElement('button');
      btn.className = `level-card${locked ? ' locked' : ''}`;
      btn.type = 'button';
      btn.disabled = locked;
      btn.innerHTML = `<span class="lv-id">${String(lv.id).padStart(2, '0')}</span><strong>${lv.name}</strong><em>${lv.subtitle}</em>`;
      btn.addEventListener('click', () => startLevel(lv.id));
      grid.appendChild(btn);
    });
  }

  function renderAlmanac() {
    save = loadSave();
    const box = document.getElementById('almanac-list');
    box.innerHTML = '';
    const add = (kind, id, def, seen, src) => {
      const el = document.createElement('article');
      el.className = `almanac-card${seen ? '' : ' unseen'}`;
      el.innerHTML = seen
        ? `<div class="almanac-art" style="background-image:url('${src}')"></div>
           <div><h3>${def.name}</h3><p class="tag">${kind}${def.cost != null ? ` · ${def.cost} 灵露` : ''}</p><p>${def.lore || def.desc}</p></div>`
        : `<div class="almanac-art silhouette"></div><div><h3>？？？</h3><p>尚未遇见</p></div>`;
      box.appendChild(el);
    };
    PLANT_ORDER.forEach((id) => add('仙草', id, PLANTS[id], save.seenPlants.includes(id), assetUrl(`plants/${id}.png`)));
    ENEMY_ORDER.forEach((id) => add('妖怪', id, ENEMIES[id], save.seenEnemies.includes(id), assetUrl(`enemies/${id}.png`)));
  }

  function toggleAutoDew() {
    game.audio.resume();
    if (sim) sim.toggleAutoDew();
    save = setAutoDew(sim ? sim.autoDew : !loadSave().autoDew);
    syncAutoDew();
  }

  function syncMute() {
    muteBtn.textContent = save.muted ? '音效关' : '音效开';
    muteBtn.setAttribute('aria-pressed', save.muted ? 'true' : 'false');
  }

  function syncAutoDew() {
    const on = sim ? sim.autoDew : save.autoDew !== false;
    autoDewBtn.textContent = on ? '自动收' : '点灵露';
    autoDewBtn.classList.toggle('active', on);
    autoDewBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  overlay('title');
}

function formatTime(sec) {
  const s = Math.floor(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
