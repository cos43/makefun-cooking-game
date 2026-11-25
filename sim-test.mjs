// Headless play-through of Simmer & Serve: one full order, a burn, a timeout.
import { newGameState, updateGame, startShift, spawnOrder, matchingOrder } from './game/src/state.js';
import { clickBin, clickGrillSlot, clickBoard, clickFryerSlot, clickPlate, clickServe, clickTrash } from './game/src/stations.js';

let failures = 0;
function check(name, cond) {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}`);
  if (!cond) failures++;
}

let s = startShift(newGameState());
check('shift starts in play', s.screen === 'play');
// Force a Classic Burger order on the board.
s.orders = [{ id: 1, recipeId: 'classic', patience: 48, maxPatience: 48 }];

// Bun -> plate.
check('take bun', clickBin(s, 'bun').ok && s.hand === 'bun');
check('bun on plate', clickPlate(s).ok && s.plate.length === 1 && s.hand === null);
// Patty -> grill -> cook 6s -> take -> plate.
check('take raw patty', clickBin(s, 'patty_raw').ok);
check('patty on grill', clickGrillSlot(s, 0).ok && s.grill[0].stage === 'cooking');
updateGame(s, 5.9);
check('still cooking at 5.9s', s.grill[0].stage === 'cooking');
updateGame(s, 0.2);
check('patty done at 6.1s', s.grill[0].stage === 'done');
check('take cooked patty', clickGrillSlot(s, 0).ok && s.hand === 'patty_cooked');
check('patty on plate', clickPlate(s).ok && s.plate.length === 2);
// Lettuce -> board -> chop 3s -> take -> plate.
check('take lettuce', clickBin(s, 'lettuce_raw').ok);
check('lettuce on board', clickBoard(s).ok && s.board && !s.board.done);
updateGame(s, 3.1);
check('lettuce chopped', s.board.done === true);
check('take chopped lettuce', clickBoard(s).ok && s.hand === 'lettuce_cut');
check('lettuce on plate', clickPlate(s).ok && s.plate.length === 3);
// Plate matches the Classic Burger ticket.
check('plate matches order', matchingOrder(s) && matchingOrder(s).recipeId === 'classic');
const moneyBefore = s.money;
const served = clickServe(s);
check('serve succeeds', served.ok);
check('money paid', s.money > moneyBefore);
console.log(`  served Classic Burger for $${s.money - moneyBefore} (price $8 + tip, combo x1)`);
check('combo is 1', s.combo === 1);
check('order cleared', s.orders.length === 0);

// Burn test: grill a patty, leave it 6 + 5 seconds.
check('take raw patty 2', clickBin(s, 'patty_raw').ok);
check('patty 2 on grill', clickGrillSlot(s, 1).ok);
updateGame(s, 6.1);
check('patty 2 done', s.grill[1].stage === 'done');
updateGame(s, 5.1);
check('patty 2 burnt', s.grill[1].stage === 'burnt');
check('take burnt patty', clickGrillSlot(s, 1).ok && s.hand === 'patty_burnt');
check('trash burnt patty', clickTrash(s).ok && s.hand === null);

// Timeout test: spawn an order and let its patience run out.
s.orders = [{ id: 2, recipeId: 'fries', patience: 2, maxPatience: 48 }];
s.combo = 2;
updateGame(s, 2.5);
check('order timed out and lost', s.lost === 1 && s.orders.length === 0);
check('combo reset on lost order', s.combo === 0);

// Fryer test: start fries, wait 8s, take them, plate, serve.
s.orders = [{ id: 3, recipeId: 'fries', patience: 48, maxPatience: 48 }];
check('start fries', clickFryerSlot(s, 0).ok && s.fryer[0].stage === 'frying');
updateGame(s, 8.1);
check('fries done', s.fryer[0].stage === 'done');
check('take fries', clickFryerSlot(s, 0).ok && s.hand === 'fries');
check('fries on plate', clickPlate(s).ok);
check('fries order matches', matchingOrder(s) && matchingOrder(s).recipeId === 'fries');
const before2 = s.money;
check('serve fries', clickServe(s).ok && s.money > before2);
console.log(`  served Crispy Fries for $${s.money - before2}`);

// Wrong plate: bun + cheese does not match any order.
s.orders = [{ id: 4, recipeId: 'classic', patience: 48, maxPatience: 48 }];
clickBin(s, 'bun'); clickPlate(s);
clickBin(s, 'cheese'); clickPlate(s);
check('wrong plate matches nothing', matchingOrder(s) === null);
check('serve refused on wrong plate', clickServe(s).ok === false);
check('empty hand takes top item back', clickPlate(s).ok && s.hand === 'cheese');

console.log(failures === 0 ? 'ALL SIMULATION CHECKS PASSED' : `${failures} CHECKS FAILED`);
process.exit(failures === 0 ? 0 : 1);
