const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Chess } = require('chess.js');
const { setup } = require('./helpers.cjs');

// two queens against a bare king: Qf7 and Qg6 both stalemate
const FEN = '7k/8/4Q3/8/8/8/Q7/5K2 w - - 0 1';

test('a stalemate is found, and the one that looks like a slip of the hand is preferred', () => {
  const f = setup();
  try {
    const legal = new Chess(FEN).moves({ verbose: true });
    const stale = legal.filter(m => { const g = new Chess(FEN); g.move(m); return g.isStalemate(); }).map(m => m.from + m.to);
    assert.ok(stale.includes('e6f7') && stale.includes('e6g6'), `stalemates: ${stale}`);
    assert.ok(['e6d7', 'e6f7'].includes(f.api.drawSlip(FEN, legal, [{ pv: ['e6e7'] }])), 'Qe7 meant, the hand slipped a square (d7 or f7)');
    assert.equal(f.api.drawSlip(FEN, legal, [{ pv: ['e6h6'] }]), 'e6g6', 'Qh6 meant, slipped to g6');
    assert.ok(stale.includes(f.api.drawSlip(FEN, legal, null)), 'no idea: any stalemate');
    assert.equal(f.api.drawSlip(new Chess().fen(), new Chess().moves({ verbose: true }), null), null, 'none there: nothing');
  } finally { f.close(); }
});

test('playing for the draw far ahead, the stalemate is played at once (no search, a quick hand)', async () => {
  const f = setup();
  try {
    let searches = 0;
    const eng = async (x, o) => { searches++; return { depth: 8, cp: 900, pv: ['e6e7'], lines: [{ depth: 8, cp: 900, pv: ['e6e7'] }] }; };
    const r = await f.api.humanAnalyse(FEN, { mode: 'draw', evalNow: 900, clock: 60, ideaLines: [{ pv: ['e6e7'] }] }, 1500, eng);
    assert.ok(['e6d7', 'e6f7'].includes(r.pv[0]), r.pv[0]);
    assert.equal(r.drawSlip, true);
    assert.equal(searches, 0, 'nothing was searched for it');
    const d = f.api.clutchDecide(FEN, r, { mode: 'draw' });
    assert.equal(d.quick, true);
    assert.match(d.note, /slip/);
    const half = () => 0.5, st = { from: 'e6', to: 'f7' };
    assert.ok(f.api.clutchPaceMs(FEN, st, 60, 1500, { quick: true }, half) < f.api.clutchPaceMs(FEN, st, 60, 1500, {}, half) * 0.3, 'and made quickly');
    // playing to win, no stalemate of course
    const w = await f.api.humanAnalyse(FEN, { mode: 'win', evalNow: 900, clock: 60, ideaLines: [{ pv: ['e6e7'] }] }, 1500, eng);
    assert.ok(!w || !w.drawSlip);
  } finally { f.close(); }
});
