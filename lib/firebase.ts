import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

/**
 * Firebase Web SDK configuration.
 *
 * Values are injected from `EXPO_PUBLIC_FIREBASE_*` environment variables, which
 * Expo loads automatically from a local `.env` file (and inlines into the
 * bundle at build time). See `.env.example`. If a variable is missing we fall
 * back to an obvious placeholder so the bundle still loads and the app can show
 * a clear "configure Firebase" message instead of hard-crashing.
 *
 * NOTE: the Firebase Web API key is NOT a secret — it is a public client
 * identifier. Real protection comes from the Realtime Database security rules
 * (database.rules.json), which restrict each user's location to linked contacts.
 */
const env = process.env;

const firebaseConfig = {
  apiKey: env.EXPO_PUBLIC_FIREBASE_API_KEY ?? 'REPLACE_WITH_YOUR_API_KEY',
  authDomain:
    env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ??
    'REPLACE_WITH_YOUR_PROJECT.firebaseapp.com',
  databaseURL:
    env.EXPO_PUBLIC_FIREBASE_DATABASE_URL ??
    'https://REPLACE_WITH_YOUR_PROJECT-default-rtdb.firebaseio.com',
  projectId: env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? 'REPLACE_WITH_YOUR_PROJECT',
  storageBucket:
    env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ??
    'REPLACE_WITH_YOUR_PROJECT.firebasestorage.app',
  messagingSenderId:
    env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? 'REPLACE_WITH_YOUR_SENDER_ID',
  appId: env.EXPO_PUBLIC_FIREBASE_APP_ID ?? 'REPLACE_WITH_YOUR_APP_ID',
};

/** True when real Firebase credentials have been provided via env. */
export const isFirebaseConfigured =
  !firebaseConfig.apiKey.startsWith('REPLACE_WITH') &&
  !firebaseConfig.databaseURL.includes('REPLACE_WITH');

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// firebase/auth is intentionally NOT imported here. It is loaded lazily inside
// firebase-auth.ts to avoid module-evaluation crashes on some React Native
// configurations (which can produce a silent white screen).

export const db = getDatabase(app);
export default app;
