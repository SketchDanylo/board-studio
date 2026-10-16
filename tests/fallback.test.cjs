const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setup, iteration, initialFEN } = require('./helpers.cjs');

test('pointer selection on a board without native hints OR an arrow controller draws legal dots', () => {
  const f = setup();
  try {
    const b = f.board();
    b.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 800 });
    b.dispatchEvent(new f.w.MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 450, clientY: 650 }));
    assert.equal(b.__cc, undefined);
    assert.deepEqual([...b.querySelectorAll('.bs-fallback-dot')].map(e => e.dataset.square).sort(), ['e3', 'e4']);
    b.dispatchEvent(new f.w.MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 450, clientY: 650 }));
    assert.equal(b.querySelector('.bs-fallback-hints'), null, 'second click deselects');
  } finally { f.close(); }
});

test('fallback draws red capture-risk dots with the blunder option off', () => {
  const f = setup();
  try {
    const b = f.board('4k3/8/8/8/4p3/8/8/4K1N1 w - - 0 1');
    f.api.fallbackHints.select(b, { f: 6, r: 0 });
    assert.ok(b.querySelector('[data-square="f3"].bs-danger'), 'f3 knight can be captured by the e4 pawn');
    assert.equal(b.querySelector('[data-square="h3"]').classList.contains('bs-danger'), false);
  } finally { f.close(); }
});

test('missing native hints still produce a cross and restore the ordinary dot on recovery', async () => {
  const f = setup();
  try {
    f.api.settings.danger.blunders = true;
    const b = f.board('rnbqkbnr/pppp1ppp/8/4p3/8/5P2/PPPPP1PP/RNBQKBNR w KQkq - 0 2');
    f.api.fallbackHints.select(b, { f: 6, r: 1 });
    const search = f.api.blunderHints.search;
    const good = { move: 'e2e4', cp: 0, wdl: [0, 1000, 0] };
    iteration(search, 1, [good, { move: 'g2g4', mate: -1 }]);
    assert.equal(b.querySelector('.bs-blunder-cross').dataset.square, 'g4');
    assert.equal(b.querySelector('.bs-fallback-dot[data-square="g4"]').dataset.bsBlunder, '1');
    assert.equal(f.w.getComputedStyle(b.querySelector('.bs-fallback-dot[data-square="g4"]')).visibility, 'hidden');
    assert.equal(b.querySelector('.bs-fallback-dot[data-square="g3"]').dataset.bsBlunder, undefined);
    iteration(search, 2, [good, { move: 'g2g4', cp: -20, wdl: [0, 950, 50] }]);
    assert.equal(b.querySelector('.bs-blunder-cross:not(.bs-cross-leave)'), null);
    assert.equal(b.querySelector('.bs-fallback-dot[data-square="g4"]').dataset.bsBlunder, '1');
    await new Promise(resolve => setTimeout(resolve, 280));
    assert.equal(b.querySelector('.bs-fallback-dot[data-square="g4"]').dataset.bsBlunder, undefined);
    assert.equal(f.w.getComputedStyle(b.querySelector('.bs-fallback-dot[data-square="g4"]')).visibility, 'visible');
  } finally { f.close(); }
});

test('legal fallback handles pins, castling, en passant, and promotion destinations', () => {
  const f = setup();
  try {
    const cases = [
      ['k3r3/8/8/8/8/8/4R3/4K3 w - - 0 1', { f: 4, r: 1 }, 'd2', false],
      ['r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', { f: 4, r: 0 }, 'g1', true],
      ['4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2', { f: 4, r: 4 }, 'd6', true],
      ['7k/P7/8/8/8/8/8/K7 w - - 0 1', { f: 0, r: 6 }, 'a8', true]
    ];
    for (const [fen, from, to, expected] of cases) {
      const b = f.board(fen); f.api.fallbackHints.select(b, from);
      assert.equal(!!b.querySelector(`[data-square="${to}"]`), expected, fen);
      if (to === 'a8') assert.equal(b.querySelectorAll('.bs-fallback-dot').length, 1);
    }
  } finally { f.close(); }
});

test('native hints take over without duplicate dots; a position change clears the fallback', () => {
  const f = setup();
  try {
    const b = f.board(); const h = f.api.fallbackHints;
    h.select(b, { f: 4, r: 1 });
    let paints = 0;
    b.__cc = { flipped: false, paintHints() { paints++; } };
    const native = f.w.document.createElement('div'); native.className = 'hint square-53'; b.appendChild(native);
    h.refresh(); assert.equal(b.querySelector('.bs-fallback-hints'), null); assert.ok(paints);
    native.remove(); h.refresh(); assert.ok(b.querySelector('.bs-fallback-hints'));
    b.game.getFEN = () => initialFEN.replace(' w ', ' b ');
    h.refresh(); assert.equal(b.querySelector('.bs-fallback-hints'), null);
  } finally { f.close(); }
});

test('worker failure does not remove legal fallback dots', () => {
  const f = setup();
  try {
    f.api.settings.danger.blunders = true;
    f.w.Worker = class { constructor() { throw new Error('Worker blocked in test'); } };
    f.w.console.warn = () => {};
    const b = f.board(); f.api.fallbackHints.select(b, { f: 4, r: 1 });
    assert.equal(b.querySelectorAll('.bs-fallback-dot').length, 2);
    assert.match(f.w.document.querySelector('#board-studio').shadowRoot.querySelector('.hint-status').textContent, /unavailable/);
    f.api.settings.danger.on = false; f.api.fallbackHints.refresh();
    assert.equal(b.querySelector('.bs-fallback-hints'), null);
  } finally { f.close(); }
});

test('native/fallback handoffs preserve the worker, scores, and callback destination', () => {
  const f = setup();
  try {
    f.api.settings.danger.blunders = true;
    const b = f.board('rnbqkbnr/pppp1ppp/8/4p3/8/5P2/PPPPP1PP/RNBQKBNR w KQkq - 0 2');
    const h = f.api.fallbackHints;
    const from = { f: 6, r: 1 }, targets = [{ f: 6, r: 3 }];
    h.select(b, from);
    const search = f.api.blunderHints.search;
    iteration(search, 1, [{ move: 'e2e4', cp: 0 }, { move: 'g2g4', mate: -1 }]);
    let paints = 0;
    b.__cc = { board: b, flipped: false, paintHints() { paints++; f.api.blunderHints.sync(this, from, targets); } };
    const native = f.w.document.createElement('div'); native.className = 'hint square-74'; b.appendChild(native);
    h.refresh();
    assert.equal(f.api.blunderHints.search, search);
    assert.equal(search.stopped, false);
    const before = paints;
    iteration(search, 2, [{ move: 'e2e4', cp: 0 }, { move: 'g2g4', cp: -10 }]);
    assert.ok(paints > before, 'engine updates follow the current renderer');
    native.remove(); h.refresh();
    assert.equal(f.api.blunderHints.search, search);
    assert.equal(search.depth, 2);
    assert.equal(f.api.blunderHints.ctl, h.adapter);
  } finally { f.close(); }
});

test('status distinguishes startup, waiting, no blunders and actual blunders', () => {
  const f = setup();
  try {
    f.api.settings.danger.blunders = true;
    const b = f.board(); f.api.fallbackHints.select(b, { f: 4, r: 1 });
    const status = () => f.w.document.querySelector('#board-studio').shadowRoot.querySelector('.hint-status').textContent;
    const s = f.api.blunderHints.search;
    assert.match(status(), /Starting evaluation/);
    s.receive('readyok'); f.api.fallbackHints.refresh();
    assert.match(status(), /waiting for move scores/);
    iteration(s, 1, [{ move: 'e2e4', cp: 0 }]);
    assert.match(status(), /Depth 1.*No blunders/);
    iteration(s, 2, [{ move: 'd2d4', cp: 0 }, { move: 'e2e4', cp: -400, wdl: [0, 0, 1000] }]);
    assert.match(status(), /Depth 2.*1 blunder square/);
    s.receive('info depth 3 multipv 1 score cp 0 pv e2e4');
    assert.match(status(), /waiting for win\/draw\/loss/);
  } finally { f.close(); }
});

test('board redraw cannot leave hint and cross layers detached', () => {
  const f = setup();
  try {
    f.api.settings.danger.blunders = true;
    const b = f.board(); f.api.fallbackHints.select(b, { f: 4, r: 1 });
    f.api.fallbackHints.layer.remove(); f.api.blunderHints.layer.remove();
    f.api.fallbackHints.refresh();
    assert.equal(f.api.fallbackHints.layer.parentElement, b);
    assert.equal(f.api.blunderHints.layer.parentElement, b);
  } finally { f.close(); }
});
