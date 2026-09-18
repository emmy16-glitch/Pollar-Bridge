# Security semantics — PollarBridge Africa

Single source of truth for auth, secrets, webhooks, and abuse control.
Code: `src/security.ts`, `src/app.ts`, `src/routes/*`. Tests: `tests/security.test.ts`.

## 1. Trust zones

| Zone | Sees secrets? | Examples |
|---|---|---|
| Browser (`web/`) | **Never.** Only `VITE_API_URL`, `VITE_POLLAR_PUBLISHABLE_KEY` (`pub_…`), optional `VITE_OPERATOR_KEY` | Sender journey, tracker, operator cockpit |
| Backend env / secret manager | **Yes, server-side only** | `POLLAR_SECRET_KEY` (`sec_…`), `OPERATOR_API_KEY`, `WEBHOOK_SECRET`, provider keys |
| Public links | Status only, no PII/secrets | `GET /track/:token`, handoff receipt |

Country/provider config references credential **names**, never values.

## 2. Operator auth (money-moving routes)

Set `OPERATOR_API_KEY` in backend `.env` (and `VITE_OPERATOR_KEY` in `web/.env` so the
cockpit sends it as `x-operator-key`).

| Route | Auth |
|---|---|
| `POST /operator/payments/*/detected|verify|reject|refund` | 🔑 required when key is set |
| `POST /transfers/:id/settle` | 🔑 required when key is set |
| `PATCH /corridors/:id` | 🔑 required when key is set |
| Everything else (health, quotes, transfers CRUD, track, recommend, webhooks) | Public (webhooks use HMAC instead) |

- Header: `x-operator-key: <key>` (or `Authorization: Bearer <key>`).
- Unset key = open **demo mode** (responses carry `X-Operator-Auth: disabled-demo-mode`).
  Convenient locally, **never deploy pilot/live without it**.
- Failure: `401 { "error": "operator auth required (x-operator-key)" }`.

## 3. Webhooks (provider → us)

- Sandbox (`MODE != live`): signature ignored; `payment.received` → `markDetected`,
  `payment.verified` → `verifyPayment`. Same state machine as the operator buttons.
- Live (`MODE=live`): all three required, else `401`:
  1. `x-webhook-signature`: hex HMAC-SHA256 over the string `<timestamp>.<raw-request-bytes>`
     with `WEBHOOK_SECRET`. Compared with `timingSafeEqual`.
  2. `x-webhook-timestamp`: unix-ms within ±5 minutes (replay protection).
  3. Raw bytes come from the express `verify` hook — **not** `JSON.stringify(req.body)`,
     which is not byte-identical to what the provider signed.

## 4. Secrets handling

- Pollar env/keys are read **lazily** (`pollarMode()`, `pollarEnv()`, `secretKeyValue()`)
  so import order vs `dotenv/config` can't freeze empty values.
- Logs redact `pub_/sec_` keys and `api_key/secret/token/authorization` patterns
  (`redactSecrets()`); header values are never printed, only presence flags.
- Errors are `{ error: string }` only — no stacks, no secrets. Expiry surfaces as
  `410 Payment expired`; auth as `401`; rate limits as `429 + Retry-After`.
- API responses carry `Cache-Control: no-store` + `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`.
- Both `.env` files are gitignored; only `.env.example` templates ship.

## 5. Abuse control

- `POST /transfers`: 120 req/min per IP.
- Operator POSTs + settle + corridor admin: 60–120 req/min per IP.
- JSON bodies capped at 100kb; `senderName` ≤ 120 chars; `Idempotency-Key` ≤ 120 chars.
- `Idempotency-Key` header (or `idempotencyKey` body) makes double-clicks/retries safe:
  same key returns the original transfer, never a duplicate.

## 6. Machine rail (x402) — its own trust zone

The agent rail lets software start transfers. It deliberately keeps **every
existing money-safety rule** and adds two of its own.

| Rule | Where |
|---|---|
| Machine transfers are never trusted for money movement | `POST /agent/transfers` only *creates* a transfer; settlement still requires staff verify (same state machine) |
| `paymentHash` is shape-checked only in sandbox, and says so | response `payment.verified: "format-only-sandbox"`; live must check Horizon |
| One memo = one transfer (double-spend guard) | in-memory redeem set → `409 memo already redeemed` |
| Memo quotes expire | 15-minute TTL → `410` |
| Unknown/malformed input fails closed | `400` (zod: memo ≥ 3 chars, hash exactly 64 hex) |
| Machine actions are attributable | audit `actor: "agent"`, surfaced in the Activity log filter "Agent (x402 machine)" |
| Rate limited like any other money-adjacent write | `rateLimit(60)` on `/agent/transfers` |

`payTo` defaults to the visibly-fake `G-AGENT-ESCROW-sandbox`; set
`AGENT_SETTLE_WALLET` for a real escrow address. No key or secret is ever
returned by an agent endpoint (`tests/pollar-surfaces.test.ts` asserts this).

---

## 7. What is still demo-grade (do before pilot)

1. In-memory store + audit (restart wipes state) — swap `MemoryStore` for a DB.
2. Single shared operator key — move to per-operator accounts + roles + key rotation.
3. No per-day limits enforcement, dispute flow, or health alerting yet.
4. Rate limiter is per-process memory — put a shared limiter (Redis/gateway) behind
   multiple instances. The x402 memo store (`src/routes/agent.ts`) is also per-process:
   multi-instance deployments need a shared store + real Horizon hash verification.
5. No agent identity/auth yet — any caller can mint a transfer; that is safe because
   settlement is still staff-gated, but a pilot should issue per-agent credentials.
