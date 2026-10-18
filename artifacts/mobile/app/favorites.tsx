import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivityIndicator } from 'react-native';
import { BusinessCard } from '@/components/Ui';
import { businesses, mapPublicBusinessToDirectory } from '@/data/businesses';
import { useCity } from '@/context/CityContext';
import { useColors } from '@/hooks/useColors';
import { bottomContentInset, topContentInset } from '@/hooks/usePlatformInsets';
import { useListPublicBusinesses } from '@workspace/api-client-react';

export default function FavoritesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { favoriteIds, isFavorite, toggleFavorite } = useCity();
  const publicBusinessesQuery = useListPublicBusinesses();
  const directoryBusinesses = useMemo(
    () => [...businesses, ...(publicBusinessesQuery.data ?? []).map(mapPublicBusinessToDirectory)],
    [publicBusinessesQuery.data],
  );
  const favoriteBusinesses = useMemo(
    () => directoryBusinesses.filter((business) => favoriteIds.includes(business.id)),
    [directoryBusinesses, favoriteIds],
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <FlatList
        data={favoriteBusinesses}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: topContentInset(insets.top) + 14, paddingBottom: bottomContentInset(insets.bottom) + 28, paddingHorizontal: 20, flexGrow: 1 }}
        ListHeaderComponent={
          <View style={styles.header}>
            <Pressable accessibilityLabel="Ortga" onPress={() => router.back()} style={[styles.back, { backgroundColor: colors.white, borderColor: colors.border }]}>
              <Feather name="arrow-left" size={20} color={colors.foreground} />
            </Pressable>
            <View style={styles.headerCopy}>
              <Text style={[styles.kicker, { color: colors.error }]}>SAVED PLACES</Text>
              <Text style={[styles.title, { color: colors.foreground }]}>Sevimli joylar</Text>
            </View>
            <View style={[styles.count, { backgroundColor: colors.softRose }]}><Text style={[styles.countText, { color: colors.error }]}>{favoriteBusinesses.length}</Text></View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.cardWrap}>
            <BusinessCard {...item} favorite={isFavorite(item.id)} onFavorite={() => toggleFavorite(item.id)} onPress={() => router.push({ pathname: '/business/[id]', params: { id: item.id } })} />
          </View>
        )}
        ListEmptyComponent={
          publicBusinessesQuery.isPending ? (
            <View style={styles.empty}><ActivityIndicator color={colors.primary} /></View>
          ) : (
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.softRose }]}><Feather name="heart" size={27} color={colors.error} /></View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{publicBusinessesQuery.isError ? 'Ro‘yxatni yuklab bo‘lmadi' : 'Sevimli joylar hali yo‘q'}</Text>
            <Text style={[styles.emptyCopy, { color: colors.mutedForeground }]}>{publicBusinessesQuery.isError ? 'Internetni tekshirib, qayta urinib ko‘ring.' : 'Yoqtirgan bizneslaringizni yurak belgisini bosib shu yerga saqlang.'}</Text>
            {publicBusinessesQuery.isError ? (
              <Pressable accessibilityRole="button" onPress={() => void publicBusinessesQuery.refetch()} style={styles.emptyActionButton}>
                <Text style={[styles.emptyAction, { color: colors.primary }]}>Qayta urinish</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={() => router.push('/map')}><Text style={[styles.emptyAction, { color: colors.primary }]}>Joylarni ko‘rish</Text></Pressable>
          </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 22, gap: 12 },
  back: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1 },
  kicker: { fontFamily: 'Inter_700Bold', fontSize: 10, lineHeight: 14, letterSpacing: 1.3 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 24, lineHeight: 31, marginTop: 2 },
  count: { minWidth: 34, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  countText: { fontFamily: 'Inter_700Bold', fontSize: 13, lineHeight: 18 },
  cardWrap: { marginBottom: 12 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 25, paddingVertical: 110, gap: 9 },
  emptyIcon: { width: 68, height: 68, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, lineHeight: 24 },
  emptyCopy: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  emptyAction: { fontFamily: 'Inter_600SemiBold', fontSize: 14, lineHeight: 20, marginTop: 6 },
  emptyActionButton: { paddingVertical: 6, paddingHorizontal: 10 },
});