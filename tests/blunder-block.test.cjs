const test = require('node:test');
const assert = require('node:assert/strict');
const { setup, initialFEN } = require('./helpers.cjs');

// A board 800 px wide at the page's corner, white at the bottom: e2 is at (450, 650), e3 (450, 550), e4 (450, 450).
function rig(f, search) {
  const board = f.board(initialFEN);
  board.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 800, right: 800, bottom: 800, x: 0, y: 0 });
  board.game.getPlayingAs = () => 1;
  f.api.setSetting('danger', 'block', true);
  f.w.document.elementFromPoint = () => board; // jsdom has no layout
  const bb = f.api.blunderBlock;
  bb.allowUntrusted = true;
  bb.search = search;
  bb.ensure = () => search;
  const seen = { down: 0, up: 0, click: 0 };
  f.w.document.addEventListener('pointerdown', () => seen.down++);
  f.w.document.addEventListener('pointerup', () => seen.up++);
  f.w.document.addEventListener('click', () => seen.click++);
  const at = (type, x, y) => board.dispatchEvent(new f.w.MouseEvent(type, { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, button: 0 }));
  return { board, bb, seen, at };
}

const fakeSearch = moves => ({ fen: initialFEN, depth: 20, error: null, moves: new Map(moves), stop() {} });

test('Blunder Block refuses a dragged blunder, lets a fine move through, and the piece goes back with a flash', () => {
  const f = setup();
  try {
    const { board, bb, seen, at } = rig(f, fakeSearch([['e2e3', { blunder: true }], ['e2e4', { blunder: false }]]));
    // drag e2 -> e3 (a blunder)
    at('pointerdown', 450, 650); at('pointerup', 450, 550);
    assert.equal(seen.up, 0, 'the drop never reaches the site');
    assert.ok(board.querySelector('.bs-block-flash'), 'the square flashes');
    // drag e2 -> e4 (fine), once the short refusal window has passed
    bb.blockUntil = 0;
    at('pointerdown', 450, 650); at('pointerup', 450, 450);
    assert.equal(seen.up, 1, 'a fine move goes through untouched');
  } finally { f.close(); }
});

test('Blunder Block works for click-click moves too, and is off when the option is off', () => {
  const f = setup();
  try {
    const { bb, seen, at } = rig(f, fakeSearch([['e2e3', { blunder: true }]]));
    at('pointerdown', 450, 650); at('pointerup', 450, 650);       // select e2
    at('pointerdown', 450, 550);                                  // click e3
    assert.equal(seen.down, 1, 'only the selecting click got through');
    bb.blockUntil = 0;
    f.api.setSetting('danger', 'block', false);
    at('pointerdown', 450, 550);
    assert.equal(seen.down, 2, 'with the option off nothing is refused');
  } finally { f.close(); }
});

test('Blunder Block ignores moves that are not real input (Clutch plays by synthetic events)', () => {
  const f = setup();
  try {
    const { bb, seen, at } = rig(f, fakeSearch([['e2e3', { blunder: true }]]));
    bb.allowUntrusted = false; // jsdom events are not trusted, like Clutch's
    at('pointerdown', 450, 650); at('pointerup', 450, 550);
    assert.equal(seen.up, 1, 'a synthetic blunder passes: the block is only for the user');
  } finally { f.close(); }
});

test('Blunder Block holds a move until the engine has judged it, then plays it for you if it is fine', async () => {
  const f = setup();
  try {
    const search = { fen: initialFEN, depth: 1, error: null, moves: new Map(), stop() {} };
    const { board, bb, seen, at } = rig(f, search);
    let dragged = null;
    // the replay is a synthetic drag; watch for its pointerdown at the origin square
    board.addEventListener('pointerdown', e => { if (dragged === null) dragged = [e.clientX, e.clientY]; });
    at('pointerdown', 450, 650); dragged = null; at('pointerup', 450, 450);
    assert.ok(bb.pending, 'the move is held while the verdict is unknown');
    search.depth = 20; search.moves.set('e2e4', { blunder: false });
    bb.allowUntrusted = false; // from here on events are synthetic, like the site sees them from the script
    bb.settle();
    assert.equal(bb.pending, null, 'decided');
    assert.ok(dragged, 'and made for the user after all');
  } finally { f.close(); }
});
