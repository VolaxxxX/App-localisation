import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  subscribeToConnections,
  subscribeToProfile,
  subscribeToLocation,
  subscribeToPresence,
} from '@/lib/database';
import type { Contact, UserProfile, LocationSample, Presence } from '@/types';

interface ContactState {
  since: number;
  profile: UserProfile | null;
  location: LocationSample | null;
  presence: Presence | null;
  unsubs: Array<() => void>;
}

/**
 * Aggregates the current user's contacts into a live `Contact[]`.
 *
 * It maintains one set of subscriptions (profile + location + presence) per
 * linked uid, adding/removing them as the connection list changes, and emits a
 * fresh sorted array whenever any underlying value updates.
 */
export function useContacts(): { contacts: Contact[]; loading: boolean } {
  const { firebaseUser } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  // uid -> ContactState. Mutated in place; setContacts re-derives the array.
  const statesRef = useRef<Map<string, ContactState>>(new Map());

  useEffect(() => {
    const uid = firebaseUser?.uid;
    if (!uid) {
      setContacts([]);
      setLoading(false);
      return;
    }

    const states = statesRef.current;

    const emit = () => {
      const list: Contact[] = [];
      states.forEach((s) => {
        if (s.profile) {
          list.push({
            profile: s.profile,
            location: s.location,
            presence: s.presence,
            since: s.since,
          });
        }
      });
      list.sort((a, b) => a.profile.displayName.localeCompare(b.profile.displayName));
      setContacts(list);
    };

    const addContact = (cid: string, since: number) => {
      if (states.has(cid)) {
        states.get(cid)!.since = since;
        return;
      }
      const state: ContactState = {
        since,
        profile: null,
        location: null,
        presence: null,
        unsubs: [],
      };
      states.set(cid, state);
      state.unsubs.push(
        subscribeToProfile(cid, (p) => {
          state.profile = p;
          emit();
        }),
        subscribeToLocation(cid, (loc) => {
          state.location = loc;
          emit();
        }),
        subscribeToPresence(cid, (pr) => {
          state.presence = pr;
          emit();
        }),
      );
    };

    const removeContact = (cid: string) => {
      const state = states.get(cid);
      if (!state) return;
      state.unsubs.forEach((u) => u());
      states.delete(cid);
    };

    const connUnsub = subscribeToConnections(
      uid,
      (map) => {
        const next = new Set(Object.keys(map));
        // Remove links that disappeared.
        for (const cid of Array.from(states.keys())) {
          if (!next.has(cid)) removeContact(cid);
        }
        // Add new links.
        for (const cid of next) addContact(cid, map[cid]);
        setLoading(false);
        emit();
      },
      () => setLoading(false),
    );

    return () => {
      connUnsub();
      states.forEach((s) => s.unsubs.forEach((u) => u()));
      states.clear();
    };
  }, [firebaseUser?.uid]);

  return { contacts, loading };
}
