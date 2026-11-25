// Simmer & Serve — the game state: orders, stations, scoring and the shift clock.
// Pure logic, no DOM and no audio, so Node can import it for a headless test.
import {
  SHIFT_SECONDS, MAX_ORDERS, ORDER_PATIENCE, FIRST_ORDER_DELAY,
  SPAWN_START, SPAWN_END, GRILL_COOK_SECONDS, GRILL_BURN_SECONDS,
  CHOP_SECONDS, FRY_SECONDS, FRY_BURN_SECONDS, COMBO_STEP, COMBO_MAX,
  RECIPES, recipeById,
} from './config.js';

let orderCounter = 0;

export function newGameState() {
  return {
    screen: 'title', // 'title' | 'play' | 'end'
    paused: false,
    timeLeft: SHIFT_SECONDS,
    elapsed: 0,
    money: 0,
    combo: 0,
    maxCombo: 0,
    served: 0,
    lost: 0,
    tips: 0,
    hand: null, // ingredient id or null
    plate: [], // ingredient ids, bottom to top
    grill: [null, null], // { kind: 'patty_raw', stage: 'cooking'|'done'|'burnt', t }
    board: null, // { kind: 'lettuce_raw'|'tomato_raw', t }
    fryer: [null, null], // { stage: 'frying'|'done'|'burnt', t }
    orders: [], // { id, recipeId, patience, maxPatience }
    spawnIn: FIRST_ORDER_DELAY,
    hint: 'Click START SHIFT to open the kitchen!',
    lastEvent: null, // { kind, text, at } for the rush panel
    stars: 0,
  };
}

// Pick the next order. Weighted towards cheap dishes early so the player
// learns the loop, then the full menu as the rush builds.
export function pickRecipe(elapsed) {
  const pool = elapsed < 40 ? RECIPES.slice(0, 4) : RECIPES;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function spawnOrder(state) {
  if (state.orders.length >= MAX_ORDERS) return null;
  const recipe = pickRecipe(state.elapsed);
  const order = {
    id: ++orderCounter,
    recipeId: recipe.id,
    patience: ORDER_PATIENCE,
    maxPatience: ORDER_PATIENCE,
  };
  state.orders.push(order);
  return order;
}

// How long until the next order, shrinking as the shift goes on.
export function spawnInterval(elapsed) {
  const k = Math.min(1, elapsed / SHIFT_SECONDS);
  return SPAWN_START + (SPAWN_END - SPAWN_START) * k;
}

// The plate matches a recipe when it holds exactly the same multiset.
export function plateMatchesRecipe(plate, recipeId) {
  const recipe = recipeById(recipeId);
  if (!recipe || plate.length !== recipe.needs.length) return false;
  const counts = new Map();
  for (const item of plate) counts.set(item, (counts.get(item) ?? 0) + 1);
  for (const item of recipe.needs) {
    const left = counts.get(item) ?? 0;
    if (left === 0) return false;
    counts.set(item, left - 1);
  }
  return true;
}

// The order this plate can serve right now: the most impatient match wins.
export function matchingOrder(state) {
  let best = null;
  for (const order of state.orders) {
    if (plateMatchesRecipe(state.plate, order.recipeId)) {
      if (!best || order.patience < best.patience) best = order;
    }
  }
  return best;
}

export function comboMultiplier(combo) {
  return Math.min(COMBO_MAX, 1 + COMBO_STEP * combo);
}

export function starCount(money, lines) {
  let stars = 0;
  for (const line of lines) if (money >= line) stars++;
  return stars;
}

// Serve the matching order. Returns the payment breakdown, or null.
export function serveOrder(state) {
  const order = matchingOrder(state);
  if (!order) return null;
  const recipe = recipeById(order.recipeId);
  const patienceFraction = Math.max(0, order.patience / order.maxPatience);
  const tip = Math.round(recipe.price * 0.5 * patienceFraction);
  const mult = comboMultiplier(state.combo);
  const paid = Math.round((recipe.price + tip) * mult);
  state.money += paid;
  state.tips += tip;
  state.combo += 1;
  state.maxCombo = Math.max(state.maxCombo, state.combo);
  state.served += 1;
  state.orders = state.orders.filter((o) => o.id !== order.id);
  state.plate = [];
  state.lastEvent = { kind: 'serve', text: `${recipe.name} served! +$${paid}${tip > 0 ? ` (tip $${tip})` : ''}`, at: state.elapsed };
  return { order, recipe, tip, mult, paid };
}

// One tick of the shift clock. dt is seconds. Returns events for sounds.
export function updateGame(state, dt) {
  if (state.screen !== 'play' || state.paused) return [];
  const events = [];
  state.elapsed += dt;
  state.timeLeft = Math.max(0, SHIFT_SECONDS - state.elapsed);

  // Grill: raw -> done -> burnt.
  for (const slot of state.grill) {
    if (!slot) continue;
    slot.t += dt;
    if (slot.stage === 'cooking' && slot.t >= GRILL_COOK_SECONDS) {
      slot.stage = 'done';
      slot.t = 0;
      events.push('grill-done');
    } else if (slot.stage === 'done' && slot.t >= GRILL_BURN_SECONDS) {
      slot.stage = 'burnt';
      slot.t = 0;
      events.push('burnt');
    }
  }
  // Chopping board.
  if (state.board) {
    state.board.t += dt;
    if (state.board.t >= CHOP_SECONDS) {
      state.board.done = true;
      events.push('chop-done');
    }
  }
  // Fryer: frying -> done -> burnt.
  for (const slot of state.fryer) {
    if (!slot) continue;
    slot.t += dt;
    if (slot.stage === 'frying' && slot.t >= FRY_SECONDS) {
      slot.stage = 'done';
      slot.t = 0;
      events.push('fry-done');
    } else if (slot.stage === 'done' && slot.t >= FRY_BURN_SECONDS) {
      slot.stage = 'burnt';
      slot.t = 0;
      events.push('burnt');
    }
  }
  // Orders lose patience; a timed-out order is lost and breaks the combo.
  for (const order of [...state.orders]) {
    order.patience -= dt;
    if (order.patience <= 0) {
      state.orders = state.orders.filter((o) => o.id !== order.id);
      state.lost += 1;
      state.combo = 0;
      state.lastEvent = { kind: 'lost', text: `${recipeById(order.recipeId).name} walked out! Combo lost.`, at: state.elapsed };
      events.push('order-lost');
    }
  }
  // Spawn the next order.
  state.spawnIn -= dt;
  if (state.spawnIn <= 0) {
    const order = spawnOrder(state);
    if (order) {
      events.push('new-order');
      state.spawnIn = spawnInterval(state.elapsed);
    } else {
      state.spawnIn = 2; // board full: check again soon
    }
  }
  // End of shift.
  if (state.timeLeft <= 0) {
    state.screen = 'end';
    state.stars = starCount(state.money, [60, 100, 150]);
    events.push('shift-end');
  }
  return events;
}

export function startShift(state) {
  const fresh = newGameState();
  fresh.screen = 'play';
  fresh.hint = 'Grab a bun from the bins to start your first burger!';
  return fresh;
}
