# Pollar Testnet — Operations Manual

App: **Pollar-Bridge** (TestNet) · Network: Stellar testnet · Status: **LIVE and verified**.
Backend keys live in gitignored `.env` files (never committed, never in `web/`).

---

## Contents

1. [Key management](#1-key-management)
2. [Dashboard checklist walkthrough](#2-dashboard-checklist-walkthrough)
3. [Server API cookbook](#3-server-api-cookbook)
4. [On-chain inventory](#4-on-chain-inventory)
5. [How Deferred funding maps to our flow](#5-how-deferred-funding-maps-to-our-flow)
6. [Troubleshooting](#6-troubleshooting)
7. [Costs on testnet](#7-costs-on-testnet)
8. [Judge demo script (2 minutes)](#8-judge-demo-script-2-minutes)

---

## 1. Key management

Pollar issues two key types per environment. They are **not interchangeable**:

| Key | Prefix | Lives in | Powers | Rule |
|---|---|---|---|---|
| Publishable | `pub_testnet_…` | `web/.env` (+ backend `.env` for mode detection) | Browser SDK: login, wallet, sponsored USDC sends, history | Safe to expose; bakes into the JS bundle |
| Secret | `sec_testnet_…` | backend `.env` **only** | Privileged calls: user/wallet creation, Deferred funding, token verify | Shown **once** at creation — rotate immediately if leaked |

Get/rotate both at https://dashboard.pollar.xyz → **Build → API Keys → Generate**
(select type + Testnet). Testnet keys allow ~1,000 requests/day — plenty for the demo.

> Mainnet later uses `pub_mainnet_`/`sec_mainnet_` with the same split. Never mix
> environments (testnet keys on mainnet fail closed).

---

## 2. Dashboard checklist walkthrough

The dashboard's *Get started* tracker has 5 steps. Each is explained below with exactly
where to click and how to confirm it worked.

### Step 1 — Configure API keys (Required)

**Where:** Build → API Keys → Generate → Publishable/Testnet, then again for Secret/Testnet.

**Wire them:**

```bash
# repo root .env (backend)
POLLAR_PUBLISHABLE_KEY=pub_testnet_…
POLLAR_SECRET_KEY=sec_testnet_…

# web/.env (frontend — publishable ONLY)
VITE_POLLAR_PUBLISHABLE_KEY=pub_testnet_…
```

**Confirm:** backend logs `pollarMode: real`. Verify without printing secrets:

```bash
set -a; source .env; set +a
node -e "import('./dist/payments/pollar/pollarService.js').then(m => console.log(m.pollarMode(), m.pollarEnv()))"
# → real testnet
```

### Step 2 — Configure allowed domains (Required)

**Where:** Build → Domains → add each origin exactly (scheme + host + port):

- `http://localhost:5173` — local demo
- production URL later (e.g. `https://pollar-bridge.vercel.app`)

**Why:** origins protect against CSRF/unauthorized SDK calls — the SDK refuses wallet
operations from unlisted domains. If browser wallet creation fails with a domain error,
this list is the first place to look.

### Step 3 — Fund app wallet (Required)

**Where:** Treasury → Account Funding shows the funding wallet (`GAX6…6HAK`).
Top it up with free testnet XLM from Friendbot (no dashboard payment needed):

```bash
curl -s "https://friendbot.stellar.org/?addr=GAX6TIASCSIEMKO7NMMX2YAXQE7UCDYEGI7ZNQSTSOLF5LLYP4JG6HAK"
```

**Why:** every user wallet locks ~1–1.5 XLM of sponsored reserve. Ours holds **10,000 XLM**,
covering ~5,000+ demo wallets. Symptom of an empty wallet: `WALLET_CREATION_FAILED` (502)
on user creation — exactly what we hit and fixed during setup.

### Step 4 — Enable trustlines (Recommended, effectively required for us)

**Where:** Treasury → Tokens & Trustlines → enable **USDC (testnet)**.

**Why:** Stellar accounts must opt in per asset. Our settlement asset is USDC, so wallets
need the USDC line or they cannot receive it. Proof it works: pilot-04's account on Horizon
carries `credit_alphanum4/USDC`. Applied automatically at wallet creation once enabled —
no code changes needed.

### Step 5 — Create first user wallet via SDK (Verification)

**Where:** run both servers, open the frontend, log in:

```bash
# terminal 1 — backend
npm run dev        # :4000
# terminal 2 — frontend
cd web && npm run dev   # :5173
```

Open `http://localhost:5173` → wallet panel → Pollar login (Google/GitHub) → first login
mints the wallet, funded from the app wallet. The dashboard ticks this off automatically.
Server-side equivalent (used during setup): `POST /v1/users/with-wallet` (§3).

---

## 3. Server API cookbook

Base: `https://server.api.pollar.xyz`, header `x-pollar-api-key: $POLLAR_SECRET_KEY`
(secret from backend `.env` — the examples below read it from the environment so it never
appears in shell history; all responses use the `{ content, code, success }` envelope).

```bash
set -a; source .env; set +a
H=( -H "x-pollar-api-key: $POLLAR_SECRET_KEY" -H 'Content-Type: application/json' )
SRV=https://server.api.pollar.xyz

# Register a user AND provision their Stellar wallet (Deferred: address now, reserve on fund)
curl -s -X POST $SRV/v1/users/with-wallet "${H[@]}" \
  -d '{"externalId":"pilot-04","email":"pilot@example.com"}'
# → 201 SERVER_USER_WALLET_CREATED { userId, externalId, walletAddress, funded }

# Fund/activate a wallet — this is what our backend fires on PAYMENT_VERIFIED
curl -s -X POST $SRV/v1/wallets/fund "${H[@]}" -d '{"publicKey":"G…"}'
# → 200 SERVER_WALLET_FUNDED | 409 WALLET_ALREADY_FUNDED (safe) | 502 FUND_XLM_FAILED (top up app wallet)

# Inventory
curl -s $SRV/v1/wallets "${H[@]}"   # app wallets (funding/gas) + sdk wallets
curl -s $SRV/v1/users "${H[@]}"     # registered users + wallet links

# Verify an SDK access token from your backend (never trust client claims blindly)
curl -s -X POST $SRV/v1/tokens/verify "${H[@]}" -d '{"token":"<sdk access token>"}'
# → SERVER_TOKEN_VERIFIED { userId, applicationId, network, wallet, … }
```

Inspect any address publicly (no key): `https://horizon-testnet.stellar.org/accounts/G…`
or paste it into https://stellar.expert/explorer/testnet.

---

## 4. On-chain inventory

All Stellar testnet, all public:

| What | Address | Status |
|---|---|---|
| App wallet (funding/gas/distribution, GLOBAL role) | `GAX6TIASCSIEMKO7NMMX2YAXQE7UCDYEGI7ZNQSTSOLF5LLYP4JG6HAK` | **10,000 XLM** via Friendbot |
| Pilot wallet (pilot-01) | `GCREREDMI5J5QXBLSEO4MK2UZL3T7HU7AY5R4E2CORK7X4FWQJXDN466` | Funded; `/fund` → 409 already-funded (correct) |
| Pipeline proof (pilot-03) | `GDYKVMXYLJNEUSKN2LFUR4IFHX2IVOF7M3FSRK4RMIJLOPFDUESN52J5` | 201 created, `funded:true`, sponsored on-chain |
| Trustline proof (pilot-04) | `GANSKOAVA3UBATAP7MNCWTOYJBK4DYLL3LGW2CNLS2X6JSDJT7FOM3O6` | **USDC trustline on-chain** — dashboard config proven |
| Final check wallet | `GCXVO6J4M472MYRXKEEXUCWUOIKUC7XWDTBWB6WFESGRD5Y2NHWVNXHT` | 201 created, `funded:true`, USDC line present |

---

## 5. How Deferred funding maps to our flow

Pollar's Deferred mode exists so reserves are locked only for users that matter. Our
transfer lifecycle maps onto it 1:1:

```
Our backend                       Pollar testnet
PAYMENT_DETECTED ──► UNDER_REVIEW   (African rail confirms; nothing released)
PAYMENT_VERIFIED  ──► POST /v1/wallets/fund   (operator/bank proof = KYC-equivalent trigger)
USDC_SETTLED_TO_POLLAR ──► sponsored USDC movement (frontend @pollar/react runTx)
COMPLETED         ──► handoff receipt (tx hash + mocked BOB leg)
```

`fundDeferredWallet()` in `src/payments/pollar/pollarService.ts` performs the middle step
server-side with the secret key; without keys it degrades to labeled mocks so demos never break.

---

## 6. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `WALLET_CREATION_FAILED` (502) on user creation | App wallet empty | Friendbot-top-up (§2 step 3) |
| `FUND_XLM_FAILED` (502) on `/fund` | Same — no reserve to sponsor | Same fix, then retry |
| `WALLET_ALREADY_FUNDED` (409) | Wallet already active | Safe to ignore (idempotent) |
| `WALLET_NOT_FOUND` (404) | Address belongs to another app / typo | Check `GET /v1/users`; retype address |
| Browser wallet creation refused | Domain not allowlisted | Add origin in Build → Domains (§2 step 2) |
| Wallet can't receive USDC | Missing trustline | Enable USDC in Tokens & Trustlines (§2 step 4) |
| `SDK_AUTH_TOKEN_EXPIRED` (401) | Stale session | Re-login, re-verify via `/tokens/verify` |
| Rate-limit (1,000 req/day testnet) | Heavy testing | Wait for UTC reset or request an increase |

---

## 7. Costs on testnet

Testnet XLM is free (Friendbot) but the mainnet math matters for the pitch:

- Reserve per wallet with USDC trustline: ~1.5 XLM (locked in funding wallet, sponsored via CAP-33 — not spent).
- Deferred mode locks reserves only for verified users; our flow funds exactly at
  `PAYMENT_VERIFIED`, so abandoned quotes cost nothing.
- Starting balance (optional top-up per wallet) is set in Treasury → Account Funding; ours is `0`.

---

## 8. Judge demo script (2 minutes)

1. **Sender (30s):** `web` → pick `NG-NGN-BANK-BO-USDC`, amount 100,000 → payment instructions with reference appear.
2. **Operator (45s):** pending queue → mark detected → verify. State the rule: *detection is not verification; settlement was blocked until now.*
3. **Pollar leg (30s):** settle → Stellar tx hash → handoff receipt: African rail proof + Pollar tx + explicitly mocked BOB leg.
4. **Recipient (15s):** open `/track/:token` — live timeline, no login.
5. Close: everything testnet, BOB mocked because the real ramp is Pollar mainnet-side.
