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
    assert.equal(pace({ recapture: true }), 0, 'a recapture in an exchange: at once');
    assert.equal(pace({ recapture: true, premove: true }, 120), 0, 'a premoved recapture too, whatever the clock');
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

test('a slip of the hand fits the outcome: never one that gives material away when winning or drawing; losing, it may', async () => {
  const f = setup();
  try {
    // the queen goes d1-d4; a slip one square on to d5 would put it where the e6 pawn takes it
    const fen = 'rnbqkbnr/pppp1ppp/4p3/8/8/8/PPP2PPP/RNBQKBNR w KQkq - 0 3';
    const board = f.board(fen);
    board.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 800, right: 800, bottom: 800 });
    f.w.document.elementFromPoint = () => board;
    const landed = [];
    board.addEventListener('pointerup', e => landed.push(String.fromCharCode(97 + Math.floor(e.clientX / 100)) + (8 - Math.floor(e.clientY / 100))));
    // the draws: hand times (3), the slip roll (0 = slips), the square (0.55 = d5 among the eight neighbours of d4)
    const seq = vals => { let i = 0; return () => vals[Math.min(i++, vals.length - 1)]; };
    const play = async mode => {
      f.api.clutch.mode = mode; landed.length = 0;
      const ms = f.api.humanDrag(board, 'd1', 'd4', false, seq([0.5, 0.5, 0.5, 0, 0.55]));
      await new Promise(r => setTimeout(r, ms + 30));
      return landed[landed.length - 1];
    };
    assert.equal(await play('win'), 'd4', 'winning: the hand does not slip into losing the queen');
    assert.equal(await play('draw'), 'd4', 'drawing: nor then');
    assert.equal(await play('lose'), 'd5', 'losing: the slip is let happen');
  } finally { f.api.clutch.mode = null; f.close(); }
});
