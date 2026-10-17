# Donutopia

A free browser trivia game with the supplied underwater pixel-art backgrounds and VT323 font, a daily seven-question dive, unlimited play, themed rounds, and a ten-question donut chase.

Live: https://mritabhash.github.io/donutopia/

## Editing

This is now an editable static app. `index.html`, `app.css`, `app.js` and `game-core.js` are the application source. No build or paid API is required. All asset URLs are relative so the site works under a GitHub Pages project path. Older page paths redirect to their matching new views.

`data/questions.json` contains 1,303 questions in 14 categories. 42 original open-answer prompts are retained from the supplied data; the new bank adds capital questions, general trivia, word puzzles and 600 generated mental-maths exercises. Rebuild it with `python scripts/build_questions.py` from the repository root. `node scripts/test.cjs` checks core game rules and end-to-end state transitions with a minimal DOM harness.

Daily questions use a deterministic America/New_York date seed, matching the original midnight reset. Core daily, unlimited and themed dives select only the 42 original rarity-scored prompts. Each round has a 3-second preview and 25-second answer window. Invalid answers can be retried without an attempt limit; the first accepted answer locks in. At timeout the current draft is submitted automatically. Rarity tiers award 10, 15, 30, 60, 85 or 100 points, with 8 metres per point. Full answer banks unlock at the end of the dive. Explicit navigation pauses a round; reloading an unpaused round preserves its deadline. Existing v1 result history is retained, but old unfinished untimed sessions are replaced by the new rules. Local storage retains active rounds, completed daily dives, motion settings, and the last 200 result summaries. Export/import is available under My progress. No authentication, purchases, live rarity statistics or online leaderboard are advertised. Local spelling correction suggests unambiguous nearby matches and asks for confirmation. It does not reproduce the private server’s complete aliases or matching algorithm.

## GitHub Pages

The existing Pages setup publishes `main` from the repository root. A commit to `main` triggers the Pages build. `.nojekyll` preserves underscore-prefixed font and asset paths. No Actions workflow or dependencies are needed.

## Credits

Original pixel backgrounds, card artwork, font, and inherited questions retain their existing ownership. Dory and the film still are © Disney/Pixar, sourced from https://www.pixar.com/finding-dory. The site is an independent fan project and is not affiliated with Krillion, Disney or Pixar. Donut and adventurer sprites were generated for Donutopia. The character still is official film art; generation of a matching pixel-art Dory was unavailable.

Browser rendering QA was unavailable in the editing environment. Static assets, game state transitions, data integrity and deployment are checked separately.
