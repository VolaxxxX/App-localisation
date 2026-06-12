import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { LoadingView } from '@/components/States';

export default function AuthLayout() {
  const { loading, firebaseUser } = useAuth();
  if (loading) return <LoadingView />;
  // Already signed in → jump straight to the app.
  if (firebaseUser) return <Redirect href="/(tabs)/map" />;

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  );
}
