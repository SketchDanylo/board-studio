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

test('requires two sufficiently deep iterations, removes a cross after recovery, ignores bounds', () => {
  const f = setup();
  try {
    const s = new f.api.BlunderSearch(initialFEN, () => {});
    iteration(s, 9, [best, bad]); s.publish();
    assert.equal(s.moves.size, 0);
    iteration(s, 10, [best, bad]); s.publish();
    assert.equal(s.moves.get('d2d4').blunder, false);
    s.publish(); // Repainting the same depth is not fresh evidence.
    assert.equal(s.moves.get('d2d4').blunder, false);
    iteration(s, 11, [best, bad]); s.publish();
    assert.equal(s.moves.get('d2d4').blunder, true);
    s.receive('info depth 12 multipv 1 score cp 999 lowerbound pv e2e4');
    assert.equal(s.depth, 11);
    iteration(s, 12, [best, recovered]); s.publish();
    assert.equal(s.moves.get('d2d4').blunder, false);
  } finally { f.close(); }
});

test('partial depth never combines a new best score with stale candidate scores', () => {
  const f = setup();
  try {
    const s = new f.api.BlunderSearch(initialFEN, () => {});
    iteration(s, 10, [best, bad]); s.publish();
    iteration(s, 11, [best]); s.publish();
    s.receive('info depth 10 multipv 2 score cp -300 wdl 0 150 850 pv d2d4');
    s.publish();
    assert.equal(s.publishedDepth, 10);
    assert.equal(s.moves.get('d2d4').blunder, false);
  } finally { f.close(); }
});

test('DOM dots are replaced, flip correctly, and return when deeper analysis changes its mind', () => {
  const f = setup();
  try {
    f.api.settings.danger.blunders = true;
    const b = f.board();
    b.innerHTML = '<svg class="arrows"></svg><div class="piece wp square-42"></div><div class="hint square-44"><div></div></div>';
    const ctl = new f.api.Controller(b.querySelector('svg'));
    ctl.selected = { f: 3, r: 1 }; ctl.paintHints();
    const s = f.api.blunderHints.search;
    iteration(s, 10, [best, bad]); s.publish();
    assert.equal(b.querySelector('.bs-blunder-cross'), null);
    iteration(s, 11, [best, bad]); s.publish();
    assert.equal(b.querySelector('.hint').dataset.bsBlunder, '1');
    let cross = b.querySelector('.bs-blunder-cross');
    assert.equal(cross.dataset.square, 'd4');
    assert.equal(cross.style.left, '37.5%');
    assert.equal(cross.style.top, '50%');
    b.classList.add('flipped'); ctl.paintHints();
    assert.equal(cross.style.left, '50%');
    assert.equal(cross.style.top, '37.5%');
    iteration(s, 12, [best, recovered]); s.publish();
    assert.equal(b.querySelector('.bs-blunder-cross'), null);
    assert.equal(b.querySelector('.hint').dataset.bsBlunder, undefined);
    assert.equal(b.querySelector('.hint').dataset.bsDanger, undefined);
  } finally { f.close(); }
});

test('canvas dots restore their original renderability when mode is disabled', () => {
  const f = setup();
  try {
    f.api.settings.danger.blunders = true;
    const b = f.board();
    const sprite = { tint: 0xffffff, renderable: true };
    const ctl = Object.create(f.api.CanvasController.prototype);
    Object.assign(ctl, { board: b, hintSprites: [{ sprite, from: 'd2', square: 'd4', danger: true }], renderer: { getCoordsFromSquare: name => ({ x: name === 'a1' ? 0 : 700, y: 0 }) } });
    ctl.paintHints();
    const s = f.api.blunderHints.search;
    iteration(s, 10, [best, bad]); s.publish(); iteration(s, 11, [best, bad]); s.publish();
    assert.equal(sprite.renderable, false);
    assert.ok(b.querySelector('.bs-blunder-cross'));
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
    for (const type of 'qrbn') h.search.moves.set('a7a8' + type, { move: 'a7a8' + type, blunder: type !== 'n' });
    assert.equal(h.sync(ctl, from, targets).size, 0);
    h.search.moves.get('a7a8n').blunder = true;
    assert.equal(h.sync(ctl, from, targets).has('a8'), true);
  } finally { f.close(); }
});

test('crown still attaches to current avatar IDs without blunder mode', () => {
  const f = setup();
  try {
    f.board();
    f.w.document.body.insertAdjacentHTML('beforeend', '<div id="player-bottom"><div class="cc-avatar-component"></div></div>');
    f.api.syncCrown(); f.api.engine.receive('uciok'); f.api.engine.receive('readyok');
    f.api.engine.receive('info depth 12 score cp 45');
    assert.ok(f.w.document.querySelector('#player-bottom .bs-crown'));
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
