import { useEffect } from 'react';
import { Redirect, Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useAuth } from '@/lib/auth-context';
import { TrackingProvider } from '@/lib/tracking-context';
import { LoadingView } from '@/components/States';
import { useColors } from '@/lib/useColors';
import { useT } from '@/lib/useT';
import { registerForPushNotifications } from '@/lib/notifications';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
}

export default function TabsLayout() {
  const { loading, firebaseUser } = useAuth();
  const c = useColors();
  const { t } = useT();

  // Register for push notifications once a session is active (best-effort).
  useEffect(() => {
    if (firebaseUser) registerForPushNotifications(firebaseUser.uid).catch(() => {});
  }, [firebaseUser]);

  if (loading) return <LoadingView />;
  if (!firebaseUser) return <Redirect href="/(auth)/login" />;

  return (
    <TrackingProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: c.primary,
          tabBarInactiveTintColor: c.textMuted,
          tabBarStyle: {
            backgroundColor: c.surface,
            borderTopColor: c.border,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        }}
      >
        <Tabs.Screen
          name="map"
          options={{
            title: t('tabMap'),
            tabBarIcon: ({ focused }) => <TabIcon emoji="🗺️" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="contacts"
          options={{
            title: t('tabContacts'),
            tabBarIcon: ({ focused }) => <TabIcon emoji="👥" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: t('tabProfile'),
            tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" focused={focused} />,
          }}
        />
      </Tabs>
    </TrackingProvider>
  );
}
