import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCity } from '@/context/CityContext';
import { useColors } from '@/hooks/useColors';
import { bottomContentInset, topContentInset } from '@/hooks/usePlatformInsets';

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { notificationsEnabled } = useCity();
  return (
    <ScrollView style={[styles.screen, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingTop: topContentInset(insets.top) + 14, paddingBottom: bottomContentInset(insets.bottom) + 30 }} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Ortga" onPress={() => router.back()} style={[styles.back, { backgroundColor: colors.white, borderColor: colors.border }]}><Feather name="arrow-left" size={20} color={colors.foreground} /></Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>Bildirishnomalar</Text>
        <View style={{ width: 42 }} />
      </View>
      <View style={styles.empty}>
        <View style={[styles.noticeIcon, { backgroundColor: notificationsEnabled ? colors.softBlue : colors.muted }]}>
          <Feather name={notificationsEnabled ? 'bell' : 'bell-off'} size={22} color={notificationsEnabled ? colors.primary : colors.mutedForeground} />
        </View>
        <Text style={[styles.noticeTitle, { color: colors.foreground }]}>
          {notificationsEnabled ? 'Hozircha xabarlar yo‘q' : 'Bildirishnomalar o‘chirilgan'}
        </Text>
        <Text style={[styles.noticeText, { color: colors.mutedForeground }]}>
          {notificationsEnabled
            ? 'Yangi uchrashuv so‘rovi yoki biznes yangilanishi qurilmangizga push-xabarnoma sifatida keladi.'
            : 'Uchrashuv va biznes yangilanishlari haqida xabar olish uchun Sozlamalarda push-xabarnomalarni yoqing.'}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 25 },
  back: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'Inter_700Bold', fontSize: 17, lineHeight: 23 },
  notice: { borderRadius: 18, borderWidth: 1, padding: 14, flexDirection: 'row', gap: 12, marginBottom: 10 },
  noticeIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  noticeCopy: { flex: 1 },
  noticeTitle: { fontFamily: 'Inter_700Bold', fontSize: 13, lineHeight: 18 },
  noticeText: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17, marginTop: 3 },
  noticeTime: { fontFamily: 'Inter_500Medium', fontSize: 10, lineHeight: 14, marginTop: 7 },
  empty: { alignItems: 'center', justifyContent: 'center', minHeight: 300, paddingHorizontal: 25, gap: 11 },
});