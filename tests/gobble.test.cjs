const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setup } = require('./helpers.cjs');

test('Gobble: Witty leads until the endgame, Gobble in it', () => {
  const f = setup();
  try {
    const opening = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
    const ending = '8/5k2/3r4/8/2B5/5N2/5PK1/8 w - - 0 50';
    assert.equal(f.api.gobbleEndgame(opening), false);
    assert.equal(f.api.gobbleEndgame(ending), true);
    const both = { witty: true, gobble: true };
    assert.deepEqual({ ...f.api.clutchStyle(both, opening) }, { gobble: false, witty: true, endgame: false });
    assert.deepEqual({ ...f.api.clutchStyle(both, ending) }, { gobble: true, witty: false, endgame: true });
    assert.equal(f.api.clutchStyle({ gobble: true }, opening).gobble, true, 'alone it gobbles all game');
    // the switch is in the Clutch panel
    const sh = [...f.w.document.body.children].find(x => x.shadowRoot && x.shadowRoot.querySelector('.sub[data-key="gobble"]')).shadowRoot;
    sh.querySelector('.sub[data-key="gobble"]').click();
    assert.equal(f.api.settings.clutch.gobble, true);
  } finally { f.close(); }
});

test('Gobble takes the material it likes while the outcome holds, pieces before pawns', () => {
  const f = setup();
  try {
    // White to move: Nxe5 wins a pawn, Bxf7+ ... here a free knight on d4 and a free pawn on e5
    const fen = 'r1bqkb1r/pppp1ppp/5n2/4p3/3nP3/2N2N2/PPPP1PPP/R1BQKB1R w KQkq - 0 5';
    const L = (uci, cp) => ({ pv: [uci], cp });
    const lines = [L('f1c4', 60), L('f3d4', 40), L('f3e5', 30)];
    const pick = f.api.gobbleChoose(fen, lines, { mode: 'win' }, 'f1c4');
    assert.equal(pick && pick.step.uci, 'f3d4', 'the knight before the pawn');
    // when the grab costs too much of the outcome, it is not made
    assert.equal(f.api.gobbleChoose(fen, [L('f1c4', 300), L('f3d4', 50)], { mode: 'win' }, 'f1c4'), null);
    // drawing: level must stay level
    assert.equal(f.api.gobbleChoose(fen, [L('f1c4', 0), L('f3d4', -120)], { mode: 'draw' }, 'f1c4'), null);
    // a mate is never swapped for material
    assert.equal(f.api.gobbleChoose(fen, [{ pv: ['f1c4'], mate: 3 }, L('f3d4', 500)], { mode: 'win' }, 'f1c4'), null);
  } finally { f.close(); }
});

test('Gobble plays fast, fastest in the endgame, and premoves at once under a minute', () => {
  const f = setup();
  try {
    const mid = 'r1bq1rk1/pp2bppp/2n1pn2/3p4/3P4/2NBPN2/PP3PPP/R2Q1RK1 w - - 0 20';
    const end = '8/5k2/3r4/8/2B5/5N2/5PK1/8 w - - 0 50';
    const half = () => 0.5, st = { from: 'f1', to: 'e1' };
    const pace = (fen, o) => f.api.clutchPaceMs(fen, st, 120, 1500, o, half);
    assert.ok(pace(mid, { gobble: true }) < pace(mid, {}) * 0.7);
    assert.ok(pace(end, { gobble: true }) < pace(end, {}) * 0.4);
    assert.equal(f.api.clutchPaceMs(mid, st, 45, 1500, { premove: true, gobble: true }, half), 0, 'premoved at once with 45 s');
    assert.ok(f.api.clutchPaceMs(mid, st, 45, 1500, { premove: true }, half) > 0, 'without Gobble it takes a moment');
  } finally { f.close(); }
});
