import { Feather } from '@expo/vector-icons';
import { useAuth } from '@clerk/expo';
import { router } from 'expo-router';
import React from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getBusiness } from '@/data/businesses';
import { useCity } from '@/context/CityContext';
import { useColors } from '@/hooks/useColors';
import { bottomContentInset, topContentInset } from '@/hooks/usePlatformInsets';
import { getListMyBookingsQueryKey, useListMyBookings, type BookingRecord } from '@workspace/api-client-react';
import type { Booking } from '@/context/CityContext';

export default function BookingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isLoaded, isSignedIn } = useAuth();
  const { bookings } = useCity();
  const requestsQuery = useListMyBookings({
    query: { queryKey: getListMyBookingsQueryKey(), enabled: isLoaded && Boolean(isSignedIn), retry: false },
  });
  const sampleBookings = bookings.filter((item) => getBusiness(item.businessId)?.isExample === true);
  const serverBookings = requestsQuery.data ?? [];
  const errorStatus = getStatusCode(requestsQuery.error);
  const serverError = requestsQuery.isError;

  if (!isLoaded || (isSignedIn && requestsQuery.isPending)) {
    return (
      <View style={[styles.stateScreen, { backgroundColor: colors.background }]} accessibilityRole="progressbar">
        <View style={[styles.skeleton, { backgroundColor: colors.softBlue }]} />
        <View style={[styles.skeletonLine, { backgroundColor: colors.softBlue }]} />
        <View style={[styles.skeletonLineShort, { backgroundColor: colors.softBlue }]} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <FlatList
        data={serverBookings}
        keyExtractor={(item) => item.id}
        scrollEnabled={serverBookings.length > 0 || sampleBookings.length > 0}
        contentContainerStyle={{ paddingTop: topContentInset(insets.top) + 20, paddingBottom: bottomContentInset(insets.bottom) + 100, paddingHorizontal: 20, flexGrow: 1 }}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <View>
                <Text style={[styles.kicker, { color: colors.primary }]}>BIZNESGA YUBORILGAN</Text>
                <Text style={[styles.title, { color: colors.foreground }]}>Vaqt so‘rovlari</Text>
              </View>
              <View style={[styles.headerIcon, { backgroundColor: colors.softGreen }]}><Feather name="calendar" size={19} color={colors.success} /></View>
            </View>
            {!isSignedIn ? (
              <View style={[styles.signInNotice, { backgroundColor: colors.white, borderColor: colors.border }]}>
                <Feather name="lock" size={16} color={colors.primary} />
                <Text style={[styles.noticeText, { color: colors.mutedForeground }]}>Biznesga yuborilgan so‘rovlaringizni ko‘rish uchun hisobingizga kiring.</Text>
                <Pressable accessibilityRole="button" onPress={() => router.push('/business-auth')} style={styles.noticeAction}><Text style={[styles.noticeActionText, { color: colors.primary }]}>Kirish</Text></Pressable>
              </View>
            ) : serverError ? (
              <View style={[styles.errorBox, { backgroundColor: colors.softRose }]}>
                <Feather name={errorStatus === 401 ? 'lock' : errorStatus === 403 ? 'slash' : 'wifi-off'} size={17} color={colors.error} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.errorTitle, { color: colors.error }]}>{errorStatus === 401 ? 'Hisobga qayta kiring' : errorStatus === 403 ? 'So‘rovlarni ko‘rish huquqi yo‘q' : 'So‘rovlar yuklanmadi'}</Text>
                  <Text style={[styles.errorCopy, { color: colors.foreground }]}>{errorStatus === 401 ? 'Kirish muddati tugagan. Qayta kirib ko‘ring.' : errorStatus === 403 ? 'Hisobingizda mijoz so‘rovlari ko‘rinmaydi.' : 'Internetni tekshirib, qayta urinib ko‘ring.'}</Text>
                </View>
                {errorStatus === 401 ? <Pressable accessibilityRole="button" onPress={() => router.push('/business-auth')}><Text style={[styles.noticeActionText, { color: colors.primary }]}>Kirish</Text></Pressable>
                  : errorStatus === 403 ? null : <Pressable accessibilityRole="button" onPress={() => void requestsQuery.refetch()}><Text style={[styles.noticeActionText, { color: colors.primary }]}>Qayta urinish</Text></Pressable>}
              </View>
            ) : null}
            {serverBookings.length > 0 ? <Text style={[styles.sectionHeading, { color: colors.foreground }]}>Yuborilgan so‘rovlar</Text> : null}
          </View>
        }
        renderItem={({ item }) => <ServerBookingCard booking={item} />}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListFooterComponent={
          <View>
            {sampleBookings.length > 0 ? (
              <View style={styles.sampleSection}>
                <View style={styles.sampleHeading}>
                  <Text style={[styles.sectionHeading, { color: colors.foreground }]}>Qurilmadagi namunalar</Text>
                  <View style={[styles.sampleTag, { backgroundColor: colors.softOrange }]}><Text style={[styles.sampleTagText, { color: colors.warning }]}>FAQAT SHU QURILMADA</Text></View>
                </View>
                <Text style={[styles.sampleIntro, { color: colors.mutedForeground }]}>Bu so‘rovlar biznesga yuborilmagan va server holatini aks ettirmaydi.</Text>
                {sampleBookings.map((booking) => <SampleBookingCard key={booking.id} booking={booking} />)}
              </View>
            ) : null}
            {serverBookings.length === 0 && sampleBookings.length === 0 && !(isSignedIn && serverError) ? (
              <View style={styles.empty}>
                <View style={[styles.emptyIcon, { backgroundColor: colors.softBlue }]}><Feather name="calendar" size={26} color={colors.primary} /></View>
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Hozircha so‘rov yo‘q</Text>
                <Text style={[styles.emptyCopy, { color: colors.mutedForeground }]}>Tasdiqlangan biznes sahifasidan vaqt so‘rang. Javob biznesdan kelganda shu yerda ko‘rasiz.</Text>
                <Pressable accessibilityRole="button" onPress={() => router.push('/map')} style={styles.emptyActionButton}><Text style={[styles.emptyAction, { color: colors.primary }]}>Bizneslarni ko‘rish</Text></Pressable>
              </View>
            ) : null}
          </View>
        }
      />
    </View>
  );
}

