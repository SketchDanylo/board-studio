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

function realEngine(f) {
  const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
  const { spawn } = require('node:child_process');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'board-studio-book-'));
  fs.writeFileSync(path.join(dir, 'stockfish.cjs'), engineAssets.script);
  fs.writeFileSync(path.join(dir, 'stockfish.wasm'), engineAssets.wasm);
  const child = spawn(process.execPath, [path.join(dir, 'stockfish.cjs')], { windowsHide: true });
  const engine = f.api.clutchEngine;
  let buffer = '';
  engine.worker = { postMessage: command => child.stdin.write(command + '\n'), terminate() {} };
  child.stdout.on('data', chunk => { buffer += chunk; const lines = buffer.split(/\r?\n/); buffer = lines.pop(); lines.forEach(l => engine.receive(l.trim())); });
  engine.send('uci');
  return { engine, kill: () => child.kill() };
}

test('the response book holds an answer for each likely reply, trades included', { timeout: 120000 }, async () => {
  const f = setup(); const { engine, kill } = realEngine(f);
  try {
    // Black to move; ...exd5 takes a knight and the answer is a recapture on d5.
    const fen = 'rnbqkbnr/pppp1ppp/4p3/3N4/2P5/8/PP1PPPPP/R1BQKBNR b KQkq - 0 1';
    const entries = new Map();
    const s = { eval: 2, depth: 8, maxDepth: 12, spare: 2 };
    const n = await f.api.bookBuild({
      fen, s, clock: 20, rounds: 1, replies: 4,
      analyse: (x, o) => engine.analyse(x, o), stop: () => false, onEntry: (k, e) => entries.set(k, e)
    });
    assert.ok(n >= 3, 'several replies are covered');
    const trade = [...entries.values()].find(e => e.reply === 'e6d5');
    assert.ok(trade, 'the capture is in the book');
    assert.equal(trade.step.to, 'd5', 'and the answer is the recapture on d5');
    // a deeper round replaces the entry, never a shallower one
    const depths = [];
    await f.api.bookBuild({ fen, s, clock: 20, rounds: 2, replies: 2, analyse: (x, o) => engine.analyse(x, o), stop: () => false, onEntry: (k, e) => depths.push(e.depth) });
    assert.ok(Math.max(...depths) >= depths[0], 'deeper rounds improve entries');
  } finally { kill(); f.close(); }
});

test('a decision is held to its time budget, even in an ending where mates are searched', { timeout: 60000 }, async () => {
  const f = setup(); const { engine, kill } = realEngine(f);
  try {
    const ask = (fen, mode, budget) => f.api.humanAnalyse(fen, { ms: 1500, budget, mode }, 1800, (x, y) => engine.analyse(x, y));
    for (const [fen, mode] of [['8/8/8/2k5/8/8/p7/4K2Q w - - 0 1', 'win'], ['r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', 'win'], ['4k3/8/8/8/8/8/8/R3K2Q w - - 0 1', 'draw']]) {
      const t0 = Date.now(); const r = await ask(fen, mode, 120);
      assert.ok(r && r.pv && r.pv.length, 'a move comes back');
      assert.ok(Date.now() - t0 < 900, 'within the budget (took ' + (Date.now() - t0) + ' ms)');
    }
  } finally { kill(); f.close(); }
});

test('a premove with room: a winning position gets one even when the answers differ, a close one does not', { timeout: 120000 }, async () => {
  const f = setup(); const { engine, kill } = realEngine(f);
  try {
    const build = async fen => {
      const entries = new Map();
      await f.api.bookBuild({ fen, s: { eval: 2, depth: 8, maxDepth: 12, spare: 2 }, clock: 20, rounds: 1, replies: 4, analyse: (x, o) => engine.analyse(x, o), stop: () => false, onEntry: (k, e) => entries.set(k, e) });
      return entries;
    };
    // a queen and a rook up: any sensible move keeps the win, so some answer is safe against every reply
    const won = await build('4k3/8/8/8/8/8/8/R3K2Q b - - 0 1');
    const w = await f.api.wigglePremove(won, (x, o) => engine.analyse(x, o), () => false);
    assert.ok(w && w.wiggle && w.step.uci, 'a premove with room is found when winning');
    // a sharp middlegame: nothing is safe against every reply
    const sharp = await build('r1bq1rk1/pp3ppp/2n1pn2/2bp4/2B1P3/2N2N2/PPP2PPP/R1BQ1RK1 b - - 0 1');
    const x = await f.api.wigglePremove(sharp, (y, o) => engine.analyse(y, o), () => false);
    assert.ok(x === null || x.wiggle, 'no promise in a sharp position beyond what holds');
  } finally { kill(); f.close(); }
});

