#!/usr/bin/env bash
# Full end-to-end verification: every backend endpoint in demo order.
# Fails on the first error. Run from repo root: bash scripts/e2e.sh
set -euo pipefail
PORT="${PORT:-4123}"
export PORT
BASE="http://localhost:${PORT}/api"

pass() { echo "PASS $1"; }
fail() { echo "FAIL $1 -- $2"; exit 1; }
need_ok() { # $1 label $2 json
  echo "$2" | python3 -c "import sys,json; d=json.load(sys.stdin)" || fail "$1" "invalid JSON: $2"
  if echo "$2" | grep -q '"error"'; then fail "$1" "$2"; fi
  pass "$1"
}

node dist/index.js & SRV=$!
trap 'kill $SRV 2>/dev/null || true' EXIT
sleep 2

R=$(curl -s "$BASE/health"); need_ok "health" "$R"
R=$(curl -s "$BASE/countries"); need_ok "countries" "$R"
R=$(curl -s "$BASE/corridors?enabledOnly=true"); need_ok "corridors.enabled" "$R"
R=$(curl -s "$BASE/capabilities"); need_ok "capabilities" "$R"
R=$(curl -s "$BASE/providers"); need_ok "providers" "$R"
R=$(curl -s "$BASE/providers/health"); need_ok "providers.health" "$R"
R=$(curl -s "$BASE/routes/recommend?country=NG&amount=50000"); need_ok "routes.recommend" "$R"
R=$(curl -s -X POST "$BASE/quotes" -H 'Content-Type: application/json' -d '{"corridorId":"NG-NGN-BANK-BO-USDC","sourceAmount":100000}'); need_ok "quotes.create" "$R"

# Create transfer (quote + instructions)
R=$(curl -s -X POST "$BASE/transfers" -H 'Content-Type: application/json' -d '{"corridorId":"NG-NGN-BANK-BO-USDC","sourceAmount":100000}'); need_ok "transfers.create" "$R"
TID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['transferId'])")
PID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['paymentId'])")
TOKEN=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['shareToken'])")
[ -n "$TID" ] && [ -n "$PID" ] && [ -n "$TOKEN" ] || fail "transfers.create" "missing ids"

# Settle must be BLOCKED before verification
if curl -s -X POST "$BASE/transfers/$TID/settle" | grep -q '"error"'; then pass "settle.blocked-before-verify"; else fail "settle.blocked-before-verify" "settle should be refused"; fi

R=$(curl -s "$BASE/transfers/$TID"); need_ok "transfers.get" "$R"
R=$(curl -s "$BASE/operator/pending"); need_ok "operator.pending" "$R"
R=$(curl -s -X POST "$BASE/operator/payments/$PID/detected"); need_ok "operator.detected" "$R"
R=$(curl -s -X POST "$BASE/operator/payments/$PID/verify"); need_ok "operator.verify" "$R"
R=$(curl -s -X POST "$BASE/transfers/$TID/settle"); need_ok "transfers.settle" "$R"
echo "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['status']=='COMPLETED', d; assert len(d.get('pollarTxHash',''))==64, d" || fail "transfers.settle" "not COMPLETED or bad Stellar hash"
pass "settle.completed-stellar-hash"
R=$(curl -s "$BASE/transfers/$TID/handoff"); need_ok "transfers.handoff" "$R"
echo "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['bolivia']['status']=='mocked', d" || fail "transfers.handoff" "BOB must be mocked"
pass "handoff.bob-mocked"
R=$(curl -s "$BASE/track/$TOKEN"); need_ok "track.public" "$R"
R=$(curl -s "$BASE/transfers/$TID/reconciliation"); need_ok "transfers.reconciliation" "$R"
R=$(curl -s "$BASE/operator/audit?limit=5"); need_ok "operator.audit" "$R"

# Refund path on a second transfer
R=$(curl -s -X POST "$BASE/transfers" -H 'Content-Type: application/json' -d '{"corridorId":"NG-NGN-P2P-BO-USDC","sourceAmount":9000}'); need_ok "transfers.create-2" "$R"
T2=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['transferId'])")
P2=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['paymentId'])")
curl -s -X POST "$BASE/operator/payments/$P2/detected" >/dev/null
curl -s -X POST "$BASE/operator/payments/$P2/verify" >/dev/null
R=$(curl -s -X POST "$BASE/operator/payments/$P2/refund" -H 'Content-Type: application/json' -d '{"reason":"e2e test refund"}'); need_ok "operator.refund" "$R"
echo "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['status']=='REFUNDED', d" || fail "operator.refund" "not REFUNDED"
pass "refund.REFUNDED"

# Corridor admin disable/enable round-trip (history preserved)
R=$(curl -s -X PATCH "$BASE/corridors/NG-NGN-P2P-BO-USDC" -H 'Content-Type: application/json' -d '{"enabled":false}'); need_ok "corridors.disable" "$R"
R=$(curl -s -X PATCH "$BASE/corridors/NG-NGN-P2P-BO-USDC" -H 'Content-Type: application/json' -d '{"enabled":true}'); need_ok "corridors.enable" "$R"
R=$(curl -s "$BASE/transfers/$T2"); need_ok "transfers.history-preserved" "$R"

# Webhook skeleton
R=$(curl -s -X POST "$BASE/webhooks/ng-demo-bank" -H 'Content-Type: application/json' -d '{"event":"payment.received"}'); need_ok "webhooks.receive" "$R"

