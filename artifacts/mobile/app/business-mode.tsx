import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@clerk/expo';
import React, { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton } from '@/components/Ui';
import { useColors } from '@/hooks/useColors';
import { bottomContentInset, topContentInset } from '@/hooks/usePlatformInsets';
import {
  getGetCurrentAccountQueryKey,
  getListMyBusinessesQueryKey,
  useGetCurrentAccount,
  useListMyBusinesses,
} from '@workspace/api-client-react';

export default function BusinessModeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isLoaded, isSignedIn } = useAuth();
  const accountQuery = useGetCurrentAccount({
    query: {
      queryKey: getGetCurrentAccountQueryKey(),
      enabled: isLoaded && Boolean(isSignedIn),
      retry: false,
    },
  });
  const businessesQuery = useListMyBusinesses({
    query: {
      queryKey: getListMyBusinessesQueryKey(),
      enabled:
        isLoaded &&
        Boolean(isSignedIn) &&
        accountQuery.isSuccess &&
        accountQuery.data.role !== 'admin',
      retry: false,
    },
  });
  const hasBusiness = (businessesQuery.data?.length ?? 0) > 0;
  const isAdmin = accountQuery.data?.role === 'admin';

  useEffect(() => {
    if (isLoaded && isSignedIn && isAdmin) {
      router.replace('/admin-businesses');
    } else if (isLoaded && isSignedIn && businessesQuery.isSuccess && hasBusiness) {
      router.replace('/business-account');
    }
  }, [businessesQuery.isSuccess, hasBusiness, isAdmin, isLoaded, isSignedIn]);

  const loading =
    !isLoaded ||
    (Boolean(isSignedIn) &&
      (accountQuery.isPending || (!isAdmin && businessesQuery.isPending)));
  const accountLoadFailed = isSignedIn && (accountQuery.isError || businessesQuery.isError);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: topContentInset(insets.top) + 14, paddingBottom: bottomContentInset(insets.bottom) + 20 }]}>
      <Pressable accessibilityLabel="Ortga" onPress={() => router.back()} style={[styles.back, { backgroundColor: colors.white, borderColor: colors.border }]}><Feather name="arrow-left" size={20} color={colors.foreground} /></Pressable>
      <View style={styles.center}>
        <View style={[styles.iconWrap, { backgroundColor: colors.softBlue }]}><Feather name="briefcase" size={38} color={colors.primary} /></View>
        <Text style={[styles.title, { color: colors.foreground }]}>Biznes rejimi</Text>
        <Text style={[styles.copy, { color: colors.mutedForeground }]}>Biznesingizni Digital City katalogiga yuboring va ariza holatini kuzating.</Text>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : accountLoadFailed ? (
          <View style={[styles.note, { backgroundColor: colors.softRose }]}>
            <Feather name="alert-circle" size={16} color={colors.error} />
            <Text style={[styles.noteText, { color: colors.error }]}>Hisob ma’lumotlarini yuklab bo‘lmadi. Internetni tekshirib, qayta urinib ko‘ring.</Text>
          </View>
        ) : (
          <View style={[styles.note, { backgroundColor: colors.white, borderColor: colors.border }]}>
            <Feather name="info" size={16} color={colors.primary} />
            <Text style={[styles.noteText, { color: colors.mutedForeground }]}>
              {isSignedIn ? 'Yuborilgan arizalar admin tasdig‘idan so‘ng katalogda ko‘rinadi.' : 'Ariza yuborish uchun tasdiqlangan email hisobidan foydalaning.'}
            </Text>
          </View>
        )}
      </View>
      {loading ? (
        <View style={styles.footerSpace} />
      ) : accountLoadFailed ? (
        <PrimaryButton
          title="Qayta urinish"
          icon="refresh-cw"
          onPress={() => {
            void accountQuery.refetch();
            void businessesQuery.refetch();
          }}
        />
      ) : !isSignedIn ? (
        <PrimaryButton title="Kirish yoki ro‘yxatdan o‘tish" icon="log-in" onPress={() => router.push('/business-auth')} />
      ) : hasBusiness ? (
        <PrimaryButton title="Biznes hisobini ko‘rish" icon="briefcase" onPress={() => router.push('/business-account')} />
      ) : (
        <PrimaryButton title="Biznes qo‘shish" icon="plus" onPress={() => router.push('/business-register')} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20, justifyContent: 'space-between' },
  back: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  center: { alignItems: 'center', paddingHorizontal: 12, marginTop: -35 },
  iconWrap: { width: 82, height: 82, borderRadius: 29, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 25, lineHeight: 32 },
  copy: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 10 },
  note: { marginTop: 23, borderRadius: 15, borderWidth: 1, padding: 12, flexDirection: 'row', gap: 9, alignItems: 'center' },
  noteText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 },
  loader: { marginTop: 25 },
  footerSpace: { height: 54 },
});