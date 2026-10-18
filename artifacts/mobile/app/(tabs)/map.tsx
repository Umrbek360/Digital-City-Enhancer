import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPreview } from '@/components/MapPreview';
import { BusinessCard, SectionHeader } from '@/components/Ui';
import { businesses, mapPublicBusinessToDirectory } from '@/data/businesses';
import { useCity } from '@/context/CityContext';
import { useColors } from '@/hooks/useColors';
import { bottomContentInset, topContentInset } from '@/hooks/usePlatformInsets';
import { useListPublicBusinesses } from '@workspace/api-client-react';

export default function MapScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isFavorite, toggleFavorite } = useCity();
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const publicBusinessesQuery = useListPublicBusinesses();
  const directoryBusinesses = useMemo(
    () => [...businesses, ...(publicBusinessesQuery.data ?? []).map(mapPublicBusinessToDirectory)],
    [publicBusinessesQuery.data],
  );
  const filteredBusinesses = useMemo(
    () => favoritesOnly ? directoryBusinesses.filter((business) => isFavorite(business.id)) : directoryBusinesses,
    [directoryBusinesses, favoritesOnly, isFavorite],
  );
  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <FlatList
        data={filteredBusinesses}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomContentInset(insets.bottom) + 90 }}
        ListHeaderComponent={
          <View style={{ paddingTop: topContentInset(insets.top) + 18 }}>
            <View style={styles.titleRow}>
              <View>
                <Text style={[styles.kicker, { color: colors.primary }]}>KASHF ETISH</Text>
                <Text style={[styles.title, { color: colors.foreground }]}>Shahardagi joylar</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={favoritesOnly ? 'Barcha joylarni ko‘rsatish' : 'Faqat sevimlilarni ko‘rsatish'}
                accessibilityState={{ selected: favoritesOnly }}
                testID="map-filter"
                onPress={() => setFavoritesOnly((current) => !current)}
                style={[styles.filter, { backgroundColor: favoritesOnly ? colors.softRose : colors.white, borderColor: favoritesOnly ? colors.error : colors.border }]}
              >
                <Feather name="heart" size={16} color={favoritesOnly ? colors.error : colors.foreground} />
              </Pressable>
            </View>
            <View style={styles.mapWrap}>
              <MapPreview
                visibleBusinesses={filteredBusinesses}
                onBusinessPress={(id) => router.push({ pathname: '/business/[id]', params: { id } })}
              />
            </View>
            <View style={styles.listHeader}>
              <SectionHeader title={favoritesOnly ? 'Sevimli joylar' : 'Barcha natijalar'} />
              <Text style={[styles.mapNotice, { color: colors.mutedForeground }]}>Xarita sxematik ko‘rinishda; aniq joylashuv manzilda ko‘rsatiladi.</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.cardWrap}>
            <BusinessCard {...item} favorite={isFavorite(item.id)} onFavorite={() => toggleFavorite(item.id)} onPress={() => router.push({ pathname: '/business/[id]', params: { id: item.id } })} />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name={favoritesOnly ? 'heart' : 'map'} size={25} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{publicBusinessesQuery.isError ? 'Ro‘yxatni yuklab bo‘lmadi' : favoritesOnly ? 'Sevimli joylar yo‘q' : 'Hozircha joylar yo‘q'}</Text>
            <Text style={[styles.emptyCopy, { color: colors.mutedForeground }]}>{publicBusinessesQuery.isError ? 'Internetni tekshirib, qayta urinib ko‘ring.' : favoritesOnly ? 'Joylarni saqlash uchun biznes kartasidagi yurak belgisini bosing.' : 'Yangi tasdiqlangan bizneslar shu yerda ko‘rinadi.'}</Text>
            {publicBusinessesQuery.isError ? (
              <Pressable accessibilityRole="button" onPress={() => void publicBusinessesQuery.refetch()} style={styles.retryButton}>
                <Text style={[styles.retry, { color: colors.primary }]}>Qayta urinish</Text>
              </Pressable>
            ) : null}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  titleRow: { paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  kicker: { fontFamily: 'Inter_700Bold', fontSize: 10, lineHeight: 14, letterSpacing: 1.5 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 27, lineHeight: 34, marginTop: 3 },
  filter: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  mapWrap: { marginHorizontal: 20, marginTop: 20 },
  listHeader: { marginHorizontal: 20, marginTop: 22 },
  cardWrap: { marginHorizontal: 20, marginBottom: 12 },
  mapNotice: { marginTop: -7, marginBottom: 9, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 },
  empty: { alignItems: 'center', paddingHorizontal: 32, paddingVertical: 34, gap: 8 },
  emptyTitle: { fontFamily: 'Inter_700Bold', fontSize: 16, lineHeight: 22 },
  emptyCopy: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  retry: { fontFamily: 'Inter_600SemiBold', fontSize: 13, paddingVertical: 8 },
  retryButton: { paddingHorizontal: 12 },
});