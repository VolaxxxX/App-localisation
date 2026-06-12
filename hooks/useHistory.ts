import { useEffect, useState } from 'react';
import { subscribeToHistory } from '@/lib/database';
import type { HistoryPoint } from '@/types';

/**
 * Subscribe to the most recent breadcrumb trail for a given uid.
 * Pass `null` to disable. `limit` caps how many points are loaded.
 */
export function useHistory(
  uid: string | null,
  limit = 200,
): { points: HistoryPoint[]; loading: boolean } {
  const [points, setPoints] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setPoints([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeToHistory(
      uid,
      limit,
      (pts) => {
        setPoints(pts);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [uid, limit]);

  return { points, loading };
}
