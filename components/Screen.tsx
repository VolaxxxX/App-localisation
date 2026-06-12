import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useColors, useIsDark } from '@/lib/useColors';

interface ScreenProps {
  children: React.ReactNode;
  edges?: Edge[];
  padded?: boolean;
  style?: ViewStyle;
}

/** Safe-area container with themed background and status bar. */
export function Screen({
  children,
  edges = ['top', 'bottom', 'left', 'right'],
  padded,
  style,
}: ScreenProps) {
  const c = useColors();
  const dark = useIsDark();
  return (
    <SafeAreaView
      edges={edges}
      style={[styles.root, { backgroundColor: c.background }]}
    >
      <StatusBar style={dark ? 'light' : 'dark'} />
      <View style={[styles.inner, padded && styles.padded, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  inner: { flex: 1 },
  padded: { paddingHorizontal: 20 },
});