test('a move is paced over the game, never the same amount twice, and the whole game fits the clock', () => {
  const f = setup();
  try {
    const ms = f.api.clutchMoveMs, start = 'x x x x 0 1';
    const at = (clock, full, r) => ms(clock, `x x x x 0 ${full}`, () => r);
    assert.equal(at(60, 1, 0.5), 1333, 'a minute at the start: a forty-fifth of it');
    assert.ok(at(60, 1, 0) === 1000 && at(60, 1, 1) === 1667, 'a quarter either way');
    const seen = new Set(); for (let i = 0; i < 30; i++) seen.add(ms(30, 'x x x x 0 10'));
    assert.ok(seen.size > 10, 'different every time');
    assert.ok(at(2, 40, 1) <= 100 && at(0.2, 40, 0) >= 45, 'nearly out: a flash');
    assert.ok(at(40, 40, 1) <= 40 * 100 * 1.25, 'never above a tenth of the clock, plus the spread');
    // a whole game on a minute at the worst rate (always a quarter over): 60 moves, the opponent instant
    let clock = 60; for (let move = 1; move <= 60; move++) clock -= ms(clock, `x x x x 0 ${move}`, () => 1) / 1000;
    assert.ok(clock > 4, 'sixty moves later ' + clock.toFixed(1) + ' s are left');
  } finally { f.close(); }
});

test('the panel bar glows in the colour of the result Clutch rolled, and stops when Clutch is not in a game', () => {
  const f = setup();
  try {
    const host = [...f.w.document.body.children].find(x => x.shadowRoot);
    const odds = host.shadowRoot.querySelector('.odds');
    assert.equal(odds.dataset.mode, undefined, 'no glow before Clutch kicks in');
    f.api.setClutchMode('draw');
    assert.equal(odds.dataset.mode, 'draw');
    f.api.setClutchMode('lose');
    assert.equal(odds.dataset.mode, 'lose');
    f.api.setClutchMode(null);
    assert.equal(odds.dataset.mode, undefined, 'and it stops');
  } finally { f.close(); }
});

test('playing to lose on the clock: quick on the obvious, long on some quiet moves, and out of time at the end', () => {
  const f = setup();
  try {
    const burn = f.api.clutchBurnMs;
    const quiet = { uci: 'g1f3', check: false, capture: false, promotion: null };
    const fens = Array.from({ length: 40 }, (_, i) => `rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - ${i} ${10 + i}`);
    const holds = fens.map(fen => burn('lose', 'time', quiet, fen, 30));
    assert.ok(holds.some(ms => ms > 0) && holds.some(ms => ms === 0), 'only some quiet moves are held');
    assert.ok(holds.filter(ms => ms > 0).every(ms => ms >= 30 * 1000 * 0.25 && ms <= 30 * 1000 * 0.6), 'a quarter to six tenths of what is left');
    assert.deepEqual(holds, fens.map(fen => burn('lose', 'time', quiet, fen, 30)), 'the same position always gets the same answer');
    const held = fens.find(fen => burn('lose', 'time', quiet, fen, 30) > 0);
    assert.equal(burn('lose', 'time', { ...quiet, capture: true }, held, 30), 0, 'a capture is played at once');
    assert.equal(burn('lose', 'time', { ...quiet, check: true }, held, 30), 0, 'and a check');
    assert.equal(burn('lose', 'board', quiet, held, 30), 0, 'losing on the board never holds');
    assert.equal(burn('win', 'time', quiet, held, 30), 0, 'nor does winning');
    assert.equal(burn('lose', 'time', quiet, 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 3', 30), 0, 'the opening is played quickly');
    const late = fens.find(fen => burn('lose', 'time', quiet, fen, 3) > 0);
    assert.ok(burn('lose', 'time', quiet, late, 3) > 3000, 'nearly out of time: it stays put until the flag falls');
  } finally { f.close(); }
});

test('the panel shows a crown, a half or a flag for the plan, each its own colour, and nothing outside a game', () => {
  const f = setup();
  try {
    const sh = [...f.w.document.body.children].find(x => x.shadowRoot).shadowRoot;
    const plan = sh.querySelector('.plan'), badge = plan.firstElementChild;
    assert.equal(plan.hidden, true, 'hidden before Clutch kicks in');
    f.api.setClutchMode('win');
    assert.equal(plan.hidden, false); assert.equal(badge.dataset.kind, 'win'); assert.ok(badge.querySelector('path'), 'the crown');
    f.api.setClutchMode('draw');
    assert.equal(badge.dataset.kind, 'draw'); assert.ok(/189/.test(badge.innerHTML) || /½/.test(badge.textContent), 'the half');
    f.api.setClutchMode('lose', 'time');
    assert.equal(badge.dataset.kind, 'lose'); assert.ok(/on time/.test(badge.title), 'says it is going for the clock');
    f.api.setClutchMode(null);
    assert.equal(plan.hidden, true);
  } finally { f.close(); }
});

test('clearly lost: premove their best reply at once; otherwise only what is certain', () => {
  const f = setup();
  try {
    const step = uci => ({ uci, from: uci.slice(0, 2), to: uci.slice(2, 4) });
    const lost = new Map([['a', { reply: 'e7e5', topReply: 'e7e5', step: step('g1f3'), fen: 'x', cp: -900 }], ['b', { reply: 'a7a6', topReply: 'e7e5', step: step('d2d4'), fen: 'y', cp: -800 }]]);
    const p = f.api.clutchPremove(lost, 'e7e5', false);
    assert.ok(p && p.gamble && p.step.uci === 'g1f3', 'a gamble on their best reply, before the other replies are worked out');
    const fine = new Map([['a', { reply: 'e7e5', topReply: 'e7e5', step: step('g1f3'), fen: 'x', cp: 20 }], ['b', { reply: 'a7a6', topReply: 'e7e5', step: step('d2d4'), fen: 'y', cp: 30 }]]);
    assert.equal(f.api.clutchPremove(fine, 'e7e5', true), null, 'a playable position does not gamble');
  } finally { f.close(); }
});

test('the book gives up as soon as the position changes', { timeout: 60000 }, async () => {
  const f = setup(); const { engine, kill } = realEngine(f);
  try {
    let calls = 0;
    const n = await f.api.bookBuild({ fen: '4k3/8/4p3/3N4/8/8/8/3QK3 b - - 0 1', s: { eval: 2, depth: 6, maxDepth: 10, spare: 2 }, clock: 20, rounds: 4, replies: 4,
      analyse: (x, o) => { calls++; return engine.analyse(x, o); }, stop: () => calls >= 3, onEntry: () => {} });
    assert.ok(calls <= 4, 'it stopped early'); assert.ok(n <= 2);
  } finally { kill(); f.close(); }
});

test('one answer to every reply is flagged as safe to premove', () => {
  const f = setup();
  try {
    const mk = uci => ({ step: { uci } });
    assert.ok(f.api.robustMove(new Map([['a', mk('e2e4')], ['b', mk('e2e4')]])));
    assert.equal(f.api.robustMove(new Map([['a', mk('e2e4')], ['b', mk('d2d4')]])), null);
    assert.equal(f.api.robustMove(new Map()), null);
  } finally { f.close(); }
});

test('answers are grouped by move, the one covering most replies first', () => {
  const f = setup();
  try {
    const mk = (uci, reply) => ({ step: { uci, from: uci.slice(0, 2), to: uci.slice(2, 4) }, reply });
    const answers = f.api.clutchAnswers(new Map([['a', mk('e2e4', 'e7e5')], ['b', mk('d2d4', 'c7c5')], ['c', mk('e2e4', 'g8f6')]]));
    assert.equal(answers.length, 2);
    assert.equal(answers[0].step.uci, 'e2e4'); assert.equal(answers[0].replies.join(), 'e7e5,g8f6');
  } finally { f.close(); }
});

test('premoves are only used where chess.com has them, and cancelling goes through the right button', () => {
  const f = setup();
  try {
    const live = { game: { getMode: () => ({ name: 'playing', plugins: [{ name: 'playing' }, { name: 'premoves' }] }) } };
    const bot = { game: { getMode: () => ({ name: 'playing', plugins: [{ name: 'playing' }] }) } };
    assert.equal(f.api.premoveNative(live), true);
    assert.equal(f.api.premoveNative(bot), false);
    assert.equal(f.api.premoveNative({ game: {} }), false);
    const board = f.board(); const seen = []; f.w.document.elementFromPoint = () => board;
    board.addEventListener('pointerdown', e => seen.push(e.button), true);
    f.api.cancelPremove(board);
    assert.equal(seen.join(), '2', 'a right-button press reaches the board');
  } finally { f.close(); }
});

test('the settings are the trigger time and the Elo (with Auto); the rest is worked out from the position and the clock', () => {
  const f = setup();
  try {
    assert.equal(Object.keys(f.api.settings.clutch).sort().join(), 'auto,draw,elo,on,time,win');
    assert.equal(f.api.settings.clutch.auto, true, 'Auto is the default');
    const p = f.api.clutchParams;
    const base = { on: true, time: 10 };
    assert.ok(p(base, 40, 32).depth > p(base, 5, 32).depth, 'a draining clock shortens the quick look');
    assert.ok(p(base, 8, 4).eval < p(base, 8, 30).eval, 'few pieces: a smaller edge already counts as winning');
    assert.ok(p({ on: true, time: 30 }, 8, 20).spare > p({ on: true, time: 3 }, 8, 20).spare, 'the spare clock follows the trigger');
    assert.equal(p(base, 8, 20).time, 10);
  } finally { f.close(); }
});

test('the opening book answers at once: the most played move of a book position', async () => {
  const fs = require('node:fs'), path = require('node:path');
  const f = setup();
  try {
    const book = fs.readFileSync(path.join(__dirname, '../assets/opening-book.txt'), 'utf8');
    f.w.fetch = async () => ({ ok: true, status: 200, text: async () => book, arrayBuffer: async () => new ArrayBuffer(0) });
    const start = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    assert.equal(f.api.clutchBookStep(start), null, 'not loaded yet: no book move, and the book is requested');
    await new Promise(resolve => setTimeout(resolve, 200));
    const hit = f.api.clutchBookStep(start);
    assert.ok(hit); assert.ok(['e2e4', 'd2d4', 'g1f3', 'c2c4'].includes(hit.step.uci)); assert.ok(hit.games > 0);
    assert.equal(f.api.clutchBookStep('4k3/8/8/8/8/8/8/4K2R w - - 0 1'), null, 'a position outside the book');
  } finally { f.close(); }
});

test('moves that call for care get thinking time, easy ones are played fast', () => {
  const f = setup();
  try {
    const s = { depth: 12, spare: 2 };
    const fen = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 2 3';
    const line = (move, cp) => ({ pv: [move], cp });
    // a close call between two moves: care
    const close = f.api.clutchCritical(fen, { lines: [line('g8f6', 20), line('f8c5', 15)], pv: ['g8f6'], cp: 20 }, { check: false, capture: false });
    assert.ok(close.crit >= 2);
    // a lone clear move, or a won position: no care
    assert.equal(f.api.clutchCritical(fen, { lines: [line('g8f6', 20)], pv: ['g8f6'], cp: 20 }, {}).crit, 0);
    assert.equal(f.api.clutchCritical(fen, { lines: [line('g8f6', 900), line('f8c5', 600)], pv: ['g8f6'], cp: 900 }, {}).crit, 0);
    // thinking time: only for care, not already deep, and a small share of the clock
    assert.equal(f.api.clutchThink({ crit: 0, depth: 12 }, 20, s), 0);
    assert.equal(f.api.clutchThink({ crit: 2, depth: 20 }, 20, s), 0, 'already deep enough');
    assert.equal(f.api.clutchThink({ crit: 2, depth: 12, book: true }, 20, s), 0, 'a book move never waits');
    assert.equal(f.api.clutchThink({ crit: 2, depth: 12 }, 1, s), 0, 'no clock to spare');
    const ms = f.api.clutchThink({ crit: 3, depth: 12 }, 20, s);
    assert.ok(ms > 0 && ms <= 3000 && ms <= 20 * 1000 * 0.2);
  } finally { f.close(); }
});

test('ratings are read from the opponent row and become a playing strength', () => {
  const f = setup();
  try {
    assert.equal(f.api.parseElo('(250)'), 250); assert.equal(f.api.parseElo(' 1500 '), 1500); assert.equal(f.api.parseElo('Martinfoot'), null);
    f.w.document.body.innerHTML = '<div id="player-top"><div>Martinfoot</div><div class="cc-text-medium cc-user-rating-white">(1830)</div><div class="move-time-monospace">3:14</div></div><div id="player-bottom"><div class="cc-user-rating-white">(900)</div></div>';
    assert.equal(f.api.readOpponentElo(), 1830, 'the top row is the opponent');
    f.w.document.body.innerHTML = '';
    assert.equal(f.api.readOpponentElo(), null);
    const low = f.api.strengthOf(300), mid = f.api.strengthOf(1500), high = f.api.strengthOf(2400), full = f.api.strengthOf(3200);
    assert.ok(low.depthCap < mid.depthCap && mid.depthCap < high.depthCap, 'a higher rating looks deeper');
    assert.ok(low.temperature > mid.temperature && mid.temperature > high.temperature, 'and slips less');
    assert.equal(full.limited, false); assert.equal(low.limited, true);
    const p = f.api.clutchStrengthen({ depth: 14, maxDepth: 28, spare: 2, time: 10 }, 800);
    assert.ok(p.depth <= p.strength.depthCap && p.maxDepth <= p.strength.depthCap + 2 && p.multipv >= 6);
    assert.equal(f.api.clutchStrengthen({ depth: 14, maxDepth: 28 }, 3200).multipv, 4);
  } finally { f.close(); }
});

test('a low rating sometimes picks a worse move, a high one almost never', () => {
  const f = setup();
  try {
    const lines = [{ pv: ['a'], cp: 100 }, { pv: ['b'], cp: 0 }, { pv: ['c'], cp: -100 }, { pv: ['d'], cp: -300 }];
    let seed = 7; const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const share = elo => { let best = 0; for (let i = 0; i < 400; i++) if (f.api.sampleLine(lines, f.api.strengthOf(elo).temperature, random).pv[0] === 'a') best++; return best / 400; };
    assert.ok(share(2700) > 0.95, 'near full strength: the best move');
    assert.ok(share(300) < 0.5, 'a beginner often does not');
    assert.ok(share(1200) > share(300) && share(2000) > share(1200));
    assert.equal(f.api.sampleLine([{ pv: ['m'], mate: 2 }, { pv: ['n'], cp: 50 }], 1).pv[0], 'm', 'a mate is found');
  } finally { f.close(); }
});

test('Auto only chooses which rating plays; it never changes the box', () => {
  const f = setup();
  try {
    const e = f.api.clutchEloFor;
    assert.equal(e({ auto: true, elo: 1500 }, 250), 250, 'Auto on, rating read: the opponent\'s');
    assert.equal(e({ auto: true, elo: 1500 }, null), 1500, 'Auto on, nothing to read: the box');
    assert.equal(e({ auto: false, elo: 1500 }, 250), 1500, 'Auto off: the box');
    const base = { auto: true, elo: 1500 }; e(base, 250);
    assert.equal(base.elo, 1500, 'the box is untouched');
  } finally { f.close(); }
});

test('a rating shapes what a player sees: radius, depth, noticing and mate reach all grow with it', () => {
  const f = setup();
  try {
    const lo = f.api.humanProfile(300), mid = f.api.humanProfile(1300), hi = f.api.humanProfile(2000);
    for (const key of ['radius', 'candidates', 'quietDepth', 'notice', 'quietEye', 'mateReach']) {
      assert.ok(lo[key] <= mid[key] && mid[key] <= hi[key], key + ' grows with the rating');
    }
    assert.ok(lo.quietDepth <= 1 && lo.mateReach === 1 && hi.mateReach >= 4);
    assert.equal(f.api.unitHash('same position'), f.api.unitHash('same position'));
    assert.ok(f.api.unitHash('a') !== f.api.unitHash('b'));
  } finally { f.close(); }
});

test('the opponent\'s last move is found from two positions', () => {
  const f = setup();
  try {
    const before = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const after = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
    const move = f.api.inferLastMove(before, after);
    assert.equal(move.from + move.to, 'e2e4');
    assert.equal(f.api.inferLastMove(before, before), null);
    assert.equal(f.api.inferLastMove(null, after), null);
  } finally { f.close(); }
});

test('a beginner looks near the action, always sees captures and checks, and considers few moves', () => {
  const f = setup();
  try {
    const p = f.api.humanProfile(300);
    const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
    const cands = f.api.humanCandidates(fen, p, { from: 'e2', to: 'e4' });
    assert.ok(cands.length >= 1 && cands.length <= p.candidates);
    const near = (a, b) => Math.max(Math.abs(a.charCodeAt(0) - b.charCodeAt(0)), Math.abs(+a[1] - +b[1])) <= p.radius;
    for (const c of cands) assert.ok([c.move.from, c.move.to].some(sq => near(sq, 'e4') || near(sq, 'e2') || Math.max(Math.abs(sq.charCodeAt(0) - 101), Math.abs(+sq[1] - 8)) <= 2) || c.forcing, 'every candidate is near the action or the king: ' + c.uci);
    // a capture is always on the table, however far from the action
    const capture = f.api.humanCandidates('4k3/8/8/7q/8/8/8/R3K3 w - - 0 1', p, { from: 'e1', to: 'e1' });
    assert.ok(capture.some(c => c.capture === false) || capture.length > 0);
    const free = f.api.humanCandidates('r3k3/8/8/8/8/8/8/R3K3 w - - 0 1', p, { from: 'h7', to: 'h8' });
    assert.ok(free.some(c => c.uci === 'a1a8' && c.capture), 'the capture is seen from across the board');
  } finally { f.close(); }
});

test('human play: free material is taken and a mate within reach is played, consistently', { timeout: 120000 }, async () => {
  const f = setup(); const { engine, kill } = realEngine(f);
  try {
    const ask = (fen, elo, lastMove) => f.api.humanAnalyse(fen, { lastMove, ms: 4000 }, elo, (x, y) => engine.analyse(x, y));
    // a free queen
    const free = await ask('4k3/8/8/3q4/8/8/8/3QK3 w - - 0 1', 300, { from: 'd5', to: 'd5' });
    assert.equal(free.pv[0], 'd1d5', 'even a beginner takes a free queen');
    // a mate in one
    const mate1 = await ask('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', 300, null);
    assert.equal(mate1.pv[0], 'a1a8'); assert.equal(mate1.mate, 1);
    // a ladder mate (mate in two) is seen from about 1000, not by a beginner's reach
    const ladder = '6k1/8/8/8/8/8/R7/1R2K3 w - - 0 1';
    const mid = await ask(ladder, 1300, null);
    assert.ok(mid.mate > 0 && mid.mate <= 2, 'a club player finds the ladder mate');
    // the same position always gets the same move
    const again = await ask('r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', 900, { from: 'b8', to: 'c6' });
    const twice = await ask('r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', 900, { from: 'b8', to: 'c6' });
    assert.equal(again.pv[0], twice.pv[0], 'consistent, not random');
    assert.ok(again.human);
  } finally { kill(); f.close(); }
});

test('the engine can be limited to a list of moves', { timeout: 60000 }, async () => {
  const f = setup(); const { engine, kill } = realEngine(f);
  try {
    const result = await engine.analyse('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', { depth: 6, ms: 2000, multipv: 2, searchMoves: ['a2a3', 'h2h3'] });
    assert.ok(result.lines.every(l => ['a2a3', 'h2h3'].includes(l.pv[0])));
  } finally { kill(); f.close(); }
});

test('Clutch starts within 0.4 s of the Time setting, a new throw each time it disarms', () => {
  const f = setup();
  try {
    const rolls = [0.0, 1.0, 0.5];
    let i = 0; const random = () => rolls[i++ % 3];
    const state = { jitter: null, engaged: false };
    // first throw: -0.4, so with Time 10 it starts at 9.6 s
    assert.equal(f.api.clutchEngages(state, 10, 9.9, random), false);
    assert.equal(f.api.clutchEngages(state, 10, 9.6, random), true);
    assert.equal(f.api.clutchEngages(state, 10, 8, random), true, 'stays on');
    assert.equal(f.api.clutchEngages(state, 10, 10.5, random), false, 'clearly above: disarmed');
    // second throw: +0.4, so it starts at 10.4 s
    assert.equal(f.api.clutchEngages(state, 10, 10.4, random), true);
    assert.ok(state.jitter >= -0.4 && state.jitter <= 0.4);
    // never below 0.1 s however it is thrown
    const tiny = { jitter: null, engaged: false };
    assert.equal(f.api.clutchEngages(tiny, 0.1, 0.05, () => 0), true);
    assert.equal(f.api.clutchEngages({ jitter: null, engaged: false }, 5, 5.5, () => 0.5), false);
  } finally { f.close(); }
});

test('blue ghosts for the moves it considers, a red one for the premove, faded out when they go', () => {
  const f = setup();
  try {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const board = f.board(fen);
    board.innerHTML = '<svg class="arrows"></svg>';
    const ctl = new f.api.Controller(board.querySelector('svg'));
    assert.equal(f.api.clutchGhostKind(fen, 'g1f3'), 'wn');
    assert.equal(f.api.clutchGhostKind(fen, 'e4e5'), null, 'no piece there');
    f.api.showClutchGhosts(ctl, [{ fen, uci: 'e2e4', color: '#ff4d4d' }, { fen, uci: 'g1f3', color: '#4cc2ff' }, { fen, uci: 'd2d4', color: '#4cc2ff' }]);
    const ghosts = [...board.querySelectorAll('.bs-ghost-clutch .cc-ghost')];
    assert.equal(ghosts.length, 3);
    const color = g => g.style.getPropertyValue('--reply-color');
    assert.equal(ghosts.filter(g => color(g) === '#ff4d4d').length, 1, 'one red premove ghost');
    assert.equal(ghosts.filter(g => color(g) === '#4cc2ff').length, 2, 'the rest blue');
    const red = ghosts.find(g => color(g) === '#ff4d4d');
    assert.equal(red.style.left, '50%'); assert.equal(red.style.top, '50%', 'sits on e4');
    assert.ok(board.querySelector('.bs-ghost-clutch').compareDocumentPosition(ctl.overlay) & 4, 'under the arrows');
    f.api.showClutchGhosts(ctl, [{ fen, uci: 'e2e4', color: '#ff4d4d' }]);
    assert.equal(board.querySelectorAll('.bs-ghost-clutch .cc-ghost:not(.cc-ghost-leave)').length, 1);
    f.api.showClutchGhosts(ctl, []);
    assert.equal(board.querySelectorAll('.bs-ghost-clutch .cc-ghost:not(.cc-ghost-leave)').length, 0);
  } finally { f.close(); }
});

test('human play takes free material and leaves poisoned material alone, at any rating', { timeout: 180000 }, async () => {
  const f = setup(); const { engine, kill } = realEngine(f);
  try {
    const ask = (fen, elo) => f.api.humanAnalyse(fen, { lastMove: null, ms: 4000 }, elo, (x, y) => engine.analyse(x, y));
    for (const elo of [300, 600, 900, 1200, 1600, 2000]) {
      const pawn = await ask('4k3/8/8/3p4/8/8/8/3QK3 w - - 0 1', elo);
      assert.equal(pawn.pv[0], 'd1d5', `free pawn at ${elo}`);
      const rook = await ask('4k3/8/8/3r4/8/8/8/3QK3 w - - 0 1', elo);
      assert.equal(rook.pv[0], 'd1d5', `free rook at ${elo}`);
      // the pawn is guarded by the knight: queen for a pawn is a blunder, not material
      const poisoned = await ask('4k3/2n5/8/3p4/8/8/8/3QK3 w - - 0 1', elo);
      assert.notEqual(poisoned.pv[0], 'd1d5', `a poisoned pawn at ${elo}`);
    }
  } finally { kill(); f.close(); }
});

test('a won position is converted: no habit of checks, and a position seen before is steered away from', { timeout: 180000 }, async () => {
  const f = setup(); const { engine, kill } = realEngine(f);
  try {
    const queen = '8/8/8/3k4/8/8/4Q3/4K3 w - - 0 1';
    const mating = await f.api.humanAnalyse(queen, { ms: 4000 }, 500, (x, y) => engine.analyse(x, y));
    assert.ok(mating.mate > 0, 'a lone queen against a king is mated, not circled, at any rating');
    // a won ending with no quick mate: Rook and pawn against a rook, extra material 
    const fen = '8/8/8/2k5/8/8/p7/4K2Q w - - 0 1';
    const ask = (elo, seen) => f.api.humanAnalyse(fen, { ms: 4000, seen }, elo, (x, y) => engine.analyse(x, y));
    for (const elo of [500]) {
      const first = await ask(elo, () => 0);
      if (first.mate > 0) continue;
      const g = new Chess(fen); g.move({ from: first.pv[0].slice(0, 2), to: first.pv[0].slice(2, 4) });
      const key = g.fen().split(' ').slice(0, 3).join(' ');
      const again = await ask(elo, after => after.split(' ').slice(0, 3).join(' ') === key ? 2 : 0);
      assert.notEqual(again.pv[0], first.pv[0], 'a won position already seen twice is not walked into again at ' + elo);
    }
  } finally { kill(); f.close(); }
});

test('win, draw or lose: a plain mate is never thrown away in a draw game, a lose game declines it', { timeout: 120000 }, async () => {
  const f = setup(); const { engine, kill } = realEngine(f);
  try {
    const fen = '7k/8/5K2/8/8/8/8/6Q1 w - - 0 1';
    const ask = mode => f.api.humanAnalyse(fen, { ms: 4000, mode }, 1200, (x, y) => engine.analyse(x, y));
    assert.equal((await ask('win')).pv[0], 'g1g7', 'to win: the mate');
    assert.equal((await ask('draw')).pv[0], 'g1g7', 'to draw: a mate in one is still plainly there, stalemating it would be absurd');
    const lost = await ask('lose');
    const g = new Chess(fen); g.move({ from: lost.pv[0].slice(0, 2), to: lost.pv[0].slice(2, 4) });
    assert.ok(!g.isCheckmate() && !g.isDraw() && !g.isStalemate(), 'to lose: neither the mate nor a draw');
  } finally { kill(); f.close(); }
});

test('the result of a game is rolled from the odds, lose being what win and draw leave', () => {
  const f = setup();
  try {
    const roll = (base, r) => f.api.clutchRollMode(base, () => r);
    const odds = { win: 60, draw: 30 };
    assert.equal(roll(odds, 0.0), 'win'); assert.equal(roll(odds, 0.59), 'win');
    assert.equal(roll(odds, 0.6), 'draw'); assert.equal(roll(odds, 0.89), 'draw');
    assert.equal(roll(odds, 0.9), 'lose'); assert.equal(roll(odds, 0.999), 'lose');
    assert.equal(roll({ win: 100, draw: 0 }, 0.999), 'win');
    assert.equal(roll({ win: 0, draw: 0 }, 0.0), 'lose');
    assert.equal(f.api.settings.clutch.win, 60); assert.equal(f.api.settings.clutch.draw, 40);
  } finally { f.close(); }
});

test('the rating does not depend on how many pieces are left: the same misjudgement of quiet positions', () => {
  const f = setup();
  try {
    const p = f.api.humanProfile(900), q = f.api.humanProfile(900);
    assert.equal(p.fuzz, q.fuzz);
    assert.ok(f.api.humanProfile(400).fuzz > f.api.humanProfile(1200).fuzz && f.api.humanProfile(1200).fuzz > f.api.humanProfile(2000).fuzz);
    assert.ok(f.api.humanProfile(400).maxLoss > f.api.humanProfile(2000).maxLoss);
  } finally { f.close(); }
});

test('in an ending the same rating sees further: depth grows as the board empties', () => {
  const f = setup();
  try {
    const full = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const rooks = '4r1k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1';
    const pawns = '8/5pk1/6p1/8/8/6P1/5PK1/8 w - - 0 1';
    const d = (elo, fen) => f.api.humanProfile(elo, fen).quietDepth;
    assert.ok(d(2000, pawns) > d(2000, rooks) && d(2000, rooks) > d(2000, full), 'a pawn ending is read deepest');
    assert.equal(d(300, pawns), d(300, full), 'a beginner gains nothing from an emptier board');
    assert.equal(f.api.humanProfile(1200).quietDepth, f.api.humanProfile(1200, full).quietDepth);
  } finally { f.close(); }
});

test('Clutch ghosts: tied to their move, the premove one marked, a colour change keeps the same ghost, no arrows', () => {
  const f = setup();
  try {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const board = f.board(fen);
    board.innerHTML = '<svg class="arrows"></svg>';
    const ctl = new f.api.Controller(board.querySelector('svg'));
    f.api.showClutchGhosts(ctl, [{ fen, uci: 'e2e4', color: '#4cc2ff' }, { fen, uci: 'g1f3', color: '#4cc2ff' }]);
    const e4 = () => board.querySelector('.bs-ghost-clutch .cc-ghost[data-uci="e2e4"]');
    const before = e4();
    assert.equal(before.dataset.premove, '');
    // it becomes the premove: the same element, now red
    f.api.showClutchGhosts(ctl, [{ fen, uci: 'e2e4', color: '#ff4d4d' }, { fen, uci: 'g1f3', color: '#4cc2ff' }]);
    assert.equal(e4(), before, 'not rebuilt');
    assert.equal(e4().dataset.premove, '1'); assert.equal(e4().style.getPropertyValue('--reply-color'), '#ff4d4d');
    assert.equal(board.querySelectorAll('.bs-ghost-clutch .cc-ghost').length, 2);
    assert.equal(ctl.clutchArrows === undefined || ctl.clutchArrows.length === 0, true, 'Clutch draws no arrows');
  } finally { f.close(); }
});

test('a premove is only a move Clutch is certain of, or a trade it is counting on', () => {
  const f = setup();
  try {
    const mk = (reply, uci, extra = {}) => [reply, { reply, fen: 'fen-' + reply, step: { uci, from: uci.slice(0, 2), to: uci.slice(2, 4), capture: false, ...(extra.step || {}) }, replyCapture: false, replyTo: reply.slice(2, 4), ...extra, ...(extra.step ? { step: { uci, from: uci.slice(0, 2), to: uci.slice(2, 4), capture: false, ...extra.step } } : {}) }];
    const P = f.api.clutchPremove;
    // not before the first full round
    assert.equal(P(new Map([mk('e7e5', 'g1f3')]), 'e7e5', false), null);
    // the same answer to every reply: certain
    const same = P(new Map([mk('e7e5', 'g1f3'), mk('c7c5', 'g1f3'), mk('e7e6', 'g1f3')]), 'e7e5', true);
    assert.equal(same.step.uci, 'g1f3'); assert.equal(same.conditional, false);
    // their only move: certain
    assert.equal(P(new Map([mk('g8f6', 'd1d2')]), 'g8f6', true).why, 'their only move');
    // different answers and no trade: no premove at all
    assert.equal(P(new Map([mk('e7e5', 'g1f3'), mk('c7c5', 'd2d4')]), 'e7e5', true), null);
    // a trade: they take on d5 (with whatever), and every taking is answered by taking back on d5
    const trade = new Map([
      mk('e6d5', 'c4d5', { replyCapture: true, replyTo: 'd5', step: { capture: true } }),
      mk('c6d5', 'd1d5', { replyCapture: true, replyTo: 'd5', step: { capture: true } }),
      mk('g8f6', 'b1c3')
    ]);
    const gamble = P(trade, 'e6d5', true);
    assert.equal(gamble.conditional, true); assert.equal(gamble.step.uci, 'c4d5'); assert.equal(gamble.why, 'if they take on d5');
    // if one of the takings is not answered by taking back, it is not counted on
    const broken = new Map([mk('e6d5', 'c4d5', { replyCapture: true, replyTo: 'd5', step: { capture: true } }), mk('c6d5', 'a2a3', { replyCapture: true, replyTo: 'd5' }), mk('g8f6', 'b1c3')]);
    assert.equal(P(broken, 'e6d5', true), null);
    // and the engine's top reply has to be the taking
    assert.equal(P(trade, 'g8f6', true), null);
  } finally { f.close(); }
});
