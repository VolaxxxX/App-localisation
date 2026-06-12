import React, { createContext, useContext } from 'react';
import { useLocationTracking } from '@/hooks/useLocationTracking';

type TrackingValue = ReturnType<typeof useLocationTracking>;

const TrackingContext = createContext<TrackingValue | null>(null);

/**
 * Hosts a SINGLE location-tracking pipeline for the whole app. Without this,
 * every screen calling `useLocationTracking()` would spin up its own watcher.
 */
export function TrackingProvider({ children }: { children: React.ReactNode }) {
  const tracking = useLocationTracking();
  return (
    <TrackingContext.Provider value={tracking}>{children}</TrackingContext.Provider>
  );
}

export function useTracking(): TrackingValue {
  const ctx = useContext(TrackingContext);
  if (!ctx) throw new Error('useTracking must be used within TrackingProvider');
  return ctx;
}
