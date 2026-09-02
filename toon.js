export function ellipse(ctx, x, y, rx, ry, fill) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

export function roundRect(ctx, x, y, w, h, r, fill, stroke = null) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2.4;
    ctx.stroke();
  }
}

export function face(ctx, x, y, scale, t, happy = true) {
  const blink = (t * 0.55) % 1 > 0.86 ? 1.1 : 3.1;
  ctx.fillStyle = '#2a2118';
  ctx.beginPath();
  ctx.ellipse(x - 6 * scale, y - 2 * scale, 2.1 * scale, blink * scale, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 6 * scale, y - 2 * scale, 2.1 * scale, blink * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2a2118';
  ctx.lineWidth = 1.7 * scale;
  ctx.beginPath();
  if (happy) ctx.arc(x, y + 3 * scale, 5.6 * scale, 0.15, Math.PI - 0.15);
  else ctx.arc(x, y + 8 * scale, 5.6 * scale, Math.PI + 0.2, -0.2);
  ctx.stroke();
}

export function drawDew(ctx, x, y, s = 1) {
  ellipse(ctx, x, y + 10 * s, 10 * s, 4 * s, 'rgba(40,60,20,0.18)');
  ctx.beginPath();
  ctx.moveTo(x, y - 16 * s);
  ctx.quadraticCurveTo(x + 14 * s, y - 2 * s, x, y + 12 * s);
  ctx.quadraticCurveTo(x - 14 * s, y - 2 * s, x, y - 16 * s);
  ctx.fillStyle = '#f0d36a';
  ctx.fill();
  ctx.strokeStyle = '#b8860b';
  ctx.lineWidth = 2;
  ctx.stroke();
  ellipse(ctx, x - 3 * s, y - 4 * s, 3.2 * s, 2.2 * s, '#fff6c8');
}

export function drawArrow(ctx, x, y, kind = 'arrow') {
  const colors = {
    arrow: '#c9844a',
    frost: '#8fe7ff',
    fire: '#ff6b3d',
  };
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = colors[kind] || colors.arrow;
  ctx.beginPath();
  ctx.moveTo(16, 0);
  ctx.lineTo(-10, -5);
  ctx.lineTo(-10, 5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#2a2118';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  if (kind === 'fire') {
    ellipse(ctx, -4, 0, 6, 4, '#ffd056');
  }
  ctx.restore();
}

export function drawSweeper(ctx, x, y) {
  roundRect(ctx, x - 28, y - 18, 56, 36, 8, '#c23a2b', '#5a1c14');
  roundRect(ctx, x - 16, y - 8, 32, 22, 4, '#f0d36a', '#8a6a12');
  ctx.strokeStyle = '#5a1c14';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 6, y);
  ctx.lineTo(x + 6, y);
  ctx.moveTo(x, y - 6);
  ctx.lineTo(x, y + 8);
  ctx.stroke();
}

export function drawItem(ctx, x, y, kind) {
  if (kind === 'thunder') {
    roundRect(ctx, x - 16, y - 22, 32, 40, 4, '#c23a2b', '#5a1c14');
    ctx.fillStyle = '#f0d36a';
    ctx.beginPath();
    ctx.moveTo(x + 2, y - 14);
    ctx.lineTo(x - 8, y + 2);
    ctx.lineTo(x + 1, y + 2);
    ctx.lineTo(x - 4, y + 16);
    ctx.lineTo(x + 10, y - 2);
    ctx.lineTo(x + 1, y - 2);
    ctx.closePath();
    ctx.fill();
  } else if (kind === 'nectar') {
    ellipse(ctx, x, y + 8, 12, 10, '#d9f2e3');
    roundRect(ctx, x - 8, y - 16, 16, 22, 6, '#9fd7c2', '#2f7a54');
    roundRect(ctx, x - 6, y - 22, 12, 8, 3, '#f0d36a', '#8a6a12');
  } else {
    ctx.beginPath();
    ctx.moveTo(x - 18, y);
    ctx.lineTo(x - 8, y - 12);
    ctx.lineTo(x + 8, y - 12);
    ctx.lineTo(x + 18, y);
    ctx.lineTo(x + 8, y + 10);
    ctx.lineTo(x - 8, y + 10);
    ctx.closePath();
    ctx.fillStyle = '#f0d36a';
    ctx.fill();
    ctx.strokeStyle = '#8a6a12';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

export function makeCanvasTexture(w, h, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  draw(ctx, w, h);
  return canvas;
}
