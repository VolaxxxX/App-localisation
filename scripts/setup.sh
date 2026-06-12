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
  1. Edit .env with your Firebase Web config (Firebase Console → Project
     Settings → Your apps → Web) and your Google Maps Android API key.
  2. Deploy the database security rules:  npm run deploy:rules
  3. Start the dev server:                 npx expo start
     (Maps & background location require a dev build, not Expo Go:
      eas build --profile development)
──────────────────────────────────────────
NEXT
