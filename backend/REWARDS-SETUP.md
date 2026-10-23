# Donutopia rewards

The website includes seven baking buddies, 18 cosmetics, 12 badges, six frosting finishes and an account wardrobe. `rewards/catalog.json` is the catalog source shared by the frontend and Worker. Run `python scripts/build-worker.py` after editing it. Pixel SVG artwork can be rebuilt with `python scripts/build-reward-assets.py` (also resets the initial catalog).

## Deploy the backend

1. In Cloudflare, open the existing `donutopia-accounts` D1 database console. Run `backend/migrations/0002_rewards.sql`. It creates four tables and three triggers without altering existing account or game data. It is safe to rerun.
2. Open the existing `donutopia-api` Worker. Replace its code with `backend/worker.mjs` and deploy. Keep DB, AI, JUDGMENTS, JUDGE_LIMITER, GOOGLE_CLIENT_ID and existing origin settings.
3. Open `/donutopia/account/`, sign in, then open the reward pantry. Existing completed saved daily batches appear as claimable. Complete a new saved daily batch to see its automatic reward reveal.
4. Claim once, refresh and verify the balance remains unchanged. Buy a 50-Sugar chef hat. With five scraps, craft a buddy and equip both. A second account must not see or spend the first account's inventory.

Until steps 1 and 2 are complete, the public `/bakery/` collection works and the account pantry displays an unavailable message. Currency is not simulated in the browser.

## Surprise rewards

Sugar and frosting retain server-side score tiers. Scrap amounts are random and saved on first claim. Surprise badges derive from server-generated random game IDs, so retries cannot reroll them. Existing earned badges remain available.

The public catalog and reward API omit score thresholds. Players see collected rewards, prices and crafting cost. Buddies and non-frame cosmetics respond to tap, click, Enter or Space with individual dialogue and animation. Reduced-motion settings suppress motion. Frames remain static.

No additional database migration is needed if 0002_rewards.sql is already installed. Replace and deploy worker.mjs again.

## Checks

Run `node --test backend/test/*.test.mjs`. Tests exercise real SQLite, mocked Google key retrieval and mocked AI judging. Live authentication, Cloudflare migration, and two-account verification still require deployment and an authenticated session.
