const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setup } = require('./helpers.cjs');

const MID = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
const half = () => 0.5;

test('pacing: a move takes the time left shared over the moves to come, less when obvious, more when hard', () => {
  const f = setup();
  try {
    const pace = (o = {}, clock = 60, elo = 1500) => f.api.clutchPaceMs(MID, { from: 'e1', to: 'g1' }, clock, elo, o, half);
    const plain = pace();
    assert.ok(plain > 900 && plain < 2200, `about clock/41 with jitter: ${plain} ms`);
    assert.ok(pace({ book: true }) < plain * 0.4, 'a book move is quick');
    assert.ok(pace({ recapture: true }) < plain * 0.5, 'a recapture is quick');
    assert.ok(pace({ crit: 3 }) > plain * 1.8, 'a hard move takes longer');
    assert.ok(pace({}, 60, 600) < pace({}, 60, 2300), 'a low rating plays a little faster');
    assert.equal(pace({ premove: true }, 10), 0, 'a premove with little time goes at once');
    assert.ok(pace({ premove: true }, 60) > 0, 'with plenty of time even an obvious move takes a moment');
    assert.ok(pace({}, 4) < pace({}, 60) * 0.1, 'hurried with the clock low');
  } finally { f.close(); }
});

test('over a game the clock is used the way a person uses it (most of it, never all of it)', () => {
  const f = setup();
  try {
    for (const start of [60, 600]) {
      let clock = start;
      for (let move = 1; move <= 40; move++) {
        const fen = MID.replace(/ 4$/, ' ' + move);
        const kind = move <= 5 ? { book: true } : move % 5 === 0 ? { recapture: true } : move % 7 === 0 ? { crit: 2 } : {};
        clock -= f.api.clutchPaceMs(fen, { from: 'e1', to: 'g1' }, clock, 1500, kind, half) / 1000;
      }
      const used = (start - clock) / start;
      assert.ok(used > 0.45 && used < 0.85, `${start} s: ${Math.round(used * 100)}% of the clock used in 40 moves`);
      console.log(`pace: ${start} s game, 40 moves at 1500: ${Math.round(start - clock)} s used (${Math.round(used * 100)}%)`);
    }
  } finally { f.close(); }
});
