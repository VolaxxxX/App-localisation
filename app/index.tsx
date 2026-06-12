import { Redirect } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '@/lib/auth-context';
import { LoadingView } from '@/components/States';
import { useColors } from '@/lib/useColors';

/**
 * Entry redirect. Decides between the auth flow and the main app based on the
 * restored session. Surfaces a hard auth-init error if firebase/auth failed.
 */
export default function Index() {
  const { loading, firebaseUser, authError } = useAuth();
  const c = useColors();

  if (authError) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Text style={styles.emoji}>⚠️</Text>
        <Text style={[styles.title, { color: c.text }]}>Initialisation impossible</Text>
        <Text style={[styles.body, { color: c.textMuted }]}>{authError}</Text>
        <Text style={[styles.hint, { color: c.textMuted }]}>
          Vérifie la configuration Firebase dans lib/firebase.ts.
        </Text>
      </View>
    );
  }

  if (loading) return <LoadingView />;

  return <Redirect href={firebaseUser ? '/(tabs)/map' : '/(auth)/login'} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 10, textAlign: 'center' },
  body: { fontSize: 14, textAlign: 'center', marginBottom: 8 },
  hint: { fontSize: 12, textAlign: 'center' },
});
