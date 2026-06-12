/** App-wide non-visual constants (task names, storage keys, tuning). */

export const BACKGROUND_LOCATION_TASK = 'geoshare-background-location';

export const STORAGE_KEYS = {
  /** Current authenticated uid, mirrored so the background task can read it. */
  uid: 'geoshare.uid',
  /** "1" / "0" — whether the user enabled location sharing. */
  sharing: 'geoshare.sharing',
  /** "1" / "0" — whether background tracking is enabled. */
  background: 'geoshare.background',
} as const;

/** Location accuracy / cadence tuning. */
export const LOCATION_TUNING = {
  /** Foreground update interval (ms). */
  foregroundIntervalMs: 2000,
  /** Foreground minimum displacement before an update (m). */
  foregroundDistanceM: 3,
  /** Background update interval (ms). Larger to preserve battery. */
  backgroundIntervalMs: 8000,
  /** Background minimum displacement before an update (m). */
  backgroundDistanceM: 15,
  /** Reject samples whose accuracy radius is worse than this (m). */
  maxAcceptableAccuracyM: 100,
} as const;
