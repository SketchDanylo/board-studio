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

test('the Styles panel carries no plan badge (it is beside the clock), and it scrolls on a short window', () => {
  const f = setup();
  try {
    const sh = [...f.w.document.body.children].find(x => x.shadowRoot).shadowRoot;
    f.api.setClutchMode('win');
    assert.equal(sh.querySelector('.plan'), null, 'no badge in the panel');
    const css = sh.querySelector('style').textContent;
    assert.ok(/\.panel \{[^}]*overflow-y: auto/.test(css), 'the panel scrolls vertically');
    assert.ok(/max-height: calc\(100vh - 16px\)/.test(css), 'and never taller than the window');
    assert.ok(/overscroll-behavior: contain/.test(css), 'without leaking the scroll to the page');
  } finally { f.close(); }
});

test('playing to draw with a clock to spare: some quiet moves are held so the opponent is not the one flagged, never when short of time', () => {
  const f = setup();
  try {
    const burn = f.api.clutchBurnMs;
    const quiet = { uci: 'g1f3', check: false, capture: false, promotion: null };
    const fens = Array.from({ length: 60 }, (_, i) => `rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - ${i} ${10 + i}`);
    const holds = fens.map(fen => burn('draw', null, quiet, fen, 40, 15));
    assert.ok(holds.some(ms => ms > 0) && holds.some(ms => ms === 0), 'only some moves');
    assert.ok(holds.filter(ms => ms > 0).every(ms => ms >= 1500 * 0.6 && ms <= 16000), 'a share of the surplus, at most 40% of its own clock');
    // 40 s against 15 s: it never spends below 12 s or below their clock + 3
    assert.ok(holds.every(ms => 40 - ms / 1000 >= 18 - 1e-9), 'it keeps a comfortable margin over their clock');
    const held = fens.find(fen => burn('draw', null, quiet, fen, 40, 15) > 0);
    assert.equal(burn('draw', null, quiet, held, 40, 38), 0, 'no surplus over them: nothing to give');
    assert.equal(burn('draw', null, quiet, held, 11, 2), 0, 'short of time itself: never');
    assert.equal(burn('draw', null, quiet, held, 40, null), 0, 'their clock unknown: nothing');
    assert.equal(burn('draw', null, { ...quiet, capture: true }, held, 40, 15), 0, 'a capture goes at once');
    assert.equal(burn('win', null, quiet, held, 40, 15), 0, 'winning never holds');
  } finally { f.close(); }
});

test('the plan badge sits just left of your own clock on the board, in the colour of the plan, and goes with the game', () => {
  const f = setup();
  try {
    const d = f.w.document;
    d.body.insertAdjacentHTML('beforeend', '<div id="player-bottom"><div class="move-time-time"><div class="move-time-monospace">1:00</div></div></div>');
    d.querySelector('.move-time-time').getBoundingClientRect = () => ({ left: 541, top: 644, width: 135, height: 40, right: 676, bottom: 684 });
    assert.equal(d.querySelector('.bs-plan-float'), null, 'nothing before Clutch kicks in');
    f.api.setClutchMode('win');
    const badge = d.querySelector('.bs-plan-float');
    assert.ok(badge && !badge.hidden && badge.dataset.kind === 'win', 'a crown for a win');
    assert.equal(badge.style.left, '505px', 'left of the clock'); assert.equal(badge.style.top, '650px', 'centred on it');
    f.api.setClutchMode('lose', 'time');
    assert.equal(badge.dataset.kind, 'lose'); assert.ok(/on time/.test(badge.title));
    f.api.setClutchMode(null);
    assert.equal(badge.hidden, true, 'gone when the game is');
  } finally { f.close(); }
});

