const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setup } = require('./helpers.cjs');

const wait = ms => new Promise(r => setTimeout(r, ms));
function rig(f) {
  const board = f.board();
  board.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 400, right: 400, bottom: 400 });
  board.game.getPlayingAs = () => 1;
  f.w.document.elementFromPoint = () => board;
  f.api.setSetting('clutch', 'mouse', true);
  f.api.setDPI(8000);   // ten times quicker, for the test
  return board;
}

test('Witty: no ghosts, and the hand looks vanilla (system pointer, open hand over a piece, fist while holding)', async () => {
  const f = setup();
  try {
    const board = rig(f), hand = f.api.shownHand;
    f.api.setSetting('clutch', 'witty', true);
    const ctl = { board, scheduleArrows() {}, paintFallen() {}, flipped: false };
    f.api.showClutchGhosts(ctl, [{ fen: board.game.getFEN(), uci: 'g1f3', line: ['g1f3'], color: '#ff4d4d' }]);
    assert.equal(board.querySelectorAll('.bs-ghost-clutch *').length, 0, 'no ghosts');
    assert.equal(f.api.clutch.ideas[0].uci, 'g1f3', 'but the hand knows what Clutch is weighing');
    hand.ensure(); hand.place(200, 300); hand.show();
    assert.ok(hand.el.classList.contains('vanilla'));
    hand.board = board; hand.occ = null;
    hand.place(...Object.values(hand.point(board, 'g1')).slice(0, 2));
    assert.ok(hand.el.classList.contains('over'), 'open hand over the knight');
    hand.place(...Object.values(hand.point(board, 'e4')).slice(0, 2));
    assert.ok(!hand.el.classList.contains('over'), 'arrow over an empty square');
    // a premove: set the way chess.com shows it (the piece on its square, two red squares), the hand free again
    hand.hold(board, { from: 'g1', to: 'f3', uci: 'g1f3' });
    await wait(120);
    assert.equal(board.querySelectorAll('.bs-premove-sq').length, 2);
    assert.equal(board.querySelectorAll('.bs-premove-piece').length, 1);
    assert.ok(!hand.el.classList.contains('held'), 'no red held hand');
    assert.ok(hand.holds({ from: 'g1', to: 'f3' }), 'still the premove it plays at once');
    hand.drop();
    assert.equal(board.querySelectorAll('.bs-premove-sq, .bs-premove-piece').length, 0, 'gone once played');
    // without Witty the old look stays
    f.api.setSetting('clutch', 'witty', false);
    hand.show();
    assert.ok(!hand.el.classList.contains('vanilla'));
  } finally { f.api.setDPI(800); f.close(); }
});

test('the hand has a whole repertoire while it waits, and moves for real in several ways', async () => {
  const f = setup();
  try {
    const board = rig(f), hand = f.api.shownHand;
    hand.ensure(); hand.place(200, 300); hand.board = board;
    f.api.clutch.acting = true;
    f.api.clutch.ideas = [{ uci: 'g1f3', ours: true }, { uci: 'e7e5', answer: 'b1c3', ours: false }];
    const seenKinds = new Set(), moved = [];
    const glide = hand.glide.bind(hand);
    hand.glide = (x, y, ms) => { moved.push([x, y]); glide(x, y, ms); };
    for (let i = 0; i < 60; i++) {
      hand.busyUntil = 0; hand.nextDrift = 0;
      hand.drift(board);
      seenKinds.add(hand.lastKind);
      await wait(5);
    }
    assert.ok(seenKinds.size >= 8, `many kinds: ${[...seenKinds].join(', ')}`);
    // it goes for the moves Clutch is weighing
    const m = Array.from({ length: 40 }, () => hand.pickMove(board)).filter(Boolean);
    assert.ok(m.filter(x => (x.from + x.to) === 'g1f3' || (x.from + x.to) === 'b1c3').length > 15, 'mostly the ideas');
    hand.glide = glide;
    hand.clearTimers();
    // the real move: every style ends on its square
    for (const style of ['drag', 'overshoot', 'hesitate', 'click']) {
      hand.drag(board, { x: 0, y: 0 }, 'e2', 'e4', 20, 5, 20, style, 30);
      await wait(150);
      const b = hand.point(board, 'e4');
      assert.ok(Math.hypot(hand.x - b.x, hand.y - b.y) < b.size * 0.2, `${style}: on e4 (${Math.round(hand.x)}, ${Math.round(hand.y)})`);
    }
  } finally { f.api.clutch.acting = false; f.api.setDPI(800); f.close(); }
});

test('the hand moves like a hand: a new aim mid-way keeps the speed it had (no jump, no stop), quickest in the middle', async () => {
  const f = setup();
  try {
    const board = rig(f), hand = f.api.shownHand;
    hand.ensure(); hand.show(); hand.place(100, 100); hand.pieceSize = 50;
    hand.glide(300, 100, 400, { exact: true });
    await wait(150);
    const t = f.w.performance.now(), before = hand.at(t);
    assert.ok(Math.hypot(before.vx, before.vy) > 0.3, `moving: ${before.vx}`);
    hand.glide(300, 300, 400, { exact: true });
    const after = hand.at(t);
    assert.ok(Math.hypot(after.x - before.x, after.y - before.y) < 1.5, 'no jump');
    assert.ok(Math.hypot(after.vx - before.vx, after.vy - before.vy) < 0.05, 'the same speed and direction');
    // speed profile: slow at the ends, quickest in the middle
    hand.place(0, 0); hand.glide(200, 0, 300, { exact: true });
    const t0 = hand.seg.t0, sp = k => Math.abs(hand.at(t0 + 300 * k).vx);
    assert.ok(sp(0.5) > sp(0.1) * 2 && sp(0.5) > sp(0.9) * 2);
    assert.equal(Math.round(hand.at(t0 + 400).x), 200, 'and it arrives');
  } finally { f.api.setDPI(800); f.close(); }
});

test('the mood follows the game: clock running out, a won game, a worse one; their move is looked at', async () => {
  const f = setup();
  try {
    const board = rig(f), hand = f.api.shownHand, c = f.api.clutch;
    c.mode = 'win'; c.lastValue = 900;
    assert.equal(hand.moodNow(), 'rush');
    c.lastValue = -400;
    assert.equal(hand.moodNow(), 'tense');
    c.lastValue = 30;
    assert.equal(hand.moodNow(), 'calm');
    // a won game is played faster
    const fen = 'r1bq1rk1/pp2bppp/2n1pn2/3p4/3P4/2NBPN2/PP3PPP/R2Q1RK1 w - - 0 20', st = { from: 'f1', to: 'e1' };
    assert.ok(f.api.clutchPaceMs(fen, st, 120, 1500, { rush: true }, () => 0.5) < f.api.clutchPaceMs(fen, st, 120, 1500, {}, () => 0.5) * 0.7);
    // their move: the hand goes to look at the piece that moved
    hand.ensure(); hand.show(); hand.place(10, 390); hand.pieceSize = 50;
    const seen = [];
    const glide = hand.glide.bind(hand);
    hand.glide = (x, y, ms, o) => { seen.push([x, y]); glide(x, y, ms, o); };
    hand.react(board, 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2', 'w', { from: 'e7', to: 'e5' });
    await wait(500);
    const e5 = hand.point(board, 'e5');
    assert.ok(seen.length && Math.hypot(seen[0][0] - e5.x, seen[0][1] - e5.y) < 20, 'first to e5');
    hand.glide = glide;
  } finally { f.api.clutch.mode = null; f.api.clutch.lastValue = null; f.api.setDPI(800); f.close(); }
});
