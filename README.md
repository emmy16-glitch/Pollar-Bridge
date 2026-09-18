# PollarBridge Africa

<img src="web/public/logo-wordmark.svg" alt="PollarBridge — African local rails to Pollar USDC" width="460" />

A **web-only, configurable payment-rail backend (+ demo frontend)** that connects African
local money (bank, mobile money, P2P, agents) to **Pollar testnet wallets and USDC transfers**,
with the final BOB payout mocked per hackathon rules.

Implements the architecture spec in `main (5).pdf`: a universal transfer engine with
pluggable country configuration, corridor model, provider adapters, capability matrix,
payment state machine, reconciliation, and a Pollar settlement boundary.

**Status:** live on testnet · **hosted on Vercel** (`pollar-bridge-chi.vercel.app` portal +
`pollar-bridge-api.vercel.app` backend) · 45/45 backend tests green · 48/48 live-API e2e
checks green · frontend builds clean. Read [docs/POLLAR_INTEGRATION.md](docs/POLLAR_INTEGRATION.md)
for what is real vs sandbox, [docs/AGENT_RAIL.md](docs/AGENT_RAIL.md) for the x402 machine rail,
[POLLAR_SETUP.md](POLLAR_SETUP.md) for on-chain proof, [SECURITY.md](SECURITY.md) for the
security model.

## Brand / logo

The mark is `web/public/logo.svg`: two arcs meeting at a keystone on a bridge deck.
**Violet arc** = the African local leg (money in) · **emerald arc** = the Bolivian payout
(money out) · **white keystone** = the verified settlement point where the two legs meet.
The favicon (`web/src/app/icon.svg`), the sidebar/mobile header (`web/src/components/Logo.tsx`),
and the social preview card (`web/src/app/opengraph-image.tsx`) all share the same geometry.

---

## Contents

