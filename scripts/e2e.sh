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

echo "ALL E2E CHECKS PASSED"
