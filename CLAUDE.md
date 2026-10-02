# d2-stash-organizer

## Build after every code change

- After changing any code, run `npm run build` before calling the work done, even for a one-line fix, so `docs/` always
  matches the source.
- It formats `src/` with Prettier, lints with no warnings allowed, then replaces `docs/` (gitignored) with the production
  bundle.
- If the change touches the game data (the generators in `src/game-data/`, or the extracted `game-data/txt*`), run
  `make build` instead: it regenerates `game-data/json` first.
- If the build fails, fix the cause and build again. TypeScript errors only show up as rollup warnings and don't stop the
  build, so check its output for new ones.
