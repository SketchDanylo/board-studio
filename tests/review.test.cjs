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
      for (let i = 0; i < 100 && r.pass <= 16; i++) await new Promise(res => setTimeout(res, 100));
      assert.ok(r.pass > 16, 'and it goes on deeper');
      console.log('Fool\'s mate review:', grades.join(' '), '| accuracy', f.api.sideAccuracy(st.acc.w).toFixed(1), f.api.sideAccuracy(st.acc.b).toFixed(1), '| pass', r.pass);
      f.api.reviewClose();
    });
  } finally { f.close(); }
});
