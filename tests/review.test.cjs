const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Chess } = require('chess.js');
const { setup, engineAssets } = require('./helpers.cjs');

// A board holding a played game (SAN list), with chess.com's stepping API.
function gameBoard(f, sans) {
  const c = new Chess(), nodes = [];
  for (const san of sans) {
    const before = c.fen(), m = c.move(san);
    nodes.push({ from: m.from, to: m.to, san: m.san, color: m.color === 'w' ? 1 : 2, beforeFen: before, fen: c.fen(), promotion: m.promotion, capturedStr: m.captured });
  }
  const b = f.board(nodes[nodes.length - 1].fen);
  let sel = nodes.length;
  b.game = {
    getFEN: () => (sel ? nodes[sel - 1].fen : nodes[0].beforeFen),
    getSelectedNode: () => (sel ? nodes[sel - 1] : null),
    getRawLines: () => [nodes],
    getPlayingAs: () => null,
    moveForward: () => { sel = Math.min(nodes.length, sel + 1); },
    moveBackward: () => { sel = Math.max(0, sel - 1); }
  };
  return { board: b, nodes, at: () => sel };
}

test('the played move is scored from the position after it, turned to the mover\'s side', () => {
  const f = setup();
  try {
    const before = { lines: [{ pv: ['e2e4'], cp: 30, depth: 16 }, { pv: ['d2d4'], cp: 25, depth: 16 }] };
    assert.equal(f.api.playedLine(before, { lines: [] }, 'd2d4').cp, 25, 'a top line is used as it is');
    assert.equal(f.api.playedLine(before, { lines: [{ pv: ['e7e5'], cp: 120, depth: 16 }] }, 'g2g4').cp, -120);
    assert.equal(f.api.playedLine(before, { lines: [{ pv: ['d8h4'], mate: 1, depth: 16 }] }, 'g2g4').mate, -1, 'allowing mate in 1');
    assert.equal(f.api.playedLine(before, { lines: [], terminal: 'mate' }, 'd8h4').mate, 1, 'giving mate');
    assert.equal(f.api.playedLine(before, { lines: [], terminal: 'draw' }, 'a2a3').cp, 0);
  } finally { f.close(); }
});

test('accuracy: a perfect move is 100, a game-losing one near 0; the game rating follows the accuracy', () => {
  const f = setup();
  try {
    assert.equal(Math.round(f.api.moveAccuracy(55, 55)), 100);
    assert.ok(f.api.moveAccuracy(80, 5) < 5);
    assert.ok(f.api.sideAccuracy([100, 100, 90]) > f.api.sideAccuracy([100, 100, 20]));
    assert.ok(f.api.accuracyElo(90) > f.api.accuracyElo(70));
  } finally { f.close(); }
});

test('the Game Review button opens the review instead of chess.com\'s page, and closes the game-over window', () => {
  const f = setup();
  try {
    f.api.setSetting('review', 'on', true);
    f.api.reviewEngines.forEach(e => { e.analyse = () => new Promise(() => {}); }); // no engine in this test
    const { board } = gameBoard(f, ['e4', 'e5', 'Nf3']);
    board.getBoundingClientRect = () => ({ left: 0, top: 0, right: 400, bottom: 400, width: 400, height: 400 });
    f.w.document.body.insertAdjacentHTML('beforeend', `<div class="game-over-modal-content"><button aria-label="Close"></button>
      <a class="cc-button-component" href="/analysis/game/computer/1?tab=review" aria-label="Game Review"><span>Game Review</span></a></div>`);
    let closed = 0;
    f.w.document.querySelector('[aria-label="Close"]').addEventListener('click', () => closed++);
    const ev = new f.w.MouseEvent('click', { bubbles: true, cancelable: true });
    f.w.document.querySelector('a[aria-label="Game Review"] span').dispatchEvent(ev);
    assert.equal(ev.defaultPrevented, true, 'chess.com does not navigate');
    assert.equal(closed, 1, 'the game-over window is closed');
    assert.equal(f.api.review.open, true);
    const root = f.w.document.getElementById('bs-fake-review').shadowRoot;
    assert.match(root.textContent, /Game Review/);
    assert.match(root.textContent, /Analyzing the game/);
    f.api.reviewClose();
    assert.equal(f.w.document.getElementById('bs-fake-review'), null);
    // with the setting off, the button is left alone
    f.api.setSetting('review', 'on', false);
    const ev2 = new f.w.MouseEvent('click', { bubbles: true, cancelable: true });
    f.w.document.querySelector('a[aria-label="Game Review"]').dispatchEvent(ev2);
    assert.equal(f.api.review.open, false);
  } finally { f.close(); }
});

