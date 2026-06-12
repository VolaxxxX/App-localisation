import { useCallback, useMemo } from 'react';
import { useAuth } from './auth-context';
import { translate, detectDeviceLanguage, type TranslateKey } from './i18n';
import type { Language } from '@/types';

/**
 * Returns a translation function `t` bound to the user's chosen language
 * (falling back to the device locale), plus the active language code.
 */
export function useT() {
  const { profile } = useAuth();
  const lang: Language = profile?.language ?? detectDeviceLanguage();

  const t = useCallback(
    (key: TranslateKey, vars?: Record<string, string | number>) =>
      translate(lang, key, vars),
    [lang],
  );

  return useMemo(() => ({ t, lang }), [t, lang]);
}