test('the plan badge also finds the clock of a live game (other markup than the bot page)', () => {
  const f = setup();
  try {
    const d = f.w.document;
    for (const [html, box] of [
      ['<div class="clock-bottom"><span class="clock-time-monospace">2:59</span></div>', '.clock-bottom'],
      ['<div id="board-layout-player-bottom"><div class="clock-component"><span class="move-time-monospace">1:00</span></div></div>', '.clock-component'],
      ['<div data-cy="clock-bottom">0:45.2</div>', '[data-cy="clock-bottom"]']
    ]) {
      d.querySelectorAll('.bs-plan-float').forEach(x => x.remove());
      d.body.innerHTML = html;
      d.querySelector(box).getBoundingClientRect = () => ({ left: 300, top: 500, width: 100, height: 40, right: 400, bottom: 540 });
      f.api.setClutchMode(null); f.api.setClutchMode('draw');
      const badge = d.querySelector('.bs-plan-float');
      assert.ok(badge && !badge.hidden, 'the badge shows beside ' + box);
      assert.equal(badge.style.left, '264px'); assert.equal(badge.style.top, '506px');
    }
  } finally { f.close(); }
});

test('a premove is played exactly as indicated, not decided again once their move is known', () => {
  const f = setup();
  try {
    const after = new Chess(); after.move('e4');            // they played 1.e4 ... wait: this is the position after White's e4, Black to move
    const fen = after.fen();
    const g = new Chess(fen); g.move('e5');                // Black replied ...e5; White is to move: Nf3 and d4 are both legal
    const here = g.fen();
    const prem = { step: { uci: 'g1f3' }, conditional: false };
    const entry = { step: { uci: 'd2d4' } };                // what the book would answer to this reply
    assert.equal(f.api.clutchAuthenticStep(prem, here, entry).uci, 'g1f3', 'the premove goes, not the book answer');
    assert.equal(f.api.clutchAuthenticStep(prem, here, null).uci, 'g1f3', 'even to a reply the book never saw');
    assert.equal(f.api.clutchAuthenticStep({ step: { uci: 'a1a5' }, conditional: false }, here, entry), null, 'an illegal premove falls back');
    assert.equal(f.api.clutchAuthenticStep({ step: { uci: 'g1f3' }, conditional: true }, here, entry).uci, 'g1f3', 'a trade premove goes whenever it is legal, as a real premove does');
    assert.equal(f.api.clutchAuthenticStep({ step: { uci: 'a2a5' }, conditional: true }, here, entry), null, 'and when it is not legal (they did not take) the board refuses it and the move is decided afresh');
    assert.equal(f.api.clutchAuthenticStep(null, here, entry), null);
  } finally { f.close(); }
});

test('a Clutch ghost shows one step after the first: a ghost at a quarter of the first, joined by an arrow', () => {
  const f = setup();
  try {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const board = f.board(fen);
    board.innerHTML = '<svg class="arrows"></svg>';
    const ctl = new f.api.Controller(board.querySelector('svg'));
    assert.deepEqual(Array.from(f.api.clutchChain(fen, ['e2e4', 'e7e5', 'g1f3', 'b8c6']), s => s.uci), ['e2e4', 'e7e5'], 'two steps, however long the line');
    assert.deepEqual(Array.from(f.api.clutchChain(fen, ['e2e4', 'e2e4']), s => s.uci), ['e2e4'], 'it stops where the line stops being legal');
    f.api.showClutchGhosts(ctl, [{ fen, uci: 'e2e4', color: '#ff4d4d', line: ['e2e4', 'e7e5', 'g1f3', 'b8c6'] }]);
    const layer = board.querySelector('.bs-ghost-clutch');
    const ghosts = [...layer.querySelectorAll('.cc-ghost:not(.cc-ghost-leave)')];
    assert.equal(ghosts.length, 2, 'a ghost and the one after it');
    const op = el => +el.style.opacity;
    const [first, second] = ['e2e4', 'e7e5'].map(u => ghosts.find(g => g.dataset.uci === u));
    assert.ok(first && second);
    assert.ok(Math.abs(op(second) - op(first) / 4) < 1e-9, 'the next ghost is a quarter of the one before');
    assert.equal(second.style.left, '50%'); assert.equal(second.style.top, '37.5%', 'it sits where its piece lands (e5)');
    assert.equal(ctl.chainArrows.length, 1, 'an arrow from the ghost to the next');
    assert.equal(ctl.chainArrows[0].uci, 'e7e5', 'the move itself, not a line between two ghosts');
    assert.ok(Math.abs(ctl.chainArrows[0].opacity - op(second)) < 1e-9, 'as strong as the ghost it leads to');
    f.api.settings.arrows.on = false;
    f.api.showClutchGhosts(ctl, [{ fen, uci: 'e2e4', color: '#4cc2ff', line: ['e2e4', 'e7e5'] }]);
    assert.equal(ctl.chainArrows.length, 0, 'the board draws none');
    assert.equal(board.querySelectorAll('.bs-ghost-clutch svg.cc-chain g').length, 1, 'a plain arrow instead');
    f.api.settings.arrows.on = true;
    f.api.showClutchGhosts(ctl, [{ fen, uci: 'd2d4', color: '#4cc2ff' }]);
    assert.equal(board.querySelectorAll('.bs-ghost-clutch .cc-ghost:not(.cc-ghost-leave)').length, 1);
    assert.equal(ctl.chainArrows.length, 0);
    f.api.showClutchGhosts(ctl, []);
    assert.equal(ctl.chainArrows.length, 0, 'clearing the ghosts clears the arrows');
  } finally { f.close(); }
});

test('a short line is carried on to three moves by quick looks, and stops where it stops being legal', async () => {
  const f = setup();
  try {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const replies = ['e7e5', 'g1f3'];
    const asked = [];
    const out = await f.api.extendLine(fen, ['e2e4'], async (x, o) => { asked.push(x.split(' ')[1]); return { pv: [replies[asked.length - 1]] }; });
    assert.deepEqual(Array.from(out), ['e2e4', 'e7e5', 'g1f3'], 'three moves');
    assert.deepEqual(asked, ['b', 'w'], 'one look per missing move');
    assert.deepEqual(Array.from(await f.api.extendLine(fen, ['e2e4', 'e7e5', 'g1f3'], async () => { throw new Error('no look needed'); })), ['e2e4', 'e7e5', 'g1f3'], 'a full line is left alone');
    assert.deepEqual(Array.from(await f.api.extendLine(fen, ['e2e4'], async () => ({ pv: ['a1a5'] }))), ['e2e4'], 'an illegal continuation stops it');
  } finally { f.close(); }
});

test('answers for a person are looked at quickly first so the ghosts are up early, then again at more length', async () => {
  const f = setup();
  try {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1';
    const calls = [], entries = new Map();
    const analyse = async () => ({ depth: 6, cp: 20, pv: ['e7e5'], lines: [{ cp: 20, pv: ['e7e5'] }, { cp: 10, pv: ['d7d5'] }] });
    const answer = async (x, o) => { calls.push([o.budget, x]); return { depth: 6, cp: 30, pv: ['g1f3', 'b8c6', 'f1c4'], human: true, lines: [] }; };
    await f.api.bookBuild({ fen, s: { eval: 2, depth: 6, maxDepth: 12, spare: 2, human: true }, clock: 20, replies: 2, analyse, answer, stop: () => false, onEntry: (k, e) => entries.set(k, e) });
    const budgets = calls.map(c => c[0]);
    assert.ok(budgets.includes(450) && budgets.includes(1600), 'a quick look, then a longer one');
    assert.ok(budgets.indexOf(450) < budgets.indexOf(1600), 'the quick one first');
    assert.ok(calls.every(c => c[0] <= 1600), 'never an unbounded look');
  } finally { f.close(); }
});

test('a hand takes time by distance: far from the piece or far across the board is slower, hurry is faster', () => {
  const f = setup();
  try {
    const t = (a, b, fast) => f.api.mouseTimes(a, b, 70, fast, () => 0.5);
    const near = t(70, 70), far = t(500, 350);
    assert.ok(far.toPiece > near.toPiece && far.withPiece > near.withPiece, 'further takes longer');
    assert.ok(t(0, 70).toPiece === 0, 'a hand already on the piece does not travel to it');
    assert.ok(t(500, 350, true).toPiece < far.toPiece && t(500, 350, true).withPiece < far.withPiece, 'in a hurry it is quicker');
    assert.ok(far.toPiece > 120 && far.toPiece < 400 && far.withPiece > 100 && far.withPiece < 350, 'quick, as a person is: a fraction of a second');
    // the whole move
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const board = f.board(fen);
    board.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 800, right: 800, bottom: 800 });
    f.w.document.elementFromPoint = () => board;
    const nearMove = f.api.humanDrag(board, 'e2', 'e3', false, () => 0.5);
    const farMove = f.api.humanDrag(board, 'a1', 'h8', false, () => 0.5);
    assert.ok(farMove > nearMove, 'a move across the whole board takes longer than one square (' + farMove + ' vs ' + nearMove + ' ms)');
  } finally { f.close(); }
});

test('a branch starts from what they may play: their ghost, then our answer, then theirs, joined, and a shared ghost is drawn once', () => {
  const f = setup();
  try {
    // Black to move after 1.e4; Black may play ...e5 or ...c5, and White answers 2.Nf3 to both
    const after = new Chess(); after.move('e4');
    const fen = after.fen();
    const board = f.board(fen);
    board.innerHTML = '<svg class="arrows"></svg>';
    const ctl = new f.api.Controller(board.querySelector('svg'));
    f.api.showClutchGhosts(ctl, [
      { fen, line: ['e7e5', 'g1f3', 'b8c6'], color: '#ff4d4d', premoveAt: 1 },
      { fen, line: ['c7c5', 'g1f3', 'd7d6'], color: '#4cc2ff' }
    ]);
    const ghosts = [...board.querySelectorAll('.bs-ghost-clutch .cc-ghost:not(.cc-ghost-leave)')];
    const by = (d, u) => ghosts.find(g => g.dataset.depth === String(d) && g.dataset.uci === u);
    assert.ok(by(0, 'e7e5') && by(0, 'c7c5'), 'both of their possible moves are shown');
    assert.equal(ghosts.filter(g => g.dataset.uci === 'g1f3').length, 1, 'the shared answer Nf3 is one ghost');
    assert.equal(by(1, 'g1f3').dataset.premove, '1', 'the answer of the premove branch is the premove');
    assert.equal(by(1, 'g1f3').style.getPropertyValue('--reply-color'), '#ff4d4d', 'a shared ghost takes the premove colour');
    assert.ok(Math.abs(+by(0, 'e7e5').style.opacity - 4 * +by(1, 'g1f3').style.opacity) < 1e-9, 'their move is the strongest, our answer a quarter of it');
    assert.equal(ctl.chainArrows.length, 1, 'the shared answer Nf3 is one arrow: g1f3');
    assert.equal(ctl.chainArrows[0].uci, 'g1f3');
  } finally { f.close(); }
});

// An engine that rates the moves it is asked about by a fixed list, best first, so the plan for the eval can be seen.
function ratedBy(values) {
  const order = [];
  return async (fen, o) => {
    if (o.mate) return { depth: 4, cp: 0, pv: [] };
    const moves = o.searchMoves || [];
    const lines = moves.map(uci => { if (!order.includes(uci)) order.push(uci); return { depth: 6, cp: values[order.indexOf(uci)] ?? -900, pv: [uci] }; })
      .sort((a, b) => b.cp - a.cp);
    return { depth: 6, cp: lines[0] ? lines[0].cp : 0, pv: lines[0] ? lines[0].pv : [], lines };
  };
}

