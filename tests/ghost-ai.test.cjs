const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Chess } = require('chess.js');
const { setup, iteration, initialFEN, source, engineAssets } = require('./helpers.cjs');
const afterE4 = new Chess(); afterE4.move('e4');
const replies = ['e7e5', 'c7c5', 'e7e6', 'g8f6'].map((move, i) => ({ move, cp: -i * 20, wdl: [0, 1000, 0] }));

test('Ghost AI is a persisted Ghosts suboption, initially off', () => {
  const f = setup();
  try {
    const root = f.w.document.querySelector('#board-studio').shadowRoot;
    const toggle = root.querySelector('[data-group="ghosts"] [aria-label="Ghost AI"]');
    assert.equal(toggle.getAttribute('aria-checked'), 'false'); toggle.click();
    assert.equal(f.api.settings.ghosts.ai, true);
    assert.equal(JSON.parse(f.w.localStorage.getItem('board-studio-settings-v1')).ghosts.ai, true);
    assert.equal(f.api.settings.arrowEval.on, false);
  } finally { f.close(); }
});

test('reply position applies legal arrows and chains without altering the live board', () => {
  const f = setup();
  try {
    const position = f.api.ghostReplyPosition;
    assert.equal(position(initialFEN, [{ from: 'e2', to: 'e4' }]), afterE4.fen());
    assert.equal(position(initialFEN, [{ from: 'e2', to: 'e5' }]), null);
    assert.equal(position(initialFEN, []), null);
    const e4e5 = new Chess(); ['e4', 'e5'].forEach(m => e4e5.move(m));
    assert.equal(position(initialFEN, [{ from: 'e2', to: 'e4' }, { from: 'e7', to: 'e5' }]), e4e5.fen(), 'a move drawn for the opponent too: the ghosts are for whoever moves next, here White');
    const line = new Chess(); ['e4', 'e5', 'Nf3'].forEach(m => line.move(m));
    assert.equal(position(initialFEN, [{ from: 'e2', to: 'e4' }, { from: 'e7', to: 'e5' }, { from: 'g1', to: 'f3' }]), line.fen());
    const d4 = new Chess(); d4.move('d4');
    assert.equal(position(initialFEN, [{ from: 'e2', to: 'e4' }, { from: 'd2', to: 'd4' }]), d4.fen(), 'new root arrow selects another variation');
    // Drawing for the side that is NOT to move assumes the opponent's best reply first.
    const e4pos = new Chess(); e4pos.move('e4');
    assert.equal(position(e4pos.fen(), [{ from: 'd2', to: 'd4' }]), null, 'best reply not known yet');
    const need = new Set(); position(e4pos.fen(), [{ from: 'd2', to: 'd4' }], need);
    assert.deepEqual([...need], [e4pos.fen()], 'asks for the best reply to be worked out');
    assert.equal(position('q4r1k/6pp/4Q2N/8/8/8/8/6K1 w - - 0 1', [{ from: 'e6', to: 'g8' }]).split(' ')[1], 'b');
  } finally { f.close(); }
});

test('search requests four lines to depth 18 or 1.3 s, shows replies from the first complete depth, refines them and releases the worker', () => {
  const f = setup();
  try {
    let updates = 0;
    const s = new f.api.GhostSearch(afterE4.fen(), () => updates++);
    s.start(); const worker = s.worker;
    s.receive('uciok'); s.receive('readyok');
    assert.ok(worker.commands.includes('setoption name MultiPV value 4'));
    assert.ok(worker.commands.includes('go depth 18 movetime 1300'));
    iteration(s, 17, replies.slice(0, 3)); assert.equal(s.results, null, 'a partial depth is never shown');
    iteration(s, 17, replies); assert.deepEqual(Array.from(s.results, r => r.move), replies.map(r => r.move)); assert.equal(updates, 1);
    iteration(s, 18, replies); assert.equal(updates, 1, 'unchanged ranking does not repaint');
    s.receive('bestmove e7e5');
    assert.equal(worker.terminated, true);
    const chain = new Chess(); ['e4', 'e5', 'd4'].forEach(m => chain.move(m));
    assert.equal(f.api.ghostReplyPosition(initialFEN, [{ from: 'e2', to: 'e4' }, { from: 'd2', to: 'd4' }]), chain.fen(), 'next move assumes the best reply');
    const partial = new f.api.GhostSearch(afterE4.fen(), () => {});
    iteration(partial, 18, replies.slice(0, 3)); partial.receive('bestmove e7e5');
    assert.equal(partial.results, null, 'incomplete top four is not displayed');
  } finally { f.close(); }
});

