const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { setup, source } = require('./helpers.cjs');

for (const position of [
  { side: 'White', fen: 'rnbqkbnr/pppp1ppp/8/4p3/8/5P2/PPPPP1PP/RNBQKBNR w KQkq - 0 2', move: 'g2g4' },
  { side: 'Black', fen: 'rnbqkbnr/ppppp1pp/5p2/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 2', move: 'g7g5' }
]) test(`bundled Stockfish detects the mate blunder for ${position.side} using real MultiPV and WDL`, { timeout: 60000 }, async () => {
  const f = setup();
  const assets = {};
  vm.runInNewContext(source.slice(source.indexOf('  var SF_JS ='), source.lastIndexOf('})();')), assets);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'board-studio-engine-'));
  fs.writeFileSync(path.join(dir, 'stockfish.cjs'), assets.SF_JS);
  fs.writeFileSync(path.join(dir, 'stockfish.wasm'), Buffer.from(assets.SF_WASM, 'base64'));
  const child = spawn(process.execPath, [path.join(dir, 'stockfish.cjs')], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
  const { fen, move } = position;
  let stderr = '', timer;
  try {
    await new Promise((resolve, reject) => {
      let buffer = '';
      const search = new f.api.BlunderSearch(fen, () => {
        if (!search.moves.get(move)?.blunder || search.moves.get(move)?.mate !== -1) return;
        try {
          assert.equal(search.moves.get(move)?.blunder, true);
          assert.equal(search.moves.get(move)?.mate, -1);
          assert.ok([...search.moves.values()].some(s => s.move !== move && !s.blunder));
          assert.ok(search.pvCount > 10, 'compares all legal moves, not just the selected pawn');
          assert.ok(search.publishedDepth < 10, 'does not wait for the old depth-10 gate');
          console.log(`Real engine: depth ${search.publishedDepth}, ${search.pvCount} legal moves, ${move} marked as mate blunder.`);
          resolve();
        } catch (e) { reject(e); }
      });
      search.send = command => child.stdin.write(command + '\n');
      timer = setTimeout(() => reject(new Error(`Engine test timed out: ${stderr.slice(-800)}`)), 55000);
      child.on('error', reject);
      child.on('exit', code => { if (code) reject(new Error(`Engine exited ${code}: ${stderr.slice(-800)}`)); });
      child.stderr.on('data', chunk => { stderr += chunk; });
      child.stdout.on('data', chunk => {
        buffer += chunk;
        const lines = buffer.split(/\r?\n/); buffer = lines.pop();
        for (const line of lines) search.receive(line.trim());
      });
      search.send('uci');
    });
  } finally {
    clearTimeout(timer);
    child.kill();
    await new Promise(resolve => child.exitCode !== null ? resolve() : child.once('exit', resolve));
    f.close();
    fs.unlinkSync(path.join(dir, 'stockfish.cjs'));
    fs.unlinkSync(path.join(dir, 'stockfish.wasm'));
    fs.rmdirSync(dir);
  }
});
