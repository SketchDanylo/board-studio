const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setup, iteration, initialFEN } = require('./helpers.cjs');
const sacrificeFEN = 'q4r1k/6pp/4Q2N/8/8/8/8/6K1 w - - 0 1';
const position = 'rn1qkb1r/pp2pppp/5n2/2pp4/4PPbP/8/PPPP4/RNBQKBNR w KQkq - 0 6';
const best = { move: 'e1f2', cp: -437, wdl: [0, 0, 1000] };
const bad = { move: 'd1e2', cp: -711, wdl: [0, 0, 1000] };

test('Arrow Eval has its own visible, persisted toggle with custom arrows off', () => {
  const f = setup();
  try {
    f.api.setSetting('arrows', 'on', false);
    const root = f.w.document.querySelector('#board-studio').shadowRoot;
    const toggle = root.querySelector('[aria-label="Arrow Eval"]');
    assert.ok(toggle);
    assert.equal(toggle.getAttribute('aria-checked'), 'false');
    toggle.click();
    assert.equal(f.api.settings.arrowEval.on, true);
    assert.equal(f.api.settings.arrows.on, false);
    assert.equal(JSON.parse(f.w.localStorage.getItem('board-studio-settings-v1')).arrowEval.on, true);
    assert.match(root.textContent, /Missed Win/);
  } finally { f.close(); }
});

test('all nine grades use expected-point loss; Brilliant requires deep, sound sacrifice evidence', () => {
  const f = setup();
  try {
    const grade = f.api.arrowGrade;
    const top = { move: 'a1a2', cp: 0, wdl: [0, 1000, 0] };
    const score = (loss, cp = -100) => ({ move: 'a1a3', cp, wdl: [0, 1000 - loss * 2000, loss * 2000] });
    assert.equal(grade(null, null, { book: true }), 'book');
    assert.equal(grade(top, top), 'best');
    assert.equal(grade(top, score(.01, -5)), 'excellent');
    assert.equal(grade(top, score(.03)), 'good');
    assert.equal(grade(top, score(.06)), 'inaccuracy');
    assert.equal(grade(top, score(.11)), 'mistake');
    assert.equal(grade(top, score(.21, -300)), 'blunder');
    assert.equal(grade({ move: 'a1a2', mate: 3 }, top), 'missed');
    assert.equal(grade(top, { cp: -900 }), null);
    assert.equal(grade(best, bad), 'blunder', 'already-lost material drops still show');
    const candidate = { move: 'e6g8', mate: 2 };
    const completed = { depth: 12, best: candidate, scores: [candidate, top] };
    assert.equal(grade(candidate, candidate, { sacrifice: true, completed }), 'brilliant');
    assert.equal(grade(candidate, candidate, { sacrifice: false, completed }), 'best');
    assert.equal(grade(candidate, candidate, { sacrifice: true, completed: { ...completed, depth: 11 } }), 'best');
    assert.equal(grade(candidate, candidate, { sacrifice: true, completed: { ...completed, scores: [candidate, { ...top, mate: 5 }] } }), 'best');
  } finally { f.close(); }
});

test('legal exchange analysis distinguishes a queen offer from equal trades and ordinary moves', () => {
  const f = setup();
  try {
    assert.equal(f.api.isSoundSacrifice(sacrificeFEN, 'e6g8'), true);
    assert.equal(f.api.isSoundSacrifice(initialFEN, 'e2e4'), false);
    assert.equal(f.api.isSoundSacrifice('3rk3/8/8/8/8/8/8/3RK3 w - - 0 1', 'd1d8'), false);
    assert.equal(f.api.isSoundSacrifice(initialFEN, 'e2e5'), false);
  } finally { f.close(); }
});

test('ArrowSearch compares scores at the same depth and only completes all legal root moves', () => {
  const f = setup();
  try {
    const search = new f.api.ArrowSearch(position, () => {});
    search.legalCount = 2;
    iteration(search, 12, [best, bad]);
    assert.equal(search.completed.depth, 12);
    iteration(search, 13, [{ ...best, cp: 0, wdl: [0, 1000, 0] }]);
    assert.equal(search.moves.get('d1e2').best.cp, -437);
    assert.equal(search.completed.depth, 12);
    search.receive('info depth 13 multipv 2 score cp -50 wdl 0 900 100 pv d1e2');
    assert.equal(search.moves.get('d1e2').best.cp, 0);
    assert.equal(search.completed.depth, 13);
  } finally { f.close(); }
});

test('native and custom DOM arrows revise grades, restore original color and stop on clear', () => {
  const f = setup();
  try {
    Object.assign(f.api.settings.arrows, { on: false, aim: false });
    f.api.settings.arrowEval.on = true;
    f.api.settings.book.on = false;
    const board = f.board(position);
    board.innerHTML = '<svg class="arrows"><polygon class="arrow" data-arrow="d1e2" style="fill: rgb(255, 170, 0)"></polygon></svg>';
    const ctl = new f.api.Controller(board.querySelector('svg'));
    ctl.syncArrows();
    const search = f.api.arrowEval.sessions.get(board).search;
    const poly = board.querySelector('polygon');
    iteration(search, 1, [best, bad]); ctl.syncArrows();
    assert.equal(poly.dataset.bsGrade, 'blunder');
    assert.equal(poly.style.getPropertyValue('--bs-eval-color'), f.api.ARROW_GRADES.blunder.color);
    assert.equal(poly.style.fill, 'rgb(255, 170, 0)');
    iteration(search, 2, [best, { ...bad, cp: -438 }]); ctl.syncArrows();
    assert.equal(poly.dataset.bsGrade, 'excellent');
    f.api.settings.arrows.on = true; ctl.syncArrows();
    assert.equal(poly.dataset.bsGrade, undefined);
    assert.equal(ctl.arrows.get('d1e2').el.dataset.bsGrade, 'excellent');
    assert.equal(ctl.arrows.get('d1e2').color, f.api.ARROW_GRADES.excellent.color);
    f.api.settings.arrowEval.on = false; ctl.syncArrows();
    assert.equal(ctl.arrows.get('d1e2').el.dataset.bsGrade, undefined);
    assert.notEqual(ctl.arrows.get('d1e2').color, f.api.ARROW_GRADES.excellent.color);
    assert.equal(search.stopped, true);
    f.api.settings.arrowEval.on = true; ctl.syncArrows();
    const next = f.api.arrowEval.sessions.get(board).search;
    poly.remove(); ctl.syncArrows();
    assert.equal(next.stopped, true);
    assert.equal(f.api.arrowEval.sessions.size, 0);
  } finally { f.close(); }
});

test('illegal arrows do not run an engine; positions discard stale results; castling and promotion map correctly', () => {
  const f = setup();
  try {
    f.api.settings.arrowEval.on = true;
    const board = f.board();
    const ctl = { board, syncArrows() {} };
    const sync = (from, to) => f.api.arrowEval.sync(ctl, [{ id: 'arrow', from, to }]);
    sync('e7', 'e5');
    assert.equal(f.api.arrowEval.sessions.size, 0);
    sync('e2', 'e4');
    const old = f.api.arrowEval.sessions.get(board).search;
    board.game.getFEN = () => '4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1';
    sync('e1', 'h1');
    assert.equal(old.stopped, true);
    const castle = f.api.arrowEval.sessions.get(board).search;
    iteration(castle, 1, [{ move: 'e1g1', cp: 0, wdl: [0, 1000, 0] }]);
    assert.equal(sync('e1', 'h1').get('arrow'), 'best');
    board.game.getFEN = () => '4k3/P7/8/8/8/8/8/4K3 w - - 0 1';
    sync('a7', 'a8');
    const promo = f.api.arrowEval.sessions.get(board).search;
    iteration(promo, 1, [{ move: 'a7a8q', cp: 900, wdl: [1000, 0, 0] }]);
    assert.equal(sync('a7', 'a8').get('arrow'), 'best');
  } finally { f.close(); }
});

test('native canvas color interpolates and reverses without mutating the original arrow', () => {
  const f = setup();
  try {
    f.api.settings.arrows.on = false;
    f.api.settings.arrowEval.on = true;
    f.api.settings.book.on = false;
    const board = f.board(position);
    const original = { key: 'queen', data: { from: 'd1', to: 'e2', color: '#ffaa00', opacity: .7 } };
    const ctl = Object.create(f.api.CanvasController.prototype);
    Object.assign(ctl, { board, nativeArrows: new Map([['queen', original]]), shownArrows: new Map(), arrows: new Map(), renderer: {}, orig: { addArrows() {}, removeArrows() {} }, aimedArrows: () => [], syncGhosts() {} });
    ctl.syncArrows();
    const search = f.api.arrowEval.sessions.get(board).search;
    iteration(search, 1, [best, bad]); ctl.syncArrows();
    const state = f.api.arrowEval.canvasColors.get(ctl).get('queen');
    state.start -= 230; ctl.syncArrows();
    const midway = ctl.shownArrows.get('queen').data.color;
    assert.notEqual(midway, original.data.color);
    assert.notEqual(midway, f.api.ARROW_GRADES.blunder.color);
    state.start -= 460; ctl.syncArrows();
    assert.equal(ctl.shownArrows.get('queen').data.color, f.api.ARROW_GRADES.blunder.color);
    assert.equal(original.data.color, '#ffaa00');
    f.api.settings.arrowEval.on = false; ctl.syncArrows();
    state.start -= 500; ctl.syncArrows();
    assert.equal(ctl.shownArrows.get('queen').data.color, '#ffaa00');
    assert.equal(search.stopped, true);
  } finally { f.close(); }
});
