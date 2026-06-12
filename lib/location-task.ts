import * as TaskManager from 'expo-task-manager';
import type { LocationObject } from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKGROUND_LOCATION_TASK, STORAGE_KEYS, LOCATION_TUNING } from './constants';
import { writeLocation } from './database';
import { waitForAuthReady } from './firebase-auth';
import type { LocationSample } from '@/types';

/**
 * Background location task.
 *
 * Registered at module load time (imported from index.js) so the OS can invoke
 * it even when the React tree is not mounted. It runs in the same JS runtime as
 * the app, but auth/firebase state may not be initialised yet — hence the
 * explicit `waitForAuthReady()` before writing.
 */

let lastBattery: { level: number | null; charging: boolean } = {
  level: null,
  charging: false,
};

/** Best-effort battery read; never throws. */
async function readBattery(): Promise<{ level: number | null; charging: boolean }> {
  try {
    const Battery = require('expo-battery');
    const [level, state] = await Promise.all([
      Battery.getBatteryLevelAsync(),
      Battery.getBatteryStateAsync(),
    ]);
    lastBattery = {
      level: typeof level === 'number' && level >= 0 ? level : null,
      charging:
        state === Battery.BatteryState.CHARGING ||
        state === Battery.BatteryState.FULL,
    };
  } catch {
    // keep previous value
  }
  return lastBattery;
}

/** Convert an expo-location sample to our wire format. */
export function toSample(
  loc: LocationObject,
  battery: { level: number | null; charging: boolean },
): LocationSample {
  return {
    lat: loc.coords.latitude,
    lng: loc.coords.longitude,
    accuracy: loc.coords.accuracy ?? null,
    altitude: loc.coords.altitude ?? null,
    speed:
      typeof loc.coords.speed === 'number' && loc.coords.speed >= 0
        ? loc.coords.speed
        : null,
    heading:
      typeof loc.coords.heading === 'number' && loc.coords.heading >= 0
        ? loc.coords.heading
        : null,
    battery: battery.level,
    charging: battery.charging,
    updatedAt: loc.timestamp || Date.now(),
  };
}

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.warn('[bg-location] task error:', error.message);
    return;
  }

  const { locations } = (data ?? {}) as { locations?: LocationObject[] };
  if (!locations || locations.length === 0) return;

  try {
    // Respect the user's sharing toggle even in the background.
    const sharing = await AsyncStorage.getItem(STORAGE_KEYS.sharing);
    if (sharing === '0') return;

    const uid = await AsyncStorage.getItem(STORAGE_KEYS.uid);
    if (!uid) return;

    // Ensure the persisted session is restored so the RTDB write is authorised.
    await waitForAuthReady();

    // Use the most recent, sufficiently-accurate sample.
    const fresh = [...locations].sort((a, b) => b.timestamp - a.timestamp);
    const best =
      fresh.find(
        (l) =>
          l.coords.accuracy == null ||
          l.coords.accuracy <= LOCATION_TUNING.maxAcceptableAccuracyM,
      ) ?? fresh[0];

    const battery = await readBattery();
    await writeLocation(uid, toSample(best, battery));
  } catch (e) {
    console.warn('[bg-location] write failed:', (e as Error)?.message);
  }
});
