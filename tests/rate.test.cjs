const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { setup, engineAssets, initialFEN } = require('./helpers.cjs');

const L = (move, score, depth = 16) => ({ pv: [move], depth, ...score });

test('Rate Moves grades by the loss in expected points, chess.com style', () => {
  const f = setup();
  try {
    const g = f.api.rateGrade;
    const top = [L('a', { cp: 0 }), L('b', { cp: -10 }), L('c', { cp: -20 })];
    assert.equal(g(top, top[0]), 'best');
    assert.equal(g(top, top[1]), 'excellent');
    assert.equal(g(top, L('x', { cp: -45 })), 'good');
    assert.equal(g(top, L('x', { cp: -60 })), 'inaccuracy');
    assert.equal(g(top, L('x', { cp: -120 })), 'mistake');
    assert.equal(g(top, L('x', { cp: -300 })), 'blunder');
    // a big drop that is not two pawns is not a blunder
    assert.notEqual(g([L('a', { cp: 0 })], L('x', { cp: -150 })), 'blunder');
    // letting a winning position go is a Miss
    assert.equal(g([L('a', { cp: 500 }), L('b', { cp: 480 })], L('x', { cp: 100 })), 'miss');
    // allowing mate is a blunder, not a miss
    assert.equal(g([L('a', { cp: 0 })], L('x', { mate: -1 })), 'blunder');
  } finally { f.close(); }
});

test('Great is the only good move; a recapture or a lost game is never Great', () => {
  const f = setup();
  try {
    const g = f.api.rateGrade;
    const only = [L('a', { cp: 40 }), L('b', { cp: -250 })];
    assert.equal(g(only, only[0], { legalCount: 20 }), 'great');
    assert.equal(g(only, only[0], { legalCount: 20, recapture: true }), 'best');
    assert.equal(g(only, only[0], { legalCount: 1 }), 'best');
    const lost = [L('a', { cp: -400 }), L('b', { cp: -900 })];
    assert.equal(g(lost, lost[0], { legalCount: 20 }), 'best');
    const close = [L('a', { cp: 40 }), L('b', { cp: 20 })];
    assert.equal(g(close, close[0], { legalCount: 20 }), 'best');
  } finally { f.close(); }
});

function fakeGame(f, moves, { playingAs = null } = {}) {
  // moves: [{ from, to, san, color, before, after }]
  const b = f.board(moves.length ? moves[moves.length - 1].fen : initialFEN);
  const nodes = moves.map(m => ({ ...m }));
  let sel = nodes.length - 1;
  b.game = {
    getFEN: () => (sel >= 0 ? nodes[sel].fen : nodes[0].beforeFen),
    getSelectedNode: () => (sel >= 0 ? nodes[sel] : null),
    getRawLines: () => [nodes],
    getPlayingAs: () => playingAs
  };
  return { board: b, nodes, select: i => { sel = i; } };
}

