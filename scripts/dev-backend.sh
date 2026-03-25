#!/bin/zsh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
API_DIR="$ROOT_DIR/backend/src/PersonalFinanceTracker.Api"
DOTNET_BIN="${DOTNET_BIN:-$HOME/.dotnet/dotnet}"
API_URL="${API_URL:-http://localhost:8080}"
APP_FRONTEND_BASE_URL="${APP_FRONTEND_BASE_URL:-http://localhost:5173}"

if [ ! -x "$DOTNET_BIN" ]; then
  echo "dotnet not found at $DOTNET_BIN"
  echo "Set DOTNET_BIN or install the .NET 8 SDK."
  exit 1
fi

cd "$API_DIR"

export ASPNETCORE_ENVIRONMENT=Development
export ASPNETCORE_URLS="$API_URL"
export App__FrontendBaseUrl="$APP_FRONTEND_BASE_URL"

echo "Starting backend at $API_URL"
echo "Frontend origin allowed: $APP_FRONTEND_BASE_URL"

exec "$DOTNET_BIN" run --project "$API_DIR"
