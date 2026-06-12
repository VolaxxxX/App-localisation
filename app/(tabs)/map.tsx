import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/lib/auth-context';
import { useTracking } from '@/lib/tracking-context';
import { useContacts } from '@/hooks/useContacts';
import { useColors, useIsDark } from '@/lib/useColors';
import { useT } from '@/lib/useT';
import { MarkerBubble } from '@/components/MarkerBubble';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { timeAgo } from '@/lib/format';
import type { Contact } from '@/types';

const DEFAULT_REGION: Region = {
  latitude: 48.8566,
  longitude: 2.3522,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function MapScreen() {
  const c = useColors();
  const dark = useIsDark();
  const insets = useSafeAreaInsets();
  const { t, lang } = useT();
  const { profile } = useAuth();
  const {
    myLocation,
    permission,
    servicesEnabled,
    sharing,
    initializing,
    requestPermissions,
    retry,
  } = useTracking();
  const { contacts } = useContacts();

  const mapRef = useRef<MapView>(null);

  const locatedContacts = useMemo(
    () => contacts.filter((ct) => ct.location),
    [contacts],
  );

  // react-native-maps renders blank custom markers on Android when
  // tracksViewChanges is false before the marker view has laid out. Keep it
  // true briefly (on mount and whenever the marker set / own glyph changes),
  // then disable it so coordinate updates don't trigger constant redraws.
  const [tracksChanges, setTracksChanges] = useState(true);
  const markerSignature =
    locatedContacts.map((ct) => `${ct.profile.uid}:${ct.profile.avatar}:${ct.profile.color}`).join('|') +
    `#${profile?.avatar ?? ''}:${profile?.color ?? ''}`;
  useEffect(() => {
    setTracksChanges(true);
    const id = setTimeout(() => setTracksChanges(false), 1800);
    return () => clearTimeout(id);
  }, [markerSignature]);

  const initialRegion: Region = myLocation
    ? {
        latitude: myLocation.lat,
        longitude: myLocation.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : DEFAULT_REGION;

  const centerOnMe = useCallback(() => {
    if (!myLocation) return;
    mapRef.current?.animateToRegion(
      {
        latitude: myLocation.lat,
        longitude: myLocation.lng,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      },
      450,
    );
  }, [myLocation]);

  const centerOn = useCallback((lat: number, lng: number) => {
    mapRef.current?.animateToRegion(
      { latitude: lat, longitude: lng, latitudeDelta: 0.005, longitudeDelta: 0.005 },
      450,
    );
  }, []);

  const fitAll = useCallback(() => {
    const points = [
      ...(myLocation ? [{ latitude: myLocation.lat, longitude: myLocation.lng }] : []),
      ...locatedContacts.map((ct) => ({
        latitude: ct.location!.lat,
        longitude: ct.location!.lng,
      })),
    ];
    if (points.length === 0) return;
    if (points.length === 1) {
      centerOn(points[0].latitude, points[0].longitude);
      return;
    }
    mapRef.current?.fitToCoordinates(points, {
      edgePadding: { top: 120, right: 80, bottom: 220, left: 80 },
      animated: true,
    });
  }, [myLocation, locatedContacts, centerOn]);

  const permissionDenied = permission === 'denied';
  const gpsOff = !servicesEnabled;

  return (
    <View style={styles.root}>
      <StatusBar style={dark ? 'light' : 'dark'} />

      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={initialRegion}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        userInterfaceStyle={dark ? 'dark' : 'light'}
      >
        {/* My own marker */}
        {myLocation && profile ? (
          <Marker
            coordinate={{ latitude: myLocation.lat, longitude: myLocation.lng }}
            anchor={{ x: 0.5, y: 1 }}
            zIndex={10}
            title={t('you')}
            tracksViewChanges={tracksChanges}
          >
            <MarkerBubble emoji={profile.avatar} color={profile.color} dimmed={!sharing} />
          </Marker>
        ) : null}

        {/* Contact markers */}
        {locatedContacts.map((ct) => (
          <Marker
            key={ct.profile.uid}
            coordinate={{ latitude: ct.location!.lat, longitude: ct.location!.lng }}
            anchor={{ x: 0.5, y: 1 }}
            title={ct.profile.displayName}
            description={`${t('updatedAgo')} ${timeAgo(ct.location!.updatedAt, lang)}`}
            tracksViewChanges={tracksChanges}
          >
            <MarkerBubble
              emoji={ct.profile.avatar}
              color={ct.profile.color}
              dimmed={ct.presence?.state !== 'online'}
            />
          </Marker>
        ))}
      </MapView>

      {/* Top status pill */}
      <View style={[styles.topBar, { top: insets.top + 8 }]} pointerEvents="box-none">
        <View style={[styles.statusPill, { backgroundColor: c.surface }]}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: sharing && !gpsOff ? c.online : c.offline },
            ]}
          />
          <Text style={[styles.statusText, { color: c.text }]}>
            {gpsOff ? t('gpsOff') : sharing ? t('sharingOn') : t('sharingOff')}
          </Text>
        </View>
      </View>

      {/* Permission / GPS banner */}
      {(permissionDenied || gpsOff) && !initializing ? (
        <View style={[styles.banner, { top: insets.top + 56, backgroundColor: c.surface }]}>
          <Text style={[styles.bannerTitle, { color: c.text }]}>
            {permissionDenied ? t('permissionDenied') : t('gpsOff')}
          </Text>
          <Text style={[styles.bannerBody, { color: c.textMuted }]}>
            {permissionDenied ? t('permissionDeniedMsg') : t('gpsOffMsg')}
          </Text>
          <Button
            label={permissionDenied ? t('openSettings') : t('retry')}
            onPress={permissionDenied ? requestPermissions : retry}
            variant="primary"
            style={styles.bannerBtn}
          />
        </View>
      ) : null}

      {/* Floating action buttons */}
      <View style={[styles.fabCol, { bottom: insets.bottom + 150 }]}>
        <Pressable
          onPress={fitAll}
          style={[styles.fab, { backgroundColor: c.surface }]}
          accessibilityLabel={t('fitAll')}
        >
          <Text style={styles.fabIcon}>🌐</Text>
        </Pressable>
        <Pressable
          onPress={centerOnMe}
          style={[styles.fab, { backgroundColor: c.surface }]}
          accessibilityLabel={t('centerOnMe')}
        >
          <Text style={styles.fabIcon}>🎯</Text>
        </Pressable>
      </View>

      {/* Bottom contact strip */}
      <View style={[styles.bottomStrip, { bottom: insets.bottom + 8 }]} pointerEvents="box-none">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stripContent}
        >
          {locatedContacts.length === 0 ? (
            <Pressable
              onPress={() => router.push('/(modals)/add-contact')}
              style={[styles.addCard, { backgroundColor: c.surface, borderColor: c.border }]}
            >
              <Text style={styles.addEmoji}>➕</Text>
              <Text style={[styles.addText, { color: c.text }]}>{t('addContact')}</Text>
            </Pressable>
          ) : (
            locatedContacts.map((ct: Contact) => (
              <Pressable
                key={ct.profile.uid}
                onPress={() => centerOn(ct.location!.lat, ct.location!.lng)}
                style={[styles.chip, { backgroundColor: c.surface }]}
              >
                <Avatar
                  emoji={ct.profile.avatar}
                  color={ct.profile.color}
                  size={36}
                  presence={ct.presence ? ct.presence.state : undefined}
                />
                <View style={styles.chipBody}>
                  <Text style={[styles.chipName, { color: c.text }]} numberOfLines={1}>
                    {ct.profile.displayName}
                  </Text>
                  <Text style={[styles.chipMeta, { color: c.textMuted }]} numberOfLines={1}>
                    {timeAgo(ct.location!.updatedAt, lang)}
                  </Text>
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      </View>
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
  topBar: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    ...SHADOW,
  },
  statusDot: { width: 9, height: 9, borderRadius: 5, marginRight: 8 },
  statusText: { fontSize: 13, fontWeight: '800' },

  banner: {
    position: 'absolute',
    left: 16,
    right: 16,
    padding: 16,
    borderRadius: 18,
    ...SHADOW,
  },
  bannerTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  bannerBody: { fontSize: 13, lineHeight: 19, marginBottom: 12 },
  bannerBtn: { height: 46 },

  fabCol: { position: 'absolute', right: 16, gap: 12 },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW,
  },
  fabIcon: { fontSize: 22 },

  bottomStrip: { position: 'absolute', left: 0, right: 0 },
  stripContent: { paddingHorizontal: 12, gap: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    maxWidth: 200,
    ...SHADOW,
  },
  chipBody: { marginLeft: 10, flexShrink: 1 },
  chipName: { fontSize: 14, fontWeight: '700' },
  chipMeta: { fontSize: 11, marginTop: 1 },
  addCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    ...SHADOW,
  },
  addEmoji: { fontSize: 18, marginRight: 8 },
  addText: { fontSize: 14, fontWeight: '700' },
});
