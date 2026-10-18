import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BusinessCard, IconButton, LogoMark, SectionHeader } from '@/components/Ui';
import { MapPreview } from '@/components/MapPreview';
import { businesses, categories, mapPublicBusinessToDirectory, type BusinessCategory } from '@/data/businesses';
import { useCity } from '@/context/CityContext';
import { useColors } from '@/hooks/useColors';
import { bottomContentInset, topContentInset } from '@/hooks/usePlatformInsets';
import { useListPublicBusinesses } from '@workspace/api-client-react';

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isFavorite, toggleFavorite, addSearch } = useCity();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'Barchasi' | BusinessCategory>('Barchasi');
  const publicBusinessesQuery = useListPublicBusinesses();
  const directoryBusinesses = useMemo(
    () => [...businesses, ...(publicBusinessesQuery.data ?? []).map(mapPublicBusinessToDirectory)],
    [publicBusinessesQuery.data],
  );

  const filteredBusinesses = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return directoryBusinesses.filter((business) => {
      const matchesCategory = category === 'Barchasi' || business.category === category;
      const matchesQuery =
        !normalizedQuery ||
        business.name.toLowerCase().includes(normalizedQuery) ||
        business.category.toLowerCase().includes(normalizedQuery) ||
        business.address.toLowerCase().includes(normalizedQuery) ||
        business.services.some((service) => service.name.toLowerCase().includes(normalizedQuery));
      return matchesCategory && matchesQuery;
    });
  }, [category, directoryBusinesses, query]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <FlatList
        data={filteredBusinesses}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomContentInset(insets.bottom) + 94 }}
        ListHeaderComponent={
          <View style={{ paddingTop: topContentInset(insets.top) + 12 }}>
            <LinearGradient colors={[colors.softBlue, colors.background]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.topArea}>
              <View style={styles.header}>
                <View style={styles.brandRow}>
                  <LogoMark size={40} />
                  <View>
                    <Text style={[styles.greeting, { color: colors.mutedForeground }]}>Xush kelibsiz</Text>
                    <Text style={[styles.brand, { color: colors.foreground }]}>Digital City</Text>
                  </View>
                </View>
                <IconButton icon="bell" label="Bildirishnomalar" onPress={() => router.push('/notifications')} />
              </View>
              <Text style={[styles.headline, { color: colors.foreground }]}>Shahardagi foydali{'\n'}<Text style={{ color: colors.primary }}>joylar bir joyda.</Text></Text>
              <View style={[styles.searchBar, { backgroundColor: colors.white, borderColor: colors.border }]}>
                <Feather name="search" size={19} color={colors.mutedForeground} />
                <TextInput
                  testID="home-search"
                  accessibilityLabel="Biznes yoki xizmat qidirish"
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Biznes yoki xizmat qidiring"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.searchInput, { color: colors.foreground }]}
                  returnKeyType="search"
                  onSubmitEditing={() => addSearch(query)}
                />
              </View>
              <FlatList
                data={categories}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.label}
                contentContainerStyle={styles.categoryList}
                renderItem={({ item }) => {
                  const selected = category === item.label;
                  return (
                    <Pressable
                      testID={`category-${item.label}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => setCategory(item.value)}
                      style={[styles.categoryChip, { backgroundColor: selected ? colors.primary : colors.white, borderColor: selected ? colors.primary : colors.border }]}
                    >
                      <Feather name={item.icon} size={15} color={selected ? colors.primaryForeground : colors.mutedForeground} />
                      <Text style={[styles.categoryText, { color: selected ? colors.primaryForeground : colors.mutedForeground }]}>{item.label}</Text>
                    </Pressable>
                  );
                }}
              />
            </LinearGradient>
            <MapPreview
              visibleBusinesses={directoryBusinesses}
              onBusinessPress={(id) => router.push({ pathname: '/business/[id]', params: { id } })}
              onExplorePress={() => router.push('/map')}
            />
            {publicBusinessesQuery.isError && (
              <View style={[styles.directoryNotice, { backgroundColor: colors.softOrange }]}>
                <Feather name="alert-circle" size={15} color={colors.warning} />
                <Text style={[styles.directoryNoticeText, { color: colors.mutedForeground }]}>
                  Yangi bizneslar ro‘yxatini yangilab bo‘lmadi.
                </Text>
              </View>
            )}
            <View style={styles.nearbyHeader}>
              <SectionHeader title="Bizneslar" />
              <View style={[styles.resultCount, { backgroundColor: colors.softBlue }]}>
                <Text style={[styles.resultCountText, { color: colors.primary }]}>{filteredBusinesses.length} ta joy</Text>
              </View>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.cardWrap}>
            <BusinessCard
              name={item.name}
              category={item.category}
              address={item.address}
              distance={item.distance}
              rating={item.rating}
              reviewCount={item.reviewCount}
              status={item.status}
              image={item.image}
              accent={item.accent}
              isExample={item.isExample}
              favorite={isFavorite(item.id)}
              onFavorite={() => toggleFavorite(item.id)}
              onPress={() => router.push({ pathname: '/business/[id]', params: { id: item.id } })}
            />
          </View>
        )}
        ListEmptyComponent={
          publicBusinessesQuery.isPending ? (
            <View style={styles.empty} accessibilityRole="progressbar" accessibilityLabel="Bizneslar yuklanmoqda">
              <ActivityIndicator color={colors.primary} />
              <Text style={[styles.emptyCopy, { color: colors.mutedForeground }]}>Bizneslar yuklanmoqda…</Text>
            </View>
          ) : publicBusinessesQuery.isError ? (
            <View style={styles.empty}>
              <Feather name="wifi-off" size={24} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Ro‘yxatni yuklab bo‘lmadi</Text>
              <Text style={[styles.emptyCopy, { color: colors.mutedForeground }]}>Internetni tekshirib, qayta urinib ko‘ring.</Text>
              <Pressable accessibilityRole="button" onPress={() => void publicBusinessesQuery.refetch()} style={styles.emptyActionButton}>
                <Text style={[styles.emptyAction, { color: colors.primary }]}>Qayta urinish</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.empty}>
              <Feather name="search" size={24} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Hech narsa topilmadi</Text>
              <Text style={[styles.emptyCopy, { color: colors.mutedForeground }]}>Qidiruv yoki filtringizni o‘zgartirib ko‘ring.</Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topArea: { paddingBottom: 10 },
  header: { paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  greeting: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 15 },
  brand: { fontFamily: 'Inter_700Bold', fontSize: 17, lineHeight: 22, marginTop: 1 },
  headline: { fontFamily: 'Inter_700Bold', fontSize: 27, lineHeight: 34, letterSpacing: -0.6, paddingHorizontal: 20, marginTop: 25 },
  searchBar: { height: 54, borderRadius: 17, borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, marginHorizontal: 20, marginTop: 20, gap: 10 },
  searchInput: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 18, paddingVertical: 0 },
  categoryList: { gap: 8, paddingHorizontal: 20, paddingVertical: 16 },
  categoryChip: { borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9 },
  categoryText: { fontFamily: 'Inter_500Medium', fontSize: 12, lineHeight: 16 },
  nearbyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 20, marginTop: 22 },
  resultCount: { borderRadius: 9, paddingHorizontal: 8, paddingVertical: 5, marginBottom: 13 },
  resultCountText: { fontFamily: 'Inter_600SemiBold', fontSize: 10, lineHeight: 14 },
  cardWrap: { marginHorizontal: 20, marginBottom: 12 },
  directoryNotice: { marginHorizontal: 20, marginTop: 10, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 8 },
  directoryNoticeText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 15 },
  empty: { alignItems: 'center', padding: 40, gap: 8 },
  emptyTitle: { fontFamily: 'Inter_700Bold', fontSize: 16, lineHeight: 22 },
  emptyCopy: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 18, textAlign: 'center' },
  emptyAction: { fontFamily: 'Inter_600SemiBold', fontSize: 14, lineHeight: 20 },
  emptyActionButton: { paddingVertical: 8, paddingHorizontal: 12, marginTop: 4 },
});
