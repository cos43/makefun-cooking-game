// Simmer & Serve — every piece of food is drawn in code, no image files.
// Each draw function paints one ingredient centred on (x, y) at the given
// radius, so the bins, the stations and the plate all share the same art.
function ellipse(ctx, x, y, rx, ry, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawBun(ctx, x, y, r) {
  // Bottom bun.
  ctx.fillStyle = '#d98f3a';
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.28, r, r * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  // Top bun dome.
  const grad = ctx.createLinearGradient(x, y - r, x, y + r * 0.3);
  grad.addColorStop(0, '#f6c453');
  grad.addColorStop(1, '#e8a94e');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(x, y - r * 0.05, r, r * 0.62, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(x - r, y - r * 0.08, r * 2, r * 0.12);
  // Sesame seeds.
  ctx.fillStyle = '#fff3c4';
  for (const [dx, dy] of [[-0.45, -0.42], [0.1, -0.55], [0.5, -0.35], [-0.1, -0.3], [0.35, -0.5]]) {
    ctx.beginPath();
    ctx.ellipse(x + dx * r, y + dy * r, r * 0.09, r * 0.06, 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawPatty(ctx, x, y, r, stage) {
  const colors = {
    raw: ['#d97b84', '#c25b6b'],
    cooked: ['#8a5a33', '#6e3f1d'],
    burnt: ['#3a2c20', '#241a12'],
  };
  const [light, dark] = colors[stage] || colors.cooked;
  const grad = ctx.createLinearGradient(x, y - r * 0.4, x, y + r * 0.4);
  grad.addColorStop(0, light);
  grad.addColorStop(1, dark);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();
  if (stage === 'cooked') {
    // Grill stripes.
    ctx.strokeStyle = 'rgba(40,20,8,0.55)';
    ctx.lineWidth = Math.max(2, r * 0.08);
    for (const dx of [-0.5, 0, 0.5]) {
      ctx.beginPath();
      ctx.moveTo(x + dx * r - r * 0.18, y - r * 0.28);
      ctx.lineTo(x + dx * r + r * 0.18, y + r * 0.28);
      ctx.stroke();
    }
  }
  if (stage === 'raw') {
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.ellipse(x - r * 0.3, y - r * 0.15, r * 0.35, r * 0.12, -0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  if (stage === 'burnt') {
    ctx.fillStyle = 'rgba(255,120,60,0.25)';
    ctx.beginPath();
    ctx.ellipse(x, y, r * 0.5, r * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawCheese(ctx, x, y, r) {
  ctx.fillStyle = '#f7c948';
  ctx.beginPath();
  ctx.moveTo(x - r, y - r * 0.15);
  ctx.lineTo(x + r, y - r * 0.15);
  ctx.lineTo(x + r * 0.55, y + r * 0.45);
  ctx.lineTo(x + r * 0.1, y + r * 0.1);
  ctx.lineTo(x - r * 0.35, y + r * 0.5);
  ctx.lineTo(x - r * 0.8, y + r * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#e0a92e';
  ctx.beginPath();
  ctx.arc(x - r * 0.4, y, r * 0.08, 0, Math.PI * 2);
  ctx.arc(x + r * 0.3, y + r * 0.15, r * 0.07, 0, Math.PI * 2);
  ctx.fill();
}

export function drawLettuce(ctx, x, y, r, cut) {
  ctx.fillStyle = cut ? '#8fd67f' : '#5da24f';
  ctx.beginPath();
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const rr = r * (0.85 + 0.25 * Math.sin(i * 2.7));
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr * 0.55;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.quadraticCurveTo(x + Math.cos(a - 0.45) * r * 1.15, y + Math.sin(a - 0.45) * r * 0.7, px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = Math.max(1.5, r * 0.06);
  ctx.beginPath();
  ctx.moveTo(x - r * 0.6, y);
  ctx.quadraticCurveTo(x, y - r * 0.2, x + r * 0.6, y);
  ctx.stroke();
  if (!cut) {
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.arc(x, y, r * 0.55, 0.3, Math.PI - 0.3);
    ctx.stroke();
  }
}

export function drawTomato(ctx, x, y, r, cut) {
  if (!cut) {
    const grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    grad.addColorStop(0, '#ff7a59');
    grad.addColorStop(1, '#d63c1e');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5da24f';
    ctx.beginPath();
    ctx.ellipse(x, y - r * 0.85, r * 0.28, r * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const grad = ctx.createRadialGradient(x, y, r * 0.1, x, y, r);
    grad.addColorStop(0, '#ff8a6a');
    grad.addColorStop(1, '#e4572e');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffb59e';
    ctx.beginPath();
    ctx.arc(x, y, r * 0.62, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff8a6a';
    ctx.beginPath();
    ctx.arc(x, y, r * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe9d6';
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(x + Math.cos(a) * r * 0.3, y + Math.sin(a) * r * 0.3, r * 0.09, r * 0.05, a, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function drawFries(ctx, x, y, r, burnt) {
  // Red carton.
  ctx.fillStyle = burnt ? '#4a3226' : '#d63c2e';
  ctx.beginPath();
  ctx.moveTo(x - r * 0.85, y - r * 0.1);
  ctx.lineTo(x + r * 0.85, y - r * 0.1);
  ctx.lineTo(x + r * 0.6, y + r * 0.75);
  ctx.lineTo(x - r * 0.6, y + r * 0.75);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.arc(x, y + r * 0.3, r * 0.28, 0, Math.PI * 2);
  ctx.fill();
  // Sticks poking out.
  const stickColor = burnt ? '#241a12' : '#f2b234';
  ctx.fillStyle = stickColor;
  for (let i = -2; i <= 2; i++) {
    const sx = x + i * r * 0.3;
    const top = y - r * (0.75 + (i % 2 === 0 ? 0.15 : 0));
    ctx.fillRect(sx - r * 0.09, top, r * 0.18, r * 0.85);
  }
  if (!burnt) {
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    for (let i = -2; i <= 2; i++) {
      ctx.fillRect(x + i * r * 0.3 - r * 0.09, y - r * 0.7, r * 0.05, r * 0.5);
    }
  }
}

// One ingredient, by id. `stage` only matters for the patty.
export function drawIngredient(ctx, id, x, y, r) {
  switch (id) {
    case 'bun': drawBun(ctx, x, y, r); break;
    case 'patty_raw': drawPatty(ctx, x, y, r, 'raw'); break;
    case 'patty_cooked': drawPatty(ctx, x, y, r, 'cooked'); break;
    case 'patty_burnt': drawPatty(ctx, x, y, r, 'burnt'); break;
    case 'cheese': drawCheese(ctx, x, y, r); break;
    case 'lettuce_raw': drawLettuce(ctx, x, y, r, false); break;
    case 'lettuce_cut': drawLettuce(ctx, x, y, r, true); break;
    case 'tomato_raw': drawTomato(ctx, x, y, r, false); break;
    case 'tomato_cut': drawTomato(ctx, x, y, r, true); break;
    case 'fries': drawFries(ctx, x, y, r, false); break;
    case 'fries_burnt': drawFries(ctx, x, y, r, true); break;
    default: break;
  }
}

// A whole burger stack, drawn layer by layer on a plate at (x, y).
export function drawBurgerStack(ctx, items, x, y, r) {
  const layerH = Math.max(7, r * 0.22);
  let cy = y + r * 0.55;
  drawBunBottom(ctx, x, cy, r);
  cy -= layerH;
  for (const item of items) {
    if (item === 'bun') continue;
    if (item === 'patty_cooked') { drawPatty(ctx, x, cy, r * 0.95, 'cooked'); cy -= layerH * 0.9; }
    else if (item === 'cheese') { drawCheese(ctx, x, cy, r * 0.95); cy -= layerH * 0.7; }
    else if (item === 'lettuce_cut') { drawLettuce(ctx, x, cy, r * 0.95, true); cy -= layerH * 0.7; }
    else if (item === 'tomato_cut') { drawTomato(ctx, x, cy, r * 0.8, true); cy -= layerH * 0.7; }
    else if (item === 'fries') { drawFries(ctx, x, cy - r * 0.2, r * 0.8, false); cy -= layerH * 0.6; }
  }
  drawBunTop(ctx, x, cy + layerH * 0.4, r);
}

function drawBunBottom(ctx, x, y, r) {
  ctx.fillStyle = '#d98f3a';
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawBunTop(ctx, x, y, r) {
  const grad = ctx.createLinearGradient(x, y - r, x, y + r * 0.3);
  grad.addColorStop(0, '#f6c453');
  grad.addColorStop(1, '#e8a94e');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.62, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(x - r, y - r * 0.06, r * 2, r * 0.1);
  ctx.fillStyle = '#fff3c4';
  for (const [dx, dy] of [[-0.45, -0.42], [0.1, -0.55], [0.5, -0.35], [-0.1, -0.3]]) {
    ctx.beginPath();
    ctx.ellipse(x + dx * r, y + dy * r, r * 0.09, r * 0.06, 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

export { ellipse, roundRectPath };
