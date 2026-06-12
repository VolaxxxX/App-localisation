import { useCallback } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { ContactCard } from '@/components/ContactCard';
import { EmptyState, LoadingView } from '@/components/States';
import { useAuth } from '@/lib/auth-context';
import { useContacts } from '@/hooks/useContacts';
import { useTracking } from '@/lib/tracking-context';
import { unlinkUsers } from '@/lib/database';
import { useColors } from '@/lib/useColors';
import { useT } from '@/lib/useT';
import type { Contact } from '@/types';

export default function ContactsScreen() {
  const c = useColors();
  const { t } = useT();
  const { firebaseUser } = useAuth();
  const { contacts, loading } = useContacts();
  const { myLocation } = useTracking();

  const confirmRemove = useCallback(
    (contact: Contact) => {
      if (!firebaseUser) return;
      Alert.alert(t('removeContactConfirm'), undefined, [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('remove'),
          style: 'destructive',
          onPress: () => {
            unlinkUsers(firebaseUser.uid, contact.profile.uid).catch(() => {
              Alert.alert(t('errorTitle'), t('somethingWrong'));
            });
          },
        },
      ]);
    },
    [firebaseUser, t],
  );

  if (loading && contacts.length === 0) return <LoadingView />;

  return (
    <Screen padded edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.text }]}>{t('contacts')}</Text>
        <Text style={[styles.count, { color: c.textMuted }]}>{contacts.length}</Text>
      </View>

      <FlatList
        data={contacts}
        keyExtractor={(item) => item.profile.uid}
        renderItem={({ item }) => (
          <ContactCard
            contact={item}
            myLocation={myLocation}
            onPress={() => router.push('/(tabs)/map')}
            onLongPress={() => confirmRemove(item)}
          />
        )}
        contentContainerStyle={contacts.length === 0 ? styles.emptyWrap : styles.list}
        ListEmptyComponent={
          <EmptyState
            emoji="🧭"
            title={t('noContacts')}
            message={t('noContactsMsg')}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.footer}>
        <Button
          label={t('addContact')}
          onPress={() => router.push('/(modals)/add-contact')}
          icon={<Text style={{ fontSize: 16 }}>➕</Text>}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: { fontSize: 30, fontWeight: '900', letterSpacing: -0.5 },
  count: { fontSize: 18, fontWeight: '700' },
  list: { paddingBottom: 16 },
  emptyWrap: { flexGrow: 1, justifyContent: 'center' },
  footer: { paddingVertical: 12 },
});
