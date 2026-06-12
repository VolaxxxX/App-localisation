import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link, router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useAuth } from '@/lib/auth-context';
import { useColors } from '@/lib/useColors';
import { useT } from '@/lib/useT';
import { authErrorMessage } from '@/lib/auth-errors';

export default function Register() {
  const c = useColors();
  const { t, lang } = useT();
  const { signUp } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (!name.trim() || !email.trim() || !password) {
      setError(t('fillAllFields'));
      return;
    }
    if (password.length < 6) {
      setError(t('weakPassword'));
      return;
    }
    setBusy(true);
    try {
      await signUp(email, password, name);
      router.replace('/(tabs)/map');
    } catch (e) {
      setError(authErrorMessage(e, lang));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen padded>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.logo}>🚀</Text>
            <Text style={[styles.appName, { color: c.text }]}>{t('signUp')}</Text>
          </View>

          <View style={styles.form}>
            <Input
              label={t('displayName')}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              placeholder={lang === 'fr' ? 'Alex' : 'Alex'}
            />
            <Input
              label={t('email')}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              placeholder="exemple@email.com"
            />
            <Input
              label={t('password')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password-new"
              textContentType="newPassword"
              placeholder="••••••••"
              error={error}
            />

            <Button label={t('signUp')} onPress={onSubmit} loading={busy} />
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: c.textMuted }]}>
              {t('haveAccount')}{' '}
            </Text>
            <Link href="/(auth)/login" style={[styles.footerLink, { color: c.primary }]}>
              {t('signIn')}
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingVertical: 24 },
  header: { alignItems: 'center', marginBottom: 32 },
  logo: { fontSize: 56, marginBottom: 12 },
  appName: { fontSize: 28, fontWeight: '900' },
  form: { marginBottom: 24 },
  footer: { flexDirection: 'row', justifyContent: 'center' },
  footerText: { fontSize: 15 },
  footerLink: { fontSize: 15, fontWeight: '800' },
});
