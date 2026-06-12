import { Stack } from 'expo-router';
import { useColors } from '@/lib/useColors';

export default function ModalsLayout() {
  const c = useColors();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: c.background },
      }}
    >
      <Stack.Screen name="add-contact" />
    </Stack>
  );
}