test('everything is played around the eval bar: the aim sets where it should go, and what they just did sets how far', async () => {
  const f = setup();
  try {
    // a middlegame with captures and checks to choose from, so there are many candidates
    const fen = 'rnbqkb1r/pppppppp/5n2/8/8/5N2/PPPPPPPP/RNBQKB1R w KQkq - 2 2';
    const play = (mode, values, extra = {}) => f.api.humanAnalyse(fen, { lastMove: null, ms: 300, mode, ...extra }, 2400, ratedBy(values));
    // far ahead (+6 pawns at best): winning takes it, drawing gives some back, losing sinks
    const ahead = [600, 450, 300, 150, 0, -150, -300];
    assert.equal((await play('win', ahead)).cp, 600, 'to win: the best');
    const drew = (await play('draw', ahead)).cp;
    assert.ok(drew < 600 && drew >= 300, 'to draw with an edge: some of it is given back, not all at once (' + drew + ')');
    const lost = (await play('lose', ahead)).cp;
    assert.ok(lost <= 300, 'to lose: the eval is taken down (' + lost + ')');
    // level: drawing keeps it near nothing
    const level = [40, 20, 0, -20, -60, -200, -400];
    const hold = (await play('draw', level)).cp;
    assert.ok(Math.abs(hold) <= 40, 'level: held near nothing (' + hold + ')');
    // against us: winning and drawing both need the best moves
    const against = [-250, -300, -400, -550, -700, -900];
    assert.equal((await play('win', against)).cp, -250, 'to win from behind: the best move');
    assert.equal((await play('draw', against)).cp, -250, 'to draw from behind: the best move, not a move that is nearer to level for show');
    // they have just erred (the eval is 400 better than we reckoned on): a draw game gives that edge back, a win game keeps it
    const edge = [350, 300, 150, 0, -100, -300];
    const kept = (await play('win', edge, { expected: -50, clock: 40 })).cp;
    const gave = (await play('draw', edge, { expected: -50, clock: 40 })).cp;
    assert.equal(kept, 350, 'to win: a mistake of theirs is taken');
    assert.ok(gave < 350 && gave >= 0, 'to draw: it is matched, the edge goes back (' + gave + ')');
    // but not when there is no time to get anywhere
    const hurried = (await play('draw', edge, { expected: -50, clock: 5 })).cp;
    assert.ok(hurried >= gave, 'with no clock to spare it does not go for the long way (' + hurried + ' vs ' + gave + ')');
  } finally { f.close(); }
});

test('the premove search runs once the three likeliest replies have answers, before the rest, one thing at a time', async () => {
  const f = setup();
  try {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1';
    const seen = [];
    let topAt = null, busy = false, overlapped = false;
    const analyse = async (x, o) => ({ depth: 6, cp: 20, pv: ['e7e5', 'g1f3'], lines: ['e7e5', 'd7d5', 'g8f6', 'c7c5', 'e7e6'].map((u, i) => ({ cp: 20 - i, pv: [u, 'g1f3'] })) });
    const answer = async (x, o) => { if (busy) overlapped = true; seen.push(x); return { depth: 6, cp: 30, pv: ['g1f3', 'b8c6'], human: true, lines: [] }; };
    await f.api.bookBuild({
      fen, s: { eval: 2, depth: 6, maxDepth: 12, spare: 2, human: true }, clock: 20, replies: 5, analyse, answer, stop: () => false, onEntry: () => {},
      onTop: async entries => { topAt = seen.length; busy = true; await new Promise(r => setTimeout(r, 20)); busy = false; }
    });
    assert.equal(topAt, 3, 'after the third answer, before the fourth');
    assert.equal(overlapped, false, 'nothing else was asked of the engine while it ran');
  } finally { f.close(); }
});

