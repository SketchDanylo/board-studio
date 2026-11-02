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
    assert.ok(plain > 600 && plain < 2200, `about clock/41, a little less in the opening: ${plain} ms`);
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

test('Time at 0 is "No Limit": shown in red, Clutch plays the whole game, and a game without a clock is paced as five minutes, never over 17 s a move', () => {
  const f = setup();
  try {
    const sh = [...f.w.document.body.children].find(x => x.shadowRoot && x.shadowRoot.querySelector('.rng')).shadowRoot;
    const slider = sh.querySelector('.rng input[data-key="time"]');
    assert.equal(slider.min, '0');
    f.api.setSetting('clutch', 'time', 0);
    const label = sh.querySelector('.rng b[data-out="time"]');
    assert.equal(label.textContent, 'No Limit');
    assert.ok(label.classList.contains('nolimit'));
    f.api.setSetting('clutch', 'time', 10);
    assert.equal(label.textContent, '10.0 s');
    assert.ok(!label.classList.contains('nolimit'));
    // engaged whatever the clock
    assert.equal(f.api.clutchEngages({}, 0, 900), true, 'No Limit: on from the first move, 15 minutes or not');
    assert.equal(f.api.clutchEngages({}, 10, 900), false, 'with a Time set, not until the clock is down to it');
    // no clock on the page
    assert.equal(f.api.clutchClock('own'), null, 'a Time set and no clock: Clutch waits for a clock');
    f.api.setSetting('clutch', 'time', 0);
    assert.equal(f.api.clutchClock('own'), 300, 'No Limit and no clock: five minutes that never run down');
    assert.equal(f.api.clutchUntimed(), true);
    const fen = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 20';
    const hard = f.api.clutchPaceMs(fen, { from: 'e1', to: 'g1' }, 300, 2000, { crit: 3, brilliant: true }, () => 1);
    assert.ok(hard <= 17000, `the longest think: ${hard} ms`);
    assert.ok(f.api.clutchPaceMs(fen, { from: 'e1', to: 'g1' }, 300, 1500, { book: true }, () => 0.5) < 3000, 'an obvious move stays quick');
  } finally { f.close(); }
});

test("the times spread like a person's: mostly short, some at a glance, now and then a long think, quick moves after it", () => {
  const f = setup();
  try {
    const fen = 'r1bq1rk1/pp2bppp/2n1pn2/3p4/3P4/2NBPN2/PP3PPP/R2Q1RK1 w - - 0 20';
    const st = { from: 'f1', to: 'e1' };
    const times = Array.from({ length: 2000 }, () => f.api.clutchPaceMs(fen, st, 300, 1500, {}, Math.random));
    const mean = times.reduce((a, b) => a + b, 0) / times.length;
    const sd = Math.sqrt(times.reduce((a, b) => a + (b - mean) ** 2, 0) / times.length);
    const share = cond => times.filter(cond).length / times.length;
    assert.ok(sd / mean > 0.8, `spread wide, not the same every move: cv ${(sd / mean).toFixed(2)}`);
    assert.ok(share(t => t < mean * 0.35) > 0.15, 'many moves well under the average');
    assert.ok(share(t => t > mean * 2.5) > 0.04, 'some long thinks');
    // a hard position brings more long thinks; after a long think the next moves go quicker
    const hard = Array.from({ length: 2000 }, () => f.api.clutchPaceMs(fen, st, 300, 1500, { crit: 3 }, Math.random));
    assert.ok(hard.filter(t => t > mean * 2.5).length > times.filter(t => t > mean * 2.5).length * 1.5);
    const settled = Array.from({ length: 2000 }, () => f.api.clutchPaceMs(fen, st, 300, 1500, { settled: true }, Math.random));
    assert.ok(settled.reduce((a, b) => a + b, 0) / settled.length < mean * 0.5);
    console.log(`pace spread at 5 min, move 20: mean ${Math.round(mean)} ms, cv ${(sd / mean).toFixed(2)}, under a third ${Math.round(share(t => t < mean * 0.35) * 100)}%, long ${Math.round(share(t => t > mean * 2.5) * 100)}%`);
  } finally { f.close(); }
});
