import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import type { ExpoConfig, ConfigContext } from 'expo/config';

/**
 * Dynamic Expo configuration.
 *
 * All deployment-specific secrets are injected from environment variables
 * (loaded automatically by Expo from a local `.env` file, or from EAS secrets
 * in CI). See `.env.example` for the full list. This keeps real credentials out
 * of source control — only one place to configure.
 */

const EAS_PROJECT_ID =
  process.env.EAS_PROJECT_ID ?? '00000000-0000-0000-0000-000000000000';

/**
 * Only attach google-services.json when it has been filled with real values.
 * A placeholder file would embed bogus FCM config; omitting it lets the project
 * build cleanly before Firebase Android push is configured.
 */
function googleServicesFile(): string | undefined {
  const path = join(__dirname, 'google-services.json');
  if (!existsSync(path)) return undefined;
  try {
    const raw = readFileSync(path, 'utf8');
    return raw.includes('REPLACE_WITH') ? undefined : './google-services.json';
  } catch {
    return undefined;
  }
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'GeoShare',
  slug: 'geoshare',
  owner: 'volaxxxx',
  version: '1.0.0',
  orientation: 'portrait',
  scheme: 'geoshare',
  userInterfaceStyle: 'automatic',
  platforms: ['ios', 'android'],
  newArchEnabled: true,
  icon: './assets/icon.png',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#0B1221',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.geoshare.app',
    config: { usesNonExemptEncryption: false },
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'GeoShare utilise ta position pour la partager en temps réel avec tes contacts liés.',
      NSLocationAlwaysAndWhenInUseUsageDescription:
        "GeoShare partage ta position avec tes contacts liés même lorsque l'application est en arrière-plan ou le téléphone verrouillé.",
      NSLocationAlwaysUsageDescription:
        'GeoShare partage ta position avec tes contacts liés même en arrière-plan.',
      UIBackgroundModes: ['location', 'fetch'],
    },
  },
  android: {
    package: 'com.geoshare.app',
    googleServicesFile: googleServicesFile(),
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#2563EB',
    },
    edgeToEdgeEnabled: true,
    permissions: [
      'ACCESS_FINE_LOCATION',
      'ACCESS_COARSE_LOCATION',
      'ACCESS_BACKGROUND_LOCATION',
      'FOREGROUND_SERVICE',
      'FOREGROUND_SERVICE_LOCATION',
      'VIBRATE',
      'RECEIVE_BOOT_COMPLETED',
      'POST_NOTIFICATIONS',
      'WAKE_LOCK',
    ],
  },
  plugins: [
    'expo-router',
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          'GeoShare partage ta position avec tes contacts liés même en arrière-plan.',
        locationWhenInUsePermission:
          'GeoShare utilise ta position pour la partager en temps réel avec tes contacts liés.',
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
      },
    ],
    ['expo-notifications', { color: '#2563EB' }],
    'expo-asset',
  ],
  updates: {
    checkAutomatically: 'ON_LOAD',
    fallbackToCacheTimeout: 3000,
  },
  extra: {
    eas: { projectId: EAS_PROJECT_ID },
    // Firebase Web config is read at runtime from EXPO_PUBLIC_* env vars
    // (see lib/firebase.ts) — nothing secret needs to live here.
  },
  runtimeVersion: { policy: 'sdkVersion' },
  experiments: { typedRoutes: true },
});
