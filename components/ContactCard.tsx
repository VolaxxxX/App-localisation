import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from './Avatar';
import { BatteryBadge } from './Badges';
import { useColors } from '@/lib/useColors';
import { useT } from '@/lib/useT';
import { timeAgo, formatDistance, distanceMeters, formatAccuracy } from '@/lib/format';
import type { Contact, LocationSample } from '@/types';

interface ContactCardProps {
  contact: Contact;
  /** The viewer's own location, used to compute distance. */
  myLocation?: LocationSample | null;
  onPress?: () => void;
  onLongPress?: () => void;
  compact?: boolean;
}

/** Row card summarising a contact's live status. */
export function ContactCard({
  contact,
  myLocation,
  onPress,
  onLongPress,
  compact,
}: ContactCardProps) {
  const c = useColors();
  const { t, lang } = useT();
  const { profile, location, presence } = contact;

  const online = presence?.state === 'online';
  const dist =
    myLocation && location
      ? formatDistance(
          distanceMeters(
            { lat: myLocation.lat, lng: myLocation.lng },
            { lat: location.lat, lng: location.lng },
          ),
          lang,
        )
      : null;

  const acc = formatAccuracy(location?.accuracy);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: c.card,
          borderColor: c.border,
          opacity: pressed ? 0.9 : 1,
        },
        compact && styles.compact,
      ]}
    >
      <Avatar
        emoji={profile.avatar}
        color={profile.color}
        size={compact ? 44 : 52}
        presence={presence ? presence.state : undefined}
      />

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
            {profile.displayName}
          </Text>
          {dist ? (
            <Text style={[styles.dist, { color: c.primary }]}>{dist}</Text>
          ) : null}
        </View>

        <View style={styles.metaRow}>
          <Text style={[styles.meta, { color: online ? c.online : c.textMuted }]}>
            {online ? t('online') : `${t('lastSeen')} ${timeAgo(presence?.lastChanged, lang)}`}
          </Text>
        </View>

        <View style={styles.subRow}>
          <Text style={[styles.sub, { color: c.textMuted }]} numberOfLines={1}>
            {location
              ? `${t('updatedAgo')} ${timeAgo(location.updatedAt, lang)}${
                  acc ? ` · ${acc}` : ''
                }`
              : t('noLocationYet')}
          </Text>
        </View>
      </View>

      <BatteryBadge level={location?.battery} charging={location?.charging} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  compact: { padding: 10, marginBottom: 8 },
  body: { flex: 1, marginLeft: 14, marginRight: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: 16, fontWeight: '700', flexShrink: 1 },
  dist: { fontSize: 14, fontWeight: '700', marginLeft: 8 },
  metaRow: { marginTop: 2 },
  meta: { fontSize: 13, fontWeight: '600' },
  subRow: { marginTop: 2 },
  sub: { fontSize: 12 },
});
