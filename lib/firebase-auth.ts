import app from './firebase';
import type { User as FirebaseUser } from 'firebase/auth';

/**
 * Centralised, idempotent Firebase Auth initialisation.
 *
 * Both the React tree (AuthProvider) and the background location task need an
 * authenticated session so that Realtime Database writes pass the security
 * rules (`auth.uid === $uid`). Initialising auth in two places would throw
 * "auth/already-initialized", so all callers funnel through here.
 *
 * firebase/auth is required lazily (not statically imported) to avoid
 * module-evaluation crashes on some React Native setups.
 */

let _auth: any = null;
let _fa: any = null;
let _readyPromise: Promise<FirebaseUser | null> | null = null;

export function getFirebaseAuth(): { auth: any; fa: any } {
  if (_auth) return { auth: _auth, fa: _fa };

  const fa = require('@firebase/auth');
  // The RN bundle (resolved via metro.config.js conditionNames) calls
  // registerAuth("ReactNative") at module load — no manual call needed.
  const AsyncStorage =
    require('@react-native-async-storage/async-storage').default;

  let auth: any;
  try {
    auth = fa.initializeAuth(app, {
      persistence: fa.getReactNativePersistence(AsyncStorage),
    });
  } catch {
    // Already initialised for this app instance (e.g. fast-refresh, or the
    // background task initialised it first).
    auth = fa.getAuth(app);
  }
  if (!auth) throw new Error('firebase/auth returned null');

  _auth = auth;
  _fa = fa;
  return { auth, fa };
}

/**
 * Resolve once the persisted auth session has been restored (or after a
 * timeout). The background task awaits this before writing locations so the
 * RTDB token is attached.
 */
export function waitForAuthReady(timeoutMs = 8000): Promise<FirebaseUser | null> {
  if (_readyPromise) return _readyPromise;

  _readyPromise = new Promise((resolve) => {
    let settled = false;
    const finish = (user: FirebaseUser | null) => {
      if (settled) return;
      settled = true;
      resolve(user);
    };

    try {
      const { auth, fa } = getFirebaseAuth();
      // currentUser may already be populated synchronously after a hot restart.
      if (auth.currentUser) {
        finish(auth.currentUser);
        return;
      }
      const unsub = fa.onAuthStateChanged(auth, (user: FirebaseUser | null) => {
        unsub();
        finish(user);
      });
      setTimeout(() => finish(auth.currentUser ?? null), timeoutMs);
    } catch {
      finish(null);
    }
  });

  return _readyPromise;
}

export type { FirebaseUser };
