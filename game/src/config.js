// Simmer & Serve — all tunable numbers, the menu, and the kitchen layout.
// One file holds every constant so balancing the game never touches logic.
export const CANVAS_W = 1280;
export const CANVAS_H = 720;
export const SHIFT_SECONDS = 150;
export const STAR_LINES = [60, 100, 150]; // money for 1 / 2 / 3 stars
export const MAX_ORDERS = 4;
export const ORDER_PATIENCE = 48; // seconds before a ticket is lost
export const FIRST_ORDER_DELAY = 3;
export const SPAWN_START = 14; // seconds between orders at the start
export const SPAWN_END = 9; // seconds between orders at the end
export const GRILL_COOK_SECONDS = 6;
export const GRILL_BURN_SECONDS = 5; // done patty burns after this long
export const CHOP_SECONDS = 3;
export const FRY_SECONDS = 8;
export const FRY_BURN_SECONDS = 5;
export const COMBO_STEP = 0.1; // +10% pay per combo step
export const COMBO_MAX = 2.0;

// Ingredient ids. A cooked / chopped ingredient is a different id on purpose:
// the plate only accepts the exact form a recipe asks for.
export const INGREDIENTS = {
  bun: { name: 'Bun', short: 'BUN', key: 'B', color: '#e8a94e', desc: 'Soft sesame bun' },
  patty_raw: { name: 'Raw Patty', short: 'PATTY', key: 'P', color: '#c25b6b', desc: 'Needs the grill' },
  patty_cooked: { name: 'Grilled Patty', short: 'PATTY', key: 'P', color: '#7a4a2b', desc: 'Hot off the grill' },
  patty_burnt: { name: 'Burnt Patty', short: 'BURNT', key: 'P', color: '#2b2118', desc: 'Trash it!' },
  cheese: { name: 'Cheese', short: 'CHEESE', key: 'C', color: '#f7c948', desc: 'Melty slice' },
  lettuce_raw: { name: 'Lettuce', short: 'LETTUCE', key: 'L', color: '#7bc96f', desc: 'Needs chopping' },
  lettuce_cut: { name: 'Chopped Lettuce', short: 'LETTUCE', key: 'L', color: '#8fd67f', desc: 'Crisp and ready' },
  tomato_raw: { name: 'Tomato', short: 'TOMATO', key: 'T', color: '#e4572e', desc: 'Needs chopping' },
  tomato_cut: { name: 'Sliced Tomato', short: 'TOMATO', key: 'T', color: '#ef6a4a', desc: 'Juicy slices' },
  fries: { name: 'Crispy Fries', short: 'FRIES', key: 'F', color: '#f2b234', desc: 'Golden and salted' },
  fries_burnt: { name: 'Burnt Fries', short: 'BURNT', key: 'F', color: '#2b2118', desc: 'Trash it!' },
};

// The five bins on the counter. Only raw / ready-to-use items live here;
// cooked and chopped food comes from the stations.
export const BIN_ITEMS = ['bun', 'patty_raw', 'cheese', 'lettuce_raw', 'tomato_raw'];

// The menu: id, name, price, one-line pitch, and the exact plate contents.
export const RECIPES = [
  { id: 'classic', name: 'Classic Burger', price: 8, pitch: 'The house favourite', needs: ['bun', 'patty_cooked', 'lettuce_cut'] },
  { id: 'cheese', name: 'Cheese Burger', price: 9, pitch: 'Extra melty', needs: ['bun', 'patty_cooked', 'cheese'] },
  { id: 'garden', name: 'Garden Burger', price: 11, pitch: 'Fresh from the patch', needs: ['bun', 'patty_cooked', 'lettuce_cut', 'tomato_cut'] },
  { id: 'double', name: 'Double Stack', price: 13, pitch: 'Two patties, no regrets', needs: ['bun', 'patty_cooked', 'patty_cooked', 'cheese'] },
  { id: 'fries', name: 'Crispy Fries', price: 4, pitch: 'Golden, salted, fast', needs: ['fries'] },
  { id: 'sunset', name: 'Sunset Meal', price: 16, pitch: 'The full works', needs: ['bun', 'patty_cooked', 'cheese', 'lettuce_cut', 'fries'] },
];

export function recipeById(id) {
  return RECIPES.find((r) => r.id === id);
}

// Kitchen layout, in canvas pixels. render.js and input.js both read this,
// so a hit box and its drawing can never drift apart.
export const LAYOUT = {
  hud: { x: 0, y: 0, w: 1280, h: 56 },
  tickets: { x: 20, y: 70, w: 296, h: 102, gap: 12 },
  bins: { x: 24, y: 196, w: 150, h: 84, gap: 8, label: 'INGREDIENTS' },
  grill: { x: 200, y: 196, w: 330, h: 154, label: 'GRILL', slots: [{ x: 216, y: 238, w: 140, h: 92 }, { x: 374, y: 238, w: 140, h: 92 }] },
  board: { x: 556, y: 196, w: 170, h: 154, label: 'CHOPPING BOARD', slot: { x: 576, y: 238, w: 130, h: 92 } },
  fryer: { x: 752, y: 196, w: 330, h: 154, label: 'FRYER', slots: [{ x: 768, y: 238, w: 140, h: 92 }, { x: 926, y: 238, w: 140, h: 92 }] },
  plate: { x: 200, y: 372, w: 330, h: 184, label: 'ASSEMBLY PLATE' },
  serve: { x: 556, y: 372, w: 330, h: 184, label: 'SERVE HERE' },
  trash: { x: 912, y: 372, w: 170, h: 184, label: 'TRASH' },
  recipes: { x: 1108, y: 196, w: 148, h: 360, label: 'MENU' },
  hand: { x: 200, y: 576, w: 330, h: 72, label: 'IN YOUR HAND' },
  rush: { x: 556, y: 576, w: 526, h: 72, label: 'SHIFT NOTES' },
  hint: { x: 0, y: 664, w: 1280, h: 56 },
};

export function rectOf(box) {
  return { x: box.x, y: box.y, w: box.w, h: box.h };
}

export function pointIn(box, x, y) {
  return x >= box.x && x < box.x + box.w && y >= box.y && y < box.y + box.h;
}
