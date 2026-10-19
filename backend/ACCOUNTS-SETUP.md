# Donutopia accounts and multiplayer

Implementation is ready for deployment testing. It is NOT active until the D1 binding and Google client are configured and the Worker is deployed. The existing public account/friend routes stay unchanged until then; the new interface is at `/donutopia/online/`.

## Features

- Google identity verified on the server (signature, issuer, audience, expiry). No passwords or email addresses stored. The browser keeps the short-lived identity token in session storage. Sign in again when it expires; game progress remains in D1.
- Baker display name, random friend code, account export and confirmed deletion.
- Saved daily games, resume across devices, history, streaks and baking buddies.
- Friend requests, recipient acceptance, removal and friend daily rankings revealed after completion.
- Private invitation-code rooms with up to eight players, host start/close, matching prompts, progress and scores refreshed every ten seconds. Rooms expire after 24 hours. Players answer at their own pace; this is not a synchronized timed race.
- Server-calculated points. Only one saved result per round; skipped rounds score zero. Common valid answers receive positive points. No browser-submitted score is trusted.
- The existing solo game remains browser-local. The online screen's daily game is the authoritative account game. Old offline scores are deliberately not imported into rankings.

## Required setup (Free plan)

1. In Cloudflare, create a D1 SQL database named `donutopia-accounts`.
2. Run `backend/migrations/0001_accounts.sql` in its SQL console (or use Wrangler migrations). Add the D1 binding to `donutopia-api`, binding name **DB**, selecting that database. Do not use the existing KV namespace as a database.
3. Create a Google OAuth **Web application** client for Donutopia in your own Google Cloud project. Configure the consent screen with Donutopia's name and privacy URL. Add `https://mritabhash.github.io` as an authorized JavaScript origin. Add test users if the consent screen is in testing. No client secret is needed or shipped to the browser.
4. Add the Worker plain-text variable **GOOGLE_CLIENT_ID** containing that web client ID. Keep AI, JUDGMENTS, JUDGE_LIMITER and ALLOWED_ORIGIN as configured.
5. Run `python scripts/build-worker.py`. Replace the Worker with `backend/worker.mjs` and deploy. This single module contains both the existing judge and the new account/room service.
6. Open `/donutopia/online/` and test with two Google accounts: create profiles, friend request/accept, create/join/start a room, submit answers, refresh, finish, compare scores, sign out and back in. Confirm data export and deletion with a disposable test account.
7. Once verified, copy `online/index.html` to `account/index.html` and `friends/index.html`, then publish the frontend. Both pages use relative assets and the same account interface. Link the main daily landing screen to `online/` for saved/ranked play. This explicit activation prevents advertising nonfunctional sign-in before the backend is ready.

For CLI deployment add this entry to `backend/wrangler.jsonc`, using the actual D1 ID:

```json
"d1_databases": [{"binding":"DB","database_name":"donutopia-accounts","database_id":"YOUR_D1_DATABASE_ID","migrations_dir":"migrations"}]
```

Add `GOOGLE_CLIENT_ID` to `vars`, then from `backend/` run:

```
npx wrangler d1 migrations apply donutopia-accounts --remote
npx wrangler deploy
```

Do not deploy placeholder IDs. No paid-plan upgrade is needed or authorized. Free quotas can interrupt service; errors preserve already-saved rounds. Cloudflare account access and Google client configuration are not available through this repository alone.

## Validation

```
python scripts/build-worker.py
node --test backend/test/*.test.mjs
node --check online.js
```

Tests run real SQL in Node's SQLite with a D1-shaped adapter and real RSA signature verification with a test key. AI and Google network calls are mocked. Live Cloudflare/Google sign-in and multi-browser checks remain required after provisioning. This is casual competition; AI validity and rarity can still be wrong.

## Data and access

D1 stores the Google subject identifier, chosen name, friend code and relationships, rooms, answer text and server scores. Only the owner can retrieve game answers. Accepted friends can see completed daily scores after finishing their own daily game. Room members see each other's display names, progress and scores. Knowing a room code permits joining only before it starts, and only if space remains. No global player directory or public leaderboard is provided.

Saved games remain until account deletion. Expired rooms cannot be joined or played. Account deletion cascades to hosted rooms and those room games for all participants. Google manages identity recovery. Signing out clears this tab's token; it does not revoke Google sessions on other devices. Tokens expire according to Google's issued expiry.

Reference implementation guidance: https://developers.google.com/identity/gsi/web/guides/verify-google-id-token and https://developers.cloudflare.com/d1/worker-api/ .