1. [The idea in 60 seconds](#1-the-idea-in-60-seconds)
2. [Hackathon compliance](#2-hackathon-compliance)
3. [Architecture](#3-architecture)
4. [Features](#4-features)
5. [Quickstart](#5-quickstart)
6. [API reference](#6-api-reference)
7. [Transfer lifecycle walkthrough](#7-transfer-lifecycle-walkthrough)
8. [Project structure](#8-project-structure)
9. [Design rules enforced in code](#9-design-rules-enforced-in-code)
10. [Testing](#10-testing)
11. [Spec traceability](#11-spec-traceability)
12. [Security model](#12-security-model)
13. [Roadmap to pilot and live](#13-roadmap-to-pilot-and-live)
14. [Links](#14-links)
15. [Judge cheat sheet (2 minutes)](#15-judge-cheat-sheet-2-minutes)

New here? Read in this order: §1 idea → §5 quickstart → §14 links to
[docs/POLLAR_INTEGRATION.md](docs/POLLAR_INTEGRATION.md) (real vs sandbox) →
[docs/AGENT_RAIL.md](docs/AGENT_RAIL.md) (the x402 machine rail).

---

## 1. The idea in 60 seconds

Sending money from Africa to Bolivia has two halves. The **African leg** (collecting local
currency through fragmented rails) is the hard product problem — Pollar provides no Africa
ramp, so this project designs and builds it. The **Bolivian leg** (BOB payout) already exists
as Pollar's mainnet Stereum ramp, so this project only hands off to it and mocks the final step.

```
African sender
  │
  ▼
Local rail (bank / mobile money / P2P / agent)   ◄── THIS PROJECT (sandbox + operator flow)
  │
  ▼
Detection ──► operator/bank verification (detection ≠ verification)
  │
  ▼  PAYMENT_VERIFIED fires Pollar Deferred wallet funding (testnet)
Pollar wallet + sponsored USDC transfer          ◄── Pollar testnet (real SDK + keys)
  │
  ▼
BOB payout                                       ◄── MOCKED (Pollar mainnet-side, out of scope)
  │
Bolivian recipient (tracks via share link)
```

The central design rule, quoted from the spec:

> “The workflow stays the same. Country configuration, payment-rail adapters, provider
> credentials, compliance policy, and settlement capabilities change around it.”

---

## 2. Hackathon compliance

How each organizer rule is satisfied:

| Organizer rule | Implementation | Proof |
|---|---|---|
| African leg is yours (fund/cash-out via local rails) | 8 sandbox providers across NG/GH/KE/ZA: bank, mobile money, P2P, agent | `GET /api/capabilities` |
| Sandbox or documented semi-manual flow is fine | Sandbox adapters + operator verify/reject/refund queue | `GET /api/operator/pending` |
| Don't build Bolivia | No Bolivia code exists; payout is a labeled mock | `GET /api/transfers/:id/handoff` → `bolivia.status: "mocked"` |
| Build and demo on testnet (wallets, sponsored txs, USDC) | `@pollar/react` wallet card + Deferred funding (`POST /v1/wallets/fund`) | `/wallet` + [POLLAR_SETUP.md](POLLAR_SETUP.md) |
| Mock the final BOB payout | `BOB-MOCK-*` refs with explicit note | handoff receipt |
| African path must exist, be well designed, hand off cleanly | State machine + capability matrix + handoff receipt with idempotency key | `scripts/e2e.sh` (48 checks) |
| Move real money via SDK (wallets, ramps, KYC, yield, agents) | x402 machine rail (402→201) + live ramps quotes + Blend/DeFindex APY + KYC providers + user register | `/agent`, `/earn`, `/kyc`, `GET /api/pollar/status` |

---

## 3. Architecture

```
                    ┌─────────────────────────────────┐
                    │           Web clients            │
                    │  sender · recipient · operator   │  web/ (Next.js portal)
                    └───────────────┬─────────────────┘
                                    │  REST /api
                    ┌───────────────▼─────────────────┐
                    │        Corridor engine           │  corridors/ + countries/
                    │  which routes actually exist?    │  capabilityMatrix.ts
                    └───────────────┬─────────────────┘
                                    │
                    ┌───────────────▼─────────────────┐
                    │     Transfer orchestration       │  orchestration/
                    │  state machine · quotes ·        │  transferService.ts
                    │  reconciliation · audit          │  stateMachine.ts · quoteService.ts
                    └───────┬─────────────────┬───────┘
                            │                 │
            ┌───────────────▼──────┐  ┌───────▼──────────────────┐
            │ Local-rail adapters  │  │ Pollar settlement adapter │
            │ bank/momo/P2P/agent  │  │ wallets · USDC · BOB-mock │
            │ sandbox/* · live/*   │  │ pollar/pollarService.ts   │
            └──────────────────────┘  └──────────────────────────┘
```

Layer map (spec §6–§15):

| # | Layer | Code |
|---|---|---|
| 1 | Country configuration | `src/payments/countries/` (NG, GH, KE, ZA + registry) |
| 2 | Explicit corridor model | `src/payments/corridors/corridorRegistry.ts` |
| 3 | Stable provider interface | `src/payments/adapters/LocalRailProvider.ts` |
| 4 | Provider registry | `src/payments/providers/providerRegistry.ts` |
| 5 | Capability matrix | `src/payments/providers/capabilityMatrix.ts` |
| 6 | Payment state machine | `src/payments/orchestration/stateMachine.ts` |
| 7 | Quote & FX service | `src/payments/orchestration/quoteService.ts` |
| 8 | Pollar settlement adapter | `src/payments/pollar/pollarService.ts` |
| 9 | Reconciliation | `src/payments/orchestration/reconciliation.ts` |

Cross-cutting: smart routing (`payments/routing/`), provider health
(`providers/providerHealth.ts`), audit log (`store/auditLog.ts`), in-memory store
(`store/memoryStore.ts`, swappable for a DB without touching orchestration).

---

## 4. Features

**Transfer engine**
- Provider-independent state machine (12 forward states + 6 failure states); illegal
  transitions throw instead of corrupting data.
- Detection is separated from verification: a detected payment cannot release USDC —
  `settleToPollar` throws unless status is `PAYMENT_VERIFIED`.
- Quotes carry fees, FX rate, expiry, rate source, and a `simulated` flag in sandbox.

**Local rails (the African leg)**
- 8 registered sandbox providers: NG bank/P2P, GH mobile money/bank, KE mobile
  money/agent, ZA bank/P2P — plus a cash-agent rail with claim codes.
- Live adapters (`NigeriaBankLiveProvider`, `GhanaMobileMoneyLiveProvider`) implement the
  same contract but refuse to run without production credentials (Phase 4 gate).
- Smart routing: `GET /api/routes/recommend?country=NG&amount=50000` ranks rails by
  cost/ETA and labels cheapest/fastest.

**Pollar leg (testnet: real where it counts, honest where it doesn't)**
- Wallet: `/wallet` shows a demo card plus a real `@pollar/react` card (login, USDC
  trustline, send, ramp modal). Without a `pub_testnet_` key the SDK is skipped entirely
  (no console 401) and the demo card stays usable.
- Deferred funding: backend holds the secret key and calls `POST /v1/wallets/fund` on
  `PAYMENT_VERIFIED` (staff approval counts as the pass in this demo).
- Machine rail (x402-style, our unique piece): `POST /api/agent/quote` answers **HTTP 402**
  with `{ priceUsdc, payTo, memo, expiresAt }`; the agent pays testnet USDC with that memo,
  then `POST /api/agent/transfers { memo, paymentHash }` mints a real transfer (audit
  `actor: agent`). Try it on the `/agent` page — it shows both steps plus the curl.
- Live-or-sandbox reads (real SDK when keys exist, labeled sandbox otherwise):
  `GET /api/ramps/quote`, `GET /api/earn/opportunities?provider=blend|defindex`,
  `GET /api/kyc/providers?country=NG`, `POST /api/users/register`, `GET /api/pollar/status`.
- Without keys the backend falls back to clearly-labeled Stellar-style mocks
  (64-hex hashes, `G…` addresses) so the demo never breaks offline.
- Handoff receipt (`GET /api/transfers/:id/handoff`) bundles African rail proof + Pollar
  tx + mocked BOB leg under one idempotency key.

**Operations (the staff leg — plain words)**
- Review queue: payments waiting for a human to confirm. No USDC moves until staff approve.
- Money check: asked-to-pay vs actually-arrived vs settled-as-USDC, per transfer. Green = match.
- Activity log: who did what, when (sender, staff, agent, Pollar engine, system).
- Routes on/off: enable/disable a country route without deleting history.
- Rail status: per-provider calls, error rate, latency, healthy flag + ping button.
- Public recipient tracking: `GET /api/track/:token` exposes status + timeline only —
  no PII, no secrets.
- Webhook skeleton for live providers (HMAC-enforced in live mode).

---

## 5. Quickstart

**Prerequisites:** Node ≥ 20.

```bash
git clone https://github.com/emmy16-glitch/Pollar-Bridge.git
cd Pollar-Bridge
npm install
cp .env.example .env        # fill in POLLAR_PUBLISHABLE_KEY / POLLAR_SECRET_KEY
npm run dev                 # backend on :4000
```

**Frontend portal** (Next.js: send · track · history · wallet · operator):

```bash
cd web
cp .env.example .env.local  # BACKEND_URL + OPERATOR_API_KEY (empty for demo)
npm install
npm run dev                 # :3000 (backend must run on :4000)
```

**Environment variables:**

| Var | Where | Required | Notes |
|---|---|---|---|
| `PORT` | backend `.env` | no (`4000`) | API listen port |
| `MODE` | backend `.env` | no (`sandbox`) | `sandbox` \| `pilot` \| `live` |
| `POLLAR_ENV` | backend `.env` | no (`testnet`) | Stellar network label |
| `POLLAR_PUBLISHABLE_KEY` | backend `.env` | for real mode | `pub_testnet_…` — safe for browsers |
| `POLLAR_SECRET_KEY` | backend `.env` only | for real funding | `sec_testnet_…` — **never** in `web/` |
| `OPERATOR_API_KEY` | backend `.env` | pilot/live yes, demo no | Gates `POST /operator/*`, `POST /transfers/:id/settle`, `PATCH /corridors/:id` via `x-operator-key` |
| `WEBHOOK_SECRET` | backend `.env` | live yes | HMAC-SHA256 over `<timestamp>.<raw-body>`; headers `x-webhook-signature` + `x-webhook-timestamp` |
| `AGENT_SETTLE_WALLET` | backend `.env` | no | x402 escrow address; empty = visibly-fake `G-AGENT-ESCROW-sandbox` |
| `ALLOWED_ORIGINS` | backend `.env` | no | Comma allowlist; empty = allow all (dev only — set in prod) |
| `BACKEND_URL` | `web/.env.local` | no (defaults to `http://localhost:4000/api`) | Express backend base URL proxied by `web/src/app/api/*` |
| `OPERATOR_API_KEY` (web) | `web/.env.local` | must match backend when set | Forwarded as `x-operator-key` on verify/settle/reject + corridor toggles |
| `NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY` | `web/.env.local` | no (`pub_testnet_…` enables the real SDK wallet card) | Empty = SDK skipped entirely, no console 401; demo card stays usable |

Full key setup, funding, and troubleshooting: [POLLAR_SETUP.md](POLLAR_SETUP.md).
Security semantics (auth, webhooks, rate limits, secret handling): [SECURITY.md](SECURITY.md).

### 5b. Hosted demo (Vercel)

The app runs as two Vercel projects in the same team:

| Project | URL | What it hosts | Key env vars |
|---|---|---|---|
| `pollar-bridge` | https://pollar-bridge-chi.vercel.app | Next.js portal | `BACKEND_URL`, `NEXT_PUBLIC_API_URL`, `OPERATOR_API_KEY`, `NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY` |
| `pollar-bridge-api` | https://pollar-bridge-api.vercel.app | Express backend as one serverless function | `MODE`, `POLLAR_ENV`, `POLLAR_*`, provider keys, `OPERATOR_API_KEY`, `WEBHOOK_SECRET`, `AGENT_SETTLE_WALLET` |

How the deploy works: `api/send.js` is a thin serverless handler that builds the same
Express app (`src/app.ts` → `buildApp(buildContainer())`) and caches it per warm lambda;
`vercel.json` rewrites every `/api/*` path (and `/`) to that handler. The store is
in-memory, so state resets on cold starts — fine for the sandbox demo, and the reason a
persistent DB is Phase 3 (see §13). All env values are set per-environment in the Vercel
dashboard (Project → Settings → Environment Variables) or via `vercel env add <KEY>
<environment>`; **no secret is ever committed** — the repo keeps only `.env.example`
templates.

Deploy / redeploy:

```bash
# backend
npx vercel link --project pollar-bridge-api
npx vercel env add MODE production      # repeat per key (value on stdin)
npx vercel --prod

# portal (from web/)
cd web && npx vercel link --project pollar-bridge
npx vercel env add BACKEND_URL production   # https://pollar-bridge-api.vercel.app/api
npx vercel --prod
```

After the first deploy, point `ALLOWED_ORIGINS` (backend) at the portal domain and
`BACKEND_URL` (portal) at the API domain, then redeploy both.

---

## 6. API reference

Base URL: `http://localhost:4000/api`. All bodies are JSON.

**Discovery**

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Liveness + Pollar env label |
| GET | `/countries` | All country configs (limits, rails, verification policy) |
| GET | `/corridors?enabledOnly=true` | Corridor list; `enabledOnly` hides disabled routes |
| GET | `/corridors/:id` | One corridor |
| GET | `/capabilities` | Availability computed from **real adapter capabilities**: `available` \| `manual` \| `coming_soon` \| `disabled` |
| GET | `/providers` | Registered provider inventory |
| GET | `/providers/health` | Per-provider calls, error rate, latency, healthy flag (§23.4) |

**Quotes, transfers, settlement**

| Method | Path | Body | Description |
|---|---|---|---|
| POST | `/estimates` (`/quotes` alias) | `{ corridorId, sourceAmount }` | Transfer estimate — fees, FX, expiry, `simulated` |
| POST | `/transfers` | `{ corridorId, sourceAmount, senderName?, idempotencyKey? }` + `Idempotency-Key` header | Creates quote **and** payment instructions; returns transfer with `paymentId` + `shareToken` + `instructions`. Same key = same transfer (safe retry) |
| GET | `/transfers?limit=50&offset=0` | — | Transfer list (newest first, paginated) |
| GET | `/transfers/:id` | — | Full transfer + status history |
| GET | `/transfers/:id/events` | SSE | Live status stream (replaces polling; auto-closes on terminal states) |
| POST | `/transfers/:id/settle` 🔑 | — | USDC settlement → Pollar → mocked BOB. **Refused unless `PAYMENT_VERIFIED`. Operator-gated.** |
| GET | `/transfers/:id/reconciliation` | — | Expected vs **real adapter actuals**, variance, `release`/`hold`/`refund`/`manual_review` |
| GET | `/transfers/:id/handoff` | — | Judge receipt: African rail + Pollar tx + mocked BOB under one idempotency key |

🔑 = requires `x-operator-key` when `OPERATOR_API_KEY` is set (always set in pilot/live).

**Operator (staff approval flow)** — money-moving POSTs are 🔑 + rate-limited.

| Method | Path | What it means |
|---|---|---|
| GET | `/operator/pending?limit=100` | Payments waiting for a human: awaiting, detected, under-review |
| POST | `/operator/payments/:paymentId/detected` 🔑 | "I see a possible match" (NOT approval); safe to re-click |
| POST | `/operator/payments/:paymentId/verify` 🔑 | "Confirmed — release the USDC" (unlocks settlement) |
| POST | `/operator/payments/:paymentId/reject` 🔑 | `{ reason }` → payment rejected, sender told why |
| POST | `/operator/payments/:paymentId/refund` 🔑 | `{ reason? }` → money sent back (`REFUND_PENDING` → `REFUNDED`) |
| GET | `/operator/audit?limit=100` | Activity log: who did what, when |

**Pollar + machine rail (new)**

| Method | Path | What it means |
|---|---|---|
| POST | `/agent/quote` | Ask the price as a machine → **HTTP 402** `{ priceUsdc, payTo, memo, expiresAt }` |
| POST | `/agent/transfers` | Swap `{ memo, paymentHash (64-hex) }` for a real transfer (201, audit `actor: agent`) |
| GET | `/agent/status/:memo` | Was this memo redeemed / expired? |
| GET | `/ramps/quote?country=BO&amount=100&currency=USDC&direction=offramp` | Live Pollar quote when keys exist, labeled sandbox otherwise |
| GET | `/earn/opportunities?provider=blend\|defindex` | Live Blend/DeFindex APY when reachable, demo figures otherwise |
| GET | `/kyc/providers?country=NG` | Live KYC providers when reachable, sandbox fallback otherwise |
| POST | `/users/register` | `{ externalId, email? }` → Pollar user (real or `mock_` labeled) |
| GET | `/pollar/status` | One glance: real vs sandbox for every Pollar surface |

**Administration & extras**

| Method | Path | Description |
|---|---|---|
| PATCH | `/corridors/:id` 🔑 | `{ enabled: boolean }` — disable a route without deleting history (§23.3) |
| GET | `/routes/recommend?country=NG&amount=50000` | Ranked rail options with fees + ETA + cheapest/fastest labels (unhealthy sinks) |
| GET | `/track/:token` | Public recipient view: reference, status, amounts, timeline (no PII) |
| POST | `/webhooks/:provider` | Provider callback. Sandbox: dispatches `payment.received/verified` to the state machine. Live: HMAC-SHA256 over `<timestamp>.<raw-body>` + 5-min replay window required |

Error shape everywhere: `{ "error": "<human-readable reason>" }` (no stacks, no secrets).
Auth failures: `401 { error: "operator auth required…" }` / `401 invalid webhook signature` / `429 rate limited`.
Expiry: `410 { error: "Payment expired…" }` — create a new transfer for a fresh quote.

---

## 7. Transfer lifecycle walkthrough

Happy path (each step appends to `transfer.history`):

```
QUOTE_CREATED → PAYMENT_INSTRUCTIONS_ISSUED → AWAITING_LOCAL_PAYMENT
  → PAYMENT_DETECTED → PAYMENT_UNDER_REVIEW → PAYMENT_VERIFIED
  → USDC_SETTLEMENT_PENDING → USDC_SETTLED_TO_POLLAR
  → POLLAR_TRANSFER_SUBMITTED → POLLAR_TRANSFER_CONFIRMED
  → DESTINATION_PAYOUT_PENDING → COMPLETED
```

Failure states: `PAYMENT_EXPIRED`, `PAYMENT_REJECTED`, `SETTLEMENT_FAILED`,
`PAYOUT_FAILED`, `REFUND_PENDING`, `REFUNDED`.

Try it (replace ids from each response):

```bash
BASE=localhost:4000/api
curl -s $BASE/corridors?enabledOnly=true
curl -s -X POST $BASE/transfers -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: demo-001' \
  -d '{"corridorId":"NG-NGN-BANK-BO-USDC","sourceAmount":100000}'
# settle is correctly REFUSED here (not yet verified):
curl -s -X POST $BASE/transfers/<transferId>/settle
curl -s -X POST $BASE/operator/payments/<paymentId>/detected
curl -s -X POST $BASE/operator/payments/<paymentId>/verify
curl -s -X POST $BASE/transfers/<transferId>/settle        # → COMPLETED
curl -s $BASE/transfers/<transferId>/handoff
curl -s $BASE/track/<shareToken>
# live timeline (replaces polling):
curl -N $BASE/transfers/<transferId>/events
```

With `OPERATOR_API_KEY` set, add `-H 'x-operator-key: $OPERATOR_API_KEY'` to the
operator/settle calls. Web portal sends it automatically from its `OPERATOR_API_KEY`.

Or run the whole flow automatically: `bash scripts/e2e.sh` (48 checks, fails fast).

---

## 8. Project structure

```
Pollar-Bridge/
├── README.md                  # this file
├── SECURITY.md                # security semantics (auth, webhooks, secrets, limits)
├── POLLAR_SETUP.md            # Pollar testnet ops manual + judge demo
├── docs/
│   ├── POLLAR_INTEGRATION.md  # what is real vs sandbox, surface by surface
│   └── AGENT_RAIL.md          # x402 machine rail: API, failure codes, 2-curl demo
├── package.json               # backend deps + scripts
├── tsconfig.json  vitest.config.ts
├── scripts/e2e.sh             # live-API end-to-end verification (48 checks)
├── scripts/web-smoke.sh       # portal smoke: pages + proxy paths + 402 rail (27 checks)
├── src/
│   ├── index.ts               # server entry (dotenv + listen)
│   ├── app.ts                 # Express app, CORS, raw-body, headers, logging, errors
│   ├── security.ts            # operatorAuth, rateLimit, redactSecrets
│   ├── container.ts           # wiring: registries, adapters, services
│   ├── types.ts               # domain types (Country, Corridor, Quote, Transfer…)
│   ├── payments/
│   │   ├── orchestration/     # transferService, stateMachine, quoteService, reconciliation
│   │   ├── adapters/          # LocalRailProvider + sandbox/* + live/*
│   │   ├── countries/         # nigeria, ghana, kenya, southAfrica + registry
│   │   ├── corridors/         # corridorRegistry (+ admin enable/disable)
│   │   ├── providers/         # providerRegistry, capabilityMatrix, providerHealth
│   │   ├── pollar/            # pollarService (real SDK path + labeled mock fallback)
│   │   └── routing/           # smart rail recommendations
│   ├── routes/                # corridors, quotes, transfers (+SSE), operator, extra,
│   │                          # pollar (ramps/earn/kyc/users), agent (x402), health
│   └── store/                 # memoryStore, auditLog, transferEvents
├── tests/                     # contract, e2e, hackathon, spec, security,
│                              # agent (x402 HTTP), pollar-surfaces (45 tests)
└── web/                       # Next.js role-based portal (proxies Express backend)
    ├── DESIGN.md                # design system every agent edit must follow
    ├── src/components/ui/       # shared kit (StatusBadge, Stat, Timeline, …)
    ├── src/lib/backend.ts       # backend base URL + operator-key forwarding
    ├── src/lib/adapters.ts      # backend → UI shape translation
    ├── src/app/api/*            # thin proxies (corridors, providers, transfers, audit,
    │                            # reconciliation, wallet, agent, pollar, earn, kyc)
    └── src/app/                 # send, track, history, wallet, earn, kyc, agent, operator pages
```

---

## 9. Design rules enforced in code

- **No country branching.** UI, orchestration, and settlement resolve providers only via
  `ProviderRegistry.resolve(country, rail, mode)` — adding a country means registering an
  adapter, never editing control flow.
- **Availability is computed, not declared.** The capability matrix combines corridor config
  with live adapter capabilities; the dashboard can never offer a route with no code behind it.
- **Detection ≠ verification.** `settleToPollar` throws unless `PAYMENT_VERIFIED`; operator
  buttons and live webhooks converge on the same state.
- **Pollar is a boundary.** Local rails prove money arrived; the Pollar adapter owns wallets,
  USDC, and the mocked BOB handoff. Secrets never cross to the browser.
- **Live is gated.** Live adapters throw without production credentials; webhooks demand
  signatures in live mode; unhealthy providers are flagged by the health tracker.

---

## 10. Testing

```bash
npm run typecheck              # strict TS, backend
npm test                       # vitest: 45 tests
bash scripts/e2e.sh            # live backend API: 48 endpoint checks
cd web && npm run build        # frontend typecheck + production build
# with both servers running:
bash scripts/web-smoke.sh      # portal smoke: 13 pages + 11 proxies + 402/201 rail
```

Test files:

| File | Covers |
|---|---|
| `tests/contract.test.ts` | Adapter contract suite (§18) × 3 sandbox providers: instructions, stable ids, awaiting state, verify, cancel, no-early-USDC, reconciliation |
| `tests/e2e.test.ts` | Full NG→BO sandbox transfer to `COMPLETED` with tx hash |
| `tests/hackathon.test.ts` | Mock-vs-real mode, smart routing, share token + handoff (BOB mocked, Stellar hash) |
| `tests/spec.test.ts` | 8-provider registration, corridor disable with history, pending/audit, refund chain, health snapshot |
| `tests/security.test.ts` | Secret redaction, operator-auth demo passthrough, lazy Pollar env |
| `tests/agent.test.ts` | x402 machine rail over HTTP: 402 payload, 201 mint, replay `409`, bad hash `400`, unknown memo `400`/`404`, `actor=agent` audit |
| `tests/pollar-surfaces.test.ts` | Pollar surfaces answer + label `real`/`mock`, input validation, and **no credential ever appears in a response body** |

---

## 11. Spec traceability

`main (5).pdf` section → implementation:

| Spec | Location |
|---|---|
| §3 web-only surfaces | `web/` (sender, tracker, operator, wallet) |
| §6 country config | `src/payments/countries/` |
| §7 corridor model | `src/payments/corridors/` |
| §8 provider interface | `src/payments/adapters/LocalRailProvider.ts` |
| §9 provider registry | `src/payments/providers/providerRegistry.ts` |
| §10 capability matrix | `src/payments/providers/capabilityMatrix.ts` |
| §11 state machine | `src/payments/orchestration/stateMachine.ts` |
| §12 detection vs verification | `transferService.markDetected/verifyPayment` + settle guard |
| §13 quotes/FX | `src/payments/orchestration/quoteService.ts` |
| §14 Pollar settlement | `src/payments/pollar/pollarService.ts` |
| §15 reconciliation | `src/payments/orchestration/reconciliation.ts` + route |
| §16 sandbox→live modes | `RuntimeMode` everywhere; live adapters gated |
| §17 sandbox adapters | `src/payments/adapters/sandbox/` (bank, momo, P2P, agent) |
| §18 contract tests | `tests/contract.test.ts` |
| §19 country expansion | 8 registrations in `src/container.ts` |
| §20 security boundaries | [§12 below](#12-security-model); credential-name references |
| §22 end-to-end example | `tests/e2e.test.ts` + `scripts/e2e.sh` |
| §23 dashboard views | operator/admin/health/track routes + `web/` panels |
| §24 phases | Phase 1–2 done; Phase 3 (DB, auth) and 4 (licensed live rails) → [§13](#13-roadmap-to-pilot-and-live) |

---

## 12. Security model

Full semantics: [SECURITY.md](SECURITY.md). Summary:

- **Key separation.** Publishable keys (`pub_…`) may ship in `web/`; secret keys (`sec_…`),
  provider API keys, webhook secrets, and `OPERATOR_API_KEY` live in backend `.env`/secret
  manager only. Country config references credential *names*, never values. Pollar env is
  read lazily so `dotenv` ordering can't bake empty secrets.
- **Operator auth.** `POST /operator/*`, `POST /transfers/:id/settle`, `PATCH /corridors/:id`
  require `x-operator-key` (or `Authorization: Bearer`) when `OPERATOR_API_KEY` is set.
  Unset = open demo mode with an `X-Operator-Auth: disabled-demo-mode` warning header.
  **Always set it in pilot/live.**
- **Webhooks.** Live mode requires HMAC-SHA256 over `<timestamp>.<raw-body>` with
  `x-webhook-signature` + `x-webhook-timestamp` inside a 5-minute window
  (`timingSafeEqual`). Sandbox dispatches the same state machine without a signature.
- **No secret leakage.** Central error handler returns `{ error }` without stacks; request
  logging redacts keys/tokens/secrets and never logs header values; tracking links expose
  status only; `Cache-Control: no-store` on API responses.
- **Abuse control.** In-memory rate limits on transfer creation (120/min/IP) and
  money-moving routes (60–120/min/IP) with `429 + Retry-After`; 100kb JSON body cap;
  `Idempotency-Key` makes client retries safe.
- **Sandbox walls.** Live adapters throw without live credentials; mock hashes/addresses
  are Stellar-shaped but visibly mock (`mode: "mock"`).
- **Both `.env` files are gitignored.** Keys stay on the operator machine; the repo carries
  only `.env.example` templates.

---

## 13. Roadmap to pilot and live

**Phase 3 — pilot readiness (next):** persistent DB behind the store interface (operator
auth is already done), per-day limits enforcement, dispute handling, alerting on health
failures, audit export.

**Phase 4 — live provider (one country, one licensed rail):** implement the adapter's real
`createPayment`/webhook/polling/refund calls, reconciliation against provider reports,
KYC/AML + sanctions screening hooks, controlled pilot limits, then broader enablement.

A country goes live only when adapter + credentials + limits + verification + settlement +
compliance are all in place — never because sandbox tests pass.

---

## 14. Links

- Pollar docs: https://docs.pollar.xyz · Ramps: https://docs.pollar.xyz/docs/operator-guide/integrations/ramps
- Pollar MCP gateway (agent/app management): https://docs.pollar.xyz/docs/sdk-reference/mcp-gateway
- Dashboard: https://dashboard.pollar.xyz · SDK: https://github.com/pollar-xyz/pollar
- Testnet explorer: https://stellar.expert/explorer/testnet
- Ops manual + judge demo: [POLLAR_SETUP.md](POLLAR_SETUP.md)
- Real-vs-sandbox: [docs/POLLAR_INTEGRATION.md](docs/POLLAR_INTEGRATION.md)
- x402 machine rail: [docs/AGENT_RAIL.md](docs/AGENT_RAIL.md)

## 15. Judge cheat sheet (2 minutes)

| # | Do this | What to say |
|---|---|---|
| 1 | Open `/send`, pick Nigeria, amount 100,000 | "African leg: local rails, quoted and limited per country." |
| 2 | Pay instructions show `PB-…` reference + sandbox account | "Nothing settles until a human confirms — detection is not verification." |
| 3 | Go to `/operator/queue`, click Verify | "Staff approval releases USDC through Pollar Deferred funding (testnet)." |
| 4 | Open the handoff receipt / `/track/:token` | "Public tracking, no PII; BOB leg explicitly mocked per the rules." |
| 5 | Open `/agent`, click Quote then Mint | "**No other team has this**: an app/AI agent buys the corridor — 402 bill, pay with memo, 201 transfer, audited as actor `agent`." |
| 6 | Open `/earn` and `/kyc` | "Same SDK surface for yield (Blend/DeFindex) and identity; live values when keys exist, labeled sandbox otherwise." |
| 7 | `bash scripts/e2e.sh` + `bash scripts/web-smoke.sh` | "48 backend checks + 27 portal checks green, including the 402→201 rail and the 409 replay guard." |


## 16. License

Released under the [MIT License](./LICENSE) — Copyright (c) 2026 Emmanuel Okunlola.
