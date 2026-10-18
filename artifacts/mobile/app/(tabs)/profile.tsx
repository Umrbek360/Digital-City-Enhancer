import { Feather } from '@expo/vector-icons';
import { useAuth, useClerk, useUser } from '@clerk/expo';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SectionHeader } from '@/components/Ui';
import { useCity } from '@/context/CityContext';
import { useColors } from '@/hooks/useColors';
import { bottomContentInset, topContentInset } from '@/hooks/usePlatformInsets';
import { usePushRegistration } from '@/hooks/usePushRegistration';

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { bookings, favoriteIds, setNotificationsEnabled } = useCity();
  const { isLoaded, isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const { disablePush } = usePushRegistration();
  const { user } = useUser();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const displayName = user?.fullName || user?.primaryEmailAddress?.emailAddress || 'Mehmon';
  const avatarLetter = (user?.firstName?.[0] ?? user?.primaryEmailAddress?.emailAddress?.[0] ?? 'G').toUpperCase();
  return (
    <ScrollView style={[styles.screen, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingTop: topContentInset(insets.top) + 18, paddingBottom: bottomContentInset(insets.bottom) + 145 }} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.kicker, { color: colors.primary }]}>YOUR SPACE</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>Profil</Text>
        </View>
        <Pressable accessibilityLabel="Sozlamalar" testID="profile-settings" onPress={() => router.push('/settings')} style={[styles.settingsButton, { backgroundColor: colors.white, borderColor: colors.border }]}>
          <Feather name="settings" size={19} color={colors.foreground} />
        </Pressable>
      </View>
      <View style={[styles.profileCard, { backgroundColor: colors.primary }]}>
        <View style={[styles.avatar, { backgroundColor: colors.white }]}><Text style={[styles.avatarText, { color: colors.primary }]}>{avatarLetter}</Text></View>
        <View style={styles.profileCopy}>
          <Text style={[styles.profileName, { color: colors.white }]} numberOfLines={1}>{displayName}</Text>
          <Text style={[styles.profilePhone, { color: 'rgba(255,255,255,0.75)' }]} numberOfLines={1}>
            {user?.primaryEmailAddress?.emailAddress ?? 'Ro‘yxatdan o‘tmasdan foydalanmoqdasiz'}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Biznes hisobimni ochish"
          accessibilityHint="Biznes hisobingiz va arizalaringizni ko‘rish"
          testID="profile-account"
          hitSlop={8}
          onPress={() => router.push('/business-account')}
          style={({ pressed }) => [styles.accountButton, pressed && styles.accountButtonPressed]}
        >
          <Feather name={isSignedIn ? 'user-check' : 'user'} size={17} color="rgba(255,255,255,0.85)" />
        </Pressable>
      </View>
      <View style={styles.statsRow}>
        <Pressable
          accessibilityLabel="So‘rovlarni ko‘rish"
          testID="profile-bookings-stat"
          onPress={() => router.push('/bookings')}
          style={({ pressed }) => [styles.stat, { backgroundColor: colors.white, borderColor: colors.border }, pressed && styles.statPressed]}
        >
          <Text style={[styles.statValue, { color: colors.foreground }]}>{bookings.length}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>So‘rovlar</Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Sevimli joylarni ko‘rish"
          testID="profile-favorites-stat"
          onPress={() => router.push('/favorites')}
          style={({ pressed }) => [styles.stat, { backgroundColor: colors.white, borderColor: colors.border }, pressed && styles.statPressed]}
        >
          <Text style={[styles.statValue, { color: colors.foreground }]}>{favoriteIds.length}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Sevimlilar</Text>
        </Pressable>
      </View>
      {isLoaded && isSignedIn ? (
        <>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>HISOB</Text>
          <Pressable
            accessibilityLabel="Tizimdan chiqish"
            testID="profile-logout"
            onPress={() => setShowLogoutConfirm(true)}
            style={({ pressed }) => [styles.menuRow, { backgroundColor: colors.white, borderColor: colors.border }, pressed && { opacity: 0.75 }]}
          >
            <View style={[styles.menuIcon, { backgroundColor: colors.softRose }]}>
              <Feather name="log-out" size={18} color={colors.error} />
            </View>
            <View style={styles.menuCopy}>
              <Text style={[styles.menuTitle, { color: colors.error }]}>Tizimdan chiqish</Text>
              <Text style={[styles.menuSubtitle, { color: colors.mutedForeground }]}>Hisobdan xavfsiz chiqish</Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </Pressable>
        </>
      ) : null}
      {showLogoutConfirm && (
        <View style={[styles.logoutConfirm, { backgroundColor: colors.softRose, borderColor: colors.error }]}>
          <Text style={[styles.logoutConfirmText, { color: colors.foreground }]}>
            Chiqishni tasdiqlaysizmi? Saqlangan sevimlilar va so‘rovlar qurilmada qoladi.
          </Text>
          <View style={styles.logoutActions}>
            <Pressable
              testID="profile-logout-cancel"
              onPress={() => setShowLogoutConfirm(false)}
              style={[styles.logoutAction, { backgroundColor: colors.white, borderColor: colors.border }]}
            >
              <Text style={[styles.logoutActionText, { color: colors.foreground }]}>Bekor qilish</Text>
            </Pressable>
            <Pressable
              testID="profile-logout-confirm"
              onPress={() => {
                void (async () => {
                  try {
                    await disablePush();
                    setNotificationsEnabled(false);
                    await signOut();
                    setShowLogoutConfirm(false);
                  } catch (error: unknown) {
                    Alert.alert('Chiqib bo‘lmadi', error instanceof Error ? error.message : 'Qayta urinib ko‘ring.');
                  }
                })();
              }}
              style={[styles.logoutAction, { backgroundColor: colors.error, borderColor: colors.error }]}
            >
              <Text style={[styles.logoutActionText, { color: colors.white }]}>Chiqish</Text>
            </Pressable>
          </View>
        </View>
      )}
      <SectionHeader title="Tezkor bo‘limlar" />
      {[
        { icon: 'heart' as const, title: 'Sevimli joylar', copy: `${favoriteIds.length} ta saqlangan joy`, color: colors.error, route: '/favorites' as const },
        { icon: 'clock' as const, title: 'Qidiruv tarixi', copy: 'So‘nggi qidiruvlaringiz', color: colors.primary, route: '/search-history' as const },
        { icon: 'briefcase' as const, title: 'Biznes egasi', copy: 'Biznesingizni qo‘shing yoki boshqaring', color: colors.success, route: '/business-mode' as const },
      ].map((item) => (
        <Pressable key={item.title} accessibilityLabel={item.title} testID={`profile-${item.route.slice(1)}`} style={({ pressed }) => [styles.menuRow, { backgroundColor: colors.white, borderColor: colors.border }, pressed && { opacity: 0.75 }]} onPress={() => router.push(item.route)}>
          <View style={[styles.menuIcon, { backgroundColor: item.color + '16' }]}><Feather name={item.icon} size={18} color={item.color} /></View>
          <View style={styles.menuCopy}><Text style={[styles.menuTitle, { color: colors.foreground }]}>{item.title}</Text><Text style={[styles.menuSubtitle, { color: colors.mutedForeground }]}>{item.copy}</Text></View>
          <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
        </Pressable>
      ))}
      <Text style={[styles.version, { color: colors.mutedForeground }]}>Digital City</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 22 },
  kicker: { fontFamily: 'Inter_700Bold', fontSize: 10, lineHeight: 14, letterSpacing: 1.5 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 29, lineHeight: 36, marginTop: 3 },
  sectionLabel: { fontFamily: 'Inter_700Bold', fontSize: 10, lineHeight: 14, letterSpacing: 1.3, marginTop: 21, marginBottom: 9 },
  settingsButton: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  profileCard: { borderRadius: 22, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: 'Inter_700Bold', fontSize: 22, lineHeight: 28 },
  profileCopy: { flex: 1 },
  accountButton: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  accountButtonPressed: { opacity: 0.7, transform: [{ scale: 0.95 }] },
  profileName: { fontFamily: 'Inter_700Bold', fontSize: 16, lineHeight: 21 },
  profilePhone: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 16, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 9, marginTop: 12, marginBottom: 30 },
  stat: { flex: 1, alignItems: 'center', borderRadius: 16, borderWidth: 1, paddingVertical: 12 },
  statPressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  statValue: { fontFamily: 'Inter_700Bold', fontSize: 18, lineHeight: 23 },
  statLabel: { fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 14, marginTop: 1 },
  menuRow: { borderRadius: 17, borderWidth: 1, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 9 },
  menuIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  menuCopy: { flex: 1 },
  menuTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14, lineHeight: 19 },
  menuSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 15, marginTop: 2 },
  logoutConfirm: { borderRadius: 17, borderWidth: 1, padding: 12, marginTop: 2, marginBottom: 10 },
  logoutConfirmText: { fontFamily: 'Inter_500Medium', fontSize: 12, lineHeight: 17 },
  logoutActions: { flexDirection: 'row', gap: 8, marginTop: 11 },
  logoutAction: { flex: 1, minHeight: 42, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  logoutActionText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, lineHeight: 16 },
  version: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 15, textAlign: 'center', marginTop: 22 },
});