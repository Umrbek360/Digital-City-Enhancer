import { useAuth, useClerk } from '@clerk/expo';
import { router } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton } from '@/components/Ui';
import { useColors } from '@/hooks/useColors';
import { bottomContentInset, topContentInset } from '@/hooks/usePlatformInsets';
import { usePushRegistration } from '@/hooks/usePushRegistration';
import { useCity } from '@/context/CityContext';
import {
  getGetCurrentAccountQueryKey,
  getListMyBusinessesQueryKey,
  useGetCurrentAccount,
  useListMyBusinesses,
} from '@workspace/api-client-react';
import type { BusinessRecord } from '@workspace/api-client-react';

export default function BusinessAccountScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isLoaded, isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const { disablePush } = usePushRegistration();
  const { setNotificationsEnabled } = useCity();
  const businessesQuery = useListMyBusinesses({
    query: {
      queryKey: getListMyBusinessesQueryKey(),
      enabled: isLoaded && Boolean(isSignedIn),
    },
  });
  const accountQuery = useGetCurrentAccount({
    query: {
      queryKey: getGetCurrentAccountQueryKey(),
      enabled: isLoaded && Boolean(isSignedIn),
      retry: false,
    },
  });

  if (!isLoaded || (isSignedIn && (businessesQuery.isPending || accountQuery.isPending))) {
    return (
      <View style={[styles.stateScreen, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!isSignedIn) {
    return (
      <View style={[styles.stateScreen, { backgroundColor: colors.background, paddingHorizontal: 24 }]}>
        <Feather name="lock" size={34} color={colors.primary} />
        <Text style={[styles.stateTitle, { color: colors.foreground }]}>Hisobga kirish kerak</Text>
        <Text style={[styles.stateCopy, { color: colors.mutedForeground }]}>Biznes arizalaringizni ko‘rish uchun tasdiqlangan hisobga kiring.</Text>
        <PrimaryButton title="Kirish" icon="log-in" onPress={() => router.push('/business-auth')} style={styles.stateButton} />
      </View>
    );
  }

  if (businessesQuery.isError || accountQuery.isError) {
    const status = readStatus(businessesQuery.error) ?? readStatus(accountQuery.error);
    return (
      <View style={[styles.stateScreen, { backgroundColor: colors.background, paddingHorizontal: 24 }]}>
        <Feather name={status === 401 ? 'lock' : status === 403 ? 'shield' : 'wifi-off'} size={34} color={colors.error} />
        <Text style={[styles.stateTitle, { color: colors.foreground }]}>{status === 401 ? 'Hisobga qayta kiring' : status === 403 ? 'Hisobga ruxsat berilmagan' : 'Ma’lumotlarni yuklab bo‘lmadi'}</Text>
        <Text style={[styles.stateCopy, { color: colors.mutedForeground }]}>{status === 401 ? 'Kirish muddati tugagan. Hisobingizga qayta kiring.' : status === 403 ? 'Biznes hisobingiz server tomonidan tasdiqlanmadi.' : 'Internetni tekshirib, qayta urinib ko‘ring.'}</Text>
        {status === 401 ? <PrimaryButton title="Kirish" icon="log-in" onPress={() => router.push('/business-auth')} style={styles.stateButton} /> : <PrimaryButton title="Qayta urinish" icon="refresh-cw" onPress={() => { void businessesQuery.refetch(); void accountQuery.refetch(); }} style={styles.stateButton} />}
      </View>
    );
  }

  const records = businessesQuery.data ?? [];

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: topContentInset(insets.top) + 14,
          paddingBottom: bottomContentInset(insets.bottom) + 28,
          paddingHorizontal: 20,
        }}
      >
        <View style={styles.header}>
          <Pressable accessibilityLabel="Ortga" onPress={() => router.back()} style={[styles.iconButton, { backgroundColor: colors.white, borderColor: colors.border }]}>
            <Feather name="arrow-left" size={19} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.title, { color: colors.foreground }]}>Biznes hisobim</Text>
          <Pressable
            accessibilityLabel="Hisobdan chiqish"
            onPress={async () => {
              try {
                await disablePush();
                setNotificationsEnabled(false);
                await signOut();
                router.replace('/business-mode');
              } catch {
                Alert.alert('Hisobdan chiqib bo‘lmadi', 'Qayta urinib ko‘ring.');
              }
            }}
            style={[styles.iconButton, { backgroundColor: colors.white, borderColor: colors.border }]}
          >
            <Feather name="log-out" size={18} color={colors.foreground} />
          </Pressable>
        </View>

        <Text style={[styles.intro, { color: colors.mutedForeground }]}>Arizalaringiz va biznesingizga kelgan vaqt so‘rovlarini shu yerdan boshqaring.</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/business-bookings')}
          style={[styles.requestsLink, { backgroundColor: colors.softBlue }]}
        >
          <View style={[styles.requestsIcon, { backgroundColor: colors.white }]}><Feather name="calendar" size={17} color={colors.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.requestsTitle, { color: colors.foreground }]}>Kelgan vaqt so‘rovlari</Text>
            <Text style={[styles.requestsSubtitle, { color: colors.mutedForeground }]}>Mijozlarga javob berish</Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.primary} />
        </Pressable>
        {accountQuery.data?.role === 'admin' ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/admin-businesses')}
            style={[styles.adminLink, { backgroundColor: colors.softOrange }]}
          >
            <View style={[styles.requestsIcon, { backgroundColor: colors.white }]}><Feather name="shield" size={17} color={colors.warning} /></View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.requestsTitle, { color: colors.foreground }]}>Biznes tekshiruvi</Text>
              <Text style={[styles.requestsSubtitle, { color: colors.mutedForeground }]}>Faqat administrator uchun</Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.warning} />
          </Pressable>
        ) : null}

        {records.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.white, borderColor: colors.border }]}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.softGreen }]}>
              <Feather name="briefcase" size={25} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Biznes hali qo‘shilmagan</Text>
            <Text style={[styles.cardCopy, { color: colors.mutedForeground }]}>Biznes ma’lumotlarini yuboring. Ular admin tekshiruvidan keyin katalogda ko‘rinadi.</Text>
            <PrimaryButton title="Biznes qo‘shish" icon="plus" onPress={() => router.push('/business-register')} style={styles.addButton} />
          </View>
        ) : (
          records.map((record) => (
            <BusinessRecordCard
              key={record.id}
              record={record}
              onEdit={() => router.push({ pathname: '/business-register', params: { id: record.id } })}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function BusinessRecordCard({ record, onEdit }: { record: BusinessRecord; onEdit: () => void }) {
  const colors = useColors();
  const status = statusPresentation(record.status, colors);
  return (
    <View style={[styles.recordCard, { backgroundColor: colors.white, borderColor: colors.border }]}>
      <View style={styles.recordHeading}>
        <View style={styles.recordTitleWrap}>
          <Text style={[styles.category, { color: colors.primary }]}>{record.category}</Text>
          <Text style={[styles.businessName, { color: colors.foreground }]}>{record.name}</Text>
        </View>
        <View style={[styles.status, { backgroundColor: status.backgroundColor }]}>
          <View style={[styles.statusDot, { backgroundColor: status.color }]} />
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>
      <Text style={[styles.meta, { color: colors.mutedForeground }]}>{record.phone}</Text>
      <Text style={[styles.meta, { color: colors.mutedForeground }]}>{record.address}</Text>
      <Text style={[styles.description, { color: colors.foreground }]}>{record.description || 'Biznes haqida ta’rif qo‘shilmagan.'}</Text>
      {record.adminNote ? (
        <View style={[styles.adminNote, { backgroundColor: colors.softOrange }]}>
          <Feather name="message-circle" size={15} color={colors.warning} />
          <Text style={[styles.adminNoteText, { color: colors.foreground }]}>{record.adminNote}</Text>
        </View>
      ) : null}
      {record.status === 'approved' ? (
        <Text style={[styles.reviewWarning, { color: colors.mutedForeground }]}>Tahrirlash biznesni qayta ko‘rib chiqishga yuboradi.</Text>
      ) : null}
      <Pressable onPress={onEdit} style={[styles.editButton, { borderColor: colors.border }]}>
        <Feather name="edit-2" size={15} color={colors.primary} />
        <Text style={[styles.editText, { color: colors.primary }]}>Ma’lumotlarni tahrirlash</Text>
      </Pressable>
    </View>
  );
}

function statusPresentation(status: BusinessRecord['status'], colors: ReturnType<typeof useColors>) {
  if (status === 'approved') return { label: 'Tasdiqlandi', color: colors.success, backgroundColor: colors.softGreen };
  if (status === 'rejected') return { label: 'Qayta ishlash kerak', color: colors.error, backgroundColor: colors.softRose };
  return { label: 'Ko‘rib chiqilmoqda', color: colors.warning, backgroundColor: colors.softOrange };
}

function readStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const value = (error as { status?: unknown; response?: { status?: unknown } }).status
    ?? (error as { response?: { status?: unknown } }).response?.status;
  return typeof value === 'number' ? value : undefined;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  stateScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 11 },
  stateTitle: { fontFamily: 'Inter_700Bold', fontSize: 19, lineHeight: 25, textAlign: 'center', marginTop: 7 },
  stateCopy: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20, textAlign: 'center' },
  stateButton: { width: '100%', marginTop: 10 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  iconButton: { width: 42, height: 42, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'Inter_700Bold', fontSize: 18, lineHeight: 24 },
  intro: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20, marginBottom: 20 },
  requestsLink: { minHeight: 68, borderRadius: 16, paddingHorizontal: 11, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  adminLink: { minHeight: 68, borderRadius: 16, paddingHorizontal: 11, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  requestsIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  requestsTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 12, lineHeight: 17 },
  requestsSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 14, marginTop: 1 },
  emptyCard: { alignItems: 'center', borderRadius: 8, borderWidth: 1, padding: 22 },
  emptyIcon: { width: 62, height: 62, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  emptyTitle: { fontFamily: 'Inter_700Bold', fontSize: 17, lineHeight: 23 },
  cardCopy: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 19, textAlign: 'center', marginTop: 7 },
  addButton: { width: '100%', marginTop: 18 },
  recordCard: { borderWidth: 1, borderRadius: 8, padding: 15, marginBottom: 13 },
  recordHeading: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 9 },
  recordTitleWrap: { flex: 1 },
  category: { fontFamily: 'Inter_600SemiBold', fontSize: 10, lineHeight: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  businessName: { fontFamily: 'Inter_700Bold', fontSize: 16, lineHeight: 21, marginTop: 2 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  statusDot: { width: 5, height: 5, borderRadius: 99 },
  statusText: { fontFamily: 'Inter_600SemiBold', fontSize: 9, lineHeight: 12 },
  meta: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 17, marginTop: 3 },
  description: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 19, marginTop: 10 },
  adminNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 10, borderRadius: 8, marginTop: 11 },
  adminNoteText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 },
  reviewWarning: { fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 15, marginTop: 11 },
  editButton: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderRadius: 8, marginTop: 12 },
  editText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
});
