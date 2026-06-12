#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  Deploy the Realtime Database security rules to your Firebase project.
#  Requires: firebase-tools (installed on demand) + an authenticated session
#  (`firebase login`, or a CI token in $FIREBASE_TOKEN).
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")/.."

# Load EXPO_PUBLIC_FIREBASE_PROJECT_ID from .env if present.
if [ -f .env ]; then
  # shellcheck disable=SC1091
  set -a; . ./.env; set +a
fi

PROJECT="${EXPO_PUBLIC_FIREBASE_PROJECT_ID:-}"
if [ -z "$PROJECT" ] || [[ "$PROJECT" == your-project ]]; then
  echo "❌ EXPO_PUBLIC_FIREBASE_PROJECT_ID is not set in .env"
  exit 1
fi

FIREBASE_BIN="npx --yes firebase-tools"

echo "🚀 Deploying database.rules.json to project: $PROJECT"
if [ -n "${FIREBASE_TOKEN:-}" ]; then
  $FIREBASE_BIN deploy --only database --project "$PROJECT" --token "$FIREBASE_TOKEN"
else
  $FIREBASE_BIN deploy --only database --project "$PROJECT"
fi
echo "✅ Rules deployed."
