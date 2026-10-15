// ==UserScript==
// @name         Board Studio for chess.com
// @namespace    https://sketchdanylo.github.io/chess
// @version      6.0.0
// @description  Runs the latest Board Studio straight from GitHub on every page load.
// @match        https://www.chess.com/*
// @match        https://chess.com/*
// @homepageURL  https://github.com/SketchDanylo/board-studio
// @updateURL    https://raw.githubusercontent.com/SketchDanylo/board-studio/main/board-studio-loader.user.js
// @downloadURL  https://raw.githubusercontent.com/SketchDanylo/board-studio/main/board-studio-loader.user.js
// @connect      raw.githubusercontent.com
// @run-at       document-idle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

// Every page load fetches the current board-studio.user.js from GitHub, so a push is live
// after a refresh: no version bumps, no Tampermonkey update checks. If GitHub cannot be
// reached, the last copy that loaded runs instead.
(function () {
  'use strict';
  const SOURCE = 'https://raw.githubusercontent.com/SketchDanylo/board-studio/main/board-studio.user.js';

  // In the page itself, like a @grant none script, so it can reach chess.com's board objects.
  const run = code => {
    try {
      unsafeWindow.eval(`${code}\n//# sourceURL=board-studio.user.js`);
    } catch (e) {
      console.error('[Board Studio] failed to start', e);
    }
  };

  const fallback = () => {
    const cached = GM_getValue('code', '');
    if (cached) run(cached);
    else console.error('[Board Studio] could not download the script from GitHub');
  };

  GM_xmlhttpRequest({
    method: 'GET',
    // The query string skips GitHub's few-minute CDN cache.
    url: `${SOURCE}?t=${Date.now()}`,
    headers: { 'Cache-Control': 'no-cache' },
    timeout: 20000,
    onload: res => {
      const code = res.status === 200 ? res.responseText : '';
      if (!code.includes('==UserScript==')) return fallback();
      if (GM_getValue('code', '') !== code) GM_setValue('code', code);
      run(code);
    },
    onerror: fallback,
    ontimeout: fallback
  });
})();
