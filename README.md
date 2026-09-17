# PollarBridge Africa — Backend (Phase 1: architecture + sandbox)

Web-only configurable payment-rail backend. Implements the spec in `main (5).pdf`:
universal transfer engine + country config + corridor model + local-rail adapters +
capability matrix + state machine + reconciliation + Pollar settlement.

## Quickstart

```bash
npm install
cp .env.example .env
npm run dev        # :4000
npm test           # contract + e2e tests
```

## API

- `GET /api/health`
- `GET /api/countries`
- `GET /api/corridors?enabledOnly=true`
- `GET /api/capabilities` — availability from real adapter capabilities
- `GET /api/providers`
- `POST /api/quotes` `{ corridorId, sourceAmount }`
- `POST /api/transfers` `{ corridorId, sourceAmount, senderName? }` → creates quote + payment instructions
- `GET /api/transfers` / `GET /api/transfers/:id`
- `POST /api/transfers/:id/settle` — only after `PAYMENT_VERIFIED`
- `GET /api/transfers/:id/reconciliation`
- Operator (sandbox): `GET /api/operator/pending`, `POST /api/operator/payments/:paymentId/detected|verify|reject|refund`, `GET /api/operator/audit`
- Admin: `PATCH /api/corridors/:id` `{enabled}` — disable without deleting history (§23.3)
- `GET /api/providers/health` — latency, error rate, availability (§23.4)
- `GET /api/routes/recommend?country=NG&amount=100000` — smart rail ranking (cheapest/fastest)
- `GET /api/transfers/:id/handoff` — clean Africa→Pollar→BOB-mock receipt for judges
- `GET /api/track/:token` — public recipient tracking link (no PII)
- `POST /api/webhooks/:provider` — live-provider webhook skeleton (HMAC-enforced in live mode)

## Pollar wiring (testnet)

Frontend uses `@pollar/react` with `POLLAR_PUBLISHABLE_KEY` (`pub_testnet_...` from
https://dashboard.pollar.xyz → Build → API Keys). Backend holds `POLLAR_SECRET_KEY`
(`sec_testnet_...`) server-side only and triggers Deferred wallet funding
(`POST /v1/wallets/fund`) when the African payment reaches `PAYMENT_VERIFIED`.
No keys = clearly-labeled Stellar-style mocks, so the demo never breaks.
The BOB payout is **always mocked** — the real BOB ramp (Stereum) is Pollar mainnet-side.

Demo flow:

```bash
curl -s localhost:4000/api/corridors?enabledOnly=true
curl -s -X POST localhost:4000/api/transfers -H 'Content-Type: application/json' \
  -d '{"corridorId":"NG-NGN-BANK-BO-USDC","sourceAmount":100000}'
# -> copy paymentId
curl -s -X POST localhost:4000/api/operator/payments/<paymentId>/detected
curl -s -X POST localhost:4000/api/operator/payments/<paymentId>/verify
curl -s -X POST localhost:4000/api/transfers/<transferId>/settle
```

## Layout

```
src/
  types.ts  container.ts  app.ts  index.ts
  payments/orchestration/ transferService.ts stateMachine.ts quoteService.ts reconciliation.ts
  payments/adapters/ LocalRailProvider.ts sandbox/* live/*
  payments/countries/ payments/corridors/ payments/providers/
  payments/pollar/pollarService.ts
  routes/ store/
tests/ contract.test.ts e2e.test.ts
```

## Rules enforced in code

- No UI/provider branching on country — `ProviderRegistry.resolve(country, rail, mode)`.
- Corridor enabled only with working adapter; capabilities matrix decides `available|manual|coming_soon|disabled`.
- Detection ≠ verification. `settleToPollar` throws unless `PAYMENT_VERIFIED`.
- Secrets server-side only; config references credential names (`GH_MOBILE_MONEY_X_LIVE`).
- Live adapters refuse to run without env credentials (Phase 4 gate).
