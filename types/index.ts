/**
 * Shared domain types for GeoShare.
 *
 * The Realtime Database is schemaless, but every read/write in lib/database.ts
 * is funnelled through these types so the rest of the app stays fully typed.
 */

/** A registered user profile (RTDB path: `users/$uid`). */
export interface UserProfile {
  uid: string;
  displayName: string;
  email: string | null;
  /** Emoji used as the avatar / map marker glyph. */
  avatar: string;
  /** Hex colour for this user's map marker, e.g. "#2563EB". */
  color: string;
  /** Permanent 6-character code others enter to link with this user. */
  shareCode: string;
  createdAt: number;
  /** Expo push token (optional, set after notification permission granted). */
  pushToken?: string;
  /** Whether the user currently shares their location with contacts. */
  sharingEnabled?: boolean;
  language?: Language;
}

/** A single live location sample (RTDB path: `locations/$uid`). */
export interface LocationSample {
  lat: number;
  lng: number;
  /** Horizontal accuracy radius in metres (lower is better). */
  accuracy: number | null;
  altitude: number | null;
  /** Ground speed in m/s, or null when unavailable / stationary. */
  speed: number | null;
  /** Heading in degrees (0–360), or null when unavailable. */
  heading: number | null;
  /** Battery level as a fraction 0–1, or null when unavailable. */
  battery: number | null;
  /** Whether the device is currently charging. */
  charging?: boolean;
  /** Server-aligned timestamp (ms since epoch) of this sample. */
  updatedAt: number;
}

/** Presence record (RTDB path: `presence/$uid`). */
export interface Presence {
  state: 'online' | 'offline';
  lastChanged: number;
}

/** A contact is another user this account is linked with, plus live data. */
export interface Contact {
  profile: UserProfile;
  location: LocationSample | null;
  presence: Presence | null;
  /** When the link was established (ms since epoch). */
  since: number;
}

export type Language = 'fr' | 'en';

/** Coordinates region used by the map. */
export interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}
