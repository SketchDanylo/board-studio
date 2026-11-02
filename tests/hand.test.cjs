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
