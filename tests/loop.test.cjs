const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setup } = require('./helpers.cjs');

const NEW_1_MIN = `<button class="cc-button-component_b359d5b cc-button-secondary_b359d5b cc-button-medium_b359d5b" data-variant="secondary" type="button" aria-label="New 1 min"><span aria-hidden="true" class="cc-icon-glyph_a660c4b"><svg viewBox="0 0 24 24"></svg></span><span class="cc-button-one-line_b359d5b new-game-buttons-label">New 1 min</span></button>`;

test('Loop Games: after a bot game, chess.com\'s "New 1 min" is pressed after a random 0-20 s; backup buttons when it is missing', async () => {
  const f = setup();
  try {
    const w = f.w, doc = w.document;
    w.HTMLElement.prototype.getClientRects = function () { return [{ width: 10, height: 10 }]; };
    const board = f.board('rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2');
    board.game.getPlayingAs = () => 2;
    // a game on: nothing is done
    f.api.setSetting('clutch', 'loop', true);
    f.api.loopTick(() => 0);
    assert.equal(f.api.loop.at, 0, 'a game is on');
    // the game ends (mate on the board, the game-over window and its New 1 min button)
    board.game.getFEN = () => 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3';
    const modal = doc.createElement('div'); modal.className = 'board-modal-component';
    modal.innerHTML = '<div class="game-over-modal-shell-container"></div>' + NEW_1_MIN;
    doc.body.appendChild(modal);
    const clicks = [];
    modal.querySelector('button').addEventListener('click', () => clicks.push('new 1 min'));
    f.api.loopTick(() => 0.5);
    const wait = f.api.loop.at - Date.now();
    assert.ok(wait > 9000 && wait <= 10000, `a random wait (half of 20 s here): ${wait}`);
    f.api.loopTick(() => 0.5);
    assert.equal(clicks.length, 0, 'not before the wait is over');
    f.api.loop.at = Date.now() - 1;
    f.api.loopTick();
    assert.deepEqual(clicks, ['new 1 min'], 'plan A: the same time control again');
    // the click did nothing: the backup closes the window and takes another new-game button
    modal.querySelector('button').remove();
    const rematch = doc.createElement('button'); rematch.textContent = 'Rematch'; doc.body.appendChild(rematch);
    rematch.addEventListener('click', () => clicks.push('rematch'));
    f.api.loop.checkAt = 0;
    f.api.loopTick();
    assert.deepEqual(clicks, ['new 1 min', 'rematch'], 'plan B');
    // on the setup page: New Game opens it, then its Play starts the game (Play is preferred once it is there)
    rematch.remove();
    const ng = doc.createElement('button'); ng.textContent = 'New Game'; doc.body.appendChild(ng);
    ng.addEventListener('click', () => { clicks.push('new game'); const play = doc.createElement('button'); play.textContent = 'Play'; play.addEventListener('click', () => clicks.push('play')); doc.body.appendChild(play); });
    f.api.loop.checkAt = 0; f.api.loopTick();
    f.api.loop.checkAt = 0; f.api.loopTick();
    assert.deepEqual(clicks.slice(2), ['new game', 'play']);
    // a new game on: the loop rests
    modal.remove(); board.game.getFEN = () => 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    f.api.loopTick();
    assert.equal(f.api.loop.at, 0);
    // off: nothing
    f.api.setSetting('clutch', 'loop', false);
  } finally { f.close(); }
});
