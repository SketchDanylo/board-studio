# Board Studio for chess.com

A Tampermonkey userscript that restyles chess.com and adds a few training helpers.

**[Install the small loader](https://raw.githubusercontent.com/SketchDanylo/board-studio/main/board-studio-loader.user.js)** — with Tampermonkey installed, open that link and press *Install*. Loader 6.0.1 resolves the current GitHub commit, then downloads the full script at that immutable revision on each page load. This avoids stale raw `main` responses. If the revision lookup fails, it tries a known release containing the crown clipping fix; if downloading fails, it uses the cached script. A fallback never replaces a newer cached version. Update older loaders once to receive this fix.

The [full script](https://raw.githubusercontent.com/SketchDanylo/board-studio/main/board-studio.user.js) is also available for direct installation; it updates only when its `@version` is bumped. Use either the loader or the full script, not both.

## What it does

Everything is switched on and off from the **Styles** item in chess.com's left sidebar.

- **Custom style** – glass sidebar and menus with flow-in and hover animations.
- **Double square** – right-click a square for your first color, again for your second, a third time to clear.
- **Custom arrows** – soft spring-animated arrows, L-shaped for knights, in your color.
  - **Aim assist** – an arrow drawn from a piece snaps to the nearest square that piece can reach.
- **Opening book** – the book from [Chess Coach](https://sketchdanylo.github.io/chess), with thicker arrows for more popular moves.
- **Winning side** – a crown on the avatar of whoever is ahead, from chess.com's eval bar or, where there is none, a built-in Stockfish that keeps searching deeper.
- **Take squares** – move dots turn red where your piece could be taken.
  - If Chess.com's own move hints are absent or disabled, Board Studio draws legal move dots itself. This also works before an arrow controller or canvas sprite hook is available. Legal destinations appear without waiting for the engine.
  - **Show Blunders** – optional engine mode: move dots and capture rings morph into translucent red crosses for likely blunders, appearing from the first available engine scores and updating as analysis deepens. Crosses span about half a square. Their outlines morph back into dots or capture rings when a move is cleared, with only one marker visible at a time. Hold or keep a piece selected for deeper analysis. Supports normal and canvas boards.
- **Ghosts** – each arrow moves a see-through copy of the piece, so you can plan lines.

Works on both chess.com board types (the normal one and the Arcade / Natural canvas board).

## Crown behavior

The winning-side crown works on bot and live boards, using the visible evaluation bar when available and the bundled engine otherwise. An equal score shows no crown. Toggle it with **Styles → Winning side**. Version 5.5.3 supports both the current `player-top` / `player-bottom` avatar containers and the older board layout IDs.

## Board support

Version 5.6.9 restores evaluation on game pages by checking for a readable board position instead of restricting it by URL. Version 5.6.10 morphs dots into crosses and back on DOM, canvas, and fallback boards. Non-blunder capture-risk dots stay red. The opening book retains its existing live-game restriction.

## Blunder estimates

Version 5.6.4 also flags a loss of at least 250 centipawns when both moves have at most 0.01 expected points. This handles positions where Stockfish rounds every candidate to a loss: dropping a queen must not disappear merely because the position was already bad. This exception does not apply to positions that remain winning or to shortening an already-forced mate. A regression test reconstructs the reported board and checks that Qe2, Qf3 and Qxg4 receive crosses from the real engine at depth 13.

Version 5.6.3 preserves the engine and its scores when native and fallback hint renderers hand off to each other, and restores overlay layers if the board redraw removes them. No cross is expected when that piece has no moves classified as blunders. Crosses describe destinations before moving, rather than annotating the last played move.

Enable **Styles → Take squares → Show Blunders** (off by default). It keeps capture-risk dots on other squares while morphing blunder destinations into crosses, and evaluates every legal root move so a bad move is compared against the best move in the whole position. Analysis stops when selection is cleared, the board is removed, the tab is hidden, or the option is disabled. Changing positions discards the old worker and its results. In the absence of native hints, legal dots come from the bundled chess.js rules; engine startup or failure never removes those ordinary dots.

These are Stockfish estimates, **not guaranteed Chess.com Game Review classifications**. [Chess.com's published blunder cutoff](https://support.chess.com/en/articles/8572705-how-are-moves-classified-what-is-a-blunder-or-brilliant-etc) is a loss of 0.20 expected points, using a rating-dependent model. This script instead uses Stockfish's win/draw/loss probabilities, with an additional 200-centipawn loss requirement unless forced mate is involved. Scores appear as soon as each candidate and the best move have evaluations at the same depth; there is no minimum-depth or repeated-verdict delay. Existing hints remain until their own fresh evaluation arrives, and are revised immediately if that verdict changes. A promotion destination is marked only after all four promotion choices have been evaluated as blunders. Early estimates can change substantially as the search deepens; engine startup and the first evaluation still take some time.

## Development checks

Run `npm ci`, `npm run check`, and `npm test`. Tests cover the settings, both hint renderers, evaluation revisions, stale results, promotion choices, and the bundled Stockfish executable on mating blunders for both colors.

Run `node scripts/bundle-rules.cjs` after changing the chess.js dependency to rebuild the embedded legal-move rules. Tests also cover boards with no native hints, pins, castling, en passant, and engine startup failure.

## License

GPL-3.0. Bundles [Stockfish](https://stockfishchess.org) 19 lite (the stockfish.js / WebAssembly build), which is GPL-3.0; its source is at [official-stockfish/Stockfish](https://github.com/official-stockfish/Stockfish) and [nmrugg/stockfish.js](https://github.com/nmrugg/stockfish.js).

Also bundles [chess.js](https://github.com/jhlywa/chess.js), distributed under the BSD-2-Clause license included alongside the embedded library.
