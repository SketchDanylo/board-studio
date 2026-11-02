const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Chess } = require('chess.js');
const { setup } = require('./helpers.cjs');

const after = san => { const c = new Chess(); san.split(' ').filter(Boolean).forEach(m => c.move(m)); return c.fen(); };
const step = (f, san, s) => { const hit = f.api.wittyBookStep(after(san), s); return hit ? hit.step.uci + ' ' + hit.name : null; };

test('Witty Alieeeen plays his gambits: Alien, Martian, Elephant, Englund', () => {
  const f = setup();
  try {
    const s = { elo: 1500, mode: 'win' };
    assert.equal(step(f, '', s), 'e2e4 Alien Gambit');
    assert.equal(step(f, 'e4 c6', s), 'd2d4 Alien Gambit');
    assert.equal(step(f, 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nf6', s), 'e4g5 Alien Gambit');
    assert.equal(step(f, 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nf6 Ng5 h6', s), 'g5f7 Alien Gambit');
    assert.equal(step(f, 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng5 Bg6 N1f3 h6', s), 'g5e6 Martian Gambit');
    assert.equal(step(f, 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng5 Bg6 N1f3 h6 Ne6 fxe6', s), 'f3e5 Martian Gambit');
    assert.equal(step(f, 'e4', s), 'e7e5 Elephant Gambit');
    assert.equal(step(f, 'e4 e5 Nf3', s), 'd7d5 Elephant Gambit');
    assert.equal(step(f, 'd4', s), 'e7e5 Englund Gambit');
    assert.equal(step(f, 'd4 e5 dxe5 Nc6 Nf3', s), 'd8e7 Englund Gambit');
    // out of the repertoire: nothing (the normal book or the engine goes on)
    assert.equal(step(f, 'e4 e5 Nc3', s), null);
    assert.equal(step(f, 'e4 c6 d4 d5 e5', s), null);
  } finally { f.close(); }
});

test('the gambits are kept to ratings that leave room to win them back, never at full strength', () => {
  const f = setup();
  try {
    // the knight sacrifices (two pawns down against perfect play) stop at 1800 to win, 1500 to draw
    assert.equal(step(f, 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nf6 Ng5 h6', { elo: 1800, mode: 'win' }), 'g5f7 Alien Gambit');
    assert.equal(step(f, 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nf6 Ng5 h6', { elo: 1900, mode: 'win' }), null);
    assert.equal(step(f, 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nf6 Ng5 h6', { elo: 1600, mode: 'draw' }), null);
    // the milder ones go further; the Englund road is still taken where only its trap is too much
    assert.equal(step(f, 'd4', { elo: 2100, mode: 'win' }), 'e7e5 Englund Gambit');
    assert.equal(step(f, 'd4 e5 dxe5 Nc6 Nf3', { elo: 2100, mode: 'win' }), null);
    assert.equal(step(f, 'e4 e5 Nf3', { elo: 2300, mode: 'win' }), null);
    assert.equal(step(f, '', { elo: 3501, mode: 'win', max: true }), null);
    assert.equal(step(f, 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nf6 Ng5 h6', { elo: 2800, mode: 'lose' }), 'g5f7 Alien Gambit', 'losing on purpose: anything goes');
  } finally { f.close(); }
});

test('flair: a sacrifice or the king torn open is chosen only while the outcome holds', () => {
  const f = setup();
  try {
    const fen = 'q4r1k/6pp/4Q2N/8/8/8/8/6K1 w - - 0 1';
    assert.ok(f.api.wittyFlair(fen, 'e6g8') >= 3, 'the queen offer is a sacrifice');
    const s = { witty: true, mode: 'win' };
    const pick = (lines, base) => f.api.wittyChoose(fen, lines, s, base);
    assert.equal(pick([{ pv: ['h6f7'], cp: 320, depth: 16 }, { pv: ['e6g8'], cp: 290, depth: 16 }], 'h6f7').line.pv[0], 'e6g8');
    assert.equal(pick([{ pv: ['h6f7'], cp: 320, depth: 16 }, { pv: ['e6g8'], cp: 200, depth: 16 }], 'h6f7'), null, 'a safe win stays safe');
    assert.equal(pick([{ pv: ['h6f7'], cp: 40, depth: 16 }, { pv: ['e6g8'], cp: -60, depth: 16 }], 'h6f7'), null, 'not a pawn given away for style');
    assert.equal(pick([{ pv: ['h6f7'], cp: 320, depth: 6 }, { pv: ['e6g8'], cp: 290, depth: 6 }], 'h6f7'), null, 'a sacrifice seen only on a quick look is not played on it');
    assert.equal(f.api.wittyKeeps('draw', { cp: 0 }, { cp: 400 }), false, 'a draw is not turned into a win');
    assert.equal(f.api.wittyKeeps('lose', { cp: -300 }, { cp: -280 }), false);
    assert.equal(f.api.wittyKeeps('win', { mate: 2 }, { mate: 4 }), true, 'a mate a little longer is still a mate');
    assert.equal(f.api.wittyKeeps('win', { mate: 2 }, { cp: 900 }), false);
    assert.equal(f.api.wittyChoose(fen, [{ pv: ['h6f7'], cp: 320, depth: 16 }, { pv: ['e6g8'], cp: 290, depth: 16 }], { mode: 'win' }, 'h6f7'), null, 'off: plain play');
  } finally { f.close(); }
});

test('a mate that starts with a sacrifice is played instead of the quickest one', () => {
  const f = setup();
  try {
    // White mates either way; with Witty Alieeeen the queen goes first (Qg8+ Rxg8 Nf7#)
    const fen = 'q4r1k/6pp/4Q2N/8/8/8/8/6K1 w - - 0 1';
    const result = { depth: 20, mate: 2, pv: ['e6e5', 'f8f6', 'e5f6'], lines: [{ mate: 2, pv: ['e6e5', 'f8f6', 'e5f6'] }, { mate: 2, pv: ['e6g8', 'f8g8', 'h6f7'] }] };
    const plain = f.api.clutchDecide(fen, result, { mode: 'win' });
    const witty = f.api.clutchDecide(fen, result, { mode: 'win', witty: true });
    assert.equal(plain.step.uci, 'e6e5');
    assert.equal(witty.step.uci, 'e6g8');
    assert.equal(witty.witty, true);
    assert.equal(witty.plan.line.length, 3);
  } finally { f.close(); }
});

// after Qg8+ Rxg8 in the smothered-mate line: White to play the knight (Nf7# is the line, Nxg8 cashes in part of it)
const SMOTHER = 'q4r1k/6pp/4Q2N/8/8/8/8/6K1 w - - 0 1';
const AFTER_SAC = 'q5rk/6pp/7N/8/8/8/8/6K1 w - - 0 2';
const FOLLOW_LINES = [{ pv: ['h6f7'], cp: 900, depth: 16 }, { pv: ['h6g8'], cp: 700, depth: 16 }, { pv: ['h6g4'], cp: 650, depth: 16 }];

test('a sacrifice played leaves a plan: the moves of the line that made it work', () => {
  const f = setup();
  try {
    const plan = f.api.wittyPlanFrom(SMOTHER, ['e6g8', 'f8g8', 'h6f7']);
    assert.ok(plan, 'a plan');
    assert.equal(plan.moves.get(f.api.repKey(AFTER_SAC)), 'h6f7', 'after ...Rxg8 the line plays Nf7');
    assert.equal(plan.left, 3);
  } finally { f.close(); }
});

test('the follow-through: the whole line at a high rating, often only part of it at a low one, never giving the win back', () => {
  const f = setup();
  try {
    assert.equal(f.api.wittyFollow(AFTER_SAC, FOLLOW_LINES, { elo: 2400 }, 'h6f7').line.pv[0], 'h6f7', 'a strong player follows the line');
    // a weak player: across many positions, sometimes the line, sometimes a lesser cash-in, always still winning
    const picks = new Set();
    for (let i = 1; i <= 40; i++) {
      const fen = AFTER_SAC.replace(/ 2$/, ' ' + (i + 1));
      const r = f.api.wittyFollow(fen, FOLLOW_LINES, { elo: 800 }, 'h6f7');
      picks.add(r.line.pv[0]);
      assert.ok(r.line.cp >= 600, 'what is kept is still a win');
    }
    assert.ok(picks.has('h6f7') && picks.has('h6g8'), `both the line and a part of it: ${[...picks]}`);
    // nothing that throws the win away
    assert.equal(f.api.wittyFollow(AFTER_SAC, [{ pv: ['h6f7'], cp: 400 }, { pv: ['h6g8'], cp: 100 }], { elo: 400 }, 'h6f7').line.pv[0], 'h6f7');
  } finally { f.close(); }
});

test('with the plan in hand, Clutch decides the follow-through move', () => {
  const f = setup();
  try {
    f.api.clutch.witPlan = f.api.wittyPlanFrom(SMOTHER, ['e6g8', 'f8g8', 'h6f7']);
    const d = f.api.clutchDecide(AFTER_SAC, { depth: 16, cp: 900, pv: ['h6f7'], lines: FOLLOW_LINES }, { witty: true, mode: 'win', elo: 2400 });
    assert.equal(d.follow, true);
    assert.equal(d.step.uci, 'h6f7');
    f.api.clutch.witPlan = null;
    const plain = f.api.clutchDecide(AFTER_SAC, { depth: 16, cp: 900, pv: ['h6f7'], lines: FOLLOW_LINES }, { witty: true, mode: 'win', elo: 2400 });
    assert.ok(!plain.follow, 'no plan, no follow-through');
  } finally { f.close(); }
});

test('a brilliant spotted is thought over longer, and so are the moves that cash it in (when the clock allows)', () => {
  const f = setup();
  try {
    const half = () => 0.5, st = { from: 'e6', to: 'g8' };
    const pace = (o, clock = 60) => f.api.clutchPaceMs(SMOTHER, st, clock, 1500, o, half);
    const plain = pace({});
    assert.ok(pace({ brilliant: true }) > plain * 2.2, 'the sacrifice: a long think');
    assert.ok(pace({ follow: true }) > plain * 1.5, 'the follow-through: not rushed');
    assert.ok(pace({ brilliant: true }, 300) <= 25000, 'within reason');
    assert.equal(pace({ brilliant: true }, 8), pace({}, 8), 'short of time: no extra');
  } finally { f.close(); }
});

test('a sacrifice is found the way the rating finds things: looked at as deep as that player looks, then checked for safety', async () => {
  const f = setup();
  try {
    assert.ok(f.api.wittyDepth(800) < f.api.wittyDepth(1500) && f.api.wittyDepth(1500) < f.api.wittyDepth(2200), 'deeper with the rating');
    const fen = 'q4r1k/6pp/4Q2N/8/8/8/8/6K1 w - - 0 1';
    const asked = [];
    // the sacrifice only holds up deep: at depth 10 it looks bad, at 13+ it is fine
    const verdict = d => (d >= 13 ? [{ pv: ['e6g8'], cp: 300, depth: d }, { pv: ['h6f7'], cp: 320, depth: d }] : [{ pv: ['h6f7'], cp: 320, depth: d }, { pv: ['e6g8'], cp: -200, depth: d }]);
    f.api.clutchEngine.analyse = async (x, o) => { asked.push(o.depth); return { depth: o.depth, lines: verdict(o.depth) }; };
    const quick = { depth: 8, cp: 320, pv: ['h6f7'], lines: [{ pv: ['h6f7'], cp: 320, depth: 8 }, { pv: ['e6g8'], cp: 290, depth: 8 }] };
    const weak = await f.api.wittyVerify(fen, quick, { witty: true, mode: 'win', elo: 800 }, 60);
    assert.equal(asked[0], f.api.wittyDepth(800));
    assert.equal(f.api.clutchDecide(fen, weak, { witty: true, mode: 'win', elo: 800 }).step.uci, 'h6f7', 'an 800 player does not see it work, so it is not played');
    asked.length = 0;
    const strong = await f.api.wittyVerify(fen, quick, { witty: true, mode: 'win', elo: 1700 }, 60);
    assert.equal(f.api.clutchDecide(fen, strong, { witty: true, mode: 'win', elo: 1700 }).step.uci, 'e6g8', 'a 1700 player sees it, and the safety check agrees');
  } finally { f.close(); }
});

test('Witty sees a mate in three or so; a long one only very rarely, and then plays on with normal winning moves', async () => {
  const f = setup();
  try {
    const caps = Array.from({ length: 400 }, (_, i) => f.api.wittyMateCap(`8/8/8/8/8/8/8/K6k w - - 0 ${i + 1}`));
    const rare = caps.filter(c => c > 3).length / caps.length;
    assert.ok(caps.every(c => c === 3 || c === 10));
    assert.ok(rare > 0.005 && rare < 0.1, `a long mate seen in ${Math.round(rare * 100)}% of positions`);
    // a mate in 8 on the board: without the style it is played as a plan, with it the game is just won on
    const fen = '7k/8/5K2/8/8/8/8/6Q1 w - - 0 7';
    const capFen = [...Array(200).keys()].map(i => fen.replace(/ 7$/, ' ' + (i + 7))).find(x => f.api.wittyMateCap(x) === 3);
    const result = { depth: 20, mate: 8, pv: ['g1g2', 'h8h7'], lines: [{ mate: 8, pv: ['g1g2', 'h8h7'], depth: 20 }, { cp: 950, pv: ['g1a7'], depth: 20 }] };
    assert.ok(f.api.clutchDecide(capFen, result, { mode: 'win' }).plan, 'plain: the mate plan');
    const w = f.api.clutchDecide(capFen, result, { mode: 'win', witty: true });
    assert.ok(!w.plan, 'Witty: no mate plan for a mate he would not see');
    // the human search is asked for short mates only
    const asked = [];
    await f.api.humanAnalyse(capFen, { mode: 'win', evalNow: 900, clock: 60, witty: true }, 1500, async (x, o) => { if (o.mate) asked.push(o.mate); return { depth: 8, cp: 900, pv: ['g1g2'], lines: [{ depth: 8, cp: 900, pv: ['g1g2'] }] }; });
    assert.ok(asked.length && asked.every(m => m <= 3), `mate searches: ${asked}`);
  } finally { f.close(); }
});

test('Witty plays ordinary moves quicker and premoves freely up to half a minute', () => {
  const f = setup();
  try {
    const half = () => 0.5, st = { from: 'e2', to: 'e4' }, fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 12';
    const plain = f.api.clutchPaceMs(fen, st, 60, 1500, {}, half), witty = f.api.clutchPaceMs(fen, st, 60, 1500, { witty: true }, half);
    assert.ok(witty < plain * 0.8, `quicker: ${witty} vs ${plain}`);
    assert.equal(f.api.clutchPaceMs(fen, st, 25, 1500, { premove: true, witty: true }, half), 0, 'a premove at 25 s goes at once');
    assert.ok(f.api.clutchPaceMs(fen, st, 25, 1500, { premove: true }, half) > 0, 'without the style it takes a moment');
    assert.ok(f.api.clutchPaceMs(fen, st, 60, 1500, { witty: true, brilliant: true }, half) > plain * 2, 'a sacrifice still gets its long think');
  } finally { f.close(); }
});

test('at full strength Witty is bold: a sacrifice may give up two or three pawns of the margin, never the demolition', () => {
  const f = setup();
  try {
    const k = f.api.wittyKeeps;
    assert.equal(k('win', { cp: 600 }, { cp: 380 }), false, 'normally that is too much');
    assert.equal(k('win', { cp: 600 }, { cp: 380 }, true), true, 'bold: fine, still crushing');
    assert.equal(k('win', { cp: 600 }, { cp: 280 }, true), false, 'but never below +3 once there');
    assert.equal(k('win', { cp: 280 }, { cp: 160 }, true), true, 'from a smaller edge, still clearly ahead after it');
    assert.equal(k('win', { cp: 200 }, { cp: 20 }, true), false, 'never into a level game (+1.5 at least)');
    assert.equal(k('win', { mate: 2 }, { mate: 7 }, true), true, 'a mate up to five moves longer, if it starts with a sacrifice');
    assert.equal(k('win', { mate: 2 }, { mate: 8 }, true), false);
    // the choice at full strength: the sacrifice line wins
    const fen = 'q4r1k/6pp/4Q2N/8/8/8/8/6K1 w - - 0 1';
    const lines = [{ pv: ['h6f7'], cp: 700, depth: 30 }, { pv: ['e6g8'], cp: 450, depth: 30 }];
    assert.equal(f.api.wittyChoose(fen, lines, { witty: true, mode: 'win', max: true }, 'h6f7').line.pv[0], 'e6g8');
    assert.equal(f.api.wittyChoose(fen, lines, { witty: true, mode: 'win' }, 'h6f7'), null, 'below full strength it is too much');
  } finally { f.close(); }
});

test('Witty draws his arrows: the pin, the long line a piece holds, the diagonal the plan goes for', async () => {
  const f = setup();
  try {
    // Bb5 pins the knight on c6 to the king (d7 is empty)
    const pin = f.api.wittyArrowsFor('r1bqkbnr/ppp2ppp/2np4/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 4', 'f1b5');
    assert.equal(pin.map(a => a.uci + ':' + a.kind).join(), 'b5e8:pin');
    // Bg2 on the long diagonal: through the pawn on b7 to the rook on a8 (a pin, the classic fianchetto arrow)
    const line = f.api.wittyArrowsFor('rnbqkbnr/pppp1ppp/8/4p3/8/6P1/PPPPPP1P/RNBQKBNR w KQkq - 0 2', 'f1g2');
    assert.equal(line.map(a => a.uci + ':' + a.kind).join(), 'g2a8:pin');
    // a rook on an open file it holds: the long line
    const file = f.api.wittyArrowsFor('6k1/8/8/8/8/8/8/R5K1 w - - 0 1', 'a1a2');
    assert.equal(file.map(a => a.uci + ':' + a.kind).join(), 'a2a8:line');
    // a quiet pawn move whose plan is the fianchetto: the planned bishop move is drawn
    const plan = f.api.wittyArrowsFor('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'g2g3', ['g2g3', 'e7e6', 'f1g2']);
    assert.equal(plan.map(a => a.uci + ':' + a.kind).join(), 'f1g2:plan');
    // nothing to say: nothing drawn
    assert.equal(f.api.wittyArrowsFor('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'a2a3').length, 0);
    // drawn on the board's arrow layer for a few seconds
    const ctl = { scheduleArrows() {} };
    f.api.wittyDraw(ctl, 'r1bqkbnr/ppp2ppp/2np4/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 4', { from: 'f1', to: 'b5', uci: 'f1b5' }, null, 0);
    await new Promise(r => setTimeout(r, 20));
    assert.equal(ctl.wittyArrows.length, 1);
    assert.equal(ctl.wittyArrows[0].uci, 'b5e8');
  } finally { f.close(); }
});
