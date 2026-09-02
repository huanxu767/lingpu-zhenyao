const KEY = 'lingpu-zhenyao-save';

const DEFAULT = {
  unlockedLevel: 1,
  seenPlants: ['dewlotus', 'peacharrow'],
  seenEnemies: [],
  muted: false,
  autoDew: true,
};

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return cloneDefault();
    const parsed = JSON.parse(raw);
    return {
      ...cloneDefault(),
      ...parsed,
      seenPlants: Array.isArray(parsed.seenPlants) ? parsed.seenPlants : [...DEFAULT.seenPlants],
      seenEnemies: Array.isArray(parsed.seenEnemies) ? parsed.seenEnemies : [],
    };
  } catch {
    return cloneDefault();
  }
}

export function writeSave(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function beatLevel(id, seenPlants, seenEnemies) {
  const save = loadSave();
  save.unlockedLevel = Math.max(save.unlockedLevel, Math.min(8, id + 1));
  save.seenPlants = uniq([...(save.seenPlants || []), ...seenPlants]);
  save.seenEnemies = uniq([...(save.seenEnemies || []), ...seenEnemies]);
  writeSave(save);
  return save;
}

export function markSeen(plants, enemies) {
  const save = loadSave();
  save.seenPlants = uniq([...(save.seenPlants || []), ...plants]);
  save.seenEnemies = uniq([...(save.seenEnemies || []), ...enemies]);
  writeSave(save);
  return save;
}

export function setMuted(muted) {
  const save = loadSave();
  save.muted = !!muted;
  writeSave(save);
  return save;
}

export function setAutoDew(autoDew) {
  const save = loadSave();
  save.autoDew = !!autoDew;
  writeSave(save);
  return save;
}

export function resetSave() {
  const prev = loadSave();
  const fresh = cloneDefault();
  fresh.muted = prev.muted;
  fresh.autoDew = prev.autoDew;
  writeSave(fresh);
  return fresh;
}

function cloneDefault() {
  return {
    unlockedLevel: DEFAULT.unlockedLevel,
    seenPlants: [...DEFAULT.seenPlants],
    seenEnemies: [...DEFAULT.seenEnemies],
    muted: DEFAULT.muted,
    autoDew: DEFAULT.autoDew,
  };
}

function uniq(list) {
  return [...new Set(list)];
}
