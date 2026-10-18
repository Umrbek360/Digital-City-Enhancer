import { Feather } from '@expo/vector-icons';
import { useAuth } from '@clerk/expo';
import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton } from '@/components/Ui';
import { getBusiness, mapPublicBusinessToDirectory } from '@/data/businesses';
import { useCity } from '@/context/CityContext';
import { useColors } from '@/hooks/useColors';
import { bottomContentInset, topContentInset } from '@/hooks/usePlatformInsets';
import {
  getGetPublicBusinessQueryKey,
  getListMyBookingsQueryKey,
  useCreateBooking,
  useGetPublicBusiness,
} from '@workspace/api-client-react';

const weekdays = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
const months = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];
const times = ['10:00', '11:30', '13:00', '15:30', '17:00'];

function makeDates(now = new Date()) {
  return [0, 1, 2].map((offset) => {
    const date = new Date(now);
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + offset);
    return {
      label: `${date.getDate()} ${months[date.getMonth()]}`,
      day: offset === 0 ? 'Bugun' : offset === 1 ? 'Ertaga' : weekdays[date.getDay()],
      isoDate: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
    };
  });
}

function availableTimesForDate(isoDate: string, now: number) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return times.filter((time) => {
    const [hour, minute] = time.split(':').map(Number);
    return new Date(year, month - 1, day, hour, minute).getTime() > now + 10 * 60 * 1000;
  });
}