test('DOM preview renders ranked ghosts only after completion, follows flips and clears stale work', () => {
  const f = setup();
  try {
    Object.assign(f.api.settings.ghosts, { on: true, ai: true });
    Object.assign(f.api.settings.arrows, { on: false, aim: false });
    f.api.settings.book.on = false;
    const board = f.board();
    f.rightClick();
    board.innerHTML = '<svg class="arrows"><polygon class="arrow" data-arrow="e2e4"></polygon></svg>';
    const ctl = new f.api.Controller(board.querySelector('svg'));
    const s = f.api.ghostAI.sessions.get(board).search;
    iteration(s, 17, replies);
    assert.equal(board.querySelectorAll('.bs-ghost-ai .cc-ghost').length, 4);
    // One arrow, to the top reply, drawn by the board's own arrow system; the others only glow,
    // in the color of how good they are. The ghosts sit under the arrows.
    assert.equal(ctl.engineArrows.map(a => a.id).join(), 'ai:e7e5');
    assert.ok(board.querySelector('.bs-ghost-ai').compareDocumentPosition(ctl.overlay) & 4, 'ghosts are below the arrows');
    const glow = rank => board.querySelector('.bs-ghost-ai .cc-ghost[data-rank="' + rank + '"]').style.getPropertyValue('--reply-color');
    assert.equal(glow(1), f.api.ARROW_GRADES.best.color);
    assert.ok(Object.values(f.api.ARROW_GRADES).some(g => g.color === glow(4)));
    const ghost = () => board.querySelector('.bs-ghost-ai .cc-ghost[data-rank="1"]');
    assert.equal(ghost().style.left, '50%'); assert.equal(ghost().style.top, '37.5%');
    board.classList.add('flipped'); ctl.syncGhosts();
    assert.equal(ghost().style.left, '37.5%'); assert.equal(ghost().style.top, '50%');
    board.querySelector('.bs-ghost-ai').remove(); ctl.syncGhosts();
    assert.equal(board.querySelectorAll('.bs-ghost-ai .cc-ghost').length, 4, 'restores detached layer');
    const poly = board.querySelector('polygon'); poly.setAttribute('data-arrow', 'd2d4'); ctl.syncGhosts();
    assert.equal(board.querySelector('.bs-ghost-ai'), null);
    const next = f.api.ghostAI.sessions.get(board).search;
    assert.notEqual(next, s); s.onUpdate(); assert.equal(board.querySelector('.bs-ghost-ai'), null);
    poly.remove(); ctl.syncGhosts();
    assert.equal(next.stopped, true); assert.equal(f.api.ghostAI.sessions.size, 0);
    assert.equal(board.game.getFEN(), initialFEN, 'never plays a real move');
  } finally { f.close(); }
});

test('canvas hook supports native arrows, promotion ghosts and fewer than four legal replies', () => {
  const f = setup();
  try {
    Object.assign(f.api.settings.ghosts, { on: true, ai: true });
    f.api.settings.arrows.on = false;
    const board = f.board(); board.game.getOptions = () => ({ pieceStyle: 'neo' });
    const ctl = Object.create(f.api.CanvasController.prototype);
    Object.assign(ctl, { board, ghosts: { sync() {}, take() {} }, place() {}, readPosition: () => [], nativeArrows: new Map([['a', { key: 'a', data: { from: 'e2', to: 'e4' } }]]), renderer: { getCoordsFromSquare: sq => ({ x: sq === 'a1' ? 0 : 7 }) } });
    ctl.syncGhosts(); assert.equal(f.api.ghostAI.sessions.size, 0, 'an arrow chess.com drew itself is not yours');
    ctl.nativeArrows = new Map([['b', { key: 'b', data: { from: 'e2', to: 'e4' } }]]); f.rightClick();
    ctl.syncGhosts(); const s = f.api.ghostAI.sessions.get(board).search;
    iteration(s, 18, replies); s.receive('bestmove e7e5');
    assert.equal(ctl.engineArrows.length, 1);
    f.api.settings.ghosts.on = false; ctl.syncGhosts();
    assert.equal(board.querySelector('.bs-ghost-ai'), null); assert.equal(f.api.ghostAI.sessions.size, 0);
    const forced = new f.api.GhostSearch('q4r1k/6Qp/7N/8/8/8/8/6K1 b - - 0 1', () => {});
    const legal = new Chess(forced.fen).moves({ verbose: true });
    assert.ok(legal.length < 4);
    const scores = legal.map(m => ({ move: m.from + m.to + (m.promotion || ''), cp: 0 }));
    iteration(forced, 18, scores); forced.receive('bestmove ' + scores[0]?.move);
    assert.equal(forced.results.length, legal.length);
    const fen = '7k/8/8/8/8/8/p7/7K b - - 0 1';
    const session = { ctl, fen, search: { results: [{ move: 'a2a1q' }] } };
    f.api.ghostAI.paint(session, kind => 'url("' + kind + '.png")');
    assert.match(board.querySelector('.bs-ghost-ai .cc-ghost').style.backgroundImage, /bq\.png/);
  } finally { f.close(); }
});

