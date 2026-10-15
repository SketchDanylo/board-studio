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
