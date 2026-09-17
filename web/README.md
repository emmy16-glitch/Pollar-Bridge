# PollarBridge Web Demo

Mobile-first demo frontend for PollarBridge Africa: **sender → tracker → operator →
Pollar wallet**. Talks to the backend (`http://localhost:4000/api` by default) and to
Pollar testnet via `@pollar/react`. No native code — one responsive codebase for senders,
recipients, operators, and judges (spec §3).

## Setup

```bash
cp .env.example .env   # VITE_API_URL + VITE_POLLAR_PUBLISHABLE_KEY (pub_testnet_… ONLY)
npm install
npm run dev            # :5173 — backend must run on :4000
npm run build          # typecheck + production build
```

> Never put a `sec_…` key in `web/.env` — secrets stay in the backend `.env`.
> Without a publishable key the wallet panel shows a mock banner and the Africa flow
> still works end to end.

## Panels (`src/views/`)

| Panel | File | What it does |
|---|---|---|
| Sender | `Sender.tsx` | Lists enabled corridors, creates transfer (quote + payment instructions) |
| Tracker | `Tracker.tsx` | Polls transfer status every 3s; shows reference, amounts, tx hash, share token, full timeline |
| Operator | `Operator.tsx` | Pending queue → mark detected → verify → settle to Pollar; states the detection≠verification rule |
| Wallet | `WalletPanel.tsx` | `PollarProvider` session: connected address or mock-mode notice |

## API client

`src/api.ts` — typed wrapper over every backend route (corridors, quotes, transfers,
settle, handoff, track, operator, capabilities, health). Base URL from `VITE_API_URL`.

## Demo path

Sender creates → Tracker shows `AWAITING…` → Operator detects → verifies
(`PAYMENT_VERIFIED`) → settles (`COMPLETED` + Pollar tx) → recipient opens the share
token link. Two-minute script: [POLLAR_SETUP.md](../POLLAR_SETUP.md#8-judge-demo-script-2-minutes).
