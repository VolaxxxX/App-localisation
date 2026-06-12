import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  BACKGROUND_LOCATION_TASK,
  STORAGE_KEYS,
  LOCATION_TUNING,
} from './constants';

export type PermissionLevel = 'denied' | 'foreground' | 'background';

/* -------------------------------------------------------------------------- */
/*  Persisted flags (mirrored for the background task)                         */
/* -------------------------------------------------------------------------- */

export async function setUidFlag(uid: string | null): Promise<void> {
  if (uid) await AsyncStorage.setItem(STORAGE_KEYS.uid, uid);
  else await AsyncStorage.removeItem(STORAGE_KEYS.uid);
}

export async function setSharingFlag(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.sharing, enabled ? '1' : '0');
}

export async function getSharingFlag(): Promise<boolean> {
  const v = await AsyncStorage.getItem(STORAGE_KEYS.sharing);
  return v !== '0'; // default ON
}

export async function setBackgroundFlag(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.background, enabled ? '1' : '0');
}

export async function getBackgroundFlag(): Promise<boolean> {
  const v = await AsyncStorage.getItem(STORAGE_KEYS.background);
  return v !== '0'; // default ON
}

/* -------------------------------------------------------------------------- */
/*  Permissions & services                                                     */
/* -------------------------------------------------------------------------- */

/** Whether device location services (GPS) are switched on. */
export async function isLocationEnabled(): Promise<boolean> {
  try {
    return await Location.hasServicesEnabledAsync();
  } catch {
    return false;
  }
}

/** Request foreground permission. Returns the granted level. */
export async function requestForegroundPermission(): Promise<PermissionLevel> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted' ? 'foreground' : 'denied';
}

/**
 * Request background ("always") permission. On both platforms this should be
 * called only AFTER foreground permission is granted.
 */
export async function requestBackgroundPermission(): Promise<boolean> {
  try {
    const { status } = await Location.requestBackgroundPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

/** Current granted level without prompting. */
export async function getPermissionLevel(): Promise<PermissionLevel> {
  const fg = await Location.getForegroundPermissionsAsync();
  if (fg.status !== 'granted') return 'denied';
  const bg = await Location.getBackgroundPermissionsAsync();
  return bg.status === 'granted' ? 'background' : 'foreground';
}

/* -------------------------------------------------------------------------- */
/*  Foreground watcher                                                         */
/* -------------------------------------------------------------------------- */

let foregroundSub: Location.LocationSubscription | null = null;

/**
 * Start a high-accuracy foreground watcher. Calls `onSample` for every update.
 * Returns true if started. Stops any previous watcher first.
 */
export async function startForegroundWatch(
  onSample: (loc: Location.LocationObject) => void,
  onError?: (e: Error) => void,
): Promise<boolean> {
  await stopForegroundWatch();
  try {
    foregroundSub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: LOCATION_TUNING.foregroundIntervalMs,
        distanceInterval: LOCATION_TUNING.foregroundDistanceM,
        mayShowUserSettingsDialog: true,
      },
      onSample,
    );
    return true;
  } catch (e) {
    onError?.(e as Error);
    return false;
  }
}

export async function stopForegroundWatch(): Promise<void> {
  if (foregroundSub) {
    foregroundSub.remove();
    foregroundSub = null;
  }
}

/** One-shot high-accuracy fix (used to centre the map on first load). */
export async function getCurrentPosition(): Promise<Location.LocationObject | null> {
  try {
    return await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Highest,
    });
  } catch {
    try {
      return await Location.getLastKnownPositionAsync();
    } catch {
      return null;
    }
  }
}

/* -------------------------------------------------------------------------- */
/*  Background updates                                                         */
/* -------------------------------------------------------------------------- */

export async function isBackgroundRunning(): Promise<boolean> {
  try {
    return await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  } catch {
    return false;
  }
}

/**
 * Start background location updates with a foreground service notification on
 * Android (required for reliable locked-screen tracking). Requires background
 * permission to be granted first.
 */
export async function startBackgroundUpdates(): Promise<boolean> {
  try {
    if (await isBackgroundRunning()) return true;
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.High,
      timeInterval: LOCATION_TUNING.backgroundIntervalMs,
      distanceInterval: LOCATION_TUNING.backgroundDistanceM,
      // iOS: keep delivering while backgrounded.
      showsBackgroundLocationIndicator: false,
      pausesUpdatesAutomatically: false,
      activityType: Location.ActivityType.Other,
      // Android foreground service notification.
      foregroundService: {
        notificationTitle: 'GeoShare partage ta position',
        notificationBody: 'Ta position est partagée avec tes contacts liés.',
        notificationColor: '#2563EB',
      },
    });
    return true;
  } catch (e) {
    console.warn('[location-service] startBackgroundUpdates failed:', (e as Error)?.message);
    return false;
  }
}

export async function stopBackgroundUpdates(): Promise<void> {
  try {
    if (await isBackgroundRunning()) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    }
  } catch {
    /* ignore */
  }
}
