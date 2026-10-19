# Donutopia AI judging backend

Status: rarity-v2 is live. The new broad-question bank (bakery-open-v2) is tested locally and awaits deployment to Cloudflare. Rarity remains a model estimate, not measured player frequency.
The public website uses the deployed Worker from `backend-config.json.apiOrigin`. If the Worker fails, answers remain unscored until retried.

## Included

- 351 distinct open-ended questions across 12 categories, with no predefined answers or answer tiers.
- Deterministic daily batches of seven, using the existing New York reset calendar. Fifty consecutive daily batches use 350 different questions. The bank eventually cycles; it is not an infinite source of fresh questions.
- Unlimited and themed batch endpoints matching the existing client contract.
- Cloudflare Workers AI Gemma 4 26B A4B for validity and estimated rarity. The v2 judge separates validity from rarity and gives accepted answers 1–100 integer points, with a minimum of 1. Visual tiers are derived from the score.
- Accepted judgments are cached for seven days, keyed by model, question, normalized answer and judge version. Rejections are not cached. KV is eventually consistent, so simultaneous first requests can get different model estimates. No claim of observed answer frequency or perfect accuracy.
- Per-IP request limiting, bounded input and output, model confidence checks, no browser API secrets, and retryable service errors.
- Existing browser-local progress remains the score store. No account syncing or verified global leaderboard is implemented.

## Build and check

From the repository root:

```
python scripts/build-worker.py
node --test backend/test/worker.test.mjs
```

Tests use a mock model. They test routing, validation, caching, rollover/DST, prompt selection and failures. They do not establish real-model judging accuracy or latency.

## Deploy on the Workers Free plan

1. Create a KV namespace for judgments. Set its ID in `backend/wrangler.jsonc` (the current deployment is already configured).
2. Keep the `AI`, `JUDGMENTS` and `JUDGE_LIMITER` bindings from the configuration. The rate limit is 20 requests per minute per IP at Cloudflare's local rate-limiting scope; it is not a global spending cap or authentication.
3. Authenticate Wrangler to the Cloudflare account, then run `npx wrangler deploy` from `backend/`. Alternatively deploy `worker.mjs` as an ES module Worker through the dashboard and configure the same bindings.
4. Verify `/health` using the Origin header `https://mritabhash.github.io`. All three bindings must be ready.
5. Test real common, uncommon, invalid, misspelled and adversarial answers using the prompt IDs from `/api/today`. Check latency fits within the client's 20-second request timeout and review judge accuracy.
6. Only after those checks, set `backend-config.json.apiOrigin` to the deployed HTTPS workers.dev origin. Update the welcome copy to describe daily rotation and AI-estimated rarity, and bump the service-worker version so existing sessions read the new configuration.
7. Publish through GitHub Pages and verify daily play, results and unlimited play in a browser.

Do not upgrade to the paid plan without the owner's explicit approval. Workers AI has a daily free allocation. At quota exhaustion, the API returns a retryable error; it never silently switches to static rarity or assigns zero points. Other free resource limits also apply.

Answers are sent to Cloudflare for inference. The cached canonical answer and judgment expire after seven days. The Worker does not store a player ID, raw IP address, or submitted score. Cloudflare processes network metadata as the hosting provider. Update the public privacy page before activating this backend.

The prompt resists answer-text instructions, but LLM judgments can still be wrong or manipulated. This is a casual game, not a secure competitive scoring service. Add human review and signed session/score receipts before using it for prizes or trusted rankings.

## Pending rarity-v2 deployment

Replace the `donutopia-api` Worker code with `worker.mjs` and deploy, keeping the existing bindings. GitHub Pages deployment alone does not publish the Worker. `/health` will report `judgeVersion: rarity-v2` after deployment. The broad-question update uses version bakery-open-v2. Daily batches through #96 retain their original questions so existing scores and archive results still match. The broad bank starts with daily batch #97; unlimited and recipe boxes use it immediately after deployment.

AI response waiting is capped at 8 seconds; cache lookup at 300 milliseconds. A timeout returns a retryable error without marking an answer wrong. This bounds the response wait, but does not guarantee cancellation of underlying model computation or eliminate network delay. Uncertain judgments remain retryable. The prompt asks the model to evaluate category validity independently of commonness, but factual accuracy still requires live evaluation.

## Broad prompt design

351 prompts favour familiar categories and everyday situations with many possible valid answers. Rarity provides the challenge; specialist factual constraints and unusual initial-letter combinations have been removed. Examples include desserts, kitchen objects, movie characters and clothing. The judge is instructed to accept reasonable specific and regional examples without inventing extra constraints. Historical daily questions are retained separately for replay compatibility.
