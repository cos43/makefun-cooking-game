// Simmer & Serve — mouse and keyboard routing: turn a click position into
// a station action, and a key press into a shortcut. No drawing here.
import { LAYOUT, BIN_ITEMS, pointIn } from './config.js';
import {
  clickBin, clickGrillSlot, clickBoard, clickFryerSlot,
  clickPlate, clickServe, clickTrash,
} from './stations.js';
import { toggleMute } from './audio.js';

// Where the mouse is, in canvas pixels. `hover` drives station highlights.
export function makePointer() {
  return { x: 0, y: 0, inside: false };
}

export function canvasPosition(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function applyResult(state, result) {
  if (!result) return;
  state.hint = result.hint;
}

// One click at canvas coordinates (x, y). Returns the action taken.
export function handleClick(state, x, y, playSound) {
  // Mute button lives in the HUD.
  if (pointIn({ x: 1180, y: 10, w: 84, h: 36 }, x, y)) {
    toggleMute();
    state.hint = 'Sound off. Press M or click again to turn it back on.';
    return { action: 'mute' };
  }
  if (state.screen === 'title') {
    if (pointIn({ x: 490, y: 486, w: 300, h: 52 }, x, y)) {
      return { action: 'start' };
    }
    return { action: 'none' };
  }
  if (state.screen === 'end') {
    if (pointIn({ x: 490, y: 486, w: 300, h: 52 }, x, y)) {
      return { action: 'restart' };
    }
    return { action: 'none' };
  }
  if (state.paused) return { action: 'none' };

  // Ingredient bins.
  const b = LAYOUT.bins;
  for (let i = 0; i < BIN_ITEMS.length; i++) {
    const box = { x: b.x, y: b.y + i * (b.h + b.gap), w: b.w, h: b.h };
    if (pointIn(box, x, y)) {
      const result = clickBin(state, BIN_ITEMS[i]);
      applyResult(state, result);
      playSound(result.sound);
      return { action: 'bin', result };
    }
  }
  // Grill slots.
  for (let i = 0; i < LAYOUT.grill.slots.length; i++) {
    if (pointIn(LAYOUT.grill.slots[i], x, y)) {
      const result = clickGrillSlot(state, i);
      applyResult(state, result);
      playSound(result.sound);
      return { action: 'grill', result };
    }
  }
  // Chopping board.
  if (pointIn(LAYOUT.board.slot, x, y)) {
    const result = clickBoard(state);
    applyResult(state, result);
    playSound(result.sound);
    return { action: 'board', result };
  }
  // Fryer slots.
  for (let i = 0; i < LAYOUT.fryer.slots.length; i++) {
    if (pointIn(LAYOUT.fryer.slots[i], x, y)) {
      const result = clickFryerSlot(state, i);
      applyResult(state, result);
      playSound(result.sound);
      return { action: 'fryer', result };
    }
  }
  // Assembly plate.
  if (pointIn(LAYOUT.plate, x, y)) {
    const result = clickPlate(state);
    applyResult(state, result);
    playSound(result.sound);
    return { action: 'plate', result };
  }
  // Serve counter.
  if (pointIn(LAYOUT.serve, x, y)) {
    const result = clickServe(state);
    applyResult(state, result);
    playSound(result.sound);
    return { action: 'serve', result };
  }
  // Trash.
  if (pointIn(LAYOUT.trash, x, y)) {
    const result = clickTrash(state);
    applyResult(state, result);
    playSound(result.sound);
    return { action: 'trash', result };
  }
  // Clicking a ticket serves it when the plate matches.
  const t = LAYOUT.tickets;
  for (let i = 0; i < 4; i++) {
    const box = { x: t.x + i * (t.w + t.gap), y: t.y, w: t.w, h: t.h };
    if (pointIn(box, x, y)) {
      const result = clickServe(state);
      applyResult(state, result);
      playSound(result.sound);
      return { action: 'serve-ticket', result };
    }
  }
  return { action: 'none' };
}

// Keyboard shortcuts. Returns 'start' / 'restart' / 'pause' / 'mute' / 'none'.
export function handleKey(state, key) {
  const k = key.toLowerCase();
  if (k === 'm') {
    toggleMute();
    return 'mute';
  }
  if (state.screen === 'title' && (k === 'enter' || k === ' ')) return 'start';
  if (state.screen === 'end' && (k === 'enter' || k === ' ')) return 'restart';
  if (state.screen !== 'play') return 'none';
  if (k === ' ' || k === 'p') return 'pause';
  if (state.paused) return 'none';
  const binByKey = { b: 'bun', p: 'patty_raw', c: 'cheese', l: 'lettuce_raw', t: 'tomato_raw' };
  if (binByKey[k]) {
    const result = clickBin(state, binByKey[k]);
    state.hint = result.hint;
    return result.ok ? 'bin' : 'error';
  }
  return 'none';
}
