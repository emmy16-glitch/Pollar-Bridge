# Agent rail (x402-style) — how it works and how to demo it

> Pollar's brief names "agent payments (x402)" as a capability. The Pollar SDK
> exposes **app management** over MCP (`mcp.api.pollar.xyz` with a `pat_…`
> token) but **no per-request machine payment endpoint**. So we built the x402
> *pattern* ourselves on top of the same wallet/USDC leg. It is real code with
> HTTP-correct semantics — not a mock.

## The idea

Normal flow: a human picks a route, pays locally, staff verify, USDC settles.

Machine flow (this rail): a program asks **"what does this cost?"**, receives a
machine-readable **bill** (`HTTP 402`), pays it in testnet USDC, then presents
the payment proof and receives a real transfer — no human in the loop for the
*initiation*. Staff verification still applies at settlement, because money
safety does not disappear just because the caller is a script.

```
agent ──POST /api/agent/quote──────────────► 402 { priceUsdc, payTo, memo, expiresAt }
   │
   ├── pays testnet USDC to payTo, memo = PB-AGENT-XXXXXXXX
   │
   └──POST /api/agent/transfers { memo, paymentHash }
              └──► 201 { transferId, reference, shareToken, ... }   audit actor=agent
                   └── staff verify in /operator/queue ► USDC settles ► COMPLETED
```

## API

| Method | Path | Response |
|---|---|---|
| POST | `/api/agent/quote` `{ corridorId, sourceAmount }` | **402** `{ code: "PAYMENT_REQUIRED", priceUsdc, currency, network, payTo, memo, expiresAt, instructions }` |
| POST | `/api/agent/transfers` `{ memo, paymentHash, senderName? }` | **201** full transfer (+ `payment: { verified: "format-only-sandbox", note }`) |
| GET | `/api/agent/status/:memo` | `{ redeemed, expired, quote }` or **404** |

Failure semantics (deliberately strict, no double-spend):

| Case | Status |
|---|---|
| memo unknown (quote first) | `400` |
| memo expired (15-min TTL) | `410` |
| memo already redeemed | `409` |
| `paymentHash` not 64 hex chars | `400` |
| corridor disabled / amount outside limits | `400` (thrown by the quote) |

`payTo` comes from `AGENT_SETTLE_WALLET` when set, otherwise
`G-AGENT-ESCROW-sandbox` (visibly sandbox). `paymentHash` is validated for
**shape only** in sandbox; live verification belongs on Horizon
(`GET /transactions/<hash>`) — that is written into the response so nobody
mistakes it for a chain check.

## Demo it in two curls

```bash
BASE=http://localhost:4000/api

# 1) machine asks the price -> 402
curl -i -X POST $BASE/agent/quote -H 'content-type: application/json' \
  -d '{"corridorId":"NG-NGN-BANK-BO-USDC","sourceAmount":100000}'
# HTTP/1.1 402 Payment Required
# {"code":"PAYMENT_REQUIRED","priceUsdc":61.07,"payTo":"G-AGENT-ESCROW-sandbox",
#  "memo":"PB-AGENT-D22B2638","expiresAt":"...","currency":"USDC","network":"stellar-testnet"}

# 2) machine presents its payment proof -> real transfer
curl -s -X POST $BASE/agent/transfers -H 'content-type: application/json' \
  -d '{"memo":"PB-AGENT-D22B2638","paymentHash":"<64-hex>"}'
# 201 {"transferId":"tr_71b99961","reference":"PB-FECC4E57","status":"AWAITING_LOCAL_PAYMENT", ...}
```

In the portal: **Agent rail** (`/agent`) runs both steps as buttons and shows
the raw 402/201 payloads. The **Activity log** then shows the line
`Agent · agent.transfer.create` — machine actions are audited like human ones.

## Why this is the differentiator

Every other submission demos a human sending money. This rail makes the corridor
purchasable by software — the thing "agent payments" is supposed to mean — while
keeping the same African-rail + staff-verify + Pollar-settle pipeline underneath.
One state machine, two callers.

## Tests

- `tests/agent.test.ts` (5 tests): 402 payload shape, 201 mint, replay `409`,
  bad hash `400`, unknown memo `400`/`404`, and the `actor=agent` audit line.
- `scripts/e2e.sh`: `agent.quote-402`, `agent.transfers-201`,
  `agent.transfers-replay-409`, `agent.transfers-badhash-400`,
  `agent.settle-completes`, `audit.actor-agent-recorded` (48 checks total).