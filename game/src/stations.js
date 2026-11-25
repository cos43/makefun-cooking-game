// Simmer & Serve — what a click does at each station of the kitchen.
// Every handler takes the state and the player's hand, mutates the state,
// and returns { ok, sound, hint } so the caller can play audio and update
// the hint bar. Nothing here touches the canvas.
import { INGREDIENTS } from './config.js';
import { matchingOrder, serveOrder } from './state.js';

function fail(hint) {
  return { ok: false, sound: 'error', hint };
}

// --- Ingredient bins -------------------------------------------------------
export function clickBin(state, itemId) {
  if (state.hand) return fail('Your hand is full — plate it or trash it first.');
  state.hand = itemId;
  return { ok: true, sound: 'pickup', hint: `${INGREDIENTS[itemId].name} in hand. ${INGREDIENTS[itemId].desc}.` };
}

// --- Grill -----------------------------------------------------------------
export function clickGrillSlot(state, index) {
  const slot = state.grill[index];
  if (!slot) {
    if (state.hand !== 'patty_raw') {
      return state.hand
        ? fail('Only a raw patty goes on the grill.')
        : fail('Take a raw patty from the bins first.');
    }
    state.grill[index] = { kind: 'patty_raw', stage: 'cooking', t: 0 };
    state.hand = null;
    return { ok: true, sound: 'place', hint: 'Patty sizzling! Grab it when the bar turns green.' };
  }
  if (slot.stage === 'cooking') return fail('Still cooking — wait for the green bar.');
  if (state.hand) return fail('Your hand is full — plate it or trash it first.');
  if (slot.stage === 'burnt') {
    state.hand = 'patty_burnt';
    state.grill[index] = null;
    return { ok: true, sound: 'burnt', hint: 'Burnt patty! Drop it in the trash.' };
  }
  state.hand = 'patty_cooked';
  state.grill[index] = null;
  return { ok: true, sound: 'pickup', hint: 'Grilled patty in hand — add it to the plate.' };
}

// --- Chopping board ---------------------------------------------------------
export function clickBoard(state) {
  const slot = state.board;
  if (!slot) {
    if (state.hand !== 'lettuce_raw' && state.hand !== 'tomato_raw') {
      return state.hand
        ? fail('Only lettuce or tomato goes on the chopping board.')
        : fail('Take lettuce or tomato from the bins first.');
    }
    state.board = { kind: state.hand, t: 0, done: false };
    state.hand = null;
    return { ok: true, sound: 'place', hint: 'Chopping… it will be ready in a moment.' };
  }
  if (!slot.done) return fail('Still chopping — wait for the green bar.');
  if (state.hand) return fail('Your hand is full — plate it or trash it first.');
  state.hand = slot.kind === 'lettuce_raw' ? 'lettuce_cut' : 'tomato_cut';
  state.board = null;
  return { ok: true, sound: 'pickup', hint: `${INGREDIENTS[state.hand].name} in hand — add it to the plate.` };
}

// --- Fryer ------------------------------------------------------------------
export function clickFryerSlot(state, index) {
  const slot = state.fryer[index];
  if (!slot) {
    if (state.hand) return fail('Empty your hand first, then click the fryer to start fries.');
    state.fryer[index] = { stage: 'frying', t: 0 };
    return { ok: true, sound: 'place', hint: 'Fries in the fryer! Grab them when golden.' };
  }
  if (slot.stage === 'frying') return fail('Still frying — wait for the golden bar.');
  if (state.hand) return fail('Your hand is full — plate it or trash it first.');
  if (slot.stage === 'burnt') {
    state.hand = 'fries_burnt';
    state.fryer[index] = null;
    return { ok: true, sound: 'burnt', hint: 'Burnt fries! Drop them in the trash.' };
  }
  state.hand = 'fries';
  state.fryer[index] = null;
  return { ok: true, sound: 'pickup', hint: 'Crispy fries in hand — add them to the plate.' };
}

// --- Assembly plate ----------------------------------------------------------
export function clickPlate(state) {
  if (state.hand) {
    state.plate.push(state.hand);
    const held = state.hand;
    state.hand = null;
    const match = matchingOrder(state);
    const hint = match
      ? `Plate matches ${match.recipeId === 'fries' ? 'Crispy Fries' : 'an order'} — serve it!`
      : `${INGREDIENTS[held].name} on the plate. Keep building to match a ticket.`;
    return { ok: true, sound: 'place', hint };
  }
  if (state.plate.length === 0) return fail('The plate is empty — add ingredients first.');
  state.hand = state.plate.pop();
  return { ok: true, sound: 'pickup', hint: `Took ${INGREDIENTS[state.hand].name} back off the plate.` };
}

// --- Serve counter ------------------------------------------------------------
export function clickServe(state) {
  const match = matchingOrder(state);
  if (!match) {
    return state.plate.length === 0
      ? fail('Nothing on the plate to serve yet.')
      : fail('This plate matches no ticket — check the recipes.');
  }
  const result = serveOrder(state);
  const multText = result.mult > 1 ? ` ×${result.mult.toFixed(1)} combo` : '';
  return {
    ok: true,
    sound: 'serve',
    hint: `${result.recipe.name} served for $${result.paid}${multText}! Combo ×${state.combo}.`,
  };
}

// --- Trash ---------------------------------------------------------------------
export function clickTrash(state) {
  if (state.hand) {
    const name = INGREDIENTS[state.hand].name;
    state.hand = null;
    return { ok: true, sound: 'place', hint: `${name} tossed. Back to work!` };
  }
  if (state.plate.length === 0) return fail('Nothing to throw away.');
  state.plate = [];
  return { ok: true, sound: 'place', hint: 'Plate cleared. Start the dish again.' };
}
