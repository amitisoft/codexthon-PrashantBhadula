#!/bin/zsh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
NODE_BIN_DIR="${NODE_BIN_DIR:-$HOME/.nvm/versions/node/v18.19.1/bin}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
FRONTEND_HOST="${FRONTEND_HOST:-127.0.0.1}"
VITE_API_BASE_URL="${VITE_API_BASE_URL:-http://localhost:8080/api/v1}"

if [ ! -x "$NODE_BIN_DIR/node" ]; then
  echo "Node not found at $NODE_BIN_DIR/node"
  echo "Set NODE_BIN_DIR to your Node 18+ install."
  exit 1
fi

cd "$FRONTEND_DIR"

export PATH="$NODE_BIN_DIR:$PATH"
export VITE_API_BASE_URL

echo "Starting frontend at http://$FRONTEND_HOST:$FRONTEND_PORT"
echo "API base URL: $VITE_API_BASE_URL"

exec npm run dev -- --host "$FRONTEND_HOST" --port "$FRONTEND_PORT"