export default function BookingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { isLoaded, isSignedIn } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const businessId = Array.isArray(id) ? id[0] : id ?? '';
  const sampleBusiness = getBusiness(businessId);
  const publicQuery = useGetPublicBusiness(businessId, {
    query: { queryKey: getGetPublicBusinessQueryKey(businessId), enabled: Boolean(businessId) && !sampleBusiness },
  });
  const business = sampleBusiness ?? (publicQuery.data ? mapPublicBusinessToDirectory(publicQuery.data) : undefined);
  const { addBooking, isReady } = useCity();
  const createBooking = useCreateBooking();
  const dates = useMemo(() => makeDates(), []);
  const [selectedService, setSelectedService] = useState(sampleBusiness?.services[0]?.name ?? '');
  const [customService, setCustomService] = useState('');
  const [selectedDate, setSelectedDate] = useState(0);
  const [selectedTime, setSelectedTime] = useState('11:30');
  const [clockNow, setClockNow] = useState(Date.now());
  const [customerNote, setCustomerNote] = useState('');
  const [sending, setSending] = useState(false);
  const availableTimes = useMemo(
    () => availableTimesForDate(dates[selectedDate].isoDate, clockNow),
    [clockNow, dates, selectedDate],
  );

  useEffect(() => {
    const timer = setInterval(() => setClockNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!availableTimes.includes(selectedTime)) {
      setSelectedTime(availableTimes[0] ?? '');
    }
  }, [availableTimes, selectedTime]);

  const chosenService = sampleBusiness ? selectedService : customService.trim();
  const submit = async () => {
    if (!business || sending || !chosenService || !availableTimes.includes(selectedTime)) return;
    if (!sampleBusiness && !isSignedIn) {
      const returnTo = `/business/${businessId}/book`;
      router.push({ pathname: '/business-auth', params: { returnTo } });
      return;
    }
    setSending(true);
    try {
      if (sampleBusiness?.isExample) {
        const saved = await addBooking({
          businessId: sampleBusiness.id,
          businessName: sampleBusiness.name,
          serviceName: chosenService,
          dateISO: dates[selectedDate].isoDate,
          dateLabel: dates[selectedDate].label,
          time: selectedTime,
        });
        if (!saved) throw new Error('DEVICE_SAVE');
        router.replace('/(tabs)/bookings');
        return;
      }
      if (!isSignedIn) {
        router.push({ pathname: '/business-auth', params: { returnTo: `/business/${businessId}/book` } });
        return;
      }
      const [year, month, day] = dates[selectedDate].isoDate.split('-').map(Number);
      const [hour, minute] = selectedTime.split(':').map(Number);
      const startsAt = new Date(year, month - 1, day, hour, minute).toISOString();
      await createBooking.mutateAsync({
        data: {
          businessId,
          serviceName: chosenService,
          startsAt,
          ...(customerNote.trim() ? { customerNote: customerNote.trim() } : {}),
        },
      });
      await queryClient.invalidateQueries({ queryKey: getListMyBookingsQueryKey() });
      router.replace('/(tabs)/bookings');
    } catch (error) {
      const status = getStatusCode(error);
      if (status === 401) {
        router.push({ pathname: '/business-auth', params: { returnTo: `/business/${businessId}/book` } });
      } else if (status === 403) {
        Alert.alert('So‘rov yuborilmadi', 'Bu biznesga vaqt so‘rovi yuborish huquqi berilmagan.');
      } else {
        Alert.alert('So‘rov yuborilmadi', error instanceof Error && error.message === 'DEVICE_SAVE'
          ? 'Namuna so‘rovini qurilmada saqlab bo‘lmadi. Qayta urinib ko‘ring.'
          : 'Aloqani tekshirib, birozdan so‘ng qayta urinib ko‘ring.');
      }
    } finally {
      setSending(false);
    }
  };

  if (!business && publicQuery.isPending) {
    return <View style={[styles.stateScreen, { backgroundColor: colors.background }]}><Text style={[styles.stateCopy, { color: colors.mutedForeground }]}>Biznes ma’lumotlari yuklanmoqda…</Text></View>;
  }
  if (!business) {
    return (
      <View style={[styles.stateScreen, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={30} color={colors.error} />
        <Text style={[styles.stateTitle, { color: colors.foreground }]}>{publicQuery.isError ? 'Biznes ma’lumotlarini yuklab bo‘lmadi' : 'Joy topilmadi'}</Text>
        {publicQuery.isError ? <Pressable accessibilityRole="button" onPress={() => void publicQuery.refetch()}><Text style={[styles.actionText, { color: colors.primary }]}>Qayta urinish</Text></Pressable> : null}
        <Pressable accessibilityRole="button" onPress={() => router.back()}><Text style={[styles.actionText, { color: colors.primary }]}>Ortga qaytish</Text></Pressable>
      </View>
    );
  }

  const isSample = Boolean(sampleBusiness?.isExample);
  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomContentInset(insets.bottom) + 112 }}>
        <View style={[styles.topBar, { paddingTop: topContentInset(insets.top) + 12 }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Ortga" onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.white, borderColor: colors.border }]}>
            <Feather name="arrow-left" size={20} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.topTitle, { color: colors.foreground }]}>Vaqt so‘rash</Text>
          <View style={{ width: 42 }} />
        </View>
        <View style={styles.content}>
          <View style={styles.businessRow}>
            <View style={[styles.businessIcon, { backgroundColor: colors.softBlue }]}><Feather name="map-pin" size={20} color={colors.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.businessName, { color: colors.foreground }]}>{business.name}</Text>
              <Text style={[styles.businessAddress, { color: colors.mutedForeground }]}>{business.address}</Text>
            </View>
          </View>
          <View style={[styles.notice, { backgroundColor: isSample ? colors.softOrange : colors.softGreen }]}>
            <Feather name={isSample ? 'info' : 'shield'} size={16} color={isSample ? colors.warning : colors.success} />
            <Text style={[styles.noticeText, { color: colors.foreground }]}>
              {isSample
                ? 'Namuna so‘rovi faqat shu qurilmada saqlanadi va biznesga yuborilmaydi.'
                : 'So‘rovingiz biznesga yuboriladi. Uchrashuv vaqti biznes tasdiqlagandan keyin yakuniy bo‘ladi.'}
            </Text>
          </View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Xizmat</Text>
          {isSample ? business.services.map((service) => (
            <Pressable key={service.id} accessibilityRole="radio" accessibilityState={{ checked: service.name === selectedService }} onPress={() => setSelectedService(service.name)} style={[styles.serviceOption, { backgroundColor: service.name === selectedService ? colors.softBlue : colors.white, borderColor: service.name === selectedService ? colors.primary : colors.border }]}>
              <View style={[styles.radio, { borderColor: service.name === selectedService ? colors.primary : colors.border }]}>{service.name === selectedService ? <View style={[styles.radioInner, { backgroundColor: colors.primary }]} /> : null}</View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionTitle, { color: colors.foreground }]}>{service.name}</Text>
                <Text style={[styles.optionDetail, { color: colors.mutedForeground }]}>{service.duration} · namuna</Text>
              </View>
              <Text style={[styles.optionPrice, { color: colors.foreground }]}>{service.price}</Text>
            </Pressable>
          )) : (
            <TextInput
              accessibilityLabel="Xizmat nomi"
              value={customService}
              onChangeText={setCustomService}
              placeholder="Masalan, soch turmaklash"
              placeholderTextColor={colors.mutedForeground}
              maxLength={160}
              style={[styles.input, { backgroundColor: colors.white, borderColor: colors.input, color: colors.foreground }]}
            />
          )}
          <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 22 }]}>Kun va vaqt</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateList}>
            {dates.map((date, index) => {
              const selected = index === selectedDate;
              return (
                <Pressable key={date.isoDate} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setSelectedDate(index)} style={[styles.dateChip, { backgroundColor: selected ? colors.primary : colors.white, borderColor: selected ? colors.primary : colors.border }]}>
                  <Text style={[styles.dateDay, { color: selected ? colors.white : colors.mutedForeground }]}>{date.day}</Text>
                  <Text style={[styles.dateValue, { color: selected ? colors.white : colors.foreground }]}>{date.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={styles.timeGrid}>
            {availableTimes.map((time) => {
              const selected = time === selectedTime;
              return <Pressable key={time} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setSelectedTime(time)} style={[styles.timeChip, { backgroundColor: selected ? colors.softBlue : colors.white, borderColor: selected ? colors.primary : colors.border }]}><Text style={[styles.timeText, { color: selected ? colors.primary : colors.foreground }]}>{time}</Text></Pressable>;
            })}
          </View>
          {availableTimes.length === 0 ? (
            <Text accessibilityRole="alert" style={[styles.stateCopy, { color: colors.mutedForeground }]}>Bugun uchun bo‘sh vaqt qolmadi. Boshqa kunni tanlang.</Text>
          ) : null}
          {!isSample ? (
            <>
              <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 22 }]}>Izoh <Text style={[styles.optional, { color: colors.mutedForeground }]}>ixtiyoriy</Text></Text>
              <TextInput
                accessibilityLabel="Biznes uchun izoh"
                value={customerNote}
                onChangeText={setCustomerNote}
                placeholder="Uchrashuv haqida qisqa izoh"
                placeholderTextColor={colors.mutedForeground}
                maxLength={1000}
                multiline
                textAlignVertical="top"
                style={[styles.noteInput, { backgroundColor: colors.white, borderColor: colors.input, color: colors.foreground }]}
              />
            </>
          ) : null}
          <View style={[styles.summary, { backgroundColor: colors.white, borderColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Tanlangan vaqt</Text>
              <Text style={[styles.summaryValue, { color: colors.foreground }]}>{dates[selectedDate].label} · {selectedTime || 'vaqt tanlanmagan'}</Text>
            </View>
            <Feather name="calendar" size={18} color={colors.primary} />
          </View>
          {!isSample && !isLoaded ? <Text style={[styles.stateCopy, { color: colors.mutedForeground }]}>Hisob holati tekshirilmoqda…</Text> : null}
        </View>
      </ScrollView>
      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: bottomContentInset(insets.bottom) + 10 }]}>
        <PrimaryButton
          title={sending || createBooking.isPending ? 'Yuborilmoqda…' : isSample ? 'Namuna so‘rovini saqlash' : isSignedIn ? 'So‘rovni yuborish' : 'Kirish va so‘rov yuborish'}
          icon={isSample ? 'save' : 'send'}
          onPress={() => void submit()}
          disabled={sending || createBooking.isPending || !availableTimes.includes(selectedTime) || (!isSample && (!isLoaded || !chosenService)) || (isSample && !isReady)}
          style={styles.confirmButton}
        />
      </View>
    </View>
  );
}