function ServerBookingCard({ booking }: { booking: BookingRecord }) {
  const colors = useColors();
  const date = new Date(booking.startsAt);
  const status = requestStatus(booking.status, colors);
  return (
    <View style={[styles.bookingCard, { backgroundColor: colors.white, borderColor: colors.border }]}>
      <DateBadge date={date} />
      <View style={styles.bookingCopy}>
        <View style={styles.bookingTop}>
          <Text style={[styles.bookingBusiness, { color: colors.foreground }]} numberOfLines={1}>{booking.businessName}</Text>
          <View style={[styles.statusBadge, { backgroundColor: status.background }]}>
            <View style={[styles.statusDot, { backgroundColor: status.color }]} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
        <Text style={[styles.bookingService, { color: colors.mutedForeground }]}>{booking.serviceName}</Text>
        <Text style={[styles.bookingMeta, { color: colors.foreground }]}>
          {formatTime(date)} · {booking.status === 'accepted' ? 'biznes tasdiqladi' : booking.status === 'declined' ? 'biznes rad etdi' : 'biznes javobi kutilmoqda'}
        </Text>
        {booking.customerNote ? <Text style={[styles.note, { color: colors.mutedForeground }]}>Izoh: {booking.customerNote}</Text> : null}
        {booking.ownerNote ? <Text style={[styles.ownerNote, { color: colors.primary }]}>Biznes javobi: {booking.ownerNote}</Text> : null}
      </View>
    </View>
  );
}

function SampleBookingCard({ booking }: { booking: Booking }) {
  const colors = useColors();
  const sample = getBusiness(booking.businessId);
  return (
    <View style={[styles.bookingCard, styles.sampleCard, { backgroundColor: colors.white, borderColor: colors.border }]}>
      <DateBadge date={booking.dateISO ? new Date(`${booking.dateISO}T${booking.time}:00`) : new Date()} />
      <View style={styles.bookingCopy}>
        <View style={styles.bookingTop}>
          <Text style={[styles.bookingBusiness, { color: colors.foreground }]} numberOfLines={1}>{booking.businessName}</Text>
          <View style={[styles.statusBadge, { backgroundColor: colors.softOrange }]}><Text style={[styles.statusText, { color: colors.warning }]}>Namuna</Text></View>
        </View>
        <Text style={[styles.bookingService, { color: colors.mutedForeground }]}>{booking.serviceName}</Text>
        <Text style={[styles.bookingMeta, { color: colors.foreground }]}>{booking.dateLabel} · {booking.time}</Text>
        <Text style={[styles.note, { color: colors.mutedForeground }]}>{sample?.name ?? 'Namuna biznes'} · so‘rov faqat qurilmada saqlangan</Text>
      </View>
    </View>
  );
}