const GAME = [
  { from: 'e2', to: 'e4', san: 'e4', color: 1, beforeFen: initialFEN, fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1' },
  { from: 'e7', to: 'e5', san: 'e5', color: 2, beforeFen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2' }
];

test('the badge sits on the move shown, and follows when you step back', () => {
  const f = setup();
  try {
    f.api.setSetting('rate', 'on', true);
    f.api.rater.bookWait = 1; // no opening book in the test page
    f.api.rater.pump = () => {};
    const { board, select } = fakeGame(f, GAME);
    f.api.rater.cache.set(f.api.rater.key(GAME[1].beforeFen, 'e7e5'), 'blunder');
    f.api.rater.cache.set(f.api.rater.key(GAME[0].beforeFen, 'e2e4'), 'brilliant');
    f.api.rateSync();
    let badge = board.querySelector('.bs-rate-badge:not(.bs-leave)');
    assert.equal(badge.dataset.grade, 'blunder');
    assert.equal(badge.style.left, '62.5%', 'top-right corner of e5');
    assert.equal(badge.style.top, '37.5%');
    assert.equal(board.querySelectorAll('.bs-rate-tint:not(.bs-leave)').length, 2, 'both squares take the colour');
    select(0);
    f.api.rateSync();
    badge = board.querySelector('.bs-rate-badge:not(.bs-leave)');
    assert.equal(badge.dataset.grade, 'brilliant', 'stepping back shows that move\'s rating');
    f.api.setSetting('rate', 'on', false);
    assert.equal(board.querySelectorAll('.bs-rate-badge:not(.bs-leave)').length, 0);
  } finally { f.close(); }
});

test('Rate Self: your own moves are rated only with it on', () => {
  const f = setup();
  try {
    f.api.setSetting('rate', 'on', true);
    f.api.rater.bookWait = 1;
    f.api.rater.pump = () => {};
    const { board, select } = fakeGame(f, GAME, { playingAs: 1 }); // you are White
    f.api.rater.cache.set(f.api.rater.key(GAME[0].beforeFen, 'e2e4'), 'best');
    f.api.rater.cache.set(f.api.rater.key(GAME[1].beforeFen, 'e7e5'), 'good');
    select(0);
    f.api.rateSync();
    assert.equal(board.querySelectorAll('.bs-rate-badge:not(.bs-leave)').length, 0, 'your move, Rate Self off');
    assert.ok(!f.api.rater.queue.some(j => j.uci === 'e2e4'), 'your moves are not even queued');
    select(1);
    f.api.rateSync();
    assert.equal(board.querySelector('.bs-rate-badge:not(.bs-leave)').dataset.grade, 'good', 'the opponent\'s move is rated');
    f.api.setSetting('rate', 'self', true);
    select(0);
    f.api.rateSync();
    assert.equal(board.querySelector('.bs-rate-badge:not(.bs-leave)').dataset.grade, 'best');
  } finally { f.close(); }
});

test('the crown remembers each position, so stepping back shows who was winning there at once', () => {
  const f = setup();
  try {
    const { board, select } = fakeGame(f, GAME);
    f.w.document.body.insertAdjacentHTML('beforeend', '<div id="player-bottom"><img class="cc-avatar-component" id="wa"></div><div id="player-top"><img class="cc-avatar-component" id="ba"></div>');
    const e = f.api.engine;
    f.api.syncCrown(); e.receive('uciok'); e.receive('readyok');
    e.receive('info depth 12 score cp -80');            // after 1...e5, white to move: black better
    assert.equal(f.w.document.querySelector('.bs-crown:not(.bs-leave)').bsAvatar.id, 'ba');
    select(0);                                            // step back to after 1.e4
    f.api.syncCrown();
    e.receive('bestmove e7e5');                           // the old search makes way
    e.receive('info depth 14 score cp -30');              // black to move, -30 for black: white better
    assert.equal(f.w.document.querySelector('.bs-crown:not(.bs-leave)').bsAvatar.id, 'wa');
    select(1);                                            // forward again: known, no search needed to show it
    f.api.syncCrown();
    assert.equal(f.w.document.querySelector('.bs-crown:not(.bs-leave)').bsAvatar.id, 'ba');
    // once the board's position is known to depth 16, spare time goes to the game's other positions
    e.receive('bestmove d2d4');
    e.receive('info depth 16 score cp -80');
    const sent = e.worker.commands;
    assert.equal(sent[sent.length - 1], 'stop');
    e.receive('bestmove d2d4');
    assert.equal(sent[sent.length - 1], 'go depth 12', 'a nearby position is looked at next');
    assert.equal(sent[sent.length - 2], `position fen ${initialFEN}`);
  } finally { f.close(); }
});

test('clutchDPI sets the hand\'s speed; 800 keeps the old timing', () => {
  const f = setup();
  try {
    const t = () => f.api.mouseTimes(200, 300, 70, false, () => 0.5);
    const base = t();
    assert.deepEqual({ ...base }, { toPiece: 152, withPiece: 172 }, 'the timing Clutch had before (35 + 60 log2(d/size + 1))');
    f.api.setDPI(400);
    const slow = t();
    assert.ok(Math.abs(slow.toPiece - base.toPiece * 2) <= 1);
    f.api.setDPI(1600);
    assert.ok(Math.abs(t().toPiece - base.toPiece / 2) <= 1);
  } finally { f.close(); }
});

test('Show Mouse: the hand carries every move; a held premove is let go at once', () => {
  const f = setup();
  try {
    const board = f.board();
    board.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 400 });
    f.w.document.elementFromPoint = () => board;
    f.api.setSetting('clutch', 'mouse', true);
    const hand = f.api.shownHand;
    f.api.humanDrag(board, 'e2', 'e4', false, () => 0.9999);
    assert.ok(f.w.document.querySelector('.bs-hand.on'), 'the hand shows');
    // a premove held over its square is let go the moment it is played
    const seen = [];
    board.addEventListener('pointerdown', () => seen.push(Date.now()));
    hand.hold(board, { from: 'g1', to: 'f3' });
    assert.equal(hand.held, 'g1f3');
    f.api.clutchMove(board, { from: 'g1', to: 'f3', uci: 'g1f3' }, 'w', true);
    assert.equal(seen.length, 1, 'played at once');
    assert.equal(hand.held, null);
    // an instant move the hand is not holding is carried by hand instead
    seen.length = 0;
    f.api.clutchMove(board, { from: 'b1', to: 'c3', uci: 'b1c3' }, 'w', true);
    assert.equal(seen.length, 0, 'not in no time');
    assert.ok(f.api.clutch.moveUntil > Date.now() + 200);
    f.api.setSetting('clutch', 'mouse', false);
    assert.equal(f.w.document.querySelector('.bs-hand.on'), null, 'switching it off hides the hand');
  } finally { f.close(); }
});

