import { Feather } from '@expo/vector-icons';
import { useAuth } from '@clerk/expo';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton } from '@/components/Ui';
import { useColors } from '@/hooks/useColors';
import { bottomContentInset, topContentInset } from '@/hooks/usePlatformInsets';
import {
  getGetCurrentAccountQueryKey,
  getListBusinessBookingsQueryKey,
  getListMyBookingsQueryKey,
  useGetCurrentAccount,
  useListBusinessBookings,
  useUpdateBookingStatus,
  type BookingRecord,
} from '@workspace/api-client-react';

export default function BusinessBookingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { isLoaded, isSignedIn } = useAuth();
  const accountQuery = useGetCurrentAccount({
    query: { queryKey: getGetCurrentAccountQueryKey(), enabled: isLoaded && Boolean(isSignedIn), retry: false },
  });
  const bookingsQuery = useListBusinessBookings({
    query: { queryKey: getListBusinessBookingsQueryKey(), enabled: isLoaded && Boolean(isSignedIn), retry: false },
  });
  const updateStatus = useUpdateBookingStatus();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const signedIn = Boolean(isSignedIn);
  const isLoading = !isLoaded || (signedIn && (accountQuery.isPending || bookingsQuery.isPending));
  const statusCode = getStatusCode(bookingsQuery.error) ?? getStatusCode(accountQuery.error);
  const isWrongRole = accountQuery.isSuccess && accountQuery.data.role === 'customer';

  const update = async (booking: BookingRecord, status: 'accepted' | 'declined') => {
    if (activeId) return;
    setActiveId(booking.id);
    try {
      await updateStatus.mutateAsync({
        bookingId: booking.id,
        data: { status, ...(notes[booking.id]?.trim() ? { ownerNote: notes[booking.id].trim() } : {}) },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListBusinessBookingsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getListMyBookingsQueryKey() }),
      ]);
      setNotes((current) => ({ ...current, [booking.id]: '' }));
    } catch (error) {
      const code = getStatusCode(error);
      Alert.alert(
        code === 401 ? 'Hisobga qayta kiring' : code === 403 ? 'Huquq tasdiqlanmadi' : code === 409 ? 'So‘rov allaqachon ko‘rib chiqilgan' : 'Holat o‘zgarmadi',
        code === 401 ? 'Kirish muddati tugagan. Qayta kirib ko‘ring.' : code === 403 ? 'Bu so‘rov sizga tegishli emas yoki biznes egasi huquqi yo‘q.' : code === 409 ? 'Ro‘yxatni yangilab, so‘rovning joriy holatini tekshiring.' : 'Aloqani tekshirib, qayta urinib ko‘ring.',
      );
    } finally {
      setActiveId(null);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: colors.background }]} accessibilityRole="progressbar" accessibilityLabel="So‘rovlar yuklanmoqda">
        <View style={[styles.skeletonTitle, { backgroundColor: colors.softBlue }]} />
        {[0, 1].map((item) => <View key={item} style={[styles.skeletonCard, { backgroundColor: colors.white, borderColor: colors.border }]}><View style={[styles.skeletonIcon, { backgroundColor: colors.softBlue }]} /><View style={{ flex: 1, gap: 9 }}><View style={[styles.skeletonLine, { backgroundColor: colors.softBlue }]} /><View style={[styles.skeletonLineShort, { backgroundColor: colors.softBlue }]} /></View></View>)}
      </View>
    );
  }

  if (!signedIn) {
    return (
      <View style={[styles.stateScreen, { backgroundColor: colors.background, paddingHorizontal: 24 }]}>
        <View style={[styles.stateIcon, { backgroundColor: colors.softBlue }]}><Feather name="lock" size={25} color={colors.primary} /></View>
        <Text style={[styles.stateTitle, { color: colors.foreground }]}>Kirish kerak</Text>
        <Text style={[styles.stateCopy, { color: colors.mutedForeground }]}>Biznesga kelgan vaqt so‘rovlarini ko‘rish uchun hisobingizga kiring.</Text>
        <PrimaryButton title="Kirish" icon="log-in" onPress={() => router.push('/business-auth')} style={styles.stateButton} />
      </View>
    );
  }

  if (isWrongRole || statusCode === 403) {
    return (
      <View style={[styles.stateScreen, { backgroundColor: colors.background, paddingHorizontal: 24 }]}>
        <View style={[styles.stateIcon, { backgroundColor: colors.softOrange }]}><Feather name="shield" size={25} color={colors.warning} /></View>
        <Text style={[styles.stateTitle, { color: colors.foreground }]}>Biznes egasi huquqi kerak</Text>
        <Text style={[styles.stateCopy, { color: colors.mutedForeground }]}>So‘rovlar faqat hisobingizga tegishli bizneslar uchun ko‘rsatiladi.</Text>
        <Pressable accessibilityRole="button" onPress={() => router.replace('/business-account')}><Text style={[styles.linkText, { color: colors.primary }]}>Biznes hisobimga qaytish</Text></Pressable>
      </View>
    );
  }

  if (statusCode === 401) {
    return (
      <View style={[styles.stateScreen, { backgroundColor: colors.background, paddingHorizontal: 24 }]}>
        <Feather name="lock" size={30} color={colors.error} />
        <Text style={[styles.stateTitle, { color: colors.foreground }]}>Hisobga qayta kiring</Text>
        <Text style={[styles.stateCopy, { color: colors.mutedForeground }]}>Server hisobingizni tasdiqlay olmadi.</Text>
        <PrimaryButton title="Kirish" icon="log-in" onPress={() => router.push('/business-auth')} style={styles.stateButton} />
      </View>
    );
  }

  if (bookingsQuery.isError || accountQuery.isError) {
    return (
      <View style={[styles.stateScreen, { backgroundColor: colors.background, paddingHorizontal: 24 }]}>
        <Feather name="wifi-off" size={30} color={colors.error} />
        <Text style={[styles.stateTitle, { color: colors.foreground }]}>So‘rovlar yuklanmadi</Text>
        <Text style={[styles.stateCopy, { color: colors.mutedForeground }]}>Aloqani tekshirib, qayta urinib ko‘ring.</Text>
        <PrimaryButton title="Qayta urinish" icon="refresh-cw" onPress={() => { void accountQuery.refetch(); void bookingsQuery.refetch(); }} style={styles.stateButton} />
      </View>
    );
  }

  const requests = bookingsQuery.data ?? [];
  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: topContentInset(insets.top) + 14, paddingBottom: bottomContentInset(insets.bottom) + 28, paddingHorizontal: 20 }}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Ortga" onPress={() => router.back()} style={[styles.iconButton, { backgroundColor: colors.white, borderColor: colors.border }]}><Feather name="arrow-left" size={19} color={colors.foreground} /></Pressable>
          <Text style={[styles.title, { color: colors.foreground }]}>Kelgan so‘rovlar</Text>
          <View style={[styles.countPill, { backgroundColor: colors.softBlue }]}><Text style={[styles.countText, { color: colors.primary }]}>{requests.filter((item) => item.status === 'pending').length}</Text></View>
        </View>
        <Text style={[styles.intro, { color: colors.mutedForeground }]}>Bizneslaringizga kelgan uchrashuv so‘rovlari. Javobingiz mijozga ko‘rinadi.</Text>
        {requests.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.white, borderColor: colors.border }]}>
            <View style={[styles.stateIcon, { backgroundColor: colors.softGreen }]}><Feather name="inbox" size={25} color={colors.success} /></View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Hozircha yangi so‘rov yo‘q</Text>
            <Text style={[styles.emptyCopy, { color: colors.mutedForeground }]}>Yangi so‘rovlar kelganda shu sahifada ko‘rasiz.</Text>
          </View>
        ) : requests.map((request) => (
          <RequestCard
            key={request.id}
            booking={request}
            note={notes[request.id] ?? ''}
            onNoteChange={(value) => setNotes((current) => ({ ...current, [request.id]: value }))}
            busy={activeId === request.id}
            onUpdate={(status) => void update(request, status)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function RequestCard({ booking, note, onNoteChange, busy, onUpdate }: {
  booking: BookingRecord;
  note: string;
  onNoteChange: (value: string) => void;
  busy: boolean;
  onUpdate: (status: 'accepted' | 'declined') => void;
}) {
  const colors = useColors();
  const date = new Date(booking.startsAt);
  const pending = booking.status === 'pending';
  return (
    <View style={[styles.requestCard, { backgroundColor: colors.white, borderColor: colors.border }]}>
      <View style={styles.cardHeading}>
        <View style={[styles.dateIcon, { backgroundColor: colors.softBlue }]}><Feather name="calendar" size={18} color={colors.primary} /></View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.customer, { color: colors.foreground }]}>Uchrashuv so‘rovi</Text>
          <Text style={[styles.service, { color: colors.primary }]}>{booking.businessName} · {booking.serviceName}</Text>
        </View>
        <StatusPill status={booking.status} />
      </View>
      <View style={[styles.dateLine, { backgroundColor: colors.background }]}>
        <Feather name="clock" size={15} color={colors.primary} />
        <Text style={[styles.dateText, { color: colors.foreground }]}>{formatDate(date)} · {formatTime(date)}</Text>
      </View>
      {booking.customerNote ? <View style={styles.noteBlock}><Text style={[styles.label, { color: colors.mutedForeground }]}>Mijoz izohi</Text><Text style={[styles.customerNote, { color: colors.foreground }]}>{booking.customerNote}</Text></View> : null}
      {booking.ownerNote ? <View style={[styles.replyBlock, { backgroundColor: colors.softGreen }]}><Text style={[styles.customerNote, { color: colors.foreground }]}>Sizning javobingiz: {booking.ownerNote}</Text></View> : null}
      {pending ? (
        <>
          <TextInput accessibilityLabel="Mijozga javob izohi, ixtiyoriy" value={note} onChangeText={onNoteChange} maxLength={1000} placeholder="Javob izohi (ixtiyoriy)" placeholderTextColor={colors.mutedForeground} style={[styles.noteInput, { backgroundColor: colors.background, borderColor: colors.input, color: colors.foreground }]} />
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" accessibilityLabel="So‘rovni rad etish" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => onUpdate('declined')} style={[styles.declineButton, { borderColor: colors.border, opacity: busy ? 0.6 : 1 }]}>
              {busy ? <ActivityIndicator size="small" color={colors.mutedForeground} /> : <Feather name="x" size={16} color={colors.error} />}
              <Text style={[styles.declineText, { color: colors.error }]}>Rad etish</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="So‘rovni qabul qilish" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => onUpdate('accepted')} style={[styles.acceptButton, { backgroundColor: colors.primary, opacity: busy ? 0.6 : 1 }]}>
              <Feather name="check" size={16} color={colors.primaryForeground} />
              <Text style={[styles.acceptText, { color: colors.primaryForeground }]}>{busy ? 'Saqlanmoqda…' : 'Qabul qilish'}</Text>
            </Pressable>
          </View>
        </>
      ) : null}
    </View>
  );
}

