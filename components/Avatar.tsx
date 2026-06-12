import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface AvatarProps {
  emoji: string;
  color: string;
  size?: number;
  /** 'online' | 'offline' | undefined (no dot). */
  presence?: 'online' | 'offline';
  ringWidth?: number;
}

/** Circular emoji avatar with a coloured ring and optional presence dot. */
export function Avatar({ emoji, color, size = 48, presence, ringWidth = 3 }: AvatarProps) {
  const dot = Math.max(10, size * 0.28);
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: color,
            borderWidth: ringWidth,
            backgroundColor: '#FFFFFF',
          },
        ]}
      >
        <Text style={{ fontSize: size * 0.5 }}>{emoji}</Text>
      </View>
      {presence ? (
        <View
          style={[
            styles.dot,
            {
              width: dot,
              height: dot,
              borderRadius: dot / 2,
              backgroundColor: presence === 'online' ? '#16A34A' : '#9CA3AF',
            },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  dot: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