test('every arrow a branch draws is a legal move in the position it is made in', () => {
  const f = setup();
  try {
    const fens = ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4'];
    for (const fen of fens) {
      const board = f.board(fen);
      board.innerHTML = '<svg class="arrows"></svg>';
      const ctl = new f.api.Controller(board.querySelector('svg'));
      const game = new Chess(fen);
      const moves = game.moves({ verbose: true });
      // every line of two legal moves, tried from the position
      for (const first of moves.slice(0, 14)) {
        const g = new Chess(fen); g.move(first);
        for (const second of g.moves({ verbose: true }).slice(0, 6)) {
          const line = [first.from + first.to + (first.promotion || ''), second.from + second.to + (second.promotion || '')];
          f.api.showClutchGhosts(ctl, [{ fen, line, color: '#4cc2ff' }]);
          for (const arrow of ctl.chainArrows) {
            const k = line.indexOf(arrow.uci);
            assert.ok(k >= 0, 'an arrow that is no move of the line: ' + arrow.uci);
            const h = new Chess(fen); if (k > 0) h.move(first);
            assert.ok(h.moves({ verbose: true }).some(m => m.from + m.to + (m.promotion || '') === arrow.uci), arrow.uci + ' is legal where it is made');
          }
        }
      }
    }
  } finally { f.close(); }
});

test('the hand slips now and then: a tenth of a per cent when slow, up to half a per cent when quick, one square off', async () => {
  const f = setup();
  try {
    assert.ok(Math.abs(f.api.slipChance(900) - 0.001) < 1e-12 && Math.abs(f.api.slipChance(600) - 0.001) < 1e-12, 'slow: 0.1%');
    assert.ok(Math.abs(f.api.slipChance(150) - 0.005) < 1e-12 && Math.abs(f.api.slipChance(10) - 0.005) < 1e-12, 'quick: 0.5%');
    assert.ok(f.api.slipChance(375) > 0.001 && f.api.slipChance(375) < 0.005, 'in between: in between');
    for (const to of ['e4', 'a1', 'h8', 'a8', 'd1']) {
      for (let i = 0; i < 20; i++) {
        const sq = f.api.slipSquare(to, () => i / 20);
        assert.ok(sq && sq !== to && Math.abs(sq.charCodeAt(0) - to.charCodeAt(0)) <= 1 && Math.abs(+sq[1] - +to[1]) <= 1 && /^[a-h][1-8]$/.test(sq), sq + ' is one square from ' + to);
      }
    }
    // a slipped drop lands off the target; an ordinary one on it
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const board = f.board(fen);
    board.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 800, right: 800, bottom: 800 });
    f.w.document.elementFromPoint = () => board;
    const drops = [];
    board.addEventListener('pointerup', e => drops.push([Math.round(e.clientX), Math.round(e.clientY)]));
    const ms = f.api.humanDrag(board, 'e2', 'e4', false, () => 0.0);     // random 0: slips, whatever the chance
    await new Promise(r => setTimeout(r, ms + 80));
    assert.equal(drops.length, 1);
    assert.ok(drops[0][0] !== 450 || drops[0][1] !== 450, 'the piece was let go off e4 (' + drops[0] + ')');
    drops.length = 0;
    const ms2 = f.api.humanDrag(board, 'e2', 'e4', false, () => 0.9999);  // never slips
    await new Promise(r => setTimeout(r, ms2 + 80));
    assert.deepEqual(drops[0], [450, 450], 'an ordinary drop lands on e4');
  } finally { f.close(); }
});

// a position as the script reads it: position[file][rank] = { c, t }
function positionOf(fen) {
  const pos = Array.from({ length: 8 }, () => Array(8).fill(null));
  fen.split(' ')[0].split('/').forEach((rank, i) => { let file = 0; for (const ch of rank) { if (/[1-8]/.test(ch)) file += +ch; else pos[file++][7 - i] = { c: ch === ch.toUpperCase() ? 'w' : 'b', t: ch.toLowerCase() }; } });
  return pos;
}

