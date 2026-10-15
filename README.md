# Board Studio for chess.com

A Tampermonkey userscript that restyles chess.com and adds a few training helpers.

**[Install](https://raw.githubusercontent.com/SketchDanylo/board-studio/main/board-studio.user.js)** — with Tampermonkey installed, open that link and press *Install*. Tampermonkey then updates it by itself whenever a new version is pushed here.

## What it does

Everything is switched on and off from the **Styles** item in chess.com's left sidebar.

- **Custom style** – glass sidebar and menus with flow-in and hover animations.
- **Double square** – right-click a square for your first color, again for your second, a third time to clear.
- **Custom arrows** – soft spring-animated arrows, L-shaped for knights, in your color.
  - **Aim assist** – an arrow drawn from a piece snaps to the nearest square that piece can reach.
- **Opening book** – the book from [Chess Coach](https://sketchdanylo.github.io/chess), with thicker arrows for more popular moves.
- **Winning side** – a crown on the avatar of whoever is ahead, from chess.com's eval bar or, where there is none, a built-in Stockfish that keeps searching deeper.
- **Take squares** – move dots turn red where your piece could be taken.
- **Ghosts** – each arrow moves a see-through copy of the piece, so you can plan lines.

Works on both chess.com board types (the normal one and the Arcade / Natural canvas board).

## Fair play

The opening book and the engine never run in games against people; they work against bots, in analysis and in puzzles.

## License

GPL-3.0. Bundles [Stockfish](https://stockfishchess.org) 19 lite (the stockfish.js / WebAssembly build), which is GPL-3.0; its source is at [official-stockfish/Stockfish](https://github.com/official-stockfish/Stockfish) and [nmrugg/stockfish.js](https://github.com/nmrugg/stockfish.js).