test('real bundled engine completes depth-18 opponent search with four legal ranked replies', { timeout: 60000 }, async () => {
  const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), vm = require('node:vm');
  const { spawn } = require('node:child_process');
  const f = setup();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'board-studio-ghost-'));
  fs.writeFileSync(path.join(dir, 'stockfish.cjs'), engineAssets.script);
  fs.writeFileSync(path.join(dir, 'stockfish.wasm'), engineAssets.wasm);
  const child = spawn(process.execPath, [path.join(dir, 'stockfish.cjs')], { windowsHide: true });
  let timer;
  try {
    await new Promise((resolve, reject) => {
      const search = new f.api.GhostSearch(afterE4.fen(), () => {
        try {
          assert.ok(search.depth <= 18); assert.equal(search.results.length, 4);
          const legal = new Chess(afterE4.fen()).moves({ verbose: true }).map(m => m.from + m.to + (m.promotion || ''));
          for (const reply of search.results) assert.ok(legal.includes(reply.move));
          console.log('Real Ghost AI depth 18: ' + search.results.map(r => r.move).join(', ')); resolve();
        } catch (e) { reject(e); }
      });
      search.worker = { postMessage: command => child.stdin.write(command + '\n'), terminate() {} };
      let buffer = '';
      child.stdout.on('data', chunk => { buffer += chunk; const lines = buffer.split(/\r?\n/); buffer = lines.pop(); lines.forEach(line => search.receive(line.trim())); });
      child.on('error', reject); child.on('exit', code => { if (code) reject(new Error('Engine exit ' + code)); });
      timer = setTimeout(() => reject(new Error('Depth-18 search timed out')), 55000);
      search.send('uci');
    });
  } finally {
    clearTimeout(timer); child.kill(); await new Promise(resolve => child.exitCode !== null ? resolve() : child.once('exit', resolve)); f.close();
    fs.unlinkSync(path.join(dir, 'stockfish.cjs')); fs.unlinkSync(path.join(dir, 'stockfish.wasm')); fs.rmdirSync(dir);
  }
});

test('replies landing on one square share it: best ghost on it, others and the taken piece in corner lists', () => {
  const f = setup();
  try {
    Object.assign(f.api.settings.ghosts, { on: true, ai: true });
    Object.assign(f.api.settings.arrows, { on: false, aim: false });
    f.api.settings.book.on = false;
    const board = f.board('rnbqkbnr/pppp1ppp/2n5/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 1 3');
    f.rightClick();
    board.innerHTML = '<svg class="arrows"><polygon class="arrow" data-arrow="d2d4"></polygon></svg>';
    const ctl = new f.api.Controller(board.querySelector('svg'));
    const s = f.api.ghostAI.sessions.get(board).search;
    const line = moves => moves.map((move, i) => ({ move, cp: -i * 10, wdl: [0, 1000, 0] }));
    iteration(s, 12, line(['e5d4', 'c6d4', 'g8f6', 'd8e7']));
    const opacity = rank => board.querySelector('.bs-ghost-ai .cc-ghost[data-rank="' + rank + '"]').style.opacity;
    assert.equal(opacity(1), '0.25'); assert.equal(opacity(2), '0', 'the other piece on d4 is hidden');
    assert.equal(opacity(3), '0.25');
    const badge = board.querySelector('.bs-ghost-ai .bs-badge');
    assert.equal(badge.querySelectorAll('.bs-alt i').length, 1);
    assert.equal(badge.querySelectorAll('.bs-taken i').length, 1);
    assert.ok(ctl.ghosts.taken.has('d4'), 'the d4 ghost is taken');
    // The top move changes and no longer takes there: nothing stays marked as taken.
    iteration(s, 13, line(['g8f6', 'd8e7', 'h7h6', 'a7a6']));
    assert.equal(board.querySelectorAll('.bs-ghost-ai .bs-badge').length, 0);
    assert.equal(ctl.ghosts.taken.size, 0, 'a reply that stopped taking frees the piece');
    // A lower reply that still captures does not keep the piece marked: only the main line counts.
    iteration(s, 14, line(['g8f6', 'e5d4', 'd8e7', 'a7a6']));
    assert.equal(ctl.ghosts.taken.size, 0, 'the top move no longer takes, so the piece is free');
    assert.equal(board.querySelectorAll('.piece.bs-fallen').length, 0);
    iteration(s, 15, line(['e5d4', 'g8f6', 'd8e7', 'a7a6']));
    assert.ok(ctl.ghosts.taken.has('d4'), 'and marked again when the top move takes');
  } finally { f.close(); }
});

test('a move you draw for the opponent is what they play, instead of the engine\'s choice', () => {
  const f = setup();
  try {
    const position = f.api.ghostReplyPosition;
    const e4 = new Chess(); e4.move('e4');
    // Black is to move. You draw your d4 first, then the reply you expect: e5 (not the engine's pick).
    const expected = new Chess(); ['e4', 'e5', 'd4'].forEach(m => expected.move(m));
    const need = new Set();
    assert.equal(position(e4.fen(), [{ from: 'd2', to: 'd4' }, { from: 'e7', to: 'e5' }], need), expected.fen(), 'the drawn reply is assumed');
    assert.equal(need.size, 0, 'so nothing has to be worked out first');
    // the same with the reply drawn first
    // drawn the other way round, the game says which side you are
    assert.equal(position(e4.fen(), [{ from: 'e7', to: 'e5' }, { from: 'd2', to: 'd4' }], null, null, 'w'), expected.fen());
    // without a drawn reply it still needs the engine's
    const asked = new Set(); position(e4.fen(), [{ from: 'd2', to: 'd4' }], asked);
    assert.equal(asked.size, 1);
  } finally { f.close(); }
});

test('a move drawn for the opponent on your own turn is taken as their next move (the position is then yours to move)', () => {
  const f = setup();
  try {
    const position = f.api.ghostReplyPosition;
    // You are White and it is your move; you draw ...e5 for Black.
    const black = new Chess('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1'); black.move('e5');
    assert.equal(position(initialFEN, [{ from: 'e7', to: 'e5' }], null, null, 'w'), black.fen(), 'it is their move now, so White is next');
    assert.equal(position(initialFEN, [{ from: 'e7', to: 'e5' }], null, null, 'w').split(' ')[1], 'w');
    // their move, then yours, then theirs again: every drawn move is followed in the order it can be played
    const chain = new Chess('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1'); ['e5', 'Nf3', 'Nc6'].forEach(m => chain.move(m));
    assert.equal(position(initialFEN, [{ from: 'e7', to: 'e5' }, { from: 'g1', to: 'f3' }, { from: 'b8', to: 'c6' }], null, null, 'w'), chain.fen());
    // an illegal drawn move still clears the preview
    assert.equal(position(initialFEN, [{ from: 'e7', to: 'e4' }], null, null, 'w'), null);
  } finally { f.close(); }
});

test('changing a move of either side rebuilds the line from it, and a gap on either side is filled with the engine\'s best', () => {
  const f = setup();
  try {
    const position = f.api.ghostReplyPosition;
    const e4 = new Chess(); e4.move('e4');
    // Black to move, you are Black: you draw two of your own moves in a row. White's reply in between is a gap
    // that must be filled with White's best, which is asked for first.
    const e5 = new Chess(e4.fen()); e5.move('e5');
    const need = new Set();
    const d5 = new Chess(e4.fen()); d5.move('d5');
    assert.equal(position(e4.fen(), [{ from: 'e7', to: 'e5' }, { from: 'd7', to: 'd5' }], need, null, 'b'), d5.fen(), 'until it is known the second move starts a variation of its own');
    assert.deepEqual([...need], [e5.fen()], 'it asks for White\'s best move after ...e5');
    // you change the opponent's move: drawing a different one for White gives a different line
    const other = new Chess(e5.fen()); other.move('Nf3'); other.move('d5');
    assert.equal(position(e4.fen(), [{ from: 'e7', to: 'e5' }, { from: 'g1', to: 'f3' }, { from: 'd7', to: 'd5' }], null, null, 'b'), other.fen(), 'the changed move is followed');
    const other2 = new Chess(e5.fen()); other2.move('d4'); other2.move('d5');
    assert.equal(position(e4.fen(), [{ from: 'e7', to: 'e5' }, { from: 'd2', to: 'd4' }, { from: 'd7', to: 'd5' }], null, null, 'b'), other2.fen());
  } finally { f.close(); }
});

