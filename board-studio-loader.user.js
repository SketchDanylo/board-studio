// ==UserScript==
// @name         Board Studio for chess.com
// @namespace    https://sketchdanylo.github.io/chess
// @version      6.0.2
// @description  Runs the latest Board Studio straight from GitHub on every page load.
// @match        https://www.chess.com/*
// @match        https://chess.com/*
// @homepageURL  https://github.com/SketchDanylo/board-studio
// @updateURL    https://raw.githubusercontent.com/SketchDanylo/board-studio/main/board-studio-loader.user.js
// @downloadURL  https://raw.githubusercontent.com/SketchDanylo/board-studio/main/board-studio-loader.user.js
// @connect      raw.githubusercontent.com
// @connect      api.github.com
// @run-at       document-idle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

// Resolve main to a commit first. Raw GitHub can return an older main file even
// with a timestamp query; a commit URL always identifies the requested revision.
(function () {
  'use strict';
  const BASE = 'https://raw.githubusercontent.com/SketchDanylo/board-studio/';
  const REF = 'https://api.github.com/repos/SketchDanylo/board-studio/git/ref/heads/main';
  const BASELINE = 'b6de7e74897f3888529cb6ea626c49732cf96d4d'; // includes the unclipped crown
  let started = false;

  // In the page itself, like a @grant none script, so it can reach chess.com's board objects.
  // The script downloads its big files (opening book, Stockfish) from assets/ at the same commit.
  const run = (code, sha) => {
    if (started) return;
    started = true;
    try {
      if (sha) unsafeWindow.__boardStudioAssetBase = `${BASE}${sha}/assets/`;
      unsafeWindow.eval(`${code}\n//# sourceURL=board-studio.user.js`);
    } catch (e) {
      console.error('[Board Studio] failed to start', e);
    }
  };

  const fallback = () => {
    const cached = GM_getValue('code', '');
    if (cached) run(cached, GM_getValue('sha', ''));
    else console.error('[Board Studio] could not download the script from GitHub');
  };

  const version = code => (code.match(/@version\s+([\d.]+)/)?.[1] || '0').split('.').map(Number);
  const newer = (a, b) => {
    const av = version(a), bv = version(b);
    for (let i = 0; i < Math.max(av.length, bv.length); i++) {
      if ((av[i] || 0) !== (bv[i] || 0)) return (av[i] || 0) > (bv[i] || 0);
    }
    return false;
  };
  const download = sha => GM_xmlhttpRequest({
    method: 'GET',
    url: `${BASE}${sha}/board-studio.user.js`,
    timeout: 20000,
    onload: res => {
      const code = res.status === 200 ? res.responseText : '';
      if (!code.includes('==UserScript==')) return fallback();
      const cached = GM_getValue('code', '');
      const keepCached = newer(cached, code);
      if (!keepCached) {
        if (code !== cached) GM_setValue('code', code);
        GM_setValue('sha', sha);
      }
      run(keepCached ? cached : code, keepCached ? GM_getValue('sha', '') : sha);
    },
    onerror: fallback,
    ontimeout: fallback
  });

  GM_xmlhttpRequest({
    method: 'GET',
    url: `${REF}?t=${Date.now()}`,
    headers: { 'Accept': 'application/vnd.github+json', 'Cache-Control': 'no-cache' },
    timeout: 10000,
    onload: res => {
      let sha;
      try { sha = res.status === 200 && JSON.parse(res.responseText).object?.sha; } catch (e) { /* use the known release */ }
      download(typeof sha === 'string' && /^[a-f0-9]{40}$/.test(sha) ? sha : BASELINE);
    },
    onerror: () => download(BASELINE),
    ontimeout: () => download(BASELINE)
  });
})();