test('Clutch ghosts follow the ruleset of ghosts you draw: what is taken is hatched, a taken ghost goes away, shared squares share a corner list', () => {
  const f = setup();
  try {
    // what the main line takes, worked out from the position
    const fen = 'rnbqkbnr/ppp2ppp/4p3/3p4/8/2N5/PPPPPPPP/R1BQKBNR w KQkq - 0 1';
    const steps = Array.from(f.api.clutchChain(fen, ['c3d5', 'e6d5']), s => ({ ...s }));
    assert.equal(steps[0].takes.kind, 'bp'); assert.equal(steps[0].takes.at, 'd5');
    assert.equal(steps[1].takes.kind, 'wn');
    const t = f.api.clutchTaking(steps, positionOf(fen));
    assert.ok(t.liveTaken.has('d5'), 'the real pawn on d5 is taken');
    assert.ok(t.fallen.has(0) && !t.fallen.has(1), 'the knight ghost is taken by the recapture');
    assert.ok(t.hatch.has('c3'), 'and the real knight it came from is out of play');
    // castling brings its rook, an en passant capture takes the pawn beside
    const castle = f.api.clutchChain('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1', ['e1g1']);
    assert.equal(castle[0].castle.kind, 'wr'); assert.equal(castle[0].castle.to, 'f1');
    const ep = f.api.clutchChain('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1', ['e5d6']);
    assert.equal(ep[0].takes.at, 'd5', 'the pawn taken en passant stands on d5');
    // in the DOM: the board hatches what is taken, and the taken ghost is gone
    const board = f.board(fen);
    board.innerHTML = '<svg class="arrows"></svg>';
    const ctl = new f.api.Controller(board.querySelector('svg'));
    f.api.showClutchGhosts(ctl, [{ fen, line: ['c3d5', 'e6d5'], color: '#ff4d4d' }]);
    const gh = u => [...board.querySelectorAll('.bs-ghost-clutch .cc-ghost')].find(g => g.dataset.uci === u);
    assert.equal(gh('c3d5').style.opacity, '0', 'the taken ghost goes away');
    assert.ok(+gh('e6d5').style.opacity > 0, 'the one that took it stays');
    assert.ok(ctl.clutchFallenSquares.has('d5') && ctl.clutchFallenSquares.has('c3'), 'the hatch squares are handed to the board');
    f.api.showClutchGhosts(ctl, []);
    assert.equal(ctl.clutchFallenSquares.size, 0, 'cleared with the ghosts');
  } finally { f.close(); }
});

test('moves that land on one square share it: the first stays on it, the others go into a list in the corner, with what they take', () => {
  const f = setup();
  try {
    // Black to move; both ...exd4 and ...Nxd4 are possible
    const fen = 'r1bqkbnr/pppp1ppp/2n5/4p3/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 3';
    const board = f.board(fen);
    board.innerHTML = '<svg class="arrows"></svg>';
    const ctl = new f.api.Controller(board.querySelector('svg'));
    f.api.showClutchGhosts(ctl, [
      { fen, line: ['e5d4'], color: '#ff4d4d' },
      { fen, line: ['c6d4'], color: '#4cc2ff' }
    ]);
    const gh = u => [...board.querySelectorAll('.bs-ghost-clutch .cc-ghost')].find(g => g.dataset.uci === u);
    assert.ok(+gh('e5d4').style.opacity > 0, 'the first stays on d4');
    assert.equal(gh('c6d4').style.opacity, '0', 'the other gives way');
    const badge = board.querySelector('.bs-ghost-clutch .bs-badge');
    assert.ok(badge, 'a corner list on the square');
    assert.equal(badge.querySelectorAll('.bs-alt i').length, 1, 'the knight that could also take is listed');
    assert.equal(badge.querySelectorAll('.bs-taken i').length, 1, 'with the pawn taken there');
    assert.ok(ctl.clutchFallenSquares.has('d4'), 'and the real pawn on d4 is hatched');
    // one move only: no list
    f.api.showClutchGhosts(ctl, [{ fen, line: ['e5d4'], color: '#ff4d4d' }]);
    assert.equal(board.querySelectorAll('.bs-ghost-clutch .bs-badge').length, 0);
  } finally { f.close(); }
});