function StatusPill({ status }: { status: BookingRecord['status'] }) {
  const colors = useColors();
  const label = status === 'accepted' ? 'Qabul qilindi' : status === 'declined' ? 'Rad etildi' : 'Kutilmoqda';
  const ink = status === 'accepted' ? colors.success : status === 'declined' ? colors.error : colors.warning;
  const background = status === 'accepted' ? colors.softGreen : status === 'declined' ? colors.softRose : colors.softOrange;
  return <View style={[styles.statusPill, { backgroundColor: background }]}><Text style={[styles.statusText, { color: ink }]}>{label}</Text></View>;
}

function formatDate(date: Date) {
  return `${date.getDate()} ${['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentyabr', 'Oktabr', 'Noyabr', 'Dekabr'][date.getMonth()]}, ${date.getFullYear()}`;
}
function formatTime(date: Date) { return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`; }
function getStatusCode(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const value = (error as { status?: unknown; response?: { status?: unknown } }).status ?? (error as { response?: { status?: unknown } }).response?.status;
  return typeof value === 'number' ? value : undefined;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  stateScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
  loadingScreen: { flex: 1, paddingHorizontal: 20, paddingTop: 70, gap: 12 },
  skeletonTitle: { width: 190, height: 24, borderRadius: 8, marginBottom: 7 },
  skeletonCard: { minHeight: 104, borderRadius: 18, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  skeletonIcon: { width: 42, height: 42, borderRadius: 14 },
  skeletonLine: { width: '78%', height: 12, borderRadius: 8 },
  skeletonLineShort: { width: '53%', height: 10, borderRadius: 8 },
  stateIcon: { width: 62, height: 62, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  stateTitle: { fontFamily: 'Inter_700Bold', fontSize: 19, lineHeight: 25, textAlign: 'center', marginTop: 5 },
  stateCopy: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20, textAlign: 'center' },
  stateButton: { width: '100%', marginTop: 8 },
  linkText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, padding: 10 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  iconButton: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'Inter_700Bold', fontSize: 19, lineHeight: 25 },
  countPill: { minWidth: 30, height: 30, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  countText: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  intro: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20, marginBottom: 18 },
  emptyCard: { borderWidth: 1, borderRadius: 20, padding: 22, alignItems: 'center', gap: 8, marginTop: 16 },
  emptyTitle: { fontFamily: 'Inter_700Bold', fontSize: 16, textAlign: 'center' },
  emptyCopy: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  requestCard: { borderRadius: 18, borderWidth: 1, padding: 14, marginBottom: 12 },
  cardHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dateIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  customer: { fontFamily: 'Inter_700Bold', fontSize: 14, lineHeight: 19 },
  service: { fontFamily: 'Inter_600SemiBold', fontSize: 11, lineHeight: 16, marginTop: 1 },
  statusPill: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 5 },
  statusText: { fontFamily: 'Inter_600SemiBold', fontSize: 9 },
  dateLine: { minHeight: 38, borderRadius: 11, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, marginTop: 13 },
  dateText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  noteBlock: { marginTop: 12 },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 10, marginBottom: 3 },
  customerNote: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 },
  replyBlock: { borderRadius: 10, padding: 9, marginTop: 10 },
  noteInput: { minHeight: 44, borderRadius: 11, borderWidth: 1, paddingHorizontal: 11, fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 12 },
  actions: { flexDirection: 'row', gap: 9, marginTop: 10 },
  declineButton: { flex: 1, minHeight: 44, borderRadius: 12, borderWidth: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7 },
  declineText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  acceptButton: { flex: 1.25, minHeight: 44, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7 },
  acceptText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
});
