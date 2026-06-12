import { useColorScheme } from 'react-native';
import { LightColors, DarkColors, type ColorScheme } from '@/constants/Colors';

/** Returns the active colour scheme based on the system appearance. */
export function useColors(): ColorScheme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? DarkColors : LightColors;
}

/** Returns true when the system is in dark mode. */
export function useIsDark(): boolean {
  return useColorScheme() === 'dark';
}
