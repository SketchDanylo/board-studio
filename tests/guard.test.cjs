const test = require('node:test');
const assert = require('node:assert/strict');
const { setup, source, iteration } = require('./helpers.cjs');

test('a second copy of the script does not start', () => {
  const f = setup();
  try {
    const styles = () => f.w.document.head.querySelectorAll('style').length;
    const before = styles();
    assert.equal(f.w.__boardStudioRunning, true);
    f.w.eval(source);
    assert.equal(styles(), before, 'the second copy added nothing to the page');
  } finally { f.close(); }
});

test('an older copy without the guard is reported on screen', async () => {
  const f = setup();
  try {
    const old = f.w.document.createElement('style');
    old.textContent = '.bs-blunder-layer { position: absolute; }';
    f.w.document.head.appendChild(old);
    await new Promise(resolve => setTimeout(resolve, 3100));
    assert.ok(f.w.document.querySelector('.bs-duplicate'), 'warning shown');
  } finally { f.close(); }
});

// Fair play: engine help only against bots, in analysis/puzzles, or for a game that has ended.
const cases = [
  ['/play/computer', '*', true],
  ['/analysis', '*', true],
  ['/live/game/185390694268', '1-0', true],
  ['/live/game/185390694268', '*', false],
  ['/game/185390694268', '*', false],
  ['/play/online', '*', false]
];
for (const [route, result, allowed] of cases) test(`blunder analysis ${allowed ? 'runs' : 'stays off'} at ${route} (result ${result})`, () => {
  const f = setup();
  try {
    f.api.settings.danger.blunders = true;
    f.dom.reconfigure({ url: 'https://www.chess.com' + route });
    const b = f.board();
    b.game.getHeaders = () => ({ Result: result });
    b.innerHTML = '<svg class="arrows"></svg><div class="piece wp square-42"></div><div class="hint square-44"><div></div></div>';
    const ctl = new f.api.Controller(b.querySelector('svg'));
    ctl.selected = { f: 3, r: 1 }; ctl.paintHints();
    const search = f.api.blunderHints.search;
    if (!allowed) { assert.equal(search, null, 'no engine while a game against a person is in progress'); return; }
    assert.ok(search);
    iteration(search, 1, [{ move: 'e2e4', cp: 20, wdl: [100, 850, 50] }, { move: 'd2d4', cp: -300, wdl: [0, 150, 850] }]);
    assert.equal(b.querySelector('.bs-blunder-cross').dataset.square, 'd4');
  } finally { f.close(); }
});