async function realEngines(f, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'board-studio-review-'));
  fs.writeFileSync(path.join(dir, 'stockfish.cjs'), engineAssets.script);
  fs.writeFileSync(path.join(dir, 'stockfish.wasm'), engineAssets.wasm);
  const children = f.api.reviewEngines.map(e => {
    const child = spawn(process.execPath, [path.join(dir, 'stockfish.cjs')], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    e.worker = { postMessage: c => child.stdin.write(c + '\n'), terminate() {} };
    let buf = '';
    child.stdout.on('data', d => { buf += d; const l = buf.split(/\r?\n/); buf = l.pop(); l.forEach(x => e.receive(x.trim())); });
    e.send('uci');
    return child;
  });
  try { return await fn(); } finally {
    children.forEach(c => c.kill());
    await Promise.all(children.map(c => new Promise(r => (c.exitCode !== null ? r() : c.once('exit', r)))));
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('real engine: Fool\'s mate is reviewed (g4 a blunder, Qh4# best), then the review keeps going deeper', { timeout: 120000 }, async () => {
  const f = setup();
  try {
    f.api.setSetting('review', 'on', true);
    await realEngines(f, async () => {
      const { board } = gameBoard(f, ['f3', 'e5', 'g4', 'Qh4#']);
      board.getBoundingClientRect = () => ({ left: 0, top: 0, right: 400, bottom: 400, width: 400, height: 400 });
      assert.equal(f.api.reviewOpen(board), true);
      const r = f.api.review;
      for (let i = 0; i < 600 && !r.firstDone; i++) await new Promise(res => setTimeout(res, 100));
      assert.equal(r.firstDone, true, 'the first sweep finishes');
      const grades = r.moves.map(m => m.grade);
      assert.equal(grades[2], 'blunder', `g4: ${grades}`);
      assert.equal(grades[3], 'best', `Qh4#: ${grades}`);
      assert.ok(['mistake', 'inaccuracy', 'blunder', 'good'].includes(grades[0]) || grades[0] === 'book', `f3: ${grades}`);
      const st = f.api.reviewStats();
      assert.ok(f.api.sideAccuracy(st.acc.b) > f.api.sideAccuracy(st.acc.w), 'Black played better');
      for (let i = 0; i < 300 && r.round < 2; i++) await new Promise(res => setTimeout(res, 100));
      assert.ok(r.round >= 2, 'and it goes on, round after round');
      console.log('Fool\'s mate review:', grades.join(' '), '| accuracy', f.api.sideAccuracy(st.acc.w).toFixed(1), f.api.sideAccuracy(st.acc.b).toFixed(1), '| round', r.round);
      f.api.reviewClose();
    });
  } finally { f.close(); }
});

test('a piece lost whatever was played is no sacrifice (a king forced out of check); one left hanging by choice still is', () => {
  const f = setup();
  try {
    // after Rxe7+ the king must move; the bishop on d1 falls either way: Kf8 is the only good move (Great), not Brilliant
    const fen = 'rn2k2r/ppp1Rppp/8/6B1/3q4/2N5/PPP2PPP/R2b2K1 b kq - 0 12';
    assert.equal(f.api.isSoundSacrifice(fen, 'e8f8'), false);
    assert.equal(f.api.isSoundSacrifice(fen, 'e8d8'), false);
    // the smothered-mate queen offer is still a sacrifice
    assert.equal(f.api.isSoundSacrifice('q4r1k/6pp/4Q2N/8/8/8/8/6K1 w - - 0 1', 'e6g8'), true);
  } finally { f.close(); }
});

test('Brilliant waits for depth: a shallow look rates the sacrifice as an ordinary move', () => {
  const f = setup();
  try {
    const lines = d => [{ pv: ['e6g8'], cp: 150, depth: d }, { pv: ['e6e5'], cp: -300, depth: d }];
    const ctx = { sacrifice: true, legalCount: 30 };
    assert.notEqual(f.api.rateGrade(lines(12), lines(12)[0], ctx), 'brilliant');
    assert.equal(f.api.rateGrade(lines(18), lines(18)[0], ctx), 'brilliant');
  } finally { f.close(); }
});

test('best-move arrows: drawn for a move that was not the engine\'s, none for the engine\'s own; the cogwheel switches them', () => {
  const f = setup();
  try {
    f.api.setSetting('review', 'on', true);
    f.api.reviewEngines.forEach(e => { e.analyse = () => new Promise(() => {}); });
    const { board } = gameBoard(f, ['e4', 'e5', 'Nf3']);
    board.getBoundingClientRect = () => ({ left: 0, top: 0, right: 400, bottom: 400, width: 400, height: 400 });
    f.api.reviewOpen(board);
    const r = f.api.review;
    const ev = (best, cp = 20) => ({ depth: 16, reached: 16, lines: [{ pv: [best], cp, depth: 16 }, { pv: ['a2a3'], cp: cp - 30, depth: 16 }] });
    r.evals[0] = ev('d2d4'); r.evals[1] = ev('e7e5'); r.evals[2] = ev('g1f3'); r.evals[3] = ev('b8c6');
    r.moves.forEach(m => { m.book = false; });
    f.api.reviewGrade();
    const arrow = () => board.querySelector('svg.bs-review-best');
    // the 1.e4 arrow (the engine wanted d4), then none on 1...e5 (the engine's own move)
    f.api.review.cur = 1;
    f.api.reviewBoardMarks();
    assert.ok(arrow(), 'an arrow for the better move');
    assert.equal(arrow().dataset.key.startsWith('d2d4'), true);
    f.api.review.cur = 2;
    f.api.reviewBoardMarks();
    assert.equal(arrow(), null, 'no arrow when the engine\'s move was played');
    // the cogwheel's checkbox turns them off
    f.api.review.cur = 1;
    const root = f.w.document.getElementById('bs-fake-review').shadowRoot;
    root.querySelector('.cog').click();
    assert.ok(root.querySelector('.menu.open'), 'the menu opens');
    const box = root.querySelector('.opt-arrows');
    assert.equal(box.checked, true, 'on by default');
    box.checked = false; box.dispatchEvent(new f.w.Event('change'));
    assert.equal(f.api.settings.review.arrows, false);
    assert.equal(arrow(), null);
    f.api.reviewClose();
  } finally { f.close(); }
});

test('a reviewed game is saved: opening it again shows it at once and only goes deeper; the last four games are kept', async () => {
  const f = setup();
  try {
    f.api.setSetting('review', 'on', true);
    const asked = [];
    // a quick fake engine: every position gets two lines at the depth asked
    f.api.reviewEngines.forEach(e => {
      e.analyse = async (fen, o) => { asked.push(o.depth); await new Promise(r => setTimeout(r, 1)); return { depth: o.depth, lines: [{ pv: ['a2a3'], cp: 10, depth: o.depth }, { pv: ['h2h3'], cp: 0, depth: o.depth }] }; };
    });
    const open = sans => {
      const { board } = gameBoard(f, sans);
      board.getBoundingClientRect = () => ({ left: 0, top: 0, right: 400, bottom: 400, width: 400, height: 400 });
      f.api.reviewOpen(board);
      return board;
    };
    const r = f.api.review;
    open(['e4', 'e5', 'Nf3', 'Nc6']);
    for (let i = 0; i < 200 && !(r.firstDone && r.round >= 2); i++) await new Promise(res => setTimeout(res, 5));
    f.api.reviewClose();
    assert.equal(f.api.reviewStored().length, 1, 'saved when the review closed');
    // open it again: the first sweep is not done again
    asked.length = 0;
    open(['e4', 'e5', 'Nf3', 'Nc6']);
    assert.equal(r.restored, true);
    assert.equal(r.firstDone, true, 'no new sweep');
    assert.ok(r.round >= 2, 'the next round, with more time');
    assert.match(f.w.document.getElementById('bs-fake-review').shadowRoot.textContent, /Saved review/);
    for (let i = 0; i < 50 && !asked.length; i++) await new Promise(res => setTimeout(res, 5));
    assert.ok(asked.length && asked.every(d => d > 18), `only deeper looks: ${asked}`);
    f.api.reviewClose();
    // four more games: the first one is the oldest and goes
    for (const g of [['d4'], ['c4'], ['Nf3'], ['g3']]) { open(g); for (let i = 0; i < 100 && !r.firstDone; i++) await new Promise(res => setTimeout(res, 5)); f.api.reviewClose(); }
    const kept = f.api.reviewStored();
    assert.equal(kept.length, 4);
    assert.ok(kept.every(g => g.n === 1), 'the 4-move game was dropped');
  } finally { f.close(); }
});

test('an exchange left hanging is a sacrifice, as on chess.com (O-O leaving Ra3 to ...Bxa3)', () => {
  const f = setup();
  try {
    assert.equal(f.api.isSoundSacrifice('8/2k2ppp/B2bp3/3p1bq1/P2P4/R7/1rP2PPP/1N1QK2R w K - 0 1', 'e1g1'), true);
  } finally { f.close(); }
});

test('after the sweep every move gets the same time, round after round with twice the time; possible Brilliants get a longer look first', async () => {
  const f = setup();
  try {
    f.api.setSetting('review', 'on', true);
    const asked = [];
    f.api.reviewEngines.forEach(e => {
      e.analyse = async (fen, o) => { asked.push({ fen, ms: o.ms, depth: o.depth }); await new Promise(r => setTimeout(r, 1)); return { depth: 18, lines: [{ pv: ['a2a3'], cp: 10, depth: 18 }, { pv: ['h2h3'], cp: 0, depth: 18 }] }; };
    });
    // Black's 2...Qxe5?? style offer is not needed: Nxe5 offers a knight (a sacrifice candidate) in a short game
    const { Chess } = require('chess.js');
    const c = new Chess(); const nodes = [];
    for (const san of ['e4', 'e5', 'Nf3', 'Nc6', 'Nxe5']) { const before = c.fen(), m = c.move(san); nodes.push({ from: m.from, to: m.to, san: m.san, color: m.color === 'w' ? 1 : 2, beforeFen: before, fen: c.fen() }); }
    const b = f.board(c.fen()); let sel = nodes.length;
    b.game = { getFEN: () => (sel ? nodes[sel - 1].fen : nodes[0].beforeFen), getSelectedNode: () => nodes[sel - 1], getRawLines: () => [nodes], getPlayingAs: () => null, moveForward() {}, moveBackward() {} };
    b.getBoundingClientRect = () => ({ left: 0, top: 0, right: 400, bottom: 400, width: 400, height: 400 });
    f.api.reviewOpen(b);
    const r = f.api.review;
    for (let i = 0; i < 400 && r.round < 3; i++) await new Promise(res => setTimeout(res, 5));
    const after = asked.filter(a => a.depth === 99);
    const share1 = after.filter(a => a.ms === 3000), share2 = after.filter(a => a.ms === 6000), long = after.filter(a => a.ms === 9000);
    // round 1: every position its 3 s, or (around the offer) the longer look in its place
    assert.equal(new Set([...share1, ...long.slice(0, 2)].map(x => x.fen)).size, nodes.length + 1, 'round 1: every position 3 s');
    assert.equal(share1.length, nodes.length + 1 - 2);
    assert.ok(share2.length >= nodes.length + 1 - 2, 'round 2: every position 6 s');
    assert.ok(long.length >= 1, 'the knight offer got a longer look of its own');
    assert.ok(after.indexOf(long[0]) < after.indexOf(share1[0]), 'and before the even shares');
    f.api.reviewClose();
    await new Promise(res => setTimeout(res, 50));
  } finally { f.close(); }
});

test('taking a lesser piece while leaving a bigger one en prise is a sacrifice (26...Bxc3 leaving Qd8 to Rxd8+), a fair trade is not', () => {
  const f = setup();
  try {
    assert.equal(f.api.isSoundSacrifice('r2q1k2/1pp4p/p4pp1/8/8/PPB3P1/K1PbB2P/3R3R b - - 0 26', 'd2c3'), true);
    assert.equal(f.api.isSoundSacrifice('r1bqkbnr/1ppp1ppp/p1n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4', 'b5c6'), false, 'Bxc6 bxc6 is a trade');
  } finally { f.close(); }
});
