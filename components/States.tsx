import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/lib/useColors';

/** Full-screen centred spinner. */
export function LoadingView({ message }: { message?: string }) {
  const c = useColors();
  return (
    <View style={[styles.center, { backgroundColor: c.background }]}>
      <ActivityIndicator size="large" color={c.primary} />
      {message ? <Text style={[styles.msg, { color: c.textMuted }]}>{message}</Text> : null}
    </View>
  );
}

/** Empty / informational placeholder with an emoji, title and optional body. */
export function EmptyState({
  emoji,
  title,
  message,
  action,
}: {
  emoji: string;
  title: string;
  message?: string;
  action?: React.ReactNode;
}) {
  const c = useColors();
  return (
    <View style={styles.empty}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[styles.title, { color: c.text }]}>{title}</Text>
      {message ? <Text style={[styles.body, { color: c.textMuted }]}>{message}</Text> : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  msg: { marginTop: 14, fontSize: 14 },
  empty: { alignItems: 'center', justifyContent: 'center', padding: 32 },
  emoji: { fontSize: 56, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  body: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  action: { marginTop: 20, alignSelf: 'stretch' },
});
