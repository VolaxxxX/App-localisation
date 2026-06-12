import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { FirebaseUser } from './firebase-auth';
import { getFirebaseAuth } from './firebase-auth';
import {
  createUser,
  getUser,
  updateUser,
  subscribeToProfile,
  reserveUniqueCode,
} from './database';
import { setUidFlag } from './location-service';
import { startPresence } from './presence';
import { MARKER_COLORS, AVATAR_EMOJIS } from '@/constants/Colors';
import { detectDeviceLanguage } from './i18n';
import type { UserProfile, Language } from '@/types';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  /** Non-null if firebase/auth failed to initialise entirely. */
  authError: string | null;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>;
  updateLanguage: (lang: Language) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const authRef = useRef<any>(null);
  const faRef = useRef<any>(null);
  const presenceCleanup = useRef<(() => void) | null>(null);

  useEffect(() => {
    let authUnsub: (() => void) | null = null;
    let profileUnsub: (() => void) | null = null;

    try {
      const { auth, fa } = getFirebaseAuth();
      authRef.current = auth;
      faRef.current = fa;

      authUnsub = fa.onAuthStateChanged(auth, (user: FirebaseUser | null) => {
        profileUnsub?.();
        profileUnsub = null;
        presenceCleanup.current?.();
        presenceCleanup.current = null;

        setFirebaseUser(user);

        if (user) {
          // Mirror uid for the background location task.
          setUidFlag(user.uid).catch(() => {});
          // Start realtime presence (online / onDisconnect → offline).
          presenceCleanup.current = startPresence(user.uid);

          let firstFire = true;
          // Safety timeout: a fully offline cold start never fires onValue.
          const offlineTimeout = setTimeout(() => {
            if (firstFire) {
              firstFire = false;
              setLoading(false);
            }
          }, 10_000);

          profileUnsub = subscribeToProfile(
            user.uid,
            (p) => {
              setProfile(p);
              if (firstFire) {
                firstFire = false;
                clearTimeout(offlineTimeout);
                setLoading(false);
              }
            },
            () => {
              if (firstFire) {
                firstFire = false;
                clearTimeout(offlineTimeout);
                setLoading(false);
              }
            },
          );
        } else {
          setProfile(null);
          setUidFlag(null).catch(() => {});
          setLoading(false);
        }
      });
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      console.error('[AuthProvider] init error:', msg);
      setAuthError(msg);
      setLoading(false);
    }

    return () => {
      authUnsub?.();
      profileUnsub?.();
      presenceCleanup.current?.();
    };
  }, []);

  const signUp = async (email: string, password: string, displayName: string) => {
    if (!authRef.current || !faRef.current) {
      const err = new Error('Auth not ready') as any;
      err.code = 'auth/not-ready';
      throw err;
    }

    const { user } = await faRef.current.createUserWithEmailAndPassword(
      authRef.current,
      email.trim(),
      password,
    );

    // Reserve a unique share code, then write the profile. Roll back the auth
    // account if the DB write fails so the user isn't stranded.
    try {
      const shareCode = await reserveUniqueCode(user.uid);
      const newProfile: Omit<UserProfile, 'uid' | 'createdAt'> = {
        displayName: displayName.trim(),
        email: user.email,
        avatar: pick(AVATAR_EMOJIS),
        color: pick(MARKER_COLORS),
        shareCode,
        sharingEnabled: true,
        language: detectDeviceLanguage(),
      };
      await createUser(user.uid, newProfile);
      setProfile({ uid: user.uid, createdAt: Date.now(), ...newProfile });
    } catch (dbErr: any) {
      try {
        await user.delete();
      } catch {
        /* ignore */
      }
      const e = new Error(
        dbErr?.message?.includes('PERMISSION_DENIED')
          ? 'Database write denied. Check Firebase RTDB rules (database.rules.json).'
          : dbErr?.message ?? 'Database write failed',
      ) as any;
      e.code = 'db/write-failed';
      throw e;
    }
  };

  const signIn = async (email: string, password: string) => {
    if (!authRef.current || !faRef.current) {
      const err = new Error('Auth not ready') as any;
      err.code = 'auth/not-ready';
      throw err;
    }
    const { user } = await faRef.current.signInWithEmailAndPassword(
      authRef.current,
      email.trim(),
      password,
    );
    const p = await getUser(user.uid);
    if (p) setProfile(p);
  };

  const signOut = async () => {
    if (!authRef.current || !faRef.current) return;
    presenceCleanup.current?.();
    presenceCleanup.current = null;
    await setUidFlag(null);
    await faRef.current.signOut(authRef.current);
    setProfile(null);
  };

  const updateProfile = async (patch: Partial<UserProfile>) => {
    if (!firebaseUser || !profile) return;
    await updateUser(firebaseUser.uid, patch);
    setProfile({ ...profile, ...patch });
  };

  const updateLanguage = async (lang: Language) => {
    await updateProfile({ language: lang });
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        profile,
        loading,
        authError,
        signUp,
        signIn,
        signOut,
        updateProfile,
        updateLanguage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export type { UserProfile };
