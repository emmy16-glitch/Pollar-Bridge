# Pollar Testnet Setup — LIVE status (2026-09-17)

App: **Pollar-Bridge** (TestNet). Keys wired locally in gitignored `.env` files.

## On-chain facts (Stellar testnet, public)

| What | Address | Status |
|---|---|---|
| App wallet (funding/gas/distribution, GLOBAL) | `GAX6TIASCSIEMKO7NMMX2YAXQE7UCDYEGI7ZNQSTSOLF5LLYP4JG6HAK` | **10,000 XLM** via Friendbot — covers ~5,000+ user wallets |
| Pilot user wallet | `GCREREDMI5J5QXBLSEO4MK2UZL3T7HU7AY5R4E2CORK7X4FWQJXDN466` | Funded (Friendbot) — `POST /v1/wallets/fund` → 409 already funded (correct) |
| Pipeline-proof wallet (pilot-03) | `GDYKVMXYLJNEUSKN2LFUR4IFHX2IVOF7M3FSRK4RMIJLOPFDUESN52J5` | **201 `SERVER_USER_WALLET_CREATED`, funded:true** — sponsored on-chain |
| Trustline-proof wallet (pilot-04) | `GANSKOAVA3UBATAP7MNCWTOYJBK4DYLL3LGW2CNLS2X6JSDJT7FOM3O6` | **USDC trustline present on-chain** — dashboard config confirmed working |

Proven working against `https://server.api.pollar.xyz`:
- `POST /v1/users/with-wallet` → creates user + sponsored wallet (Deferred model)
- `POST /v1/wallets/fund` → our `PAYMENT_VERIFIED` trigger funds the wallet
- `GET /v1/wallets`, `GET /v1/users` → app/user inventory

## Still needed in Dashboard UI (cannot be automated)

1. **Build → Domains**: add `http://localhost:5173` (+ prod URL later) or browser wallet creation is refused.
2. **Treasury → Tokens & Trustlines**: enable **USDC (testnet)** — wallets currently hold only native XLM; without this they cannot receive settlement USDC.

## Judge demo (2 min)

1. Backend `:4000` + web `:5173`. Sender creates `NG-NGN-BANK-BO-USDC` transfer → instructions issued.
2. Operator marks detected → verifies (`PAYMENT_VERIFIED` fires Deferred fund on testnet).
3. Settle → Stellar-style tx hash → handoff receipt shows African rail + Pollar tx + mocked BOB leg.
4. Recipient opens `/track/:token` link. All on testnet; BOB payout mocked per hackathon rules.