test('Ghost AI never shows your own best move: a line that ends on your turn shows only what it assumed for the opponent', () => {
  const f = setup();
  try {
    Object.assign(f.api.settings.ghosts, { on: true, ai: true });
    Object.assign(f.api.settings.arrows, { on: false, aim: false });
    f.api.settings.book.on = false;
    const board = f.board();
    board.game.getPlayingAs = () => 1;                           // you are White, White to move
    f.rightClick();
    // your own move: the opponent's replies are worked out
    board.innerHTML = '<svg class="arrows"><polygon class="arrow" data-arrow="e2e4"></polygon></svg>';
    const ctl = new f.api.Controller(board.querySelector('svg'));
    assert.ok(f.api.ghostAI.sessions.get(board), 'replies are searched for Black');
    // the move you expect from them instead: it ends on your turn, so nothing is searched or shown for White
    board.querySelector('polygon').setAttribute('data-arrow', 'e7e5'); f.rightClick(); ctl.syncGhosts();
    assert.equal(f.api.ghostAI.sessions.get(board), undefined, 'no search for your side');
    assert.equal(board.querySelector('.bs-ghost-ai'), null, 'no ghosts for your side');
    assert.equal((ctl.engineArrows || []).length, 0, 'and no arrow to your best move');
    assert.equal(board.game.getFEN(), initialFEN, 'never plays a real move');
  } finally { f.close(); }
});

test('your arrows by age: the newest a deeper orange, the older ones your colour, each 35% fainter than the next', () => {
  const f = setup();
  try {
    f.api.settings.arrows.color = '#3366ffcc';
    const a = 0xcc / 255;
    const aged = f.api.agedArrowColors(['a', 'b', 'c']);
    assert.equal(aged.get('c').rgb, '#ff7b00', 'the newest is orange'); assert.equal(aged.get('c').a, a);
    assert.equal(aged.get('b').rgb, '#3366ff'); assert.ok(Math.abs(aged.get('b').a - a * 0.65) < 1e-9);
    assert.equal(aged.get('a').rgb, '#3366ff'); assert.ok(Math.abs(aged.get('a').a - a * 0.65 * 0.65) < 1e-9);
    assert.equal(f.api.agedArrowColors(['x']).get('x').rgb, '#ff7b00', 'a lone arrow is the newest');
    // on a board: three plain arrows and one shift (green) arrow, which keeps its own colour and is not counted
    Object.assign(f.api.settings.arrows, { on: true, aim: false });
    f.api.settings.book.on = false;
    const board = f.board();
    board.innerHTML = '<svg class="arrows">' + ['e2e4', 'g1f3', 'b1c3'].map(u => '<polygon class="arrow" data-arrow="' + u + '" style="fill: rgb(255, 170, 0); opacity: 0.8"></polygon>').join('') +
      '<polygon class="arrow" data-arrow="d2d4" style="fill: rgb(159, 207, 63); opacity: 0.8"></polygon></svg>';
    const ctl = new f.api.Controller(board.querySelector('svg'));
    ctl.syncArrows();
    const arrow = id => ctl.arrows.get(id);
    assert.equal(arrow('b1c3').color, '#ff7b00', 'the last drawn is orange');
    assert.equal(arrow('g1f3').color, '#3366ff'); assert.equal(arrow('e2e4').color, '#3366ff');
    assert.ok(arrow('e2e4').target.opacity < arrow('g1f3').target.opacity && arrow('g1f3').target.opacity < arrow('b1c3').target.opacity, 'older is fainter');
    assert.ok(Math.abs(arrow('e2e4').target.opacity / arrow('g1f3').target.opacity - 0.65) < 0.02, '35% less each step');
    assert.notEqual(arrow('d2d4').color, '#3366ff', 'a coloured (shift) arrow keeps its colour');
  } finally { f.close(); }
});
