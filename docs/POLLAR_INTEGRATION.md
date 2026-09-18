# Pollar integration — what is real, what is sandbox

One page to settle the "is any of this actually Pollar?" question.

## 1. Real (calls Pollar's API)

| Surface | Where | Needs |
|---|---|---|
| Deferred wallet funding — `POST https://server.api.pollar.xyz/v1/wallets/fund` | `src/payments/pollar/pollarService.ts: fundDeferredWallet()` — fires on `PAYMENT_VERIFIED` | `POLLAR_SECRET_KEY` (`sec_testnet_…`) |
| User registration — `POST /v1/users` | `pollarService.ts: registerPollarUser()` via `POST /api/users/register` | `POLLAR_SECRET_KEY` |
| Ramps quotes — `GET /v1/ramps/quote` (Stereum BOB, Etherfuse MXN, Bridge/Pag Pix, Anclap) | `fetchRampsQuoteReal()` via `GET /api/ramps/quote` | `POLLAR_PUBLISHABLE_KEY` + corridors enabled in Dashboard → Integrations → Ramps |
| Yield — `GET /v1/earn/providers`, `/v1/earn/opportunities` (Blend / DeFindex APY) | `fetchEarnOpportunities()` via `GET /api/earn/opportunities` | publishable key + Earn enabled |
| KYC — `GET /v1/kyc/providers`, `/v1/kyc/status` | `fetchKycProviders()` via `GET /api/kyc/providers` | publishable key + KYC providers enabled |
| Browser wallet — `@pollar/react` (`PollarProvider`, `usePollar`, `setTrustline`, `sendPayment`, `openRampModal`) | `web/src/components/PollarWalletCard.tsx` on `/wallet` | `NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY` |

All of the above read keys **lazily** and degrade to a labeled sandbox answer
instead of throwing, so the demo never dies mid-pitch. Check what you are
getting at any time:

```bash
curl -s localhost:4000/api/pollar/status
# {"mode":"mock","env":"testnet","deferredFunding":false,"ramps":"live-quote-or-sandbox", ...}
```

`mode: "real"` means a `pub_…` key is present; `deferredFunding: true` means a
`sec_…` key is present.

## 2. Sandbox by design (and the code says so)

| Thing | Why | Label in responses |
|---|---|---|
| African local rails (bank, mobile money, P2P, agent) | Pollar has no Africa ramp — that is this project's job, sandbox is allowed | adapters are `sandbox/*`, instructions carry "Sandbox" notes |
| BOB payout | Organizer rule: do not build Bolivia; real ramp is Pollar mainnet-side | handoff receipt `bolivia.status: "mocked"`, `BOB-MOCK-*` |
| Agent `paymentHash` check | Sandbox has no chain read | `payment: { verified: "format-only-sandbox", note: "mainnet verifies on Horizon" }` |
| Earn/KYC/ramps when keys are absent | API would 401 without a key | `{ mode: "mock", note: "sandbox fallback — …" }` |
| `/wallet` demo card + faucet | Legacy demo card kept beside the real SDK card | "Sandbox demo" copy |

## 3. Honest limits

- The **unaudited** piece: the SDK is used client-side for wallet actions; the
  server-side REST calls are hand-rolled `fetch` against the documented Server
  API because `createApiClient` is internal to `@pollar/core` (declared but not
  exported). Shape is per docs; no deep imports.
- No key is ever returned by an API. `tests/pollar-surfaces.test.ts` asserts
  that no `pub_…`/`sec_…`/`x-pollar-api-key` string appears in any response.
- Ramp **execution** (`createOnRamp`/`createOffRamp`) is deliberately not called
  — quoting is read-only and safe; executing would move real fiat ramps that the
  African leg is not authorised to drive.

See also: [AGENT_RAIL.md](AGENT_RAIL.md), [../POLLAR_SETUP.md](../POLLAR_SETUP.md),
[../SECURITY.md](../SECURITY.md).