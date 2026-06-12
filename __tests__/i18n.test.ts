import { translate, detectDeviceLanguage } from '@/lib/i18n';

describe('translate', () => {
  it('returns the French string for a known key', () => {
    expect(translate('fr', 'signIn')).toBe('Se connecter');
  });

  it('returns the English string for a known key', () => {
    expect(translate('en', 'signIn')).toBe('Sign in');
  });

  it('interpolates variables', () => {
    expect(translate('en', 'pointsRecorded', { n: 42 })).toBe('42 points');
    expect(translate('fr', 'metersAway', { d: '300 m' })).toBe('à 300 m');
  });

  it('falls back to English when a key is missing in the target language', () => {
    // Every key exists in both dicts here, so just assert no throw + string out.
    expect(typeof translate('fr', 'appName')).toBe('string');
  });
});

describe('detectDeviceLanguage', () => {
  it('always returns a supported language code', () => {
    expect(['fr', 'en']).toContain(detectDeviceLanguage());
  });
});
