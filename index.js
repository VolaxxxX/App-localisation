// Polyfill crypto.getRandomValues FIRST — required by Firebase Auth's
// internal token generation on React Native.
import 'react-native-get-random-values';

// Register the background location task BEFORE the router mounts so that the
// OS can wake the task even when the JS app is not in the foreground.
import './lib/location-task';

// Then load expo-router's entry point.
import 'expo-router/entry';
