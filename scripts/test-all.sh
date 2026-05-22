#!/usr/bin/env bash
# test-all.sh — build the client, start the server, run all tests, then tear down.
# Usage: ./scripts/test-all.sh [--no-build]

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVER_PORT=3099   # Use a dedicated port so the test run doesn't clash with a running dev server
DATA_DIR="$ROOT/server/data-test"
SERVER_PID=""
PASS=0
FAIL=0

# ── Colours ────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BOLD='\033[1m'; RESET='\033[0m'

ok()   { echo -e "  ${GREEN}✓${RESET}  $*"; }
fail() { echo -e "  ${RED}✗${RESET}  $*"; }
info() { echo -e "  ${YELLOW}→${RESET}  $*"; }
banner() { echo -e "\n${BOLD}$*${RESET}"; }

# ── Cleanup ─────────────────────────────────────────────────────────────────
cleanup() {
  if [[ -n "$SERVER_PID" ]]; then
    info "Stopping server (PID $SERVER_PID)…"
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  rm -rf "$DATA_DIR"
}
trap cleanup EXIT

# ── 1. Build client ─────────────────────────────────────────────────────────
if [[ "${1:-}" != "--no-build" ]]; then
  banner "Step 1 · Build client"
  cd "$ROOT"
  if pnpm --filter client build 2>&1 | tail -5; then
    ok "Client built → server/public"
  else
    fail "Client build failed"; exit 1
  fi
else
  info "Skipping build (--no-build)"
fi

# ── 2. Start server ─────────────────────────────────────────────────────────
banner "Step 2 · Start server on port $SERVER_PORT"
mkdir -p "$DATA_DIR"
PORT=$SERVER_PORT DATA_DIR_OVERRIDE="$DATA_DIR" \
  pnpm --filter server start > /tmp/tsundoku-server.log 2>&1 &
SERVER_PID=$!
info "Server PID: $SERVER_PID  (log: /tmp/tsundoku-server.log)"

# Wait for the health endpoint (up to 15 s)
HEALTH_URL="http://localhost:$SERVER_PORT/health"
MAX_WAIT=15
elapsed=0
until curl -sf "$HEALTH_URL" > /dev/null 2>&1; do
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    fail "Server exited unexpectedly. Log:"
    cat /tmp/tsundoku-server.log
    exit 1
  fi
  if (( elapsed >= MAX_WAIT )); then
    fail "Server did not become healthy within ${MAX_WAIT}s. Log:"
    cat /tmp/tsundoku-server.log
    exit 1
  fi
  sleep 1
  (( elapsed++ ))
done
ok "Server healthy at $HEALTH_URL (after ${elapsed}s)"

# Verify health JSON
HEALTH=$(curl -sf "$HEALTH_URL")
if echo "$HEALTH" | grep -q '"status":"ok"'; then
  ok "Health payload: $HEALTH"
else
  fail "Unexpected health payload: $HEALTH"; exit 1
fi

# ── 3. Client unit tests ─────────────────────────────────────────────────────
banner "Step 3 · Client unit tests (Vitest)"
cd "$ROOT"
if pnpm --filter client test 2>&1; then
  ok "All client tests passed"
  (( PASS++ ))
else
  fail "Client tests failed"
  (( FAIL++ ))
fi

# ── 4. Server unit + sync tests ──────────────────────────────────────────────
banner "Step 4 · Server unit + WebSocket sync tests (Vitest)"
if pnpm --filter server test 2>&1; then
  ok "All server tests passed"
  (( PASS++ ))
else
  fail "Server tests failed"
  (( FAIL++ ))
fi

# ── 5. Live integration checks ───────────────────────────────────────────────
banner "Step 5 · Live integration checks against running server"

# 5a. Static client is served (follow redirects; expect final 200)
HTTP_STATUS=$(curl -sLo /dev/null -w "%{http_code}" "http://localhost:$SERVER_PORT/")
if [[ "$HTTP_STATUS" == "200" ]]; then
  ok "GET /  →  HTTP $HTTP_STATUS  (client served)"
  (( PASS++ ))
else
  fail "GET /  →  HTTP $HTTP_STATUS  (expected 200)"
  (( FAIL++ ))
fi

# 5b. WebSocket connection is accepted (uses Node 22+ built-in WebSocket — no import needed)
if command -v node &>/dev/null; then
  WS_CHECK=$(PORT=$SERVER_PORT node --input-type=module <<'EOF'
const ws = new WebSocket(`ws://localhost:${process.env.PORT}`);
const result = await new Promise((resolve) => {
  const t = setTimeout(() => resolve('timeout'), 3000);
  ws.addEventListener('open',  () => { clearTimeout(t); ws.close(); resolve('ok'); });
  ws.addEventListener('error', (e) => { clearTimeout(t); resolve('error: ' + e.message); });
});
console.log(result);
EOF
  2>/dev/null)
  if [[ "$WS_CHECK" == "ok" ]]; then
    ok "WebSocket handshake succeeded"
    (( PASS++ ))
  else
    fail "WebSocket check: $WS_CHECK"
    (( FAIL++ ))
  fi
else
  info "node not found in PATH — skipping WebSocket live check"
fi

# 5c. Discovery page renders
DISCOVER_STATUS=$(curl -so /dev/null -w "%{http_code}" "http://localhost:$SERVER_PORT/_discover")
if [[ "$DISCOVER_STATUS" == "200" ]]; then
  ok "GET /_discover  →  HTTP $DISCOVER_STATUS"
  (( PASS++ ))
else
  fail "GET /_discover  →  HTTP $DISCOVER_STATUS  (expected 200)"
  (( FAIL++ ))
fi

# ── Summary ──────────────────────────────────────────────────────────────────
banner "Results"
TOTAL=$(( PASS + FAIL ))
if (( FAIL == 0 )); then
  echo -e "\n  ${GREEN}${BOLD}All checks passed${RESET}  (${PASS}/${TOTAL})\n"
  exit 0
else
  echo -e "\n  ${RED}${BOLD}${FAIL} check(s) failed${RESET}  (${PASS}/${TOTAL} passed)\n"
  exit 1
fi
