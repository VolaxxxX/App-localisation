import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/lib/useColors';
import { formatBattery } from '@/lib/format';

/** Small battery percentage pill, colour-coded by level. */
export function BatteryBadge({
  level,
  charging,
}: {
  level: number | null | undefined;
  charging?: boolean;
}) {
  const c = useColors();
  const text = formatBattery(level);
  if (!text) return null;
  const color =
    level! <= 0.15 ? c.danger : level! <= 0.3 ? c.warning : c.textMuted;
  return (
    <View style={[styles.pill, { backgroundColor: c.surfaceAlt }]}>
      <Text style={[styles.pillText, { color }]}>
        {charging ? '⚡ ' : '🔋 '}
        {text}
      </Text>
    </View>
  );
}

/** Presence dot + label. */
export function PresenceBadge({
  online,
  label,
}: {
  online: boolean;
  label: string;
}) {
  const c = useColors();
  return (
    <View style={styles.row}>
      <View
        style={[
          styles.dot,
          { backgroundColor: online ? c.online : c.offline },
        ]}
      />
      <Text style={[styles.presenceText, { color: c.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  pillText: { fontSize: 12, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  presenceText: { fontSize: 12, fontWeight: '600' },
});
