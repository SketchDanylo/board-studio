const test = require('node:test');
const assert = require('node:assert/strict');
const { setup, source } = require('./helpers.cjs');

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

test('no engine in games against people', () => {
  const f = setup();
  try {
    f.api.settings.danger.blunders = true;
    f.dom.reconfigure({ url: 'https://www.chess.com/game/185390694268' });
    const b = f.board();
    b.innerHTML = '<svg class="arrows"></svg><div class="piece wp square-42"></div><div class="hint square-44"><div></div></div>';
    const ctl = new f.api.Controller(b.querySelector('svg'));
    ctl.selected = { f: 3, r: 1 }; ctl.paintHints();
    assert.equal(f.api.blunderHints.search, null, 'no Stockfish search started');
  } finally { f.close(); }
});