# ---- Pollar surfaces (real when keys are set, labeled sandbox otherwise) ----
R=$(curl -s "$BASE/pollar/status"); need_ok "pollar.status" "$R"
echo "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['mode'] in ('real','mock'), d; assert d['env'] in ('testnet','live'), d" || fail "pollar.status" "bad shape"
pass "pollar.status-shape"
R=$(curl -s "$BASE/ramps/quote?country=BO&amount=100&currency=USDC&direction=offramp"); need_ok "ramps.quote" "$R"
echo "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['mode'] in ('real','mock'), d" || fail "ramps.quote" "missing mode label"
pass "ramps.quote-labeled"
R=$(curl -s "$BASE/earn/opportunities?provider=blend"); need_ok "earn.opportunities" "$R"
R=$(curl -s "$BASE/earn/opportunities?provider=defindex"); need_ok "earn.defindex" "$R"
R=$(curl -s "$BASE/kyc/providers?country=NG"); need_ok "kyc.providers" "$R"
R=$(curl -s -X POST "$BASE/users/register" -H 'Content-Type: application/json' -d '{"externalId":"e2e-check"}'); need_ok "users.register" "$R"

# ---- x402 machine rail: 402 quote -> paid redeem -> 201 transfer ----
CODE=$(curl -s -o /tmp/agent_quote.json -w "%{http_code}" -X POST "$BASE/agent/quote" -H 'Content-Type: application/json' -d '{"corridorId":"NG-NGN-BANK-BO-USDC","sourceAmount":100000}')
[ "$CODE" = "402" ] || fail "agent.quote" "expected HTTP 402, got $CODE"
pass "agent.quote-402"
python3 -c "import json;d=json.load(open('/tmp/agent_quote.json'));assert d['code']=='PAYMENT_REQUIRED',d;assert float(d['priceUsdc'])>0,d;assert d['payTo'],d;assert d['memo'].startswith('PB-AGENT-'),d;assert d['expiresAt'],d" || fail "agent.quote" "bad 402 payload"
pass "agent.quote-payload"
AMEMO=$(python3 -c "import json;print(json.load(open('/tmp/agent_quote.json'))['memo'])")
R=$(curl -s "$BASE/agent/status/$AMEMO"); need_ok "agent.status" "$R"
echo "$R" | python3 -c "import sys,json;d=json.load(sys.stdin);assert d['redeemed'] is False,d" || fail "agent.status" "should start unredeemed"
pass "agent.status-unredeemed"
CODE=$(curl -s -o /tmp/agent_t.json -w "%{http_code}" -X POST "$BASE/agent/transfers" -H 'Content-Type: application/json' -d "{\"memo\":\"$AMEMO\",\"paymentHash\":\"$(python3 -c 'print("ab"*32)')\"}")
[ "$CODE" = "201" ] || fail "agent.transfers" "expected HTTP 201, got $CODE"
pass "agent.transfers-201"
ATID=$(python3 -c "import json;d=json.load(open('/tmp/agent_t.json'));print(d['transferId'])")
python3 -c "import json;d=json.load(open('/tmp/agent_t.json'));assert d['idempotencyKey']=='agent_$AMEMO',d;assert d['payment']['verified']=='format-only-sandbox',d" || fail "agent.transfers" "bad body"
pass "agent.transfers-idempotent-key"
# Same memo twice -> 409 (no double-spend of a paid memo)
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/agent/transfers" -H 'Content-Type: application/json' -d "{\"memo\":\"$AMEMO\",\"paymentHash\":\"$(python3 -c 'print("ab"*32)')\"}")
[ "$CODE" = "409" ] || fail "agent.transfers-replay" "expected 409 on memo replay, got $CODE"
pass "agent.transfers-replay-409"
# Bad hash shape -> 400
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/agent/transfers" -H 'Content-Type: application/json' -d "{\"memo\":\"$AMEMO\",\"paymentHash\":\"not-hex\"}")
[ "$CODE" = "400" ] || fail "agent.transfers-badhash" "expected 400 for non-hex hash, got $CODE"
pass "agent.transfers-badhash-400"
# Agent transfer is a normal transfer: it can be verified + settled like any other
APID=$(curl -s "$BASE/transfers/$ATID" | python3 -c "import sys,json;print(json.load(sys.stdin)['paymentId'])")
curl -s -X POST "$BASE/operator/payments/$APID/detected" >/dev/null
curl -s -X POST "$BASE/operator/payments/$APID/verify" >/dev/null
R=$(curl -s -X POST "$BASE/transfers/$ATID/settle"); need_ok "agent.settle" "$R"
echo "$R" | python3 -c "import sys,json;d=json.load(sys.stdin);assert d['status']=='COMPLETED',d" || fail "agent.settle" "agent transfer did not complete"
pass "agent.settle-completes"
R=$(curl -s "$BASE/operator/audit?limit=50"); need_ok "audit.after-agent" "$R"
echo "$R" | python3 -c "import sys,json;d=json.load(sys.stdin);assert any(l['actor']=='agent' and l['action']=='agent.transfer.create' for l in d), 'no agent audit line'" || fail "audit.after-agent" "agent action not audited"
pass "audit.actor-agent-recorded"

echo "ALL E2E CHECKS PASSED"
