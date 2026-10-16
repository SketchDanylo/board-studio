const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setup, iteration, initialFEN } = require('./helpers.cjs');
const best = { move: 'e2e4', cp: 20, wdl: [100, 850, 50] };
const bad = { move: 'd2d4', cp: -300, wdl: [0, 150, 850] };
const recovered = { move: 'd2d4', cp: 0, wdl: [70, 860, 70] };

test('suboption defaults off, toggles independently and persists', () => {
  const f = setup();
  try {
    assert.equal(f.api.settings.danger.blunders, false);
    const toggle = f.w.document.querySelector('#board-studio').shadowRoot.querySelector('[aria-label="Show Blunders"]');
    assert.equal(toggle.getAttribute('aria-checked'), 'false');
    toggle.click();
    assert.equal(f.api.settings.danger.on, true);
    assert.equal(f.api.settings.danger.blunders, true);
    assert.equal(toggle.getAttribute('aria-checked'), 'true');
    assert.equal(JSON.parse(f.w.localStorage.getItem('board-studio-settings-v1')).danger.blunders, true);
  } finally { f.close(); }
});

test('filters small errors, insufficient WDL loss, and already-lost forced mates', () => {
  const f = setup();
  try {
    const isBad = f.api.isBlunderLoss;
    assert.equal(isBad(best, bad), true);
    assert.equal(isBad(best, { cp: -90, wdl: [0, 100, 900] }), false);
    assert.equal(isBad({ cp: 900, wdl: [1000, 0, 0] }, { cp: 600, wdl: [990, 10, 0] }), false);
    assert.equal(isBad(best, { mate: -1 }), true);
    assert.equal(isBad({ mate: -6 }, { mate: -1 }), false);
    assert.equal(isBad(best, { cp: -500 }), false);
    // The expected-points threshold includes its exact boundary.
    assert.equal(isBad({ cp: 0, wdl: [0, 1000, 0] }, { cp: -200, wdl: [0, 600, 400] }), true);
  } finally { f.close(); }
});

test('publishes the first shallow estimate immediately, then revises it without waiting', () => {
  const f = setup();
  try {
    const s = new f.api.BlunderSearch(initialFEN, () => {});
    iteration(s, 1, [best, bad]); // No explicit publish, next iteration, or minimum depth.
    assert.equal(s.moves.get('d2d4').blunder, true);
    s.receive('info depth 2 multipv 1 score cp 999 lowerbound pv e2e4');
    assert.equal(s.depth, 1);
    iteration(s, 2, [best, recovered]);
    assert.equal(s.moves.get('d2d4').blunder, false);
  } finally { f.close(); }
});

test('large additional losses still count when losing WDL scores have saturated', () => {
  const f = setup();
  try {
    const isBad = f.api.isBlunderLoss;
    const losing = { cp: -437, wdl: [0, 0, 1000] };
    for (const cp of [-702, -711, -763]) assert.equal(isBad(losing, { cp, wdl: [0, 0, 1000] }), true);
    assert.equal(isBad(losing, { cp: -686, wdl: [0, 0, 1000] }), false, 'small additional losses stay unmarked');
    assert.equal(isBad(losing, { cp: -687, wdl: [0, 0, 1000] }), true, '2.5-pawn boundary');
    assert.equal(isBad({ cp: -400, wdl: [0, 20, 980] }, { cp: -700, wdl: [0, 0, 1000] }), true);
    assert.equal(isBad({ cp: 900, wdl: [1000, 0, 0] }, { cp: 600, wdl: [1000, 0, 0] }), false, 'do not flag safe winning simplifications');
    assert.equal(isBad({ mate: -6 }, { mate: -1 }), false);
    assert.equal(isBad(losing, { cp: -900 }), false, 'missing WDL is not a verdict');
  } finally { f.close(); }
});

test('partial depth never combines a new best score with stale candidate scores', () => {
  const f = setup();
  try {
    const s = new f.api.BlunderSearch(initialFEN, () => {});
    iteration(s, 10, [best, recovered]);
    // A much higher best score must NOT be compared with the old candidate score.
    iteration(s, 11, [{ ...best, cp: 600, wdl: [1000, 0, 0] }]);
    s.receive('info depth 10 multipv 2 score cp -300 wdl 0 150 850 pv d2d4');
    s.publish();
    assert.equal(s.moves.get('d2d4').depth, 10);
    assert.equal(s.moves.get('d2d4').blunder, false);
    s.receive('info depth 11 multipv 2 score cp -300 wdl 0 150 850 pv d2d4');
    assert.equal(s.moves.get('d2d4').blunder, true);
  } finally { f.close(); }
});

test('streamed rank changes cannot mark the new best move from an older duplicate row', () => {
  const f = setup();
  try {
    const s = new f.api.BlunderSearch(initialFEN, () => {});
    iteration(s, 1, [best, bad]);
    assert.equal(s.moves.get('d2d4').blunder, true);
    s.receive('info depth 1 multipv 1 score cp 600 wdl 1000 0 0 pv d2d4');
    assert.equal(s.moves.get('d2d4').blunder, false);
    s.receive('info depth 1 multipv 2 score cp 20 wdl 100 850 50 pv e2e4');
    assert.equal(s.moves.get('d2d4').blunder, false);
    assert.equal(s.moves.get('e2e4').blunder, true);
  } finally { f.close(); }
});

test('DOM crosses appear immediately, flip, animate out, and can revive without duplicating', async () => {
  const f = setup();
  try {
    f.api.settings.danger.blunders = true;
    const b = f.board();
    b.innerHTML = '<svg class="arrows"></svg><div class="piece wp square-42"></div><div class="hint square-44"><div></div></div>';
    const ctl = new f.api.Controller(b.querySelector('svg'));
    ctl.selected = { f: 3, r: 1 }; ctl.paintHints();
    const s = f.api.blunderHints.search;
    iteration(s, 1, [best, bad]);
    assert.equal(b.querySelector('.hint').dataset.bsBlunder, '1');
    assert.equal(f.w.getComputedStyle(b.querySelector('.hint')).visibility, 'hidden');
    let cross = b.querySelector('.bs-blunder-cross');
    assert.equal(cross.dataset.square, 'd4');
    assert.equal(cross.style.left, '37.5%');
    assert.equal(cross.style.top, '50%');
    b.classList.add('flipped'); ctl.paintHints();
    assert.equal(cross.style.left, '50%');
    assert.equal(cross.style.top, '37.5%');
    iteration(s, 2, [best, recovered]);
    assert.equal(b.querySelector('.bs-blunder-cross:not(.bs-cross-leave)'), null);
    assert.ok(cross.classList.contains('bs-cross-leave'));
    assert.equal(b.querySelector('.hint').dataset.bsBlunder, '1', 'native dot stays hidden until the reverse morph completes');
    assert.equal(b.querySelector('.hint').dataset.bsDanger, undefined);
    iteration(s, 3, [best, bad]);
    assert.equal(b.querySelector('.bs-blunder-cross'), cross);
    assert.equal(b.querySelectorAll('.bs-blunder-cross').length, 1);
    assert.equal(cross.classList.contains('bs-cross-leave'), false);
    await new Promise(resolve => setTimeout(resolve, 280));
    assert.equal(cross.isConnected, true, 'revival cancels the pending removal');
    iteration(s, 4, [best, recovered]);
    await new Promise(resolve => setTimeout(resolve, 280));
    assert.equal(cross.isConnected, false);
    assert.equal(b.querySelector('.hint').dataset.bsBlunder, undefined);
    assert.equal(f.w.getComputedStyle(b.querySelector('.hint')).visibility, 'visible');
  } finally { f.close(); }
});

test('canvas dots hand off during both morph directions and restore when mode turns off', async () => {
  const f = setup();
  try {
    f.api.settings.danger.blunders = true;
    const b = f.board();
    const sprite = { tint: 0xffffff, renderable: true };
    const other = { tint: 0xffffff, renderable: true };
    const ctl = Object.create(f.api.CanvasController.prototype);
    Object.assign(ctl, { board: b, hintSprites: [{ sprite, from: 'd2', square: 'd4', danger: true }, { sprite: other, from: 'd2', square: 'd3', danger: true }], renderer: { getCoordsFromSquare: name => ({ x: name === 'a1' ? 0 : 700, y: 0 }) } });
    ctl.paintHints();
    const s = f.api.blunderHints.search;
    iteration(s, 10, [best, bad]); s.publish(); iteration(s, 11, [best, bad]); s.publish();
    assert.equal(sprite.renderable, false, 'one marker is drawn, not a dot beneath the cross');
    assert.equal(sprite.tint, 0xff4a42, 'capture risk color is preserved for recovery');
    assert.equal(other.renderable, true);
    assert.equal(other.tint, 0xff4a42, 'non-blunder capture squares stay red');
    assert.ok(b.querySelector('.bs-blunder-cross'));
    iteration(s, 12, [best, recovered]);
    assert.equal(sprite.renderable, false, 'the overlay owns the reverse morph');
    await new Promise(resolve => setTimeout(resolve, 280));
    assert.equal(sprite.renderable, true, 'the dot returns after the reverse morph');
    iteration(s, 13, [best, bad]);
    assert.equal(sprite.renderable, false);
    f.api.settings.danger.blunders = false; ctl.paintHints();
    assert.equal(sprite.renderable, true);
    assert.equal(sprite.tint, 0xff4a42);
    assert.equal(b.querySelector('.bs-blunder-layer'), null);
    assert.equal(s.stopped, true);
  } finally { f.close(); }
});

test('selection changes reuse the position; FEN changes discard stale worker output', () => {
  const f = setup();
  try {
    f.api.settings.danger.blunders = true;
    const b = f.board();
    const ctl = { board: b, flipped: false, paintHints() {} };
    const h = f.api.blunderHints;
    h.sync(ctl, { f: 3, r: 1 }, [{ f: 3, r: 3 }]);
    const old = h.search, worker = old.worker;
    h.sync(ctl, { f: 4, r: 1 }, [{ f: 4, r: 3 }]);
    assert.equal(h.search, old);
    b.game.getFEN = () => initialFEN.replace(' w ', ' b ');
    h.sync(ctl, { f: 3, r: 6 }, [{ f: 3, r: 4 }]);
    assert.notEqual(h.search, old);
    assert.equal(worker.terminated, true);
    iteration(old, 12, [best, bad]); old.publish();
    assert.equal(h.search.moves.size, 0);
    h.sync(ctl, null, []);
    assert.equal(h.search, null);
  } finally { f.close(); }
});

test('a promotion square is not condemned when an underpromotion saves it', () => {
  const f = setup();
  try {
    f.api.settings.danger.blunders = true;
    const b = f.board('7k/P7/8/8/8/8/8/K7 w - - 0 1');
    const ctl = { board: b, flipped: false, paintHints() {} };
    const h = f.api.blunderHints, from = { f: 0, r: 6 }, targets = [{ f: 0, r: 7 }];
    h.sync(ctl, from, targets);
    h.search.moves.set('a7a8q', { move: 'a7a8q', blunder: true });
    assert.equal(h.sync(ctl, from, targets).size, 0, 'waits for underpromotion choices, not just the first queen score');
    for (const type of 'qrbn') h.search.moves.set('a7a8' + type, { move: 'a7a8' + type, blunder: type !== 'n' });
    assert.equal(h.sync(ctl, from, targets).size, 0);
    h.search.moves.get('a7a8n').blunder = true;
    assert.equal(h.sync(ctl, from, targets).has('a8'), true);
  } finally { f.close(); }
});

test('crown escapes clipped avatar wrappers and follows its avatar on scroll', () => {
  const f = setup();
  try {
    f.board();
    f.w.document.body.insertAdjacentHTML('beforeend', '<div id="player-bottom" style="overflow:hidden;isolation:isolate"><img class="cc-avatar-component"></div>');
    const avatar = f.w.document.querySelector('.cc-avatar-component');
    let top = 300;
    avatar.getBoundingClientRect = () => ({ left: 100, top, width: 40, height: 40 });
    f.api.syncCrown(); f.api.engine.receive('uciok'); f.api.engine.receive('readyok');
    f.api.engine.receive('info depth 12 score cp 45');
    const crown = f.w.document.querySelector('.bs-crown');
    assert.equal(crown.parentElement, f.w.document.body);
    assert.equal(crown.bsAvatar, avatar);
    assert.equal(crown.style.left, '120px');
    assert.equal(crown.style.top, '284px');
    top = 200; f.w.dispatchEvent(new f.w.Event('scroll'));
    assert.equal(crown.style.top, '184px');
    f.api.syncCrown();
    assert.equal(f.w.document.querySelectorAll('.bs-crown').length, 1);
    avatar.remove(); f.w.dispatchEvent(new f.w.Event('resize'));
    assert.equal(crown.isConnected, false);
  } finally { f.close(); }
});

test('castling hint on a rook maps to the engine king destination', () => {
  const f = setup();
  try {
    f.api.settings.danger.blunders = true;
    const b = f.board('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
    const ctl = { board: b, flipped: false, paintHints() {} };
    const h = f.api.blunderHints, from = { f: 4, r: 0 }, targets = [{ f: 7, r: 0 }];
    h.sync(ctl, from, targets);
    h.search.moves.set('e1g1', { move: 'e1g1', blunder: true });
    assert.equal(h.sync(ctl, from, targets).has('h1'), true);
  } finally { f.close(); }
});
