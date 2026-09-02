export const VIEW_W = 1280;
export const VIEW_H = 620;
export const HOUSE_W = 168;
export const TILE_W = 98;
export const TILE_H = 116;
export const ROWS = 5;
export const COLS = 9;
export const TOP = 16;
export const LAWN_RIGHT = HOUSE_W + COLS * TILE_W;

export function tileCenterX(col) {
  return HOUSE_W + col * TILE_W + TILE_W / 2;
}

export function tileCenterY(row) {
  return TOP + row * TILE_H + TILE_H / 2;
}

export function colFromX(x) {
  return Math.floor((x - HOUSE_W) / TILE_W);
}

export function tileAt(x, y) {
  const col = Math.floor((x - HOUSE_W) / TILE_W);
  const row = Math.floor((y - TOP) / TILE_H);
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return null;
  return { row, col };
}
