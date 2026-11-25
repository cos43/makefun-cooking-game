// Simmer & Serve — startup, the main loop, and the staged scenes used for
// screenshots (?scene=title|play|end). The game itself lives in the other
// modules; this file only wires them together.
import { CANVAS_W, CANVAS_H } from './config.js';
import { newGameState, updateGame, startShift, starCount } from './state.js';
import { render } from './render.js';
import { handleClick, handleKey, canvasPosition } from './input.js';
import {
  soundPickup, soundPlace, soundChop, soundServe, soundError, soundBurnt,
  soundNewOrder, startSizzle, stopSizzle,
} from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = CANVAS_W;
canvas.height = CANVAS_H;

let state = newGameState();
const ui = { mouse: null, hover: null };
const params = new URLSearchParams(window.location.search);
const scene = params.get('scene');
let frozen = false; // staged scenes never advance, so screenshots are exact

// --- Staged scenes for screenshots -------------------------------------------
// Each one builds a real game state through the same constructors the live
// game uses, then freezes the clock so the render is deterministic.
function stageTitleScene() {
  state = newGameState();
  state.hint = 'Click START SHIFT to open the kitchen!';
  frozen = true;
}

function stagePlayScene() {
  state = newGameState();
  state.screen = 'play';
  state.elapsed = 78;
  state.timeLeft = 72; // 01:12 on the clock
  state.money = 48;
  state.combo = 3;
  state.maxCombo = 4;
  state.served = 6;
  state.lost = 1;
  state.tips = 9;
  state.orders = [
    { id: 1, recipeId: 'garden', patience: 30, maxPatience: 48 },
    { id: 2, recipeId: 'classic', patience: 12, maxPatience: 48 },
    { id: 3, recipeId: 'fries', patience: 40, maxPatience: 48 },
  ];
  // Grill: one patty halfway cooked, one ready to grab.
  state.grill = [
    { kind: 'patty_raw', stage: 'cooking', t: 3 },
    { kind: 'patty_raw', stage: 'done', t: 1 },
  ];
  // Board: a tomato halfway chopped.
  state.board = { kind: 'tomato_raw', t: 1.5, done: false };
  // Fryer: fries five seconds in.
  state.fryer = [{ stage: 'frying', t: 5 }, null];
  // Plate: a Classic Burger mid-assembly, matching the second ticket.
  state.plate = ['bun', 'patty_cooked', 'lettuce_cut'];
  // Cheese in hand, ready to go on the next burger.
  state.hand = 'cheese';
  state.hint = 'Plate matches Classic Burger — serve it at the bell!';
  state.lastEvent = { kind: 'serve', text: 'Cheese Burger served! +$11 (tip $2)', at: 74 };
  frozen = true;
}

function stageEndScene() {
  state = newGameState();
  state.screen = 'end';
  state.timeLeft = 0;
  state.money = 152;
  state.served = 15;
  state.lost = 2;
  state.tips = 21;
  state.maxCombo = 6;
  state.stars = starCount(152, [60, 100, 150]);
  state.hint = 'Shift over! Press Play Again for another round.';
  frozen = true;
}

if (scene === 'title') stageTitleScene();
else if (scene === 'play') stagePlayScene();
else if (scene === 'end') stageEndScene();

// --- Sounds -------------------------------------------------------------------
function playSound(name) {
  try {
    if (name === 'pickup') soundPickup();
    else if (name === 'place') soundPlace();
    else if (name === 'serve') soundServe();
    else if (name === 'error') soundError();
    else if (name === 'burnt') soundBurnt();
  } catch {
    // Audio must never break the game.
  }
}

function playEventSounds(events) {
  for (const event of events) {
    try {
      if (event === 'chop-done') soundChop();
      else if (event === 'burnt') soundBurnt();
      else if (event === 'new-order') soundNewOrder();
      else if (event === 'order-lost') soundError();
    } catch {
      // Ignore audio failures.
    }
  }
}

function updateSizzle() {
  const busy = state.screen === 'play' && !state.paused && (
    state.grill.some((s) => s && s.stage === 'cooking') ||
    state.fryer.some((s) => s && s.stage === 'frying')
  );
  try {
    if (busy) startSizzle();
    else stopSizzle();
  } catch {
    // Ignore audio failures.
  }
}

// --- Input ----------------------------------------------------------------------
canvas.addEventListener('mousemove', (event) => {
  const pos = canvasPosition(event, canvas);
  ui.mouse = pos;
  ui.hover = pos;
});
canvas.addEventListener('mouseleave', () => {
  ui.mouse = null;
  ui.hover = null;
});
canvas.addEventListener('click', (event) => {
  if (frozen) return;
  const pos = canvasPosition(event, canvas);
  const result = handleClick(state, pos.x, pos.y, playSound);
  if (result.action === 'start' || result.action === 'restart') {
    state = startShift(state);
    playSound('place');
  }
});
window.addEventListener('keydown', (event) => {
  if (frozen) return;
  if ([' ', 'ArrowUp', 'ArrowDown'].includes(event.key)) event.preventDefault();
  const action = handleKey(state, event.key);
  if (action === 'start' || action === 'restart') {
    state = startShift(state);
    playSound('place');
  } else if (action === 'pause') {
    state.paused = !state.paused;
    state.hint = state.paused ? 'Paused — press Space to get back to the rush.' : 'Back to the rush!';
  } else if (action === 'bin') {
    playSound('pickup');
  } else if (action === 'error') {
    playSound('error');
  }
});

// --- Main loop --------------------------------------------------------------------
let lastTime = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  if (!frozen) {
    const events = updateGame(state, dt);
    if (events.length > 0) playEventSounds(events);
    updateSizzle();
  }
  render(ctx, state, ui);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
