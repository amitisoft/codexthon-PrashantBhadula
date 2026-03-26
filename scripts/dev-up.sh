#!/bin/zsh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
FRONTEND_HOST="${FRONTEND_HOST:-127.0.0.1}"
API_URL="${API_URL:-http://localhost:8080}"

echo "Starting local stack for Fitra"
echo "Frontend: http://$FRONTEND_HOST:$FRONTEND_PORT"
echo "Backend:  $API_URL"
echo
echo "Run these in separate terminals if you want to keep logs split:"
echo "  $ROOT_DIR/scripts/dev-backend.sh"
echo "  $ROOT_DIR/scripts/dev-frontend.sh"
