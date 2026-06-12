import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import * as Battery from 'expo-battery';
import { useAuth } from '@/lib/auth-context';
import { writeLocation } from '@/lib/database';
import { toSample } from '@/lib/location-task';
import {
  startForegroundWatch,
  stopForegroundWatch,
  getCurrentPosition,
  isLocationEnabled,
  getPermissionLevel,
  requestForegroundPermission,
  requestBackgroundPermission,
  startBackgroundUpdates,
  stopBackgroundUpdates,
  setSharingFlag,
  getSharingFlag,
  setBackgroundFlag,
  getBackgroundFlag,
  type PermissionLevel,
} from '@/lib/location-service';
import { LOCATION_TUNING } from '@/lib/constants';
import type { LocationSample } from '@/types';

export interface TrackingState {
  myLocation: LocationSample | null;
  permission: PermissionLevel;
  servicesEnabled: boolean;
  sharing: boolean;
  backgroundEnabled: boolean;
  /** True until the first permission/service check resolves. */
  initializing: boolean;
}

/**
 * Owns the device's own location pipeline: permissions, foreground watcher,
 * background updates, the sharing toggle, and writing samples to RTDB.
 */
export function useLocationTracking() {
  const { firebaseUser } = useAuth();
  const uid = firebaseUser?.uid ?? null;

  const [state, setState] = useState<TrackingState>({
    myLocation: null,
    permission: 'denied',
    servicesEnabled: true,
    sharing: true,
    backgroundEnabled: true,
    initializing: true,
  });

  const sharingRef = useRef(true);
  const batteryRef = useRef<{ level: number | null; charging: boolean }>({
    level: null,
    charging: false,
  });
  const lastWriteRef = useRef(0);

  const patch = useCallback((p: Partial<TrackingState>) => {
    setState((s) => ({ ...s, ...p }));
  }, []);

  /* ---- battery polling (cheap, every 60s) -------------------------------- */
  useEffect(() => {
    let mounted = true;
    const read = async () => {
      try {
        const [level, bstate] = await Promise.all([
          Battery.getBatteryLevelAsync(),
          Battery.getBatteryStateAsync(),
        ]);
        if (!mounted) return;
        batteryRef.current = {
          level: typeof level === 'number' && level >= 0 ? level : null,
          charging:
            bstate === Battery.BatteryState.CHARGING ||
            bstate === Battery.BatteryState.FULL,
        };
      } catch {
        /* ignore */
      }
    };
    read();
    const id = setInterval(read, 60_000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  /* ---- write a sample to RTDB (throttled) -------------------------------- */
  const pushSample = useCallback(
    async (sample: LocationSample) => {
      if (!uid || !sharingRef.current) return;
      // Drop wildly inaccurate samples.
      if (
        sample.accuracy != null &&
        sample.accuracy > LOCATION_TUNING.maxAcceptableAccuracyM
      ) {
        return;
      }
      const now = Date.now();
      if (now - lastWriteRef.current < LOCATION_TUNING.foregroundIntervalMs - 250) {
        return;
      }
      lastWriteRef.current = now;
      try {
        await writeLocation(uid, sample);
      } catch {
        /* transient — next sample will retry */
      }
    },
    [uid],
  );

  /* ---- foreground watcher lifecycle -------------------------------------- */
  const startWatch = useCallback(async () => {
    const ok = await startForegroundWatch(
      (loc) => {
        const sample = toSample(loc, batteryRef.current);
        setState((s) => ({ ...s, myLocation: sample }));
        pushSample(sample);
      },
      () => {},
    );
    return ok;
  }, [pushSample]);

  /* ---- initial setup ------------------------------------------------------ */
  const initialize = useCallback(async () => {
    patch({ initializing: true });

    const [perm, services, sharing, bg] = await Promise.all([
      getPermissionLevel(),
      isLocationEnabled(),
      getSharingFlag(),
      getBackgroundFlag(),
    ]);
    sharingRef.current = sharing;
    patch({
      permission: perm,
      servicesEnabled: services,
      sharing,
      backgroundEnabled: bg,
      initializing: false,
    });

    if (perm === 'denied' || !services) return;

    // Seed the map immediately with a one-shot fix.
    const current = await getCurrentPosition();
    if (current) {
      const sample = toSample(current, batteryRef.current);
      setState((s) => ({ ...s, myLocation: sample }));
      pushSample(sample);
    }

    await startWatch();

    if (bg && perm === 'background') {
      await startBackgroundUpdates();
    }
  }, [patch, pushSample, startWatch]);

  useEffect(() => {
    if (!uid) return;
    initialize();
    return () => {
      stopForegroundWatch();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  /* ---- re-check when returning to foreground ----------------------------- */
  useEffect(() => {
    const onChange = async (next: AppStateStatus) => {
      if (next !== 'active') return;
      const [perm, services] = await Promise.all([
        getPermissionLevel(),
        isLocationEnabled(),
      ]);
      patch({ permission: perm, servicesEnabled: services });
      if (perm !== 'denied' && services) {
        await startWatch();
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [patch, startWatch]);

  /* ---- public actions ----------------------------------------------------- */
  const requestPermissions = useCallback(async (): Promise<PermissionLevel> => {
    const fg = await requestForegroundPermission();
    if (fg === 'denied') {
      patch({ permission: 'denied' });
      return 'denied';
    }
    // Ask for background as a second step (platform best practice).
    const bgGranted = await requestBackgroundPermission();
    const level: PermissionLevel = bgGranted ? 'background' : 'foreground';
    patch({ permission: level, servicesEnabled: await isLocationEnabled() });
    await initialize();
    return level;
  }, [initialize, patch]);

  const setSharing = useCallback(
    async (enabled: boolean) => {
      sharingRef.current = enabled;
      await setSharingFlag(enabled);
      patch({ sharing: enabled });
      if (enabled) {
        await startWatch();
        if (state.backgroundEnabled && state.permission === 'background') {
          await startBackgroundUpdates();
        }
      } else {
        await stopForegroundWatch();
        await stopBackgroundUpdates();
      }
    },
    [patch, startWatch, state.backgroundEnabled, state.permission],
  );

  const setBackground = useCallback(
    async (enabled: boolean) => {
      await setBackgroundFlag(enabled);
      patch({ backgroundEnabled: enabled });
      if (enabled) {
        if (state.permission !== 'background') {
          const granted = await requestBackgroundPermission();
          if (!granted) {
            patch({ backgroundEnabled: false });
            await setBackgroundFlag(false);
            return false;
          }
          patch({ permission: 'background' });
        }
        if (sharingRef.current) await startBackgroundUpdates();
      } else {
        await stopBackgroundUpdates();
      }
      return enabled;
    },
    [patch, state.permission],
  );

  const retry = useCallback(() => initialize(), [initialize]);

  return {
    ...state,
    requestPermissions,
    setSharing,
    setBackground,
    retry,
  };
}
