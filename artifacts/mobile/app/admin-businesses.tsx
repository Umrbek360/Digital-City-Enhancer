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
  getGetAdminDashboardQueryKey,
  getGetCurrentAccountQueryKey,
  getListAdminBusinessesQueryKey,
  getListMyBusinessesQueryKey,
  getListPublicBusinessesQueryKey,
  getGetPublicBusinessQueryKey,
  useGetAdminDashboard,
  useGetCurrentAccount,
  useListAdminBusinesses,
  useReviewBusiness,
  type BusinessRecord,
} from '@workspace/api-client-react';

const pendingParams = { status: 'pending' as const };

export default function AdminBusinessesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { isLoaded, isSignedIn } = useAuth();
  const accountQuery = useGetCurrentAccount({
    query: { queryKey: getGetCurrentAccountQueryKey(), enabled: isLoaded && Boolean(isSignedIn), retry: false },
  });
  const isAdmin = accountQuery.data?.role === 'admin';
  const dashboardQuery = useGetAdminDashboard({
    query: { queryKey: getGetAdminDashboardQueryKey(), enabled: Boolean(isAdmin), retry: false },
  });
  const businessesQuery = useListAdminBusinesses(pendingParams, {
    query: { queryKey: getListAdminBusinessesQueryKey(pendingParams), enabled: Boolean(isAdmin), retry: false },
  });
  const reviewBusiness = useReviewBusiness();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const statusCode = getStatusCode(accountQuery.error) ?? getStatusCode(dashboardQuery.error) ?? getStatusCode(businessesQuery.error);

  const review = async (record: BusinessRecord, status: 'approved' | 'rejected') => {
    if (reviewingId) return;
    setReviewingId(record.id);
    try {
      await reviewBusiness.mutateAsync({
        businessId: record.id,
        data: { status, ...(notes[record.id]?.trim() ? { adminNote: notes[record.id].trim() } : {}) },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListAdminBusinessesQueryKey(pendingParams) }),
        queryClient.invalidateQueries({ queryKey: getListAdminBusinessesQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetAdminDashboardQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getListPublicBusinessesQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getListMyBusinessesQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetPublicBusinessQueryKey(record.id) }),
      ]);
    } catch (error) {
      const code = getStatusCode(error);
      Alert.alert(
        code === 401 ? 'Hisobga qayta kiring' : code === 403 ? 'Admin huquqi kerak' : 'Holat saqlanmadi',
        code === 401 ? 'Kirish muddati tugagan. Qayta kirib ko‘ring.' : code === 403 ? 'Server admin huquqini tasdiqlamadi.' : 'Internetni tekshirib, qayta urinib ko‘ring.',
      );
    } finally {
      setReviewingId(null);
    }
  };

  if (!isLoaded || (isSignedIn && accountQuery.isPending) || (isAdmin && (dashboardQuery.isPending || businessesQuery.isPending))) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: colors.background }]} accessibilityRole="progressbar" accessibilityLabel="Arizalar tekshirilmoqda">
        <View style={[styles.skeletonTitle, { backgroundColor: colors.softBlue }]} />
        <View style={[styles.skeletonSummary, { backgroundColor: colors.softBlue }]} />
        {[0, 1].map((item) => <View key={item} style={[styles.skeletonCard, { backgroundColor: colors.white, borderColor: colors.border }]}><View style={[styles.skeletonIcon, { backgroundColor: colors.softBlue }]} /><View style={{ flex: 1, gap: 9 }}><View style={[styles.skeletonLine, { backgroundColor: colors.softBlue }]} /><View style={[styles.skeletonLineShort, { backgroundColor: colors.softBlue }]} /></View></View>)}
      </View>
    );
  }
  if (!isSignedIn) {
    return (
      <View style={[styles.stateScreen, { backgroundColor: colors.background, paddingHorizontal: 24 }]}>
        <View style={[styles.stateIcon, { backgroundColor: colors.softBlue }]}><Feather name="lock" size={25} color={colors.primary} /></View>
        <Text style={[styles.stateTitle, { color: colors.foreground }]}>Admin hisobi kerak</Text>
        <Text style={[styles.stateCopy, { color: colors.mutedForeground }]}>Biznes arizalarini ko‘rib chiqish uchun hisobingizga kiring.</Text>
        <PrimaryButton title="Kirish" icon="log-in" onPress={() => router.push('/business-auth')} style={styles.stateButton} />
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
  if (statusCode === 403 || (accountQuery.isSuccess && !isAdmin)) {
    return (
      <View style={[styles.stateScreen, { backgroundColor: colors.background, paddingHorizontal: 24 }]}>
        <View style={[styles.stateIcon, { backgroundColor: colors.softOrange }]}><Feather name="shield" size={25} color={colors.warning} /></View>
        <Text style={[styles.stateTitle, { color: colors.foreground }]}>Ruxsat berilmagan</Text>
        <Text style={[styles.stateCopy, { color: colors.mutedForeground }]}>Faqat administrator biznes arizalarini tasdiqlashi yoki rad etishi mumkin.</Text>
        <Pressable accessibilityRole="button" onPress={() => router.replace('/business-account')}><Text style={[styles.linkText, { color: colors.primary }]}>Hisobimga qaytish</Text></Pressable>
      </View>
    );
  }
  if (accountQuery.isError || dashboardQuery.isError || businessesQuery.isError) {
    return (
      <View style={[styles.stateScreen, { backgroundColor: colors.background, paddingHorizontal: 24 }]}>
        <Feather name="wifi-off" size={30} color={colors.error} />
        <Text style={[styles.stateTitle, { color: colors.foreground }]}>Arizalarni yuklab bo‘lmadi</Text>
        <Text style={[styles.stateCopy, { color: colors.mutedForeground }]}>Internetni tekshirib, qayta urinib ko‘ring.</Text>
        <PrimaryButton title="Qayta urinish" icon="refresh-cw" onPress={() => { void accountQuery.refetch(); void dashboardQuery.refetch(); void businessesQuery.refetch(); }} style={styles.stateButton} />
      </View>
    );
  }

  const dashboard = dashboardQuery.data;
  const records = businessesQuery.data ?? [];
  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: topContentInset(insets.top) + 14, paddingBottom: bottomContentInset(insets.bottom) + 30, paddingHorizontal: 20 }}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Ortga" onPress={() => router.back()} style={[styles.iconButton, { backgroundColor: colors.white, borderColor: colors.border }]}><Feather name="arrow-left" size={19} color={colors.foreground} /></Pressable>
          <Text style={[styles.title, { color: colors.foreground }]}>Biznes tekshiruvi</Text>
          <View style={{ width: 42 }} />
        </View>
        <Text style={[styles.intro, { color: colors.mutedForeground }]}>Katalogga qo‘shilish so‘rovlarini tekshirib, qaroringizni biznes egasiga yuboring.</Text>
        <View style={[styles.summaryCard, { backgroundColor: colors.primary }]}>
          <View style={styles.summaryTop}>
            <View>
              <Text style={[styles.summaryLabel, { color: colors.primaryForeground }]}>KO‘RIB CHIQILISHI KERAK</Text>
              <Text style={[styles.pendingCount, { color: colors.primaryForeground }]}>{dashboard?.pending ?? 0}</Text>
            </View>
            <View style={[styles.summaryIcon, { backgroundColor: colors.primaryForeground + '22' }]}><Feather name="clipboard" size={20} color={colors.primaryForeground} /></View>
          </View>
          <View style={[styles.summaryStats, { borderTopColor: colors.primaryForeground + '33' }]}>
            <Text style={[styles.summaryMeta, { color: colors.primaryForeground }]}>Jami {dashboard?.total ?? 0}</Text>
            <Text style={[styles.summaryMeta, { color: colors.primaryForeground }]}>Tasdiqlangan {dashboard?.approved ?? 0}</Text>
            <Text style={[styles.summaryMeta, { color: colors.primaryForeground }]}>Rad etilgan {dashboard?.rejected ?? 0}</Text>
          </View>
        </View>
        <View style={styles.listHeading}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Yangi arizalar</Text>
          <View style={[styles.pendingTag, { backgroundColor: colors.softOrange }]}><Text style={[styles.pendingTagText, { color: colors.warning }]}>{records.length} ta</Text></View>
        </View>
        {records.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.white, borderColor: colors.border }]}>
            <View style={[styles.stateIcon, { backgroundColor: colors.softGreen }]}><Feather name="check" size={25} color={colors.success} /></View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Kutilayotgan ariza yo‘q</Text>
            <Text style={[styles.emptyCopy, { color: colors.mutedForeground }]}>Yangi bizneslar tekshiruvga yuborilganda shu yerda ko‘rinadi.</Text>
          </View>
        ) : records.map((record) => (
          <BusinessReviewCard
            key={record.id}
            record={record}
            note={notes[record.id] ?? ''}
            onNoteChange={(value) => setNotes((current) => ({ ...current, [record.id]: value }))}
            busy={reviewingId === record.id}
            onReview={(status) => void review(record, status)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function BusinessReviewCard({ record, note, onNoteChange, busy, onReview }: {
  record: BusinessRecord;
  note: string;
  onNoteChange: (value: string) => void;
  busy: boolean;
  onReview: (status: 'approved' | 'rejected') => void;
}) {
  const colors = useColors();
  return (
    <View style={[styles.businessCard, { backgroundColor: colors.white, borderColor: colors.border }]}>
      <View style={styles.businessHeading}>
        <View style={[styles.categoryIcon, { backgroundColor: colors.softBlue }]}><Feather name={categoryIcon(record.category)} size={17} color={colors.primary} /></View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.category, { color: colors.primary }]}>{record.category}</Text>
          <Text style={[styles.businessName, { color: colors.foreground }]}>{record.name}</Text>
        </View>
      </View>
      <View style={[styles.ownerBox, { backgroundColor: colors.background }]}>
        <Text style={[styles.ownerName, { color: colors.foreground }]}>{record.ownerName}</Text>
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>{record.ownerEmail}</Text>
      </View>
      <View style={styles.infoRow}><Feather name="phone" size={14} color={colors.primary} /><Text style={[styles.meta, { color: colors.foreground }]}>{record.phone}</Text></View>
      <View style={styles.infoRow}><Feather name="map-pin" size={14} color={colors.primary} /><Text style={[styles.meta, { color: colors.foreground, flex: 1 }]}>{record.address}</Text></View>
      {record.hours ? <View style={styles.infoRow}><Feather name="clock" size={14} color={colors.primary} /><Text style={[styles.meta, { color: colors.foreground }]}>{record.hours}</Text></View> : null}
      <Text style={[styles.description, { color: colors.mutedForeground }]}>{record.description || 'Biznes haqida izoh berilmagan.'}</Text>
      <TextInput
        accessibilityLabel={`${record.name} uchun admin izohi, ixtiyoriy`}
        value={note}
        onChangeText={onNoteChange}
        maxLength={1000}
        placeholder="Admin izohi (ixtiyoriy)"
        placeholderTextColor={colors.mutedForeground}
        multiline
        style={[styles.noteInput, { backgroundColor: colors.background, borderColor: colors.input, color: colors.foreground }]}
      />
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" accessibilityLabel="Biznes arizasini rad etish" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => onReview('rejected')} style={[styles.rejectButton, { borderColor: colors.border, opacity: busy ? 0.6 : 1 }]}>
          {busy ? <ActivityIndicator size="small" color={colors.mutedForeground} /> : <Feather name="x" size={16} color={colors.error} />}
          <Text style={[styles.rejectText, { color: colors.error }]}>Rad etish</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Biznesni tasdiqlash" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => onReview('approved')} style={[styles.approveButton, { backgroundColor: colors.primary, opacity: busy ? 0.6 : 1 }]}>
          <Feather name="check" size={16} color={colors.primaryForeground} />
          <Text style={[styles.approveText, { color: colors.primaryForeground }]}>{busy ? 'Saqlanmoqda…' : 'Tasdiqlash'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function categoryIcon(category: BusinessRecord['category']): keyof typeof Feather.glyphMap {
  if (category === 'Ovqatlanish') return 'coffee';
  if (category === 'Go‘zallik') return 'scissors';
  if (category === 'Sog‘liq') return 'heart';
  return 'book-open';
}

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
  skeletonSummary: { height: 115, borderRadius: 20, marginBottom: 10 },
  skeletonCard: { minHeight: 104, borderRadius: 18, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  skeletonIcon: { width: 42, height: 42, borderRadius: 14 },
  skeletonLine: { width: '78%', height: 12, borderRadius: 8 },
  skeletonLineShort: { width: '53%', height: 10, borderRadius: 8 },
  stateIcon: { width: 62, height: 62, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  stateTitle: { fontFamily: 'Inter_700Bold', fontSize: 19, lineHeight: 25, textAlign: 'center', marginTop: 5 },
  stateCopy: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20, textAlign: 'center' },
  stateButton: { width: '100%', marginTop: 8 },
  linkText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, padding: 10 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 17 },
  iconButton: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'Inter_700Bold', fontSize: 19, lineHeight: 25 },
  intro: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20, marginBottom: 17 },
  summaryCard: { borderRadius: 20, padding: 16, marginBottom: 23 },
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 0.8 },
  pendingCount: { fontFamily: 'Inter_700Bold', fontSize: 34, lineHeight: 40, marginTop: 4 },
  summaryIcon: { width: 43, height: 43, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  summaryStats: { borderTopWidth: 1, marginTop: 13, paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 },
  summaryMeta: { fontFamily: 'Inter_500Medium', fontSize: 9 },
  listHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 17, lineHeight: 23 },
  pendingTag: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6 },
  pendingTagText: { fontFamily: 'Inter_700Bold', fontSize: 10 },
  emptyCard: { borderWidth: 1, borderRadius: 19, padding: 22, alignItems: 'center', gap: 8 },
  emptyTitle: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  emptyCopy: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  businessCard: { borderRadius: 18, borderWidth: 1, padding: 14, marginBottom: 12 },
  businessHeading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  categoryIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  category: { fontFamily: 'Inter_600SemiBold', fontSize: 9, letterSpacing: 0.6, textTransform: 'uppercase' },
  businessName: { fontFamily: 'Inter_700Bold', fontSize: 16, lineHeight: 21, marginTop: 2 },
  ownerBox: { borderRadius: 11, padding: 10, marginBottom: 9 },
  ownerName: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  meta: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  description: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 19, marginTop: 12 },
  noteInput: { minHeight: 48, borderRadius: 11, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 10, fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 12 },
  actions: { flexDirection: 'row', gap: 9, marginTop: 10 },
  rejectButton: { flex: 1, minHeight: 44, borderRadius: 12, borderWidth: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7 },
  rejectText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  approveButton: { flex: 1.2, minHeight: 44, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7 },
  approveText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
});
