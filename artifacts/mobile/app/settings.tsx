import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCity } from '@/context/CityContext';
import { useColors } from '@/hooks/useColors';
import { bottomContentInset, topContentInset } from '@/hooks/usePlatformInsets';
import { PushSetupError, usePushRegistration } from '@/hooks/usePushRegistration';
import { useState } from 'react';

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { notificationsEnabled, setNotificationsEnabled } = useCity();
  const { enablePush, disablePush, isBusy } = usePushRegistration();
  const [notificationError, setNotificationError] = useState<string | null>(null);

  const updateNotificationPreference = async (enabled: boolean) => {
    setNotificationError(null);
    try {
      if (enabled) {
        await enablePush();
      } else {
        await disablePush();
      }
      setNotificationsEnabled(enabled);
    } catch (error) {
      if (error instanceof PushSetupError && error.issue === 'permission-settings') {
        Alert.alert(
          'Ruxsat kerak',
          error.message,
          [
            { text: 'Bekor qilish', style: 'cancel' },
            { text: 'Sozlamalarni ochish', onPress: () => void Linking.openSettings().catch(() => undefined) },
          ],
        );
        return;
      }
      setNotificationError(error instanceof Error ? error.message : 'Qayta urinib ko‘ring.');
    }
  };

  return (
    <ScrollView style={[styles.screen, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingTop: topContentInset(insets.top) + 14, paddingBottom: bottomContentInset(insets.bottom) + 30 }} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Ortga" onPress={() => router.back()} style={[styles.back, { backgroundColor: colors.white, borderColor: colors.border }]}><Feather name="arrow-left" size={20} color={colors.foreground} /></Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>Sozlamalar</Text>
        <View style={{ width: 42 }} />
      </View>
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>BILDIRISHNOMALAR</Text>
      <View style={[styles.group, { backgroundColor: colors.white, borderColor: colors.border }]}>
        <ToggleRow icon="bell" title="Uchrashuv va biznes xabarlari" copy="So‘rov holati va biznes arizasi yangilanishlarini qurilmangizda oling." value={notificationsEnabled} onChange={updateNotificationPreference} disabled={isBusy} colors={colors} />
      </View>
      {notificationError ? (
        <Text accessibilityRole="alert" style={[styles.errorText, { color: colors.error }]}>{notificationError}</Text>
      ) : null}
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>XARITA</Text>
      <View style={[styles.infoRow, { backgroundColor: colors.white, borderColor: colors.border }]}>
        <View style={[styles.linkIcon, { backgroundColor: colors.softBlue }]}><Feather name="map" size={17} color={colors.primary} /></View>
        <View style={styles.copy}>
          <Text style={[styles.rowTitle, { color: colors.foreground }]}>Sxematik ko‘rinish</Text>
          <Text style={[styles.rowCopy, { color: colors.mutedForeground }]}>Aniq koordinatlar mavjud bo‘lmagani uchun ilova lokatsiyani so‘ramaydi.</Text>
        </View>
      </View>
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>YORDAM</Text>
      <Pressable style={[styles.linkRow, { backgroundColor: colors.white, borderColor: colors.border }]} onPress={() => router.push('/notifications')}>
        <View style={[styles.linkIcon, { backgroundColor: colors.softBlue }]}><Feather name="help-circle" size={17} color={colors.primary} /></View>
        <Text style={[styles.linkText, { color: colors.foreground }]}>Yordam va bildirishnomalar</Text>
        <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
      </Pressable>
      <Text style={[styles.version, { color: colors.mutedForeground }]}>Digital City</Text>
    </ScrollView>
  );
}

function ToggleRow({ icon, title, copy, value, onChange, disabled, colors }: { icon: keyof typeof Feather.glyphMap; title: string; copy: string; value: boolean; onChange: (value: boolean) => void | Promise<void>; disabled: boolean; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.toggleRow}>
      <View style={[styles.linkIcon, { backgroundColor: colors.softBlue }]}><Feather name={icon} size={17} color={colors.primary} /></View>
      <View style={styles.copy}><Text style={[styles.rowTitle, { color: colors.foreground }]}>{title}</Text><Text style={[styles.rowCopy, { color: colors.mutedForeground }]}>{copy}</Text></View>
       <Pressable
         accessibilityRole="switch"
         accessibilityLabel={title}
         accessibilityState={{ checked: value }}
          disabled={disabled}
          onPress={() => void onChange(!value)}
          style={[styles.switch, { backgroundColor: value ? colors.primary : colors.muted }, disabled && { opacity: 0.55 }]}
       >
         <View style={[styles.switchThumb, { backgroundColor: colors.white, transform: [{ translateX: value ? 18 : 2 }] }]} />
       </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 },
  back: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'Inter_700Bold', fontSize: 18, lineHeight: 24 },
  sectionLabel: { fontFamily: 'Inter_700Bold', fontSize: 10, lineHeight: 14, letterSpacing: 1.3, marginBottom: 9 },
  group: { borderRadius: 17, borderWidth: 1, paddingHorizontal: 13, marginBottom: 26 },
  toggleRow: { minHeight: 69, flexDirection: 'row', alignItems: 'center', gap: 11 },
  infoRow: { minHeight: 70, borderRadius: 17, borderWidth: 1, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 11 },
  linkIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 },
  rowTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13, lineHeight: 18 },
  rowCopy: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 15, marginTop: 2 },
  switch: { width: 40, height: 24, borderRadius: 99, justifyContent: 'center' },
  switchThumb: { width: 20, height: 20, borderRadius: 99 },
  linkRow: { minHeight: 62, borderRadius: 17, borderWidth: 1, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 11 },
  linkText: { flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 13, lineHeight: 18 },
  version: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 15, textAlign: 'center', marginTop: 25 },
  errorText: { fontFamily: 'Inter_500Medium', fontSize: 12, lineHeight: 17, marginTop: -17, marginBottom: 22 },
});