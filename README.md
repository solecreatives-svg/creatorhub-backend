# CreatorHub Backend — Step-by-Step Setup

This is a real, working backend (Node.js + Express + TypeScript + PostgreSQL via Prisma) that replaces the fake `localStorage` auth in the frontend demo with actual accounts, a real database, and real API calls. Payment processing and content-safety scanning are wired as **stubs** — see the warnings inline in `src/services/` — because those require real vendor accounts (explained in `BACKEND-AND-DEPLOYMENT-GUIDE.md` in the parent folder).

Follow these steps in order. Each one builds on the last.

## Step 1 — Install prerequisites

You need two things installed on your machine:

1. **Node.js** (v18 or newer) — check with `node -v` in Terminal. Install from nodejs.org if missing.
2. **PostgreSQL** — you have two options:
   - **Easiest: a free hosted database.** Go to [neon.tech](https://neon.tech) or [supabase.com](https://supabase.com), create a free project, and copy the connection string they give you (looks like `postgresql://user:pass@host/dbname`).
   - **Local Postgres:** install via `brew install postgresql@16` (Mac) and run `brew services start postgresql@16`, then create a database with `createdb creatorhub`.

## Step 2 — Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in:
- `DATABASE_URL` — the connection string from Step 1
- `JWT_SECRET` — run `openssl rand -hex 32` in Terminal and paste the output

Leave the payment/verification/CSAM keys blank for now — the app runs fine locally without them, it just can't process real charges or publish real content yet.

## Step 3 — Install dependencies

```bash
npm install
```

## Step 4 — Create the database tables

This reads `prisma/schema.prisma` (the data model — users, posts, subscriptions, etc.) and creates matching tables in your database.

```bash
npx prisma migrate dev --name init
```

You should see it create a `Migration` and confirm success. If this fails, double check `DATABASE_URL` in `.env`.

## Step 5 — Run the API server

```bash
npm run dev
```

You should see:
```
CreatorHub API listening on http://localhost:4000
```

Test it's alive:
```bash
curl http://localhost:4000/health
```
Should return `{"ok":true}`.

## Step 6 — Try the auth endpoints

Register a user:
```bash
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Alex Rivera","email":"alex@example.com","password":"password123","role":"FAN"}'
```

You'll get back a `token` — save it, you need it for anything else:
```bash
curl http://localhost:4000/users/me \
  -H "Authorization: Bearer PASTE_YOUR_TOKEN_HERE"
```

## Step 7 — The frontend is already wired to this backend

The `fanvue-clone` frontend's `AuthContext.jsx`, `src/lib/api.js`, and `src/lib/normalize.js` now call this backend directly instead of faking everything with `localStorage`. As long as this backend is running at the URL in the frontend's `.env` (`VITE_API_URL`, defaults to `http://localhost:4000`), things like login, signup, subscribing, messaging, posting, and payouts all hit real endpoints.

A few flows will predictably throw an error until you finish Step 3 of the deployment guide (real vendor accounts) — that's intentional, not a bug:
- **Subscribing to a creator** and **adding a payment method** fail with "No payment provider configured" — `src/services/paymentProvider.ts` is a stub until you wire CCBill/Segpay/Epoch/Vendo.
- **Publishing a post** fails with an identity-verification error unless the creator's `ageVerified` and `idVerificationStatus` fields are set. For local testing without a real verification vendor, open Prisma Studio (`npx prisma studio`) and manually set those two fields to `true` / `VERIFIED` on a test user.
- **Linking a bank account** / **withdrawing funds** fail the same way as subscribing, for the same reason.
- Posts won't show up in feeds or on a creator's public profile until `moderationStatus` is `APPROVED` **and** `csamScanStatus` is `CLEAR` — nothing in this scaffold sets `csamScanStatus` to `CLEAR` automatically (see `src/services/contentSafety.ts`), so newly created posts will stay invisible until you wire a real scanner or manually flip that field in Prisma Studio for testing.

## What's real vs. stubbed in this backend

| Feature | Status |
|---|---|
| User registration/login (bcrypt + JWT) | **Real** |
| Database (Postgres via Prisma) | **Real** |
| Creator profiles, posts, subscriptions, messages, notifications, payment methods, payouts (data layer + routes) | **Real** |
| Frontend wired to this backend (`AuthContext.jsx`, `api.js`) | **Real** |
| Post visibility gating (`moderationStatus`, `csamScanStatus`) | **Real gate logic**, but nothing sets these to APPROVED/CLEAR automatically — see Step 7 |
| Content moderation review | **Not implemented** — `POST /posts/:id/moderate` exists as an admin-only endpoint stub; you need a real admin review process behind it |
| CSAM scanning | **Stub only** — `src/services/contentSafety.ts` — must be replaced with Thorn Safer or PhotoDNA before any real media upload goes live |
| Payment charging | **Stub only** — `src/services/paymentProvider.ts` — must be replaced with CCBill/Segpay/Epoch/Vendo, not Stripe/PayPal |
| Payouts to creators | **Stub only** — same file, same reason |
| Age/identity verification | **Not implemented** — `ageVerified`/`idVerificationStatus` fields exist on the User model but nothing sets them; needs Persona/Veriff/Yoti integration |
| File/media upload | **Not implemented** — posts currently take a `mediaUrl` string; you need to add an actual upload endpoint that pushes to S3/R2 and returns the URL |
| Real-time messaging | **Partially real** — messages save to and load from the database, but there's no WebSocket push and no read/unread tracking yet, so the frontend has to reload to see new messages |
| Creator analytics (revenue chart, subscriber growth chart, "recent subscribers" widget) | **Still mock data** — `CreatorDashboard.jsx`, `CreatorEarnings.jsx`, and `CreatorSubscribers.jsx` on the frontend still read from `src/data/mockData.js`'s `creatorStats`; wiring real analytics aggregation queries is a separate pass |

## Suggested order to keep building

1. Get Steps 1–6 above working (you'll have a real database and real login), then run the frontend against it.
2. Add a media upload endpoint (S3/R2) — needed before posts can have real images instead of a pasted URL.
3. Replace the creator dashboard's mock analytics with real aggregation queries.
4. Start the vendor sign-up processes for payments, age verification, and CSAM scanning early — they take weeks, not days — then swap the stubs in `src/services/` for real calls once accounts are approved.
