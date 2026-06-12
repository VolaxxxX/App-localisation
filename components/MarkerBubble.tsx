import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

/**
 * Custom map-marker visual: a coloured rounded bubble containing the emoji
 * avatar, with a small pointer beneath. Kept intentionally simple (no images)
 * so it renders reliably as a react-native-maps custom marker on both
 * platforms.
 */
export function MarkerBubble({
  emoji,
  color,
  dimmed,
}: {
  emoji: string;
  color: string;
  dimmed?: boolean;
}) {
  return (
    <View style={styles.wrap} pointerEvents="none">
      <View
        style={[
          styles.bubble,
          { backgroundColor: color, opacity: dimmed ? 0.55 : 1 },
        ]}
      >
        <Text style={styles.emoji}>{emoji}</Text>
      </View>
      <View style={[styles.pointer, { borderTopColor: color, opacity: dimmed ? 0.55 : 1 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  // Extra padding gives the native marker a stable bounding box (avoids the
  // Android "marker clipped on first render" glitch).
  wrap: { alignItems: 'center', paddingTop: 2, paddingHorizontal: 2 },
  bubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  emoji: { fontSize: 22 },
  pointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -2,
  },
});
