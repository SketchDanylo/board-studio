const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const source = fs.readFileSync(path.join(__dirname, '../board-studio.user.js'), 'utf8');
const initialFEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function setup() {
  const dom = new JSDOM('<html><head></head><body></body></html>', {
    url: 'https://www.chess.com/play/computer', runScripts: 'outside-only', pretendToBeVisual: true
  });
  const w = dom.window;
  const observers = [];
  const Observer = w.MutationObserver;
  w.MutationObserver = class extends Observer { constructor(fn) { super(fn); observers.push(this); } };
  w.setInterval = () => 0;
  w.URL.createObjectURL = () => 'blob:test';
  w.URL.revokeObjectURL = () => {};
  w.Worker = class {
    constructor() { this.commands = []; this.terminated = false; }
    postMessage(command) { this.commands.push(command); }
    terminate() { this.terminated = true; }
  };
  w.HTMLElement.prototype.getClientRects = function () { return this.hidden ? [] : [{}]; };
  const end = source.lastIndexOf('})();');
  w.eval(source.slice(0, end) + '\nwindow.testAPI = { BlunderSearch, blunderHints, fallbackHints, blunderPosition, isBlunderLoss, blunderExpected, Controller, CanvasController, settings, setSetting, syncCrown, engine };\n' + source.slice(end));
  function board(fen = initialFEN) {
    const b = w.document.createElement('wc-chess-board');
    b.game = { getFEN: () => fen };
    w.document.body.appendChild(b);
    return b;
  }
  return { dom, w, api: w.testAPI, board, close: () => { observers.forEach(o => o.disconnect()); w.testAPI.fallbackHints.clear(); w.testAPI.blunderHints.clear(); w.close(); } };
}

function iteration(search, depth, scores) {
  scores.forEach((s, i) => search.receive(`info depth ${depth} multipv ${i + 1} score ${s.mate === undefined ? `cp ${s.cp}` : `mate ${s.mate}`} wdl ${(s.wdl || [0, 1000, 0]).join(' ')} pv ${s.move}`));
}

module.exports = { setup, iteration, source, initialFEN };
