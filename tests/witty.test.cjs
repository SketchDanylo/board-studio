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
    assert.equal(pick([{ pv: ['h6f7'], cp: 320 }, { pv: ['e6g8'], cp: 290 }], 'h6f7').line.pv[0], 'e6g8');
    assert.equal(pick([{ pv: ['h6f7'], cp: 320 }, { pv: ['e6g8'], cp: 200 }], 'h6f7'), null, 'a safe win stays safe');
    assert.equal(pick([{ pv: ['h6f7'], cp: 40 }, { pv: ['e6g8'], cp: -60 }], 'h6f7'), null, 'not a pawn given away for style');
    assert.equal(f.api.wittyKeeps('draw', { cp: 0 }, { cp: 400 }), false, 'a draw is not turned into a win');
    assert.equal(f.api.wittyKeeps('lose', { cp: -300 }, { cp: -280 }), false);
    assert.equal(f.api.wittyKeeps('win', { mate: 2 }, { mate: 4 }), true, 'a mate a little longer is still a mate');
    assert.equal(f.api.wittyKeeps('win', { mate: 2 }, { cp: 900 }), false);
    assert.equal(f.api.wittyChoose(fen, [{ pv: ['h6f7'], cp: 320 }, { pv: ['e6g8'], cp: 290 }], { mode: 'win' }, 'h6f7'), null, 'off: plain play');
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
