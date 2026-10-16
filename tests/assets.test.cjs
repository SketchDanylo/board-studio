const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setup, initialFEN } = require('./helpers.cjs');

const ticks = () => new Promise(resolve => setTimeout(resolve, 20));

// A fetch that serves files from memory and records what was asked for.
function fakeFetch(files) {
  const asked = [];
  const fetch = async url => {
    const name = url.split('/').pop();
    asked.push(name);
    if (!(name in files)) return { ok: false, status: 404 };
    const bytes = Buffer.from(files[name]);
    return {
      ok: true, status: 200,
      text: async () => bytes.toString('utf8'),
      arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    };
  };
  return { fetch, asked };
}

test('the opening book is downloaded once, on the first lookup', async () => {
  const f = setup();
  try {
    const book = fakeFetch({ 'opening-book.txt': require('node:fs').readFileSync(require('node:path').join(__dirname, '../assets/opening-book.txt')) });
    f.w.fetch = book.fetch;
    assert.equal(f.api.bookMoves(initialFEN).length, 0);   // not here yet
    assert.equal(f.api.bookMoves(initialFEN).length, 0);
    await ticks();
    assert.deepEqual(book.asked, ['opening-book.txt']);
    assert.ok(f.api.bookMoves(initialFEN).some(m => m.uci === 'e2e4'));
  } finally { f.close(); }
});

test('Stockfish starts after its two files arrive, and they are downloaded once', async () => {
  const f = setup();
  try {
    f.api.preloadEngine(null);
    const engine = fakeFetch({ 'stockfish.js': '// engine', 'stockfish.wasm': new Uint8Array([0, 97, 115, 109]) });
    f.w.fetch = engine.fetch;
    const first = new f.api.BlunderSearch(initialFEN, () => {});
    const second = new f.api.BlunderSearch(initialFEN, () => {});
    first.start(); first.start(); second.start();
    assert.equal(first.worker, null);                    // still downloading
    await ticks();
    assert.ok(first.worker && second.worker);
    assert.deepEqual(engine.asked.sort(), ['stockfish.js', 'stockfish.wasm']);
    assert.deepEqual(first.worker.commands, ['uci']);
  } finally { f.close(); }
});

test('a failed engine download is reported like any other engine failure', async () => {
  const f = setup();
  try {
    f.api.preloadEngine(null);
    f.w.fetch = fakeFetch({}).fetch;
    let updates = 0;
    const search = new f.api.BlunderSearch(initialFEN, () => updates++);
    search.start();
    await ticks();
    assert.match(search.error, /Could not download the engine/);
    assert.equal(search.worker, null);
    assert.equal(updates, 1);
  } finally { f.close(); }
});

test('a search stopped while the engine downloads never starts a worker', async () => {
  const f = setup();
  try {
    f.api.preloadEngine(null);
    f.w.fetch = fakeFetch({ 'stockfish.js': '// engine', 'stockfish.wasm': new Uint8Array([0]) }).fetch;
    const search = new f.api.BlunderSearch(initialFEN, () => {});
    search.start();
    search.stop();
    await ticks();
    assert.equal(search.worker, null);
  } finally { f.close(); }
});
