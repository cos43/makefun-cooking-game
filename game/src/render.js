// Simmer & Serve — everything the player sees: the HUD, the order board,
// the kitchen stations, the title screen and the end-of-shift screen.
// All drawing is plain canvas, sized for 1280x720.
import {
  CANVAS_W, CANVAS_H, LAYOUT, BIN_ITEMS, INGREDIENTS, RECIPES, recipeById,
  pointIn, GRILL_COOK_SECONDS, GRILL_BURN_SECONDS, CHOP_SECONDS,
  FRY_SECONDS, FRY_BURN_SECONDS, SHIFT_SECONDS, STAR_LINES,
} from './config.js';
import { matchingOrder } from './state.js';
import { drawIngredient, drawBurgerStack, drawPatty, drawFries, roundRectPath } from './sprites.js';

const FONT = 'system-ui, "Segoe UI", sans-serif';

function text(ctx, str, x, y, size, color, weight, align) {
  ctx.fillStyle = color;
  ctx.font = `${weight || 700} ${size}px ${FONT}`;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function panel(ctx, box, fill, stroke) {
  roundRectPath(ctx, box.x, box.y, box.w, box.h, 12);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function stationLabel(ctx, box, label, color) {
  text(ctx, label, box.x + 12, box.y + 16, 13, color || '#6b4a2f', 800, 'left');
}

function progressBar(ctx, x, y, w, h, frac, color, bg) {
  roundRectPath(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = bg || 'rgba(0,0,0,0.25)';
  ctx.fill();
  if (frac > 0) {
    roundRectPath(ctx, x, y, Math.max(h, w * Math.min(1, frac)), h, h / 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
}

function fmtTime(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

// --- HUD ----------------------------------------------------------------------
function drawHud(ctx, state) {
  const hud = LAYOUT.hud;
  const grad = ctx.createLinearGradient(0, 0, 0, hud.h);
  grad.addColorStop(0, '#3d2b1f');
  grad.addColorStop(1, '#2c1e14');
  ctx.fillStyle = grad;
  ctx.fillRect(hud.x, hud.y, hud.w, hud.h);
  // Logo.
  // Little frying-pan logo mark, drawn in code.
  ctx.fillStyle = '#ffd166';
  ctx.beginPath(); ctx.arc(30, 28, 13, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3d2b1f';
  ctx.beginPath(); ctx.arc(30, 28, 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffd166';
  ctx.fillRect(42, 25, 12, 6);
  text(ctx, 'SIMMER & SERVE', 52, 22, 22, '#ffd166', 800, 'left');
  text(ctx, 'a tiny burger joint', 52, 42, 11, '#d8c3a5', 600, 'left');
  // Shift timer with progress bar.
  const timeFrac = state.timeLeft / SHIFT_SECONDS;
  const timerColor = state.timeLeft <= 30 ? '#ff5a4e' : '#ffd166';
  text(ctx, 'SHIFT', 300, 16, 11, '#d8c3a5', 800, 'left');
  text(ctx, fmtTime(state.timeLeft), 300, 38, 24, timerColor, 800, 'left');
  progressBar(ctx, 380, 28, 190, 10, timeFrac, timerColor);
  // Money and target.
  text(ctx, 'EARNED', 610, 16, 11, '#d8c3a5', 800, 'left');
  text(ctx, `$${state.money}`, 610, 38, 24, '#7be495', 800, 'left');
  text(ctx, `goal $${STAR_LINES[2]} ★★★`, 700, 38, 13, '#d8c3a5', 700, 'left');
  // Combo.
  const comboText = state.combo > 1 ? `COMBO ×${state.combo}` : 'COMBO —';
  text(ctx, comboText, 850, 30, 18, state.combo > 1 ? '#ff9f43' : '#d8c3a5', 800, 'left');
  // Mute button.
  panel(ctx, { x: 1180, y: 10, w: 84, h: 36 }, '#4a3524', '#6b4a2f');
  text(ctx, 'MUTE [M]', 1222, 29, 13, '#ffd166', 800, 'center');
}

// --- Order board ----------------------------------------------------------------
function drawOrders(ctx, state) {
  text(ctx, 'ORDER BOARD', 20, 60, 12, '#6b4a2f', 800, 'left');
  const t = LAYOUT.tickets;
  const match = state.screen === 'play' ? matchingOrder(state) : null;
  for (let i = 0; i < 4; i++) {
    const box = { x: t.x + i * (t.w + t.gap), y: t.y, w: t.w, h: t.h };
    const order = state.orders[i];
    panel(ctx, box, order ? '#fffdf6' : '#efe6d4', order ? '#c9a86a' : '#d8cbb2');
    if (!order) {
      text(ctx, '— empty —', box.x + box.w / 2, box.y + box.h / 2, 14, '#a08c6d', 600, 'center');
      continue;
    }
    const recipe = recipeById(order.recipeId);
    const frac = Math.max(0, order.patience / order.maxPatience);
    const patienceColor = frac > 0.5 ? '#5da24f' : frac > 0.25 ? '#f2a007' : '#e4572e';
    // Ticket header.
    ctx.fillStyle = patienceColor;
    ctx.fillRect(box.x, box.y, box.w, 6);
    text(ctx, recipe.name.toUpperCase(), box.x + 12, box.y + 22, 16, '#3d2b1f', 800, 'left');
    text(ctx, `$${recipe.price}`, box.x + box.w - 12, box.y + 22, 18, '#2e7d32', 800, 'right');
    text(ctx, recipe.pitch, box.x + 12, box.y + 42, 12, '#8a6d4b', 600, 'left');
    // Recipe chips.
    let cx = box.x + 12;
    for (const item of recipe.needs) {
      const label = INGREDIENTS[item].short;
      ctx.font = `700 10px ${FONT}`;
      const w = ctx.measureText(label).width + 12;
      roundRectPath(ctx, cx, box.y + 56, w, 18, 9);
      ctx.fillStyle = '#f3e3c2';
      ctx.fill();
      text(ctx, label, cx + w / 2, box.y + 66, 10, '#6b4a2f', 700, 'center');
      cx += w + 5;
    }
    // Patience bar.
    progressBar(ctx, box.x + 12, box.y + 84, box.w - 24, 10, frac, patienceColor);
    if (match && match.id === order.id) {
      roundRectPath(ctx, box.x, box.y, box.w, box.h, 12);
      ctx.strokeStyle = '#2e9e4f';
      ctx.lineWidth = 4;
      ctx.stroke();
      panel(ctx, { x: box.x + box.w - 108, y: box.y + box.h - 26, w: 100, h: 20 }, '#2e9e4f');
      text(ctx, '✓ READY!', box.x + box.w - 58, box.y + box.h - 15, 11, '#fff', 800, 'center');
    }
  }
}

// --- Kitchen stations ---------------------------------------------------------------
function drawBins(ctx, state, hover) {
  const b = LAYOUT.bins;
  text(ctx, b.label, b.x, b.y - 10, 12, '#6b4a2f', 800, 'left');
  BIN_ITEMS.forEach((item, i) => {
    const box = { x: b.x, y: b.y + i * (b.h + b.gap), w: b.w, h: b.h };
    const hot = hover && pointIn(box, hover.x, hover.y);
    panel(ctx, box, hot ? '#ffe9b8' : '#fff8e7', hot ? '#f2a007' : '#c9a86a');
    drawIngredient(ctx, item, box.x + 34, box.y + box.h / 2, 24);
    text(ctx, INGREDIENTS[item].name, box.x + 66, box.y + 30, 14, '#3d2b1f', 800, 'left');
    text(ctx, `[${INGREDIENTS[item].key}]`, box.x + 66, box.y + 54, 11, '#8a6d4b', 700, 'left');
    text(ctx, 'click to take', box.x + 66, box.y + 70, 10, '#b09a7a', 600, 'left');
  });
}

function drawGrill(ctx, state, hover) {
  const g = LAYOUT.grill;
  panel(ctx, g, '#3a3f46', '#22262b');
  stationLabel(ctx, g, 'GRILL — 6s, burns 5s later', '#ffd166');
  g.slots.forEach((slot, i) => {
    const item = state.grill[i];
    const hot = hover && pointIn(slot, hover.x, hover.y);
    roundRectPath(ctx, slot.x, slot.y, slot.w, slot.h, 10);
    ctx.fillStyle = hot ? '#4a4f58' : '#2b2f36';
    ctx.fill();
    ctx.strokeStyle = '#565b64';
    ctx.lineWidth = 2;
    ctx.stroke();
    if (!item) {
      text(ctx, '+ patty', slot.x + slot.w / 2, slot.y + slot.h / 2, 13, '#8a8f98', 700, 'center');
      return;
    }
    drawPatty(ctx, slot.x + slot.w / 2, slot.y + slot.h / 2 - 6, 34, item.stage === 'cooking' ? 'raw' : item.stage);
    if (item.stage === 'cooking') {
      progressBar(ctx, slot.x + 10, slot.y + slot.h - 18, slot.w - 20, 8, item.t / GRILL_COOK_SECONDS, '#f2a007');
      text(ctx, 'COOKING…', slot.x + slot.w / 2, slot.y + slot.h - 28, 11, '#ffd166', 800, 'center');
    } else if (item.stage === 'done') {
      progressBar(ctx, slot.x + 10, slot.y + slot.h - 18, slot.w - 20, 8, 1 - item.t / GRILL_BURN_SECONDS, '#5da24f');
      text(ctx, 'READY!', slot.x + slot.w / 2, slot.y + slot.h - 28, 11, '#7be495', 800, 'center');
    } else {
      text(ctx, 'BURNT!', slot.x + slot.w / 2, slot.y + slot.h - 28, 11, '#ff5a4e', 800, 'center');
    }
  });
}

function drawBoard(ctx, state, hover) {
  const b = LAYOUT.board;
  panel(ctx, b, '#c89b6a', '#8a6d4b');
  stationLabel(ctx, b, 'CHOPPING BOARD');
  const slot = b.slot;
  const hot = hover && pointIn(slot, hover.x, hover.y);
  roundRectPath(ctx, slot.x, slot.y, slot.w, slot.h, 10);
  ctx.fillStyle = hot ? '#e8c491' : '#dcb078';
  ctx.fill();
  ctx.strokeStyle = '#8a6d4b';
  ctx.lineWidth = 2;
  ctx.stroke();
  const item = state.board;
  if (!item) {
    text(ctx, '+ lettuce', slot.x + slot.w / 2, slot.y + 34, 12, '#7a5a38', 700, 'center');
    text(ctx, 'or tomato', slot.x + slot.w / 2, slot.y + 56, 12, '#7a5a38', 700, 'center');
    return;
  }
  const cutId = item.kind === 'lettuce_raw' ? 'lettuce_cut' : 'tomato_cut';
  drawIngredient(ctx, item.done ? cutId : item.kind, slot.x + slot.w / 2, slot.y + slot.h / 2 - 8, 26);
  if (!item.done) {
    progressBar(ctx, slot.x + 10, slot.y + slot.h - 18, slot.w - 20, 8, item.t / CHOP_SECONDS, '#f2a007');
    text(ctx, 'CHOPPING…', slot.x + slot.w / 2, slot.y + slot.h - 28, 11, '#7a5a38', 800, 'center');
  } else {
    text(ctx, 'READY!', slot.x + slot.w / 2, slot.y + slot.h - 28, 11, '#2e7d32', 800, 'center');
  }
}

function drawFryer(ctx, state, hover) {
  const f = LAYOUT.fryer;
  panel(ctx, f, '#3a3f46', '#22262b');
  stationLabel(ctx, f, 'FRYER — click to start, 8s', '#ffd166');
  f.slots.forEach((slot, i) => {
    const item = state.fryer[i];
    const hot = hover && pointIn(slot, hover.x, hover.y);
    roundRectPath(ctx, slot.x, slot.y, slot.w, slot.h, 10);
    ctx.fillStyle = hot ? '#4a4030' : '#33291a';
    ctx.fill();
    ctx.strokeStyle = '#8a6d4b';
    ctx.lineWidth = 2;
    ctx.stroke();
    if (!item) {
      text(ctx, '+ start fries', slot.x + slot.w / 2, slot.y + slot.h / 2, 13, '#c9a86a', 700, 'center');
      return;
    }
    drawFries(ctx, slot.x + slot.w / 2, slot.y + slot.h / 2 - 4, 26, item.stage === 'burnt');
    if (item.stage === 'frying') {
      progressBar(ctx, slot.x + 10, slot.y + slot.h - 18, slot.w - 20, 8, item.t / FRY_SECONDS, '#f2b234');
      text(ctx, 'FRYING…', slot.x + slot.w / 2, slot.y + slot.h - 28, 11, '#ffd166', 800, 'center');
    } else if (item.stage === 'done') {
      progressBar(ctx, slot.x + 10, slot.y + slot.h - 18, slot.w - 20, 8, 1 - item.t / FRY_BURN_SECONDS, '#5da24f');
      text(ctx, 'GOLDEN!', slot.x + slot.w / 2, slot.y + slot.h - 28, 11, '#7be495', 800, 'center');
    } else {
      text(ctx, 'BURNT!', slot.x + slot.w / 2, slot.y + slot.h - 28, 11, '#ff5a4e', 800, 'center');
    }
  });
}

function drawPlate(ctx, state, hover) {
  const p = LAYOUT.plate;
  const match = matchingOrder(state);
  panel(ctx, p, match ? '#e6f7e6' : '#fff8e7', match ? '#2e9e4f' : '#c9a86a');
  stationLabel(ctx, p, 'ASSEMBLY PLATE');
  const cx = p.x + p.w / 2;
  const cy = p.y + 108;
  // The plate itself.
  ctx.fillStyle = '#f4f6f8';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 18, 120, 30, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c8ccd2';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#e8ebee';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 14, 88, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  if (state.plate.length === 0) {
    text(ctx, 'empty plate — click ingredients', cx, cy - 30, 13, '#a08c6d', 600, 'center');
  } else if (state.plate.length === 1 && state.plate[0] === 'fries') {
    drawFries(ctx, cx, cy - 6, 34, false);
  } else {
    drawBurgerStack(ctx, state.plate, cx, cy + 6, 52);
  }
  if (match) {
    panel(ctx, { x: p.x + 14, y: p.y + p.h - 34, w: p.w - 28, h: 24 }, '#2e9e4f');
    text(ctx, `✓ MATCHES ${recipeById(match.recipeId).name.toUpperCase()} — SERVE IT!`, cx, p.y + p.h - 22, 12, '#fff', 800, 'center');
  } else if (state.plate.length > 0) {
    text(ctx, `${state.plate.length} item${state.plate.length > 1 ? 's' : ''} on the plate`, cx, p.y + p.h - 20, 12, '#8a6d4b', 700, 'center');
  }
}

function drawServe(ctx, state, hover) {
  const s = LAYOUT.serve;
  const match = matchingOrder(state);
  const hot = hover && pointIn(s, hover.x, hover.y);
  panel(ctx, s, match ? '#2e9e4f' : hot ? '#ffe9b8' : '#fff8e7', match ? '#1e6e34' : '#c9a86a');
  stationLabel(ctx, s, 'SERVE HERE');
  const cx = s.x + s.w / 2;
  // Bell.
  ctx.fillStyle = match ? '#ffd166' : '#c9a86a';
  ctx.beginPath();
  ctx.arc(cx, s.y + 92, 46, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(cx - 46, s.y + 92, 92, 8);
  ctx.fillStyle = match ? '#ffd166' : '#c9a86a';
  ctx.beginPath();
  ctx.arc(cx, s.y + 112, 8, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, match ? 'SERVE NOW!' : 'click to serve', cx, s.y + 150, match ? 18 : 13, match ? '#fff' : '#8a6d4b', 800, 'center');
  if (match) {
    text(ctx, `${recipeById(match.recipeId).name} — $${recipeById(match.recipeId).price}`, cx, s.y + 128, 13, '#e6f7e6', 700, 'center');
  }
}

function drawTrash(ctx, state, hover) {
  const t = LAYOUT.trash;
  const hot = hover && pointIn(t, hover.x, hover.y);
  panel(ctx, t, hot ? '#ffe0d6' : '#fff8e7', '#c9a86a');
  stationLabel(ctx, t, 'TRASH');
  const cx = t.x + t.w / 2;
  ctx.fillStyle = '#8a6d4b';
  roundRectPath(ctx, cx - 34, t.y + 78, 68, 76, 8);
  ctx.fill();
  ctx.fillStyle = '#6b4a2f';
  ctx.fillRect(cx - 40, t.y + 68, 80, 12);
  ctx.fillStyle = '#fff8e7';
  for (let i = -1; i <= 1; i++) ctx.fillRect(cx + i * 18 - 2, t.y + 92, 4, 46);
  text(ctx, 'toss what', cx, t.y + 168, 11, '#8a6d4b', 600, 'center');
}

function drawRecipes(ctx) {
  const r = LAYOUT.recipes;
  panel(ctx, r, '#fff8e7', '#c9a86a');
  text(ctx, r.label, r.x + 12, r.y + 16, 12, '#6b4a2f', 800, 'left');
  let y = r.y + 34;
  for (const recipe of RECIPES) {
    text(ctx, recipe.name, r.x + 10, y, 12, '#3d2b1f', 800, 'left');
    text(ctx, `$${recipe.price}`, r.x + r.w - 10, y, 12, '#2e7d32', 800, 'right');
    y += 16;
    const chips = recipe.needs.map((n) => INGREDIENTS[n].short).join(' + ');
    ctx.font = `600 10px ${FONT}`;
    ctx.fillStyle = '#8a6d4b';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    // Wrap long chip lists onto two lines.
    const words = chips.split(' + ');
    let line = '';
    for (const w of words) {
      const trial = line ? `${line} + ${w}` : w;
      if (ctx.measureText(trial).width > r.w - 20 && line) {
        ctx.fillText(line, r.x + 10, y);
        y += 13;
        line = w;
      } else line = trial;
    }
    ctx.fillText(line, r.x + 10, y);
    y += 24;
  }
  text(ctx, 'Tip: serve fast for', r.x + 10, r.y + r.h - 34, 11, '#8a6d4b', 700, 'left');
  text(ctx, 'bigger tips!', r.x + 10, r.y + r.h - 18, 11, '#8a6d4b', 700, 'left');
}

function drawHandTray(ctx, state) {
  const h = LAYOUT.hand;
  panel(ctx, h, '#fff8e7', '#c9a86a');
  text(ctx, h.label, h.x + 12, h.y + 16, 12, '#6b4a2f', 800, 'left');
  if (state.hand) {
    drawIngredient(ctx, state.hand, h.x + 52, h.y + 42, 22);
    text(ctx, INGREDIENTS[state.hand].name, h.x + 88, h.y + 36, 15, '#3d2b1f', 800, 'left');
    text(ctx, INGREDIENTS[state.hand].desc, h.x + 88, h.y + 56, 11, '#8a6d4b', 600, 'left');
  } else {
    text(ctx, 'empty — click a bin or a station', h.x + 12, h.y + 42, 13, '#a08c6d', 600, 'left');
  }
}

function drawRush(ctx, state) {
  const r = LAYOUT.rush;
  panel(ctx, r, '#fff8e7', '#c9a86a');
  text(ctx, r.label, r.x + 12, r.y + 16, 12, '#6b4a2f', 800, 'left');
  const event = state.lastEvent ? state.lastEvent.text : 'No orders served yet — the rush is coming!';
  text(ctx, event, r.x + 12, r.y + 40, 13, '#3d2b1f', 700, 'left');
  text(
    ctx,
    `Served ${state.served} · Lost ${state.lost} · Tips $${state.tips} · Best combo ×${state.maxCombo}`,
    r.x + 12, r.y + 60, 12, '#8a6d4b', 600, 'left',
  );
}

function drawHintBar(ctx, state) {
  const h = LAYOUT.hint;
  ctx.fillStyle = '#2c1e14';
  ctx.fillRect(h.x, h.y, h.w, h.h);
  text(ctx, 'TIP:', 16, h.y + 28, 13, '#ffd166', 800, 'left');
  text(ctx, state.hint, 62, h.y + 28, 15, '#ffd166', 700, 'left');
  text(ctx, 'Space pause · M mute · B/P/C/L/T grab', CANVAS_W - 20, h.y + 28, 12, '#d8c3a5', 600, 'right');
}

function drawHeldItem(ctx, state, mouse) {
  if (!state.hand || !mouse) return;
  ctx.save();
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = 'rgba(255,248,231,0.95)';
  ctx.beginPath();
  ctx.arc(mouse.x, mouse.y, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c9a86a';
  ctx.lineWidth = 2;
  ctx.stroke();
  drawIngredient(ctx, state.hand, mouse.x, mouse.y, 18);
  ctx.restore();
}

// --- Kitchen background ----------------------------------------------------------
function drawKitchenBackdrop(ctx) {
  // Warm wall with tiles.
  ctx.fillStyle = '#f7e8c9';
  ctx.fillRect(0, 56, CANVAS_W, 124);
  ctx.fillStyle = '#f2dfba';
  for (let x = 0; x < CANVAS_W; x += 64) {
    ctx.fillRect(x, 56, 1, 124);
    ctx.fillRect(x, 120, 64, 1);
  }
  // Wooden counter top.
  const grad = ctx.createLinearGradient(0, 180, 0, 664);
  grad.addColorStop(0, '#a9713d');
  grad.addColorStop(1, '#8a5a2e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 180, CANVAS_W, 484);
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  for (let y = 200; y < 664; y += 46) ctx.fillRect(0, y, CANVAS_W, 2);
}

// --- Screens ------------------------------------------------------------------------
function drawTitle(ctx, state) {
  drawKitchenBackdrop(ctx);
  ctx.fillStyle = 'rgba(44,30,20,0.55)';
  ctx.fillRect(0, 56, CANVAS_W, 608);
  // Title card.
  panel(ctx, { x: 290, y: 96, w: 700, h: 500 }, '#fff8e7', '#c9a86a');
  text(ctx, 'SIMMER & SERVE', 640, 150, 44, '#3d2b1f', 800, 'center');
  text(ctx, 'Run a tiny burger joint through one frantic 150-second shift.', 640, 196, 16, '#8a6d4b', 600, 'center');
  text(ctx, 'Grill patties, chop veg, fry the fries, stack the order — serve it before', 640, 220, 14, '#8a6d4b', 600, 'center');
  text(ctx, 'the customer walks out. Fast hands earn fat tips and big combos!', 640, 240, 14, '#8a6d4b', 600, 'center');
  // Menu price list.
  let y = 286;
  text(ctx, '— TODAY’S MENU —', 640, y, 13, '#6b4a2f', 800, 'center');
  y += 26;
  for (const recipe of RECIPES) {
    text(ctx, recipe.name, 400, y, 15, '#3d2b1f', 700, 'left');
    text(ctx, recipe.needs.map((n) => INGREDIENTS[n].short).join(' + '), 640, y, 12, '#8a6d4b', 600, 'center');
    text(ctx, `$${recipe.price}`, 880, y, 15, '#2e7d32', 800, 'right');
    y += 26;
  }
  // Start button.
  panel(ctx, { x: 490, y: 486, w: 300, h: 52 }, '#2e9e4f', '#1e6e34');
  text(ctx, '▶  START SHIFT', 640, 513, 22, '#fff', 800, 'center');
  text(ctx, 'Click the button, or press Enter', 640, 556, 12, '#a08c6d', 600, 'center');
  // Star goals.
  text(ctx, '★ $60  ★★ $100  ★★★ $150', 640, 584, 13, '#b8860b', 800, 'center');
}

function drawEnd(ctx, state) {
  drawKitchenBackdrop(ctx);
  ctx.fillStyle = 'rgba(44,30,20,0.55)';
  ctx.fillRect(0, 56, CANVAS_W, 608);
  panel(ctx, { x: 340, y: 96, w: 600, h: 460 }, '#fff8e7', '#c9a86a');
  text(ctx, 'SHIFT OVER!', 640, 150, 40, '#3d2b1f', 800, 'center');
  // Stars.
  let stars = '';
  for (let i = 0; i < 3; i++) stars += i < state.stars ? '★' : '☆';
  text(ctx, stars, 640, 200, 40, '#f2a007', 800, 'center');
  const rows = [
    ['Money earned', `$${state.money}`],
    ['Goal', `$${STAR_LINES[2]} for ★★★`],
    ['Orders served', `${state.served}`],
    ['Orders lost', `${state.lost}`],
    ['Tips collected', `$${state.tips}`],
    ['Best combo', `×${state.maxCombo}`],
  ];
  let y = 252;
  for (const [label, value] of rows) {
    text(ctx, label, 420, y, 16, '#8a6d4b', 700, 'left');
    text(ctx, value, 860, y, 16, '#3d2b1f', 800, 'right');
    y += 32;
  }
  const verdict = state.stars >= 3
    ? 'Three stars! The lunch rush bows to you.'
    : state.stars === 2
      ? 'Two stars — the regulars are coming back!'
      : state.stars === 1
        ? 'One star — a solid first shift. Keep cooking!'
        : 'No stars this time — the grill misses you already.';
  text(ctx, verdict, 640, y + 8, 15, '#3d2b1f', 700, 'center');
  panel(ctx, { x: 490, y: 486, w: 300, h: 52 }, '#2e9e4f', '#1e6e34');
  text(ctx, '↻  PLAY AGAIN', 640, 513, 22, '#fff', 800, 'center');
}

function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(44,30,20,0.6)';
  ctx.fillRect(0, 56, CANVAS_W, 608);
  text(ctx, 'PAUSED', 640, 340, 44, '#fff', 800, 'center');
  text(ctx, 'Press Space or P to resume', 640, 388, 16, '#ffd166', 600, 'center');
}

// --- Main render -----------------------------------------------------------------------
export function render(ctx, state, ui) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  if (state.screen === 'title') {
    drawHud(ctx, state);
    drawTitle(ctx, state);
    drawHintBar(ctx, state);
    return;
  }
  if (state.screen === 'end') {
    drawHud(ctx, state);
    drawEnd(ctx, state);
    drawHintBar(ctx, state);
    return;
  }
  drawKitchenBackdrop(ctx);
  drawHud(ctx, state);
  drawOrders(ctx, state);
  drawBins(ctx, state, ui.hover);
  drawGrill(ctx, state, ui.hover);
  drawBoard(ctx, state, ui.hover);
  drawFryer(ctx, state, ui.hover);
  drawPlate(ctx, state, ui.hover);
  drawServe(ctx, state, ui.hover);
  drawTrash(ctx, state, ui.hover);
  drawRecipes(ctx);
  drawHandTray(ctx, state);
  drawRush(ctx, state);
  drawHintBar(ctx, state);
  drawHeldItem(ctx, state, ui.mouse);
  if (state.paused) drawPaused(ctx);
}
