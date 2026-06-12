import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

/**
 * Firebase Web SDK configuration.
 *
 * Replace these placeholder values with your own project credentials from
 * Firebase Console → Project Settings → "Your apps" → Web app config.
 * See SETUP.md, "Étape 1 — Configurer Firebase".
 *
 * NOTE: These values are NOT secrets — the Firebase Web API key is a public
 * client identifier. Real protection comes from the Realtime Database security
 * rules (see database.rules.json), which restrict who can read each user's
 * location to their explicitly linked contacts only.
 */
const firebaseConfig = {
  apiKey: 'REPLACE_WITH_YOUR_API_KEY',
  authDomain: 'REPLACE_WITH_YOUR_PROJECT.firebaseapp.com',
  databaseURL: 'https://REPLACE_WITH_YOUR_PROJECT-default-rtdb.firebaseio.com',
  projectId: 'REPLACE_WITH_YOUR_PROJECT',
  storageBucket: 'REPLACE_WITH_YOUR_PROJECT.firebasestorage.app',
  messagingSenderId: 'REPLACE_WITH_YOUR_SENDER_ID',
  appId: 'REPLACE_WITH_YOUR_APP_ID',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// firebase/auth is intentionally NOT imported here.
// It is loaded lazily inside AuthProvider (auth-context.tsx) to prevent
// module-level evaluation crashes that can produce a silent white screen on
// some React Native / Expo Go configurations.

export const db = getDatabase(app);
export default app;
