#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  GeoShare — guided setup
#  Prepares the project: installs deps and scaffolds the .env file.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")/.."

echo "📍 GeoShare setup"
echo "──────────────────────────────────────────"

# 1. Dependencies
if [ ! -d node_modules ]; then
  echo "📦 Installing dependencies…"
  npm install
else
  echo "✅ Dependencies already installed."
fi

# 2. .env scaffold
if [ ! -f .env ]; then
  cp .env.example .env
  echo "📝 Created .env from .env.example — fill in your Firebase + Maps values."
else
  echo "✅ .env already exists."
fi

# 3. Sanity checks
echo ""
echo "🔍 Checking configuration…"
if grep -q "EXPO_PUBLIC_FIREBASE_API_KEY=$" .env 2>/dev/null || \
   ! grep -q "EXPO_PUBLIC_FIREBASE_API_KEY=." .env 2>/dev/null; then
  echo "   ⚠️  Firebase API key not set in .env"
else
  echo "   ✅ Firebase API key set"
fi

cat <<'NEXT'

──────────────────────────────────────────
Next steps:
  1. Configure Firebase automatically (one browser login, then it writes .env,
     creates the DB and deploys rules):
        npm run firebase:init
     …then enable Email/Password in the console (one click).
     Or do it manually — see README.md → "Option B".
  2. Start the dev server:                 npx expo start
     The OSM map + foreground location work in Expo Go; background location
     needs a dev build (eas build --profile development).
──────────────────────────────────────────
NEXT
