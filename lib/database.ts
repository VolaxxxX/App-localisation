import {
  ref,
  get,
  set,
  update,
  push,
  onValue,
  query,
  orderByKey,
  limitToLast,
  serverTimestamp,
  type DatabaseReference,
} from 'firebase/database';
import { db } from './firebase';
import type {
  UserProfile,
  LocationSample,
  Presence,
  HistoryPoint,
} from '@/types';

/* -------------------------------------------------------------------------- */
/*  Codes                                                                      */
/* -------------------------------------------------------------------------- */

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I,O,0,1 ambiguity

/** Generate a random 6-character share code (client side). */
export function generateShareCode(): string {
  return Array.from(
    { length: 6 },
    () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)],
  ).join('');
}

/**
 * Reserve a code → uid mapping, retrying with fresh codes on collision.
 * Returns the code that was successfully reserved.
 */
export async function reserveUniqueCode(uid: string): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateShareCode();
    const snap = await get(ref(db, `codes/${code}`));
    if (!snap.exists()) {
      await set(ref(db, `codes/${code}`), uid);
      return code;
    }
  }
  // Extremely unlikely; fall back to an 8-char code.
  const code = generateShareCode() + generateShareCode().slice(0, 2);
  await set(ref(db, `codes/${code}`), uid);
  return code;
}

/** Resolve a share code to the owning uid, or null if it does not exist. */
export async function resolveCode(code: string): Promise<string | null> {
  const snap = await get(ref(db, `codes/${code.toUpperCase().trim()}`));
  return snap.exists() ? (snap.val() as string) : null;
}

/**
 * Rotate a user's share code: invalidate the old mapping, reserve a fresh one,
 * and update the profile. Existing contacts are unaffected (links are stored
 * separately under `connections`). Returns the new code.
 */
export async function regenerateShareCode(
  uid: string,
  oldCode: string,
): Promise<string> {
  const newCode = await reserveUniqueCode(uid);
  await update(ref(db), {
    [`codes/${oldCode}`]: null,
    [`users/${uid}/shareCode`]: newCode,
  });
  return newCode;
}

/* -------------------------------------------------------------------------- */
/*  Users                                                                      */
/* -------------------------------------------------------------------------- */

export async function createUser(
  uid: string,
  profile: Omit<UserProfile, 'uid' | 'createdAt'>,
): Promise<void> {
  await set(ref(db, `users/${uid}`), {
    ...profile,
    createdAt: Date.now(),
  });
}

export async function getUser(uid: string): Promise<UserProfile | null> {
  const snap = await get(ref(db, `users/${uid}`));
  if (!snap.exists()) return null;
  return { uid, ...snap.val() } as UserProfile;
}

export async function updateUser(
  uid: string,
  patch: Partial<UserProfile>,
): Promise<void> {
  await update(ref(db, `users/${uid}`), patch);
}

/** Subscribe to a user profile. Returns an unsubscribe function. */
export function subscribeToProfile(
  uid: string,
  onData: (profile: UserProfile | null) => void,
  onError?: (err: Error) => void,
): () => void {
  const r = ref(db, `users/${uid}`);
  return onValue(
    r,
    (snap) => onData(snap.exists() ? ({ uid, ...snap.val() } as UserProfile) : null),
    (err) => onError?.(err),
  );
}

/* -------------------------------------------------------------------------- */
/*  Connections (mutual links)                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Link two users mutually. Both `connections/$a/$b` and `connections/$b/$a`
 * are written so each side can read the other's location (security rules
 * require a reciprocal edge to exist).
 */
export async function linkUsers(a: string, b: string): Promise<void> {
  if (a === b) throw new Error('cannot-link-self');
  const since = Date.now();
  await update(ref(db), {
    [`connections/${a}/${b}`]: { since },
    [`connections/${b}/${a}`]: { since },
  });
}

/**
 * Join another user by their share code. Validates the code, prevents
 * self-linking and re-linking, then creates the mutual connection.
 * Throws an Error whose `code` is one of:
 *   'code-not-found' | 'cannot-link-self' | 'already-linked'
 * Returns the linked uid on success.
 */
export async function joinByCode(myUid: string, rawCode: string): Promise<string> {
  const targetUid = await resolveCode(rawCode);
  if (!targetUid) {
    const e = new Error('code-not-found') as any;
    e.code = 'code-not-found';
    throw e;
  }
  if (targetUid === myUid) {
    const e = new Error('cannot-link-self') as any;
    e.code = 'cannot-link-self';
    throw e;
  }
  const existing = await get(ref(db, `connections/${myUid}/${targetUid}`));
  if (existing.exists()) {
    const e = new Error('already-linked') as any;
    e.code = 'already-linked';
    throw e;
  }
  await linkUsers(myUid, targetUid);
  return targetUid;
}

/** Remove a mutual link (and stop sharing in both directions). */
export async function unlinkUsers(a: string, b: string): Promise<void> {
  await update(ref(db), {
    [`connections/${a}/${b}`]: null,
    [`connections/${b}/${a}`]: null,
  });
}

/**
 * Subscribe to the list of contact uids (with their link timestamps) for a
 * user. Returns an unsubscribe function.
 */
export function subscribeToConnections(
  uid: string,
  onData: (contacts: Record<string, number>) => void,
  onError?: (err: Error) => void,
): () => void {
  const r = ref(db, `connections/${uid}`);
  return onValue(
    r,
    (snap) => {
      const out: Record<string, number> = {};
      snap.forEach((child) => {
        const v = child.val();
        // Supports both the legacy boolean form and the { since } object form.
        out[child.key as string] =
          typeof v === 'object' && v?.since ? v.since : Date.now();
      });
      onData(out);
    },
    (err) => onError?.(err),
  );
}

/** One-shot read of a user's linked contact uids. */
export async function getConnectionUids(uid: string): Promise<string[]> {
  const snap = await get(ref(db, `connections/${uid}`));
  const out: string[] = [];
  snap.forEach((child) => {
    if (child.key) out.push(child.key);
  });
  return out;
}

/* -------------------------------------------------------------------------- */
/*  Locations                                                                  */
/* -------------------------------------------------------------------------- */

/** Write the current location sample for a user. */
export async function writeLocation(
  uid: string,
  sample: LocationSample,
): Promise<void> {
  await set(ref(db, `locations/${uid}`), sample);
}

/** Subscribe to a single contact's live location. */
export function subscribeToLocation(
  uid: string,
  onData: (loc: LocationSample | null) => void,
  onError?: (err: Error) => void,
): () => void {
  const r = ref(db, `locations/${uid}`);
  return onValue(
    r,
    (snap) => onData(snap.exists() ? (snap.val() as LocationSample) : null),
    (err) => onError?.(err),
  );
}

/* -------------------------------------------------------------------------- */
/*  History (breadcrumb trail)                                                 */
/* -------------------------------------------------------------------------- */

/** Append a breadcrumb to a user's history (chronological push keys). */
export async function appendHistory(
  uid: string,
  point: HistoryPoint,
): Promise<void> {
  await push(ref(db, `history/${uid}`), point);
}

/**
 * Subscribe to the most recent `limit` history points for a user, ordered
 * oldest → newest. Returns an unsubscribe function.
 */
export function subscribeToHistory(
  uid: string,
  limit: number,
  onData: (points: HistoryPoint[]) => void,
  onError?: (err: Error) => void,
): () => void {
  const q = query(ref(db, `history/${uid}`), orderByKey(), limitToLast(limit));
  return onValue(
    q,
    (snap) => {
      const out: HistoryPoint[] = [];
      snap.forEach((child) => {
        const v = child.val();
        if (v && typeof v.lat === 'number' && typeof v.lng === 'number') {
          out.push({ lat: v.lat, lng: v.lng, t: v.t ?? 0 });
        }
      });
      onData(out);
    },
    (err) => onError?.(err),
  );
}

/* -------------------------------------------------------------------------- */
/*  Account deletion                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Erase all Realtime Database data owned by a user: profile, share code, live
 * location, presence, history, and every mutual connection edge. Done as a
 * single atomic multi-path update.
 */
export async function deleteUserData(
  uid: string,
  shareCode: string | undefined,
  contactUids: string[],
): Promise<void> {
  const updates: Record<string, null> = {
    [`users/${uid}`]: null,
    [`locations/${uid}`]: null,
    [`presence/${uid}`]: null,
    [`history/${uid}`]: null,
    [`connections/${uid}`]: null,
  };
  if (shareCode) updates[`codes/${shareCode}`] = null;
  for (const cid of contactUids) {
    updates[`connections/${cid}/${uid}`] = null;
  }
  await update(ref(db), updates);
}

/* -------------------------------------------------------------------------- */
/*  Presence                                                                   */
/* -------------------------------------------------------------------------- */

export function subscribeToPresence(
  uid: string,
  onData: (presence: Presence | null) => void,
  onError?: (err: Error) => void,
): () => void {
  const r = ref(db, `presence/${uid}`);
  return onValue(
    r,
    (snap) => onData(snap.exists() ? (snap.val() as Presence) : null),
    (err) => onError?.(err),
  );
}

/** Helper used by the presence manager to mark a user offline immediately. */
export async function setPresence(
  uid: string,
  state: Presence['state'],
): Promise<void> {
  await set(ref(db, `presence/${uid}`), {
    state,
    lastChanged: Date.now(),
  });
}

export { serverTimestamp, ref, db };
export type { DatabaseReference };