function DateBadge({ date }: { date: Date }) {
  const colors = useColors();
  return (
    <View style={[styles.dateBlock, { backgroundColor: colors.softBlue }]}>
      <Text style={[styles.dateDay, { color: colors.primary }]}>{date.getDate()}</Text>
      <Text style={[styles.dateMonth, { color: colors.primary }]}>{monthShort(date.getMonth())}</Text>
    </View>
  );
}

function requestStatus(status: BookingRecord['status'], colors: ReturnType<typeof useColors>) {
  if (status === 'accepted') return { label: 'Qabul qilindi', color: colors.success, background: colors.softGreen };
  if (status === 'declined') return { label: 'Rad etildi', color: colors.error, background: colors.softRose };
  return { label: 'Kutilmoqda', color: colors.warning, background: colors.softOrange };
}

function monthShort(month: number) {
  return ['YAN', 'FEV', 'MAR', 'APR', 'MAY', 'IYN', 'IYL', 'AVG', 'SEN', 'OKT', 'NOY', 'DEK'][month];
}

function formatTime(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function getStatusCode(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const value = (error as { status?: unknown; response?: { status?: unknown } }).status
    ?? (error as { response?: { status?: unknown } }).response?.status;
  return typeof value === 'number' ? value : undefined;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  stateScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  skeleton: { width: 60, height: 60, borderRadius: 22 },
  skeletonLine: { width: '65%', height: 14, borderRadius: 10, marginTop: 8 },
  skeletonLineShort: { width: '42%', height: 11, borderRadius: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 },
  kicker: { fontFamily: 'Inter_700Bold', fontSize: 10, lineHeight: 14, letterSpacing: 1.5 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 29, lineHeight: 36, marginTop: 3 },
  headerIcon: { width: 43, height: 43, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  signInNotice: { minHeight: 66, borderRadius: 16, borderWidth: 1, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 18 },
  noticeText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 },
  noticeAction: { padding: 5 },
  noticeActionText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  errorBox: { borderRadius: 15, padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 9, marginBottom: 17 },
  errorTitle: { fontFamily: 'Inter_700Bold', fontSize: 12, lineHeight: 17 },
  errorCopy: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16, marginTop: 2 },
  sectionHeading: { fontFamily: 'Inter_700Bold', fontSize: 16, lineHeight: 22, marginTop: 16, marginBottom: 10 },
  bookingCard: { minHeight: 108, borderRadius: 18, borderWidth: 1, padding: 11, flexDirection: 'row', gap: 11 },
  sampleCard: { marginBottom: 9 },
  dateBlock: { width: 52, minHeight: 60, borderRadius: 14, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  dateDay: { fontFamily: 'Inter_700Bold', fontSize: 19, lineHeight: 24 },
  dateMonth: { fontFamily: 'Inter_700Bold', fontSize: 9, lineHeight: 13 },
  bookingCopy: { flex: 1, minWidth: 0, paddingVertical: 1 },
  bookingTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  bookingBusiness: { flex: 1, fontFamily: 'Inter_700Bold', fontSize: 13, lineHeight: 18 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 5 },
  statusDot: { width: 5, height: 5, borderRadius: 99 },
  statusText: { fontFamily: 'Inter_600SemiBold', fontSize: 9, lineHeight: 12 },
  bookingService: { fontFamily: 'Inter_500Medium', fontSize: 12, lineHeight: 16, marginTop: 4 },
  bookingMeta: { fontFamily: 'Inter_600SemiBold', fontSize: 11, lineHeight: 15, marginTop: 7 },
  note: { fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 15, marginTop: 6 },
  ownerNote: { fontFamily: 'Inter_600SemiBold', fontSize: 10, lineHeight: 15, marginTop: 5 },
  sampleSection: { marginTop: 10 },
  sampleHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 5 },
  sampleTag: { borderRadius: 7, paddingHorizontal: 7, paddingVertical: 5 },
  sampleTagText: { fontFamily: 'Inter_700Bold', fontSize: 8, letterSpacing: 0.4 },
  sampleIntro: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16, marginBottom: 10 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 96, gap: 10 },
  emptyIcon: { width: 64, height: 64, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginBottom: 3 },
  emptyTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, lineHeight: 24, textAlign: 'center' },
  emptyCopy: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  emptyAction: { fontFamily: 'Inter_600SemiBold', fontSize: 14, lineHeight: 20, marginTop: 5 },
  emptyActionButton: { paddingVertical: 6, paddingHorizontal: 10 },
});