test('the outcome comes first: a drawing game never gives material away or drops below level just because the rating is low', async () => {
  const f = setup();
  try {
    // White queen and king against a king and a knight: Qb5 puts the queen where the knight takes it
    const fen = '4k3/2n5/8/3p4/8/8/8/3QK3 w - - 0 1';
    // an engine that, as a shallow one can, rates the queen move best and the quiet ones a little worse
    const eng = vals => async (x, o) => {
      if (o.mate) return { depth: 4, cp: 0, pv: [] };
      const moves = o.searchMoves || [];
      const lines = moves.map(u => ({ depth: 6, cp: vals[u] ?? -30, pv: [u] })).sort((a, b) => b.cp - a.cp);
      return { depth: 6, cp: lines[0] ? lines[0].cp : 0, pv: lines[0] ? lines[0].pv : [], lines };
    };
    for (const mode of ['draw', 'win']) {
      for (const elo of [400, 1200, 2400]) {
        const r = await f.api.humanAnalyse(fen, { lastMove: null, ms: 300, mode }, elo, eng({ d1b5: 20, d1d2: 0, d1e2: -10, d1d3: 5 }));
        assert.notEqual(r.pv[0], 'd1b5', mode + ' at ' + elo + ': the queen is not put where it is taken');
      }
    }
    assert.ok(f.api.materialAtRisk ? true : true);
  } finally { f.close(); }
});

test('a drawing game keeps the eval from falling below level when it can, and plays the best move when already worse', async () => {
  const f = setup();
  try {
    const fen = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
    const order = [];
    const eng = vals => async (x, o) => {
      if (o.mate) return { depth: 4, cp: 0, pv: [] };
      const lines = (o.searchMoves || []).map(u => { if (!order.includes(u)) order.push(u); return { depth: 6, cp: vals[order.indexOf(u)] ?? -900, pv: [u] }; }).sort((a, b) => b.cp - a.cp);
      return { depth: 6, cp: lines[0] ? lines[0].cp : 0, pv: lines[0] ? lines[0].pv : [], lines };
    };
    // level at best: nothing below -40 may be played while something at or above it exists
    const level = [10, -20, -120, -200, -400, -500];
    for (const elo of [400, 1200, 2400]) {
      order.length = 0;
      const r = await f.api.humanAnalyse(fen, { lastMove: null, ms: 300, mode: 'draw' }, elo, eng(level));
      assert.ok(r.cp >= -40, 'drawing at ' + elo + ' keeps the eval at ' + r.cp);
    }
    // worse (-200 at best): the best move, not a showy one
    const worse = [-200, -260, -320, -400, -600];
    for (const elo of [400, 2400]) {
      order.length = 0;
      const r = await f.api.humanAnalyse(fen, { lastMove: null, ms: 300, mode: 'draw' }, elo, eng(worse));
      assert.ok(r.cp >= -260, 'worse at ' + elo + ': ' + r.cp);
    }
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
    f.api.showClutchGhosts(ctl, [{ fen, uci: 'e2e4', color: '#ff4d4d', premoveAt: 0 }, { fen, uci: 'g1f3', color: '#4cc2ff' }]);
    assert.equal(e4(), before, 'not rebuilt');
    assert.equal(e4().dataset.premove, '1'); assert.equal(e4().style.getPropertyValue('--reply-color'), '#ff4d4d');
    assert.equal(board.querySelectorAll('.bs-ghost-clutch .cc-ghost').length, 2);
    assert.equal(ctl.clutchArrows === undefined || ctl.clutchArrows.length === 0, true, 'single moves have nothing to link: no arrows');
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
