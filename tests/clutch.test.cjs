const test = require('node:test');
const assert = require('node:assert/strict');
const { setup, engineAssets } = require('./helpers.cjs');
const { Chess } = require('chess.js');

test('clock text becomes seconds', () => {
  const f = setup();
  try {
    const p = f.api.parseClock;
    assert.equal(p('1:23'), 83); assert.equal(p('0:09.8'), 9.8); assert.equal(p('9.8'), 9.8);
    assert.equal(p('1:02:03'), 3723); assert.equal(p(' 0:05 '), 5);
    assert.equal(p('abc'), null); assert.equal(p('1-0'), null); assert.equal(p(''), null);
  } finally { f.close(); }
});

test('piece count and search budget: fewer pieces search longer and deeper, tiny clocks stay tiny', () => {
  const f = setup();
  try {
    const s = { time: 10, eval: 2, depth: 12, maxDepth: 28, spare: 2 };
    assert.equal(f.api.countPieces('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'), 32);
    assert.equal(f.api.countPieces('8/8/8/4k3/8/8/4K3/7R w - - 0 1'), 3);
    const many = f.api.clutchBudget(8, 32, s), few = f.api.clutchBudget(8, 5, s);
    assert.ok(few.stage2Ms > many.stage2Ms * 2, 'a sparse board may think longer');
    assert.ok(few.maxDepth > many.maxDepth, 'and deeper');
    assert.ok(many.stage2Ms <= 8000 * 0.12 * 1000 / 1000 + 1, 'the deep look is a small share of the clock');
    assert.equal(f.api.clutchBudget(1.5, 32, s).canDeepen, false, 'below the spare clock it does not go deep');
    assert.ok(f.api.clutchBudget(0.4, 5, s).stage1Ms <= 500);
  } finally { f.close(); }
});

test('winning means a mate or the Eval setting in pawns', () => {
  const f = setup();
  try {
    const s = { eval: 2 };
    assert.equal(f.api.clutchWinning({ cp: 250 }, s), true);
    assert.equal(f.api.clutchWinning({ cp: 150 }, s), false);
    assert.equal(f.api.clutchWinning({ mate: 3 }, s), true);
    assert.equal(f.api.clutchWinning({ mate: -3 }, s), false);
  } finally { f.close(); }
});

test('a mate line marks which of our moves are sure (every earlier reply forced)', () => {
  const f = setup();
  try {
    // Back-rank: Rd8+ Rxd8 is not forced (two replies?) so use a ladder with only-move replies.
    const fen = '7k/8/6K1/8/8/8/8/R7 w - - 0 1';
    const game = new Chess(fen);
    // Ra8# is mate in one: single step, ours, sure.
    let line = f.api.mateLine(fen, ['a1a8']);
    assert.equal(line.length, 1); assert.equal(line[0].ours, true); assert.equal(line[0].sure, true);
    // Kg6-f7... king h8 has few replies; after Rh1+ the black king's only move is Kg8.
    const fen2 = '7k/8/5K2/8/8/8/8/R7 w - - 0 1';
    line = f.api.mateLine(fen2, ['a1h1', 'h8g8', 'h1h8']);
    assert.equal(line.length, 3);
    assert.equal(line.map(s => s.ours).join(), 'true,false,true');
    assert.equal(line[1].sure, true, 'Kg8 is the only reply to Rh1+');
    assert.equal(line[2].sure, true, 'so our next move is certain and can be premoved');
    // Several replies: the move after them is not sure.
    const open = f.api.mateLine('4k3/8/8/8/8/8/PPPPPPPP/4K3 w - - 0 1', ['a2a3', 'e8d8', 'b2b3']);
    assert.equal(open[0].sure, true); assert.equal(open[1].sure, false); assert.equal(open[2].sure, false);
    assert.ok(game);
  } finally { f.close(); }
});

