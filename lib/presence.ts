import { ref, onValue, onDisconnect, set, serverTimestamp } from 'firebase/database';
import { db } from './firebase';

/**
 * Realtime presence using the canonical Firebase `.info/connected` +
 * `onDisconnect` pattern. When the socket drops (app closed, network lost,
 * phone off), the server writes the "offline" record automatically.
 *
 * Returns a cleanup function that detaches listeners and marks the user
 * offline.
 */
export function startPresence(uid: string): () => void {
  const userPresenceRef = ref(db, `presence/${uid}`);
  const connectedRef = ref(db, '.info/connected');

  const unsub = onValue(connectedRef, (snap) => {
    if (snap.val() === false) return;

    // Register the disconnect handler FIRST, then set online — this ordering
    // guarantees the offline write is queued on the server before we go online.
    onDisconnect(userPresenceRef)
      .set({ state: 'offline', lastChanged: serverTimestamp() })
      .then(() => {
        set(userPresenceRef, { state: 'online', lastChanged: serverTimestamp() }).catch(
          () => {},
        );
      })
      .catch(() => {});
  });

  return () => {
    unsub();
    // Best-effort immediate offline on explicit teardown (e.g. sign-out).
    set(userPresenceRef, { state: 'offline', lastChanged: serverTimestamp() }).catch(
      () => {},
    );
  };
}
