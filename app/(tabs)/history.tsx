import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/lib/auth-context';
import { useTracking } from '@/lib/tracking-context';
import { useContacts } from '@/hooks/useContacts';
import { useHistory } from '@/hooks/useHistory';
import { useColors, useIsDark } from '@/lib/useColors';
import { useT } from '@/lib/useT';
import { LeafletMap, type MapMarker } from '@/components/LeafletMap';
import { Avatar } from '@/components/Avatar';
import { EmptyState } from '@/components/States';

interface Person {
  uid: string;
  displayName: string;
  avatar: string;
  color: string;
  lat: number | null;
  lng: number | null;
}

const DEFAULT_CENTER = { lat: 48.8566, lng: 2.3522, zoom: 12 };

export default function HistoryScreen() {
  const c = useColors();
  const dark = useIsDark();
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const { firebaseUser, profile } = useAuth();
  const { myLocation } = useTracking();
  const { contacts } = useContacts();

  const me = firebaseUser?.uid ?? '';
  const [selected, setSelected] = useState<string>(me);

  const people = useMemo<Person[]>(() => {
    const list: Person[] = [];
    if (profile && firebaseUser) {
      list.push({
        uid: firebaseUser.uid,
        displayName: t('you'),
        avatar: profile.avatar,
        color: profile.color,
        lat: myLocation?.lat ?? null,
        lng: myLocation?.lng ?? null,
      });
    }
    for (const ct of contacts) {
      list.push({
        uid: ct.profile.uid,
        displayName: ct.profile.displayName,
        avatar: ct.profile.avatar,
        color: ct.profile.color,
        lat: ct.location?.lat ?? null,
        lng: ct.location?.lng ?? null,
      });
    }
    return list;
  }, [profile, firebaseUser, myLocation, contacts, t]);

  const selectedUid = people.some((p) => p.uid === selected) ? selected : me;
  const person = people.find((p) => p.uid === selectedUid) ?? null;
  const { points, loading } = useHistory(selectedUid || null);

  const markers = useMemo<MapMarker[]>(() => {
    if (!person || person.lat == null || person.lng == null) return [];
    return [
      {
        id: person.uid,
        lat: person.lat,
        lng: person.lng,
        emoji: person.avatar,
        color: person.color,
        isMe: person.uid === me,
      },
    ];
  }, [person, me]);

  const path = useMemo(() => points.map((p) => ({ lat: p.lat, lng: p.lng })), [points]);

  const initialCenter = useMemo(() => {
    if (person?.lat != null && person?.lng != null) {
      return { lat: person.lat, lng: person.lng, zoom: 15 };
    }
    if (points.length) {
      const last = points[points.length - 1];
      return { lat: last.lat, lng: last.lng, zoom: 15 };
    }
    return DEFAULT_CENTER;
  }, [person, points]);

  const hasTrail = path.length >= 2;

  return (
    <View style={styles.root}>
      <StatusBar style={dark ? 'light' : 'dark'} />

      <LeafletMap
        // Remount when switching person so the map re-centres cleanly.
        key={selectedUid}
        markers={markers}
        initialCenter={initialCenter}
        dark={dark}
        path={path}
        pathColor={person?.color}
      />

      {/* Person selector */}
      <View style={[styles.top, { top: insets.top + 8 }]} pointerEvents="box-none">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.selectorContent}
        >
          {people.map((p) => {
            const active = p.uid === selectedUid;
            return (
              <Pressable
                key={p.uid}
                onPress={() => setSelected(p.uid)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? p.color : c.surface,
                  },
                ]}
              >
                <Avatar emoji={p.avatar} color={active ? '#FFFFFF' : p.color} size={28} ringWidth={2} />
                <Text
                  style={[
                    styles.chipText,
                    { color: active ? '#FFFFFF' : c.text },
                  ]}
                  numberOfLines={1}
                >
                  {p.displayName}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Info / empty pill */}
      <View style={[styles.bottom, { bottom: insets.bottom + 16 }]} pointerEvents="box-none">
        <View style={[styles.infoPill, { backgroundColor: c.surface }]}>
          {hasTrail ? (
            <Text style={[styles.infoText, { color: c.text }]}>
              📍 {t('pointsRecorded', { n: points.length })}
            </Text>
          ) : (
            <Text style={[styles.infoText, { color: c.textMuted }]}>
              {loading ? t('loading') : t('noHistory')}
            </Text>
          )}
        </View>
      </View>

      {/* Full empty state overlay when nothing at all */}
      {!loading && points.length === 0 && markers.length === 0 ? (
        <View style={[styles.emptyOverlay, { backgroundColor: c.background }]}>
          <EmptyState emoji="🛤️" title={t('noHistory')} message={t('noHistoryMsg')} />
        </View>
      ) : null}
    </View>
  );
}

const SHADOW = {
  shadowColor: '#000',
  shadowOpacity: 0.18,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 3 },
  elevation: 5,
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  top: { position: 'absolute', left: 0, right: 0 },
  selectorContent: { paddingHorizontal: 12, gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    maxWidth: 170,
    ...SHADOW,
  },
  chipText: { fontSize: 13, fontWeight: '800', marginLeft: 8, flexShrink: 1 },

  bottom: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  infoPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    ...SHADOW,
  },
  infoText: { fontSize: 13, fontWeight: '700' },

  emptyOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
