import { translate, type TranslateKey } from './i18n';
import type { Language } from '@/types';

/** Map a Firebase/auth error code to a friendly localised message. */
export function authErrorMessage(err: any, lang: Language): string {
  const code: string = err?.code ?? '';
  const map: Record<string, TranslateKey> = {
    'auth/invalid-email': 'invalidEmail',
    'auth/weak-password': 'weakPassword',
    'auth/email-already-in-use': 'emailInUse',
    'auth/wrong-password': 'wrongCredentials',
    'auth/user-not-found': 'wrongCredentials',
    'auth/invalid-credential': 'wrongCredentials',
    'auth/network-request-failed': 'networkError',
  };
  const key = map[code];
  if (key) return translate(lang, key);
  if (code === 'db/write-failed') return err?.message ?? translate(lang, 'somethingWrong');
  return err?.message ?? translate(lang, 'somethingWrong');
}
