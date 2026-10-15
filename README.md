# Board Studio for chess.com

A Tampermonkey userscript that restyles chess.com and adds a few training helpers.

**[Install the small loader](https://raw.githubusercontent.com/SketchDanylo/board-studio/main/board-studio-loader.user.js)** — with Tampermonkey installed, open that link and press *Install*. The loader downloads the full script through `@require`, so you do not need to paste the bundled engine into the editor. Tampermonkey checks for loader updates on its normal update schedule.

The [full script](https://raw.githubusercontent.com/SketchDanylo/board-studio/main/board-studio.user.js) is also available for direct installation. Use either the loader or the full script, not both. For each release, bump the version in both files and the loader's `@require` version query so it fetches the new dependency.

## What it does

Everything is switched on and off from the **Styles** item in chess.com's left sidebar.

- **Custom style** – glass sidebar and menus with flow-in and hover animations.
- **Double square** – right-click a square for your first color, again for your second, a third time to clear.
- **Custom arrows** – soft spring-animated arrows, L-shaped for knights, in your color.
  - **Aim assist** – an arrow drawn from a piece snaps to the nearest square that piece can reach.
- **Opening book** – the book from [Chess Coach](https://sketchdanylo.github.io/chess), with thicker arrows for more popular moves.
- **Winning side** – a crown on the avatar of whoever is ahead, from chess.com's eval bar or, where there is none, a built-in Stockfish that keeps searching deeper.
- **Take squares** – move dots turn red where your piece could be taken.
  - **Show Blunders** – optional engine mode: translucent red crosses replace dots for likely blunders, appearing from the first available engine scores and updating as analysis deepens. Crosses span half a square, with a spring scale-in and a smooth fade-out when a move is cleared. Hold or keep a piece selected for deeper analysis. Supports normal and canvas boards.
- **Ghosts** – each arrow moves a see-through copy of the piece, so you can plan lines.

Works on both chess.com board types (the normal one and the Arcade / Natural canvas board).

## Crown behavior

The winning-side crown works on bot and live boards, using the visible evaluation bar when available and the bundled engine otherwise. An equal score shows no crown. Toggle it with **Styles → Winning side**. Version 5.5.3 supports both the current `player-top` / `player-bottom` avatar containers and the older board layout IDs.

## Blunder estimates

Enable **Styles → Take squares → Show Blunders** (off by default). It replaces the capture-risk coloring while enabled, and evaluates every legal root move so a bad move is compared against the best move in the whole position. Analysis stops when the hints disappear, the board is removed, the tab is hidden, or the option is disabled. Changing positions discards the old worker and its results.

These are Stockfish estimates, **not guaranteed Chess.com Game Review classifications**. [Chess.com's published blunder cutoff](https://support.chess.com/en/articles/8572705-how-are-moves-classified-what-is-a-blunder-or-brilliant-etc) is a loss of 0.20 expected points, using a rating-dependent model. This script instead uses Stockfish's win/draw/loss probabilities, with an additional 200-centipawn loss requirement unless forced mate is involved. Scores appear as soon as each candidate and the best move have evaluations at the same depth; there is no minimum-depth or repeated-verdict delay. Existing hints remain until their own fresh evaluation arrives, and are revised immediately if that verdict changes. A promotion destination is marked only after all four promotion choices have been evaluated as blunders. Early estimates can change substantially as the search deepens; engine startup and the first evaluation still take some time.

## Development checks

Run `npm ci`, `npm run check`, and `npm test`. Tests cover the settings, both hint renderers, evaluation revisions, stale results, promotion choices, and the bundled Stockfish executable on mating blunders for both colors.

## License

GPL-3.0. Bundles [Stockfish](https://stockfishchess.org) 19 lite (the stockfish.js / WebAssembly build), which is GPL-3.0; its source is at [official-stockfish/Stockfish](https://github.com/official-stockfish/Stockfish) and [nmrugg/stockfish.js](https://github.com/nmrugg/stockfish.js).
