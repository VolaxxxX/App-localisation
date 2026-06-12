import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Avatar } from '@/components/Avatar';
import { useAuth } from '@/lib/auth-context';
import { useTracking } from '@/lib/tracking-context';
import { regenerateShareCode } from '@/lib/database';
import { useColors } from '@/lib/useColors';
import { useT } from '@/lib/useT';
import { MARKER_COLORS, AVATAR_EMOJIS } from '@/constants/Colors';
import { timeAgo, formatBattery } from '@/lib/format';
import type { Language } from '@/types';

export default function ProfileScreen() {
  const c = useColors();
  const { t, lang } = useT();
  const { profile, firebaseUser, signOut, updateProfile, updateLanguage } = useAuth();
  const {
    sharing,
    backgroundEnabled,
    myLocation,
    permission,
    setSharing,
    setBackground,
  } = useTracking();

  const [editingLook, setEditingLook] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  if (!profile) return null;
  const code = profile.shareCode;

  const copyCode = async () => {
    await Clipboard.setStringAsync(code);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    Alert.alert(t('copied'), code);
  };

  const shareCode = async () => {
    const msg =
      lang === 'fr'
        ? `Rejoins-moi sur GeoShare ! Mon code : ${code}`
        : `Join me on GeoShare! My code: ${code}`;
    try {
      await Share.share({ message: msg });
    } catch {
      /* user cancelled */
    }
  };

  const regenerate = () => {
    Alert.alert(t('regenerateCode'), t('regenerateConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('ok'),
        onPress: async () => {
          if (!firebaseUser) return;
          setRegenerating(true);
          try {
            await regenerateShareCode(firebaseUser.uid, code);
          } catch {
            Alert.alert(t('errorTitle'), t('somethingWrong'));
          } finally {
            setRegenerating(false);
          }
        },
      },
    ]);
  };

  const onToggleBackground = async (v: boolean) => {
    const ok = await setBackground(v);
    if (v && !ok) {
      Alert.alert(t('permissionDenied'), t('permissionDeniedMsg'));
    }
  };

  const battery = formatBattery(myLocation?.battery);

  return (
    <Screen edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Identity header */}
        <View style={styles.identity}>
          <Pressable onPress={() => setEditingLook((s) => !s)}>
            <Avatar emoji={profile.avatar} color={profile.color} size={88} ringWidth={4} />
          </Pressable>
          <Text style={[styles.name, { color: c.text }]}>{profile.displayName}</Text>
          <Text style={[styles.email, { color: c.textMuted }]}>{profile.email}</Text>
        </View>

        {/* Avatar / colour editor */}
        {editingLook ? (
          <View style={[styles.section, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.sectionTitle, { color: c.textMuted }]}>
              {t('chooseAvatar')}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerRow}>
              {AVATAR_EMOJIS.map((e) => (
                <Pressable
                  key={e}
                  onPress={() => updateProfile({ avatar: e })}
                  style={[
                    styles.emojiOpt,
                    {
                      backgroundColor: c.surfaceAlt,
                      borderColor: profile.avatar === e ? c.primary : 'transparent',
                    },
                  ]}
                >
                  <Text style={{ fontSize: 24 }}>{e}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Text style={[styles.sectionTitle, { color: c.textMuted, marginTop: 14 }]}>
              {t('chooseColor')}
            </Text>
            <View style={styles.colorRow}>
              {MARKER_COLORS.map((col) => (
                <Pressable
                  key={col}
                  onPress={() => updateProfile({ color: col })}
                  style={[
                    styles.colorOpt,
                    {
                      backgroundColor: col,
                      borderColor: profile.color === col ? c.text : 'transparent',
                    },
                  ]}
                />
              ))}
            </View>
          </View>
        ) : null}

        {/* Share code */}
        <View style={[styles.section, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.sectionTitle, { color: c.textMuted }]}>{t('myCode')}</Text>
          <Pressable onPress={copyCode} style={styles.codeBox}>
            <Text style={[styles.code, { color: c.primary }]}>{code}</Text>
            <Text style={[styles.codeHint, { color: c.textMuted }]}>📋 {t('copyCode')}</Text>
          </Pressable>
          <View style={styles.codeActions}>
            <Pressable
              onPress={shareCode}
              style={[styles.codeBtn, { backgroundColor: c.primary }]}
            >
              <Text style={[styles.codeBtnText, { color: c.primaryText }]}>
                📤 {t('shareCode')}
              </Text>
            </Pressable>
            <Pressable
              onPress={regenerate}
              disabled={regenerating}
              style={[styles.codeBtn, { backgroundColor: c.surfaceAlt }]}
            >
              <Text style={[styles.codeBtnText, { color: c.text }]}>
                🔄 {regenerating ? t('loading') : t('regenerateCode')}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Settings */}
        <View style={[styles.section, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.sectionTitle, { color: c.textMuted }]}>{t('settings')}</Text>

          <Row
            title={t('shareLocation')}
            desc={t('shareLocationDesc')}
            right={
              <Switch
                value={sharing}
                onValueChange={setSharing}
                trackColor={{ true: c.primary, false: c.border }}
              />
            }
          />
          <Divider />
          <Row
            title={t('backgroundLocation')}
            desc={t('backgroundLocationDesc')}
            right={
              <Switch
                value={backgroundEnabled && permission === 'background'}
                onValueChange={onToggleBackground}
                trackColor={{ true: c.primary, false: c.border }}
              />
            }
          />
          <Divider />
          <Row
            title={t('language')}
            right={
              <View style={styles.langRow}>
                {(['fr', 'en'] as Language[]).map((l) => (
                  <Pressable
                    key={l}
                    onPress={() => updateLanguage(l)}
                    style={[
                      styles.langChip,
                      {
                        backgroundColor: lang === l ? c.primary : c.surfaceAlt,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: lang === l ? c.primaryText : c.text,
                        fontWeight: '800',
                        fontSize: 13,
                      }}
                    >
                      {l.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>
            }
          />
        </View>

        {/* Account */}
        <View style={[styles.section, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.sectionTitle, { color: c.textMuted }]}>{t('account')}</Text>
          {battery ? (
            <Row title={t('battery')} right={<Text style={[styles.val, { color: c.text }]}>{battery}</Text>} />
          ) : null}
          <Row
            title={t('memberSince')}
            right={
              <Text style={[styles.val, { color: c.text }]}>
                {timeAgo(profile.createdAt, lang)}
              </Text>
            }
          />
        </View>

        {/* Sign out */}
        <Pressable
          onPress={() => {
            Alert.alert(t('signOut'), undefined, [
              { text: t('cancel'), style: 'cancel' },
              { text: t('signOut'), style: 'destructive', onPress: () => {
                signOut().then(() => router.replace('/(auth)/login'));
              } },
            ]);
          }}
          style={[styles.signOut, { borderColor: c.border }]}
        >
          <Text style={[styles.signOutText, { color: c.danger }]}>{t('signOut')}</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

function Row({
  title,
  desc,
  right,
}: {
  title: string;
  desc?: string;
  right?: React.ReactNode;
}) {
  const c = useColors();
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, { color: c.text }]}>{title}</Text>
        {desc ? <Text style={[styles.rowDesc, { color: c.textMuted }]}>{desc}</Text> : null}
      </View>
      {right ? <View style={styles.rowRight}>{right}</View> : null}
    </View>
  );
}

function Divider() {
  const c = useColors();
  return <View style={[styles.divider, { backgroundColor: c.border }]} />;
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 40 },
  identity: { alignItems: 'center', marginBottom: 20 },
  name: { fontSize: 24, fontWeight: '900', marginTop: 12 },
  email: { fontSize: 14, marginTop: 2 },

  section: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },

  pickerRow: { flexDirection: 'row' },
  emojiOpt: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  colorOpt: { width: 36, height: 36, borderRadius: 18, borderWidth: 3 },

  codeBox: { alignItems: 'center', paddingVertical: 12 },
  code: { fontSize: 40, fontWeight: '900', letterSpacing: 8 },
  codeHint: { fontSize: 12, marginTop: 4 },
  codeActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  codeBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBtnText: { fontSize: 13, fontWeight: '800' },

  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  rowText: { flex: 1, paddingRight: 12 },
  rowTitle: { fontSize: 15, fontWeight: '700' },
  rowDesc: { fontSize: 12, marginTop: 2, lineHeight: 17 },
  rowRight: {},
  val: { fontSize: 15, fontWeight: '700' },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 2 },

  langRow: { flexDirection: 'row', gap: 8 },
  langChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },

  signOut: {
    height: 52,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  signOutText: { fontSize: 16, fontWeight: '800' },
});