function getStatusCode(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const value = (error as { status?: unknown; response?: { status?: unknown } }).status
    ?? (error as { response?: { status?: unknown } }).response?.status;
  return typeof value === 'number' ? value : undefined;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  stateScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  stateTitle: { fontFamily: 'Inter_700Bold', fontSize: 19, lineHeight: 25, textAlign: 'center' },
  stateCopy: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 10 },
  actionText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, padding: 8 },
  topBar: { paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 18 },
  backButton: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontFamily: 'Inter_700Bold', fontSize: 17, lineHeight: 23 },
  content: { paddingHorizontal: 20 },
  businessRow: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 20 },
  businessIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  businessName: { fontFamily: 'Inter_700Bold', fontSize: 15, lineHeight: 20 },
  businessAddress: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 15, marginTop: 2 },
  notice: { borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 9, marginBottom: 22 },
  noticeText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, lineHeight: 24, marginBottom: 11 },
  serviceOption: { minHeight: 65, borderRadius: 15, borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, gap: 10, marginBottom: 8 },
  radio: { width: 19, height: 19, borderRadius: 99, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 9, height: 9, borderRadius: 99 },
  optionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13, lineHeight: 18 },
  optionDetail: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 15, marginTop: 2 },
  optionPrice: { fontFamily: 'Inter_700Bold', fontSize: 11 },
  input: { minHeight: 52, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, fontFamily: 'Inter_400Regular', fontSize: 14 },
  noteInput: { minHeight: 86, borderRadius: 14, borderWidth: 1, paddingHorizontal: 13, paddingTop: 12, fontFamily: 'Inter_400Regular', fontSize: 13 },
  optional: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  dateList: { gap: 8, paddingBottom: 11 },
  dateChip: { minWidth: 104, borderRadius: 15, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 11 },
  dateDay: { fontFamily: 'Inter_500Medium', fontSize: 10, lineHeight: 14 },
  dateValue: { fontFamily: 'Inter_700Bold', fontSize: 12, lineHeight: 17, marginTop: 2 },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeChip: { width: '30%', borderRadius: 12, borderWidth: 1, alignItems: 'center', paddingVertical: 10 },
  timeText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, lineHeight: 16 },
  summary: { borderRadius: 16, borderWidth: 1, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 21 },
  summaryLabel: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 15 },
  summaryValue: { fontFamily: 'Inter_600SemiBold', fontSize: 13, lineHeight: 18, marginTop: 3 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, paddingHorizontal: 20, paddingTop: 10 },
  confirmButton: { width: '100%' },
});
