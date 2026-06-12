import {
  timeAgo,
  distanceMeters,
  formatDistance,
  formatBattery,
  formatAccuracy,
} from '@/lib/format';

describe('timeAgo', () => {
  it('returns a placeholder for nullish input', () => {
    expect(timeAgo(null, 'fr')).toBe('—');
    expect(timeAgo(undefined, 'en')).toBe('—');
  });

  it('reports "just now" for very recent timestamps', () => {
    expect(timeAgo(Date.now(), 'en')).toBe('just now');
    expect(timeAgo(Date.now(), 'fr')).toBe("à l'instant");
  });

  it('reports minutes for a few minutes ago', () => {
    const tenMinAgo = Date.now() - 10 * 60 * 1000;
    expect(timeAgo(tenMinAgo, 'en')).toBe('10 min ago');
    expect(timeAgo(tenMinAgo, 'fr')).toBe('il y a 10 min');
  });

  it('reports hours for a few hours ago', () => {
    const threeHoursAgo = Date.now() - 3 * 60 * 60 * 1000;
    expect(timeAgo(threeHoursAgo, 'en')).toBe('3h ago');
  });
});

describe('distanceMeters', () => {
  it('is ~0 for identical points', () => {
    const p = { lat: 48.8566, lng: 2.3522 };
    expect(distanceMeters(p, p)).toBeCloseTo(0, 5);
  });

  it('matches a known distance (Paris → Lyon ≈ 392 km)', () => {
    const paris = { lat: 48.8566, lng: 2.3522 };
    const lyon = { lat: 45.764, lng: 4.8357 };
    const km = distanceMeters(paris, lyon) / 1000;
    expect(km).toBeGreaterThan(380);
    expect(km).toBeLessThan(400);
  });

  it('is symmetric', () => {
    const a = { lat: 10, lng: 20 };
    const b = { lat: -5, lng: 30 };
    expect(distanceMeters(a, b)).toBeCloseTo(distanceMeters(b, a), 6);
  });
});

describe('formatDistance', () => {
  it('uses metres below 1 km', () => {
    expect(formatDistance(450, 'fr')).toBe('450 m');
    expect(formatDistance(0, 'en')).toBe('0 m');
  });

  it('uses km with one decimal below 10 km', () => {
    expect(formatDistance(1500, 'fr')).toBe('1.5 km');
  });

  it('rounds km above 10 km', () => {
    expect(formatDistance(23400, 'en')).toBe('23 km');
  });

  it('handles non-finite input', () => {
    expect(formatDistance(Infinity, 'en')).toBe('—');
  });
});

describe('formatBattery', () => {
  it('formats a fraction as a percentage', () => {
    expect(formatBattery(0.5)).toBe('50%');
    expect(formatBattery(1)).toBe('100%');
  });

  it('returns null for invalid input', () => {
    expect(formatBattery(null)).toBeNull();
    expect(formatBattery(-1)).toBeNull();
    expect(formatBattery(undefined)).toBeNull();
  });
});

describe('formatAccuracy', () => {
  it('formats metres with a ± prefix', () => {
    expect(formatAccuracy(12.4)).toBe('±12 m');
  });

  it('returns null for invalid input', () => {
    expect(formatAccuracy(null)).toBeNull();
    expect(formatAccuracy(-3)).toBeNull();
  });
});
