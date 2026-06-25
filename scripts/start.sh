#!/usr/bin/env bash
# start.sh — build the client and start the Tsundoku server.
# The server serves the built client (server/public) over HTTP and syncs over WS.
# Usage: ./scripts/start.sh [--no-build]
#   --no-build   Skip the client build and start the server with whatever is
#                already in server/public (fails if it has never been built).

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${PORT:-3000}"

# ── Colours ────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BOLD='\033[1m'; RESET='\033[0m'

ok()   { echo -e "  ${GREEN}✓${RESET}  $*"; }
fail() { echo -e "  ${RED}✗${RESET}  $*"; }
info() { echo -e "  ${YELLOW}→${RESET}  $*"; }
banner() { echo -e "\n${BOLD}$*${RESET}"; }

cd "$ROOT"

# ── 1. Build client ─────────────────────────────────────────────────────────
if [[ "${1:-}" == "--no-build" ]]; then
  if [[ ! -f "$ROOT/server/public/index.html" ]]; then
    fail "server/public is empty — run without --no-build to build the client first."
    exit 1
  fi
  info "Skipping build (--no-build); serving existing server/public"
else
  banner "Build client"
  if pnpm --filter client build 2>&1 | tail -5; then
    ok "Client built → server/public"
  else
    fail "Client build failed"; exit 1
  fi
fi

# ── 2. Start server ─────────────────────────────────────────────────────────
banner "Start server on port $PORT"
info "Open http://localhost:$PORT  (LAN URL + QR at http://localhost:$PORT/_discover)"
info "Press Ctrl-C to stop."
exec env PORT="$PORT" pnpm --filter server start