// The real engine, through the rater's own engine object.
async function withRealRater(f, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'board-studio-rate-'));
  fs.writeFileSync(path.join(dir, 'stockfish.cjs'), engineAssets.script);
  fs.writeFileSync(path.join(dir, 'stockfish.wasm'), engineAssets.wasm);
  const child = spawn(process.execPath, [path.join(dir, 'stockfish.cjs')], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
  const e = f.api.rateEngine;
  e.worker = { postMessage: c => child.stdin.write(c + '\n'), terminate() {} };
  let buffer = '';
  child.stdout.on('data', chunk => {
    buffer += chunk;
    const lines = buffer.split(/\r?\n/); buffer = lines.pop();
    lines.forEach(line => e.receive(line.trim()));
  });
  e.send('uci');
  try { return await fn(); } finally {
    child.kill();
    await new Promise(resolve => child.exitCode !== null ? resolve() : child.once('exit', resolve));
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('real engine: the smothered-mate queen sacrifice is Brilliant, missing the mate is a Miss, allowing mate a Blunder', { timeout: 120000 }, async () => {
  const f = setup();
  try {
    await withRealRater(f, async () => {
      const smother = 'q4r1k/6pp/4Q2N/8/8/8/8/6K1 w - - 0 1';
      assert.equal(await f.api.rateMove(smother, 'e6g8'), 'brilliant');
      const other = await f.api.rateMove(smother, 'e6e5');
      assert.ok(['miss', 'blunder'].includes(other), `Qe5 instead of the mate: ${other}`);
      assert.equal(await f.api.rateMove('rnbqkbnr/pppp1ppp/8/4p3/8/5P2/PPPPP1PP/RNBQKBNR w KQkq - 0 2', 'g2g4'), 'blunder');
      const quiet = await f.api.rateMove('r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', 'f1b5');
      assert.ok(['best', 'excellent', 'good'].includes(quiet), `Bb5 in the Ruy Lopez: ${quiet}`);
      console.log('Real ratings: Qg8+ Brilliant, Qe5', other, ', g4?? Blunder, Bb5', quiet);
    });
  } finally { f.close(); }
});
