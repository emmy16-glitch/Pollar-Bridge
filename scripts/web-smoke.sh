#!/usr/bin/env bash
# Portal smoke test: every page renders + every proxy path reaches the backend.
# Catches the "proxy strips a path segment" class of bug (e.g. /api/pollar/status
# mapping to /api/status) without a browser.
#
# Usage:
#   bash scripts/web-smoke.sh                 # expects :3000 web, :4000 backend
#   WEB=http://localhost:3000 bash scripts/web-smoke.sh
set -euo pipefail

WEB="${WEB:-http://localhost:3000}"
BACKEND="${BACKEND:-http://localhost:4000/api}"

pass() { echo "PASS $1"; }
fail() { echo "FAIL $1 -- $2"; exit 1; }

code_of() { curl -s -o /dev/null -w "%{http_code}" "$1"; }

# --- backend must be up (proxies are useless without it) ---
curl -sf "$BACKEND/health" >/dev/null || fail "backend" "$BACKEND/health unreachable"
pass "backend.health"

# --- pages render ---
for p in / /send /track /wallet /earn /kyc /agent \
         /operator /operator/queue /operator/corridors /operator/providers \
         /operator/reconciliation /operator/audit; do
  c=$(code_of "$WEB$p")
  [ "$c" = "200" ] || fail "page$p" "expected 200, got $c"
  pass "page$p"
done

# --- proxies: each must return JSON with the shape the UI reads ---
probe() { # $1 label $2 path $3 jq-less python assertion
  local body
  body=$(curl -s "$WEB$2") || fail "$1" "request failed"
  echo "$body" | python3 -c "import sys,json;d=json.load(sys.stdin);$3" \
    || fail "$1" "unexpected body: ${body:0:160}"
  pass "$1"
}

probe "proxy.corridors"        "/api/corridors"        "assert isinstance(d.get('corridors'),list), d"
probe "proxy.providers"        "/api/providers"        "assert isinstance(d.get('providers'),list), d"
probe "proxy.transfers"        "/api/transfers"        "assert isinstance(d.get('transfers'),list), d"
probe "proxy.audit"            "/api/audit"            "assert isinstance(d.get('logs'),list), d"
probe "proxy.reconciliation"   "/api/reconciliation"   "assert d.get('success') is True, d"
probe "proxy.wallet"           "/api/wallet"           "assert d.get('success') is True, d"
probe "proxy.earn.opportunities" "/api/earn/opportunities?provider=blend" \
                               "assert d.get('mode') in ('real','mock'), d; assert isinstance(d.get('opportunities'),list), d"
probe "proxy.kyc.providers"    "/api/kyc/providers?country=NG" \
                               "assert d.get('mode') in ('real','mock'), d; assert isinstance(d.get('providers'),list), d"
probe "proxy.pollar.status"    "/api/pollar/status" \
                               "assert d.get('mode') in ('real','mock'), d; assert 'env' in d, d"
probe "proxy.pollar.ramps.quote" "/api/pollar/ramps/quote?country=BO&amount=100&currency=USDC&direction=offramp" \
                               "assert d.get('mode') in ('real','mock'), d; assert d.get('quotes') or d.get('quote'), d"

# --- x402 machine rail through the portal: status codes must survive proxying ---
c=$(curl -s -o /tmp/smoke_quote.json -w "%{http_code}" -X POST "$WEB/api/agent/quote" \
      -H 'Content-Type: application/json' \
      -d '{"corridorId":"NG-NGN-BANK-BO-USDC","sourceAmount":100000}')
[ "$c" = "402" ] || fail "proxy.agent.quote" "expected 402 through the proxy, got $c"
pass "proxy.agent.quote-402"

memo=$(python3 -c "import json;print(json.load(open('/tmp/smoke_quote.json'))['memo'])")
c=$(curl -s -o /tmp/smoke_transfer.json -w "%{http_code}" -X POST "$WEB/api/agent/transfers" \
      -H 'Content-Type: application/json' \
      -d "{\"memo\":\"$memo\",\"paymentHash\":\"$(python3 -c 'print("ab"*32)')\"}")
[ "$c" = "201" ] || fail "proxy.agent.transfers" "expected 201 through the proxy, got $c"
pass "proxy.agent.transfers-201"

# replaying the same memo must still be refused through the proxy
c=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$WEB/api/agent/transfers" \
      -H 'Content-Type: application/json' \
      -d "{\"memo\":\"$memo\",\"paymentHash\":\"$(python3 -c 'print("ab"*32)')\"}")
[ "$c" = "409" ] || fail "proxy.agent.transfers-replay" "expected 409, got $c"
pass "proxy.agent.transfers-replay-409"

echo "ALL WEB SMOKE CHECKS PASSED"