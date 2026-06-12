import type { Language } from '@/types';

/** Format a "time ago" string from a timestamp (ms). */
export function timeAgo(ts: number | null | undefined, lang: Language): string {
  if (!ts) return '—';
  const diff = Math.max(0, Date.now() - ts);
  const sec = Math.floor(diff / 1000);
  const fr = lang === 'fr';

  if (sec < 5) return fr ? "à l'instant" : 'just now';
  if (sec < 60) return fr ? `il y a ${sec}s` : `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return fr ? `il y a ${min} min` : `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return fr ? `il y a ${hr} h` : `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return fr ? `il y a ${day} j` : `${day}d ago`;
  return new Date(ts).toLocaleDateString(fr ? 'fr-FR' : 'en-US', {
    day: 'numeric',
    month: 'short',
  });
}

/** Human-readable distance between two lat/lng points (Haversine). */
export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371e3;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Format a metre distance into a compact "m / km" string. */
export function formatDistance(m: number, lang: Language): string {
  if (!isFinite(m)) return '—';
  if (m < 1000) return `${Math.round(m)} m`;
  const km = m / 1000;
  const v = km < 10 ? km.toFixed(1) : Math.round(km).toString();
  return `${v} km`;
}

/** Format a battery fraction (0–1) into a percentage string. */
export function formatBattery(level: number | null | undefined): string | null {
  if (level == null || level < 0) return null;
  return `${Math.round(level * 100)}%`;
}

/** Format accuracy in metres. */
export function formatAccuracy(m: number | null | undefined): string | null {
  if (m == null || m < 0) return null;
  return `±${Math.round(m)} m`;
}
