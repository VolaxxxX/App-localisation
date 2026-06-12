import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useAuth } from '@/lib/auth-context';
import { joinByCode } from '@/lib/database';
import { useColors } from '@/lib/useColors';
import { useT } from '@/lib/useT';
import { registerForPushNotifications } from '@/lib/notifications';

export default function AddContact() {
  const c = useColors();
  const { t, lang } = useT();
  const { profile, firebaseUser } = useAuth();

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const myCode = profile?.shareCode ?? '';

  const copyMine = async () => {
    await Clipboard.setStringAsync(myCode);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  const shareMine = async () => {
    const msg =
      lang === 'fr'
        ? `Rejoins-moi sur GeoShare ! Mon code : ${myCode}`
        : `Join me on GeoShare! My code: ${myCode}`;
    try {
      await Share.share({ message: msg });
    } catch {
      /* cancelled */
    }
  };

  const onJoin = async () => {
    setError(null);
    const clean = code.trim().toUpperCase();
    if (clean.length < 4) {
      setError(t('codeNotFound'));
      return;
    }
    if (!firebaseUser) return;
    setBusy(true);
    try {
      await joinByCode(firebaseUser.uid, clean);
      // Best-effort: ensure push token is registered now that we have a contact.
      registerForPushNotifications(firebaseUser.uid).catch(() => {});
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.back();
      router.push('/(tabs)/map');
    } catch (e: any) {
      const map: Record<string, string> = {
        'code-not-found': t('codeNotFound'),
        'cannot-link-self': t('cannotLinkSelf'),
        'already-linked': t('alreadyLinked'),
      };
      setError(map[e?.code] ?? t('somethingWrong'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
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
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: c.text }]}>{t('addContact')}</Text>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={[styles.close, { color: c.textMuted }]}>✕</Text>
          </Pressable>
        </View>

        {/* My code card */}
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.label, { color: c.textMuted }]}>{t('myCode')}</Text>
          <Pressable onPress={copyMine}>
            <Text style={[styles.code, { color: c.primary }]}>{myCode}</Text>
          </Pressable>
          <View style={styles.cardActions}>
            <Pressable onPress={copyMine} style={[styles.smallBtn, { backgroundColor: c.surfaceAlt }]}>
              <Text style={[styles.smallBtnText, { color: c.text }]}>📋 {t('copyCode')}</Text>
            </Pressable>
            <Pressable onPress={shareMine} style={[styles.smallBtn, { backgroundColor: c.primary }]}>
              <Text style={[styles.smallBtnText, { color: c.primaryText }]}>📤 {t('shareCode')}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.divider}>
          <View style={[styles.line, { backgroundColor: c.border }]} />
          <Text style={[styles.dividerText, { color: c.textMuted }]}>
            {lang === 'fr' ? 'OU' : 'OR'}
          </Text>
          <View style={[styles.line, { backgroundColor: c.border }]} />
        </View>

        {/* Join card */}
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.label, { color: c.textMuted }]}>{t('joinTitle')}</Text>
          <Input
            value={code}
            onChangeText={(v) => setCode(v.toUpperCase())}
            placeholder={t('joinPlaceholder')}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={8}
            error={error}
            style={styles.codeInput}
          />
          <Button label={busy ? t('joining') : t('join')} onPress={onJoin} loading={busy} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, paddingTop: 8 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: { fontSize: 26, fontWeight: '900' },
  close: { fontSize: 22, fontWeight: '700' },

  card: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  code: {
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: 8,
    textAlign: 'center',
    marginVertical: 8,
  },
  cardActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  smallBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallBtnText: { fontSize: 13, fontWeight: '800' },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 22 },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerText: { marginHorizontal: 12, fontSize: 13, fontWeight: '800' },

  codeInput: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 6,
    textAlign: 'center',
    height: 60,
  },
});