test('the real engine finds a forced mate and the planner turns it into steps', { timeout: 60000 }, async () => {
  const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
  const { spawn } = require('node:child_process');
  const f = setup();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'board-studio-clutch-'));
  fs.writeFileSync(path.join(dir, 'stockfish.cjs'), engineAssets.script);
  fs.writeFileSync(path.join(dir, 'stockfish.wasm'), engineAssets.wasm);
  const child = spawn(process.execPath, [path.join(dir, 'stockfish.cjs')], { windowsHide: true });
  try {
    const engine = f.api.clutchEngine;
    let buffer = '';
    engine.worker = { postMessage: command => child.stdin.write(command + '\n'), terminate() {} };
    child.stdout.on('data', chunk => { buffer += chunk; const lines = buffer.split(/\r?\n/); buffer = lines.pop(); lines.forEach(l => engine.receive(l.trim())); });
    engine.send('uci');
    const fen = '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1'; // Rd8#
    const result = await engine.analyse(fen, { depth: 10, ms: 5000 });
    assert.equal(result.mate, 1);
    const line = f.api.mateLine(fen, result.pv);
    assert.equal(line[0].uci, 'd1d8'); assert.equal(line[0].sure, true);
    // a newer request replaces one still running
    const slow = engine.analyse('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', { depth: 30, ms: 20000 });
    const quick = engine.analyse(fen, { depth: 10, ms: 5000 });
    assert.equal(await slow, null, 'the old request is dropped');
    assert.equal((await quick).mate, 1);
  } finally { child.kill(); f.close(); }
});

test('clocks are read from the player rows: your own at the bottom, the opponent at the top', () => {
  const f = setup();
  try {
    f.w.document.body.innerHTML = '<div id="player-top"><div class="move-time-monospace">0:42</div></div><div id="player-bottom"><div class="move-time-monospace">0:09.8</div></div>';
    assert.equal(f.api.readClock('own'), 9.8);
    assert.equal(f.api.readClock('opp'), 42);
    f.w.document.body.innerHTML = '';
    assert.equal(f.api.readClock('own'), null, 'no clock, no Clutch');
    f.w.__bsClutchClock = 5;
    assert.equal(f.api.readClock('own'), 5, 'the test override wins');
  } finally { f.close(); }
});

test('without a mate: best move when fine, a check that holds when losing, a holding move otherwise', () => {
  const f = setup();
  try {
    const s = { eval: 2 };
    const fen = '6k1/5ppp/8/8/8/8/5PPP/3Q2K1 w - - 0 1';
    const line = (move, cp, mate) => ({ pv: [move], ...(mate !== undefined ? { mate } : { cp }) });
    // fine: just the best move
    assert.equal(f.api.clutchPick(fen, { cp: 30, pv: ['d1d4'], lines: [line('d1d4', 30), line('d1d2', 20)] }, s).uci, 'd1d4');
    // losing, and a queen check holds the draw: take the check even though it is not the best line
    const losing = { cp: -400, pv: ['g1f1'], lines: [line('g1f1', -400), line('d1d8', -10), line('d1d2', -450)] };
    const pick = f.api.clutchPick(fen, losing, s);
    assert.equal(pick.uci, 'd1d8'); assert.equal(pick.check, true);
    // losing and nothing holds: the best move
    assert.equal(f.api.clutchPick(fen, { cp: -500, pv: ['g1f1'], lines: [line('g1f1', -500), line('d1d2', -600)] }, s).uci, 'g1f1');
    assert.equal(f.api.clutchPick(fen, { pv: [] }, s), null);
    assert.equal(f.api.clutchLosing({ mate: -3 }, s), true);
  } finally { f.close(); }
});

test('promotion: the queen in chess.com\'s picker gets clicked', () => {
  const f = setup();
  try {
    f.w.document.body.innerHTML = '<div class="promotion-window"><div class="promotion-piece wq"></div><div class="promotion-piece wn"></div></div>';
    const clicks = [];
    f.w.document.querySelector('.promotion-piece.wq').addEventListener('click', () => clicks.push('q'));
    f.w.document.querySelector('.promotion-piece.wn').addEventListener('click', () => clicks.push('n'));
    f.api.choosePromotion('w', 'q');
    return new Promise(resolve => setTimeout(() => { assert.equal(clicks.join(), 'q'); f.close(); resolve(); }, 150));
  } catch (e) { f.close(); throw e; }
});
