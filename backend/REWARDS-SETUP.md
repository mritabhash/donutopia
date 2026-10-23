# Donutopia rewards

The website includes seven baking buddies, 18 cosmetics, 12 badges, six frosting finishes and an account wardrobe. `rewards/catalog.json` is the catalog source shared by the frontend and Worker. Run `python scripts/build-worker.py` after editing it. Pixel SVG artwork can be rebuilt with `python scripts/build-reward-assets.py` (also resets the initial catalog).

## Deploy the backend

1. In Cloudflare, open the existing `donutopia-accounts` D1 database console. Run `backend/migrations/0002_rewards.sql`. It creates four tables and three triggers without altering existing account or game data. It is safe to rerun.
2. Open the existing `donutopia-api` Worker. Replace its code with `backend/worker.mjs` and deploy. Keep DB, AI, JUDGMENTS, JUDGE_LIMITER, GOOGLE_CLIENT_ID and existing origin settings.
3. Open `/donutopia/account/`, sign in, then open the reward pantry. Existing completed saved daily batches appear as claimable. Complete a new saved daily batch to see its automatic reward reveal.
4. Claim once, refresh and verify the balance remains unchanged. Buy a 50-Sugar chef hat. With five scraps, craft a buddy and equip both. A second account must not see or spend the first account's inventory.

Until steps 1 and 2 are complete, the public `/bakery/` collection works and the account pantry displays an unavailable message. Currency is not simulated in the browser.

## Economy

Daily total is 0–700, calculated by the existing judge on the server. Tier boundaries are 0, 1, 150, 300, 450 and 600. Sugar payouts are 0/20/40/70/105/150; scrap payouts are 0/1/2/3/4/5. Each reward is claimed once per user and daily game. Past saved daily batches can be claimed, but offline games and room games cannot.

Crafting costs five scraps and selects uniformly among unowned buddies using cryptographic randomness. Duplicates do not charge currency. Once all seven are owned, crafting stops. Keep remaining scraps. All cosmetics are permanent, single-purchase unlocks. There are no paid draws, subscriptions or gameplay boosts.

Frosting is recorded on each day's reward, with the latest seven shown in the pantry. Badges use score and qualifying-day counts and never require consecutive days. Equip one buddy, hat, aura, frame and badge in your account display.

Credits and debits are database triggers. Unique claims, owned-item constraints and request keys prevent duplicate rewards and repeat charges. SQL wallet constraints reject overspending atomically. Google identity and existing ownership checks protect each operation. No user-submitted score or price is accepted.

## Checks

Run `node --test backend/test/*.test.mjs`. Tests exercise real SQLite, mocked Google key retrieval and mocked AI judging. Live authentication, Cloudflare migration, and two-account verification still require deployment and an authenticated session.
