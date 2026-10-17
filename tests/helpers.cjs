const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const source = fs.readFileSync(path.join(__dirname, '../board-studio.user.js'), 'utf8');
const assetsDir = path.join(__dirname, '../assets');
// Stockfish's two files exactly as the script downloads them: the JS as text, the wasm as bytes.
const engineAssets = {
  script: fs.readFileSync(path.join(assetsDir, 'stockfish.js'), 'utf8'),
  wasm: fs.readFileSync(path.join(assetsDir, 'stockfish.wasm'))
};
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
  // The opening book never arrives unless a test asks for it, so no download outlives its page.
  w.fetch = async url => {
    const name = path.basename(url);
    if (name === 'opening-book.txt') return new Promise(() => {});
    const bytes = fs.readFileSync(path.join(assetsDir, name));
    return { ok: true, status: 200, text: async () => bytes.toString('utf8'), arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) };
  };
  const end = source.lastIndexOf('})();');
  w.eval(source.slice(0, end) + '\nwindow.testAPI = { humanProfile, humanCandidates, humanAnalyse, inferLastMove, unitHash, clutchEloFor, parseElo, readOpponentElo, strengthOf, sampleLine, clutchStrengthen, clutchBookStep, clutchCritical, clutchThink, clutchParams, clutchAnswers, premoveNative, cancelPremove, bookBuild, repKey, robustMove, clutchDecide, readClock, clutchPick, stepFor, choosePromotion, clutchLosing, parseClock, countPieces, clutchBudget, clutchWinning, mateLine, clutchEngine, dragPiece, GhostSearch, ghostAI, ghostReplyPosition, GHOST_AI_COLORS, ArrowSearch, arrowEval, arrowGrade, isSoundSacrifice, ARROW_GRADES, BlunderSearch, blunderHints, fallbackHints, blunderPosition, isBlunderLoss, blunderExpected, Controller, CanvasController, settings, setSetting, syncCrown, engine, loadEngineFiles, bookMoves, preloadEngine: files => { engineFiles = files; } };\n' + source.slice(end));
  w.testAPI.preloadEngine(engineAssets);
  function board(fen = initialFEN) {
    const b = w.document.createElement('wc-chess-board');
    b.game = { getFEN: () => fen };
    w.document.body.appendChild(b);
    return b;
  }
  const rightClick = () => w.dispatchEvent(new w.MouseEvent('pointerup', { button: 2 }));
  return { dom, w, api: w.testAPI, board, rightClick, close: () => { observers.forEach(o => o.disconnect()); w.testAPI.ghostAI.clear(); w.testAPI.arrowEval.clear(); w.testAPI.fallbackHints.clear(); w.testAPI.blunderHints.clear(); w.close(); } };
}

function iteration(search, depth, scores) {
  scores.forEach((s, i) => search.receive(`info depth ${depth} multipv ${i + 1} score ${s.mate === undefined ? `cp ${s.cp}` : `mate ${s.mate}`} wdl ${(s.wdl || [0, 1000, 0]).join(' ')} pv ${s.move}`));
}

module.exports = { setup, iteration, source, initialFEN, engineAssets };
