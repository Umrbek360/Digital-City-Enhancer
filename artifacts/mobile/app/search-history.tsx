import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCity } from '@/context/CityContext';
import { useColors } from '@/hooks/useColors';
import { bottomContentInset, topContentInset } from '@/hooks/usePlatformInsets';

export default function SearchHistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { searchHistory, removeSearch, clearSearchHistory } = useCity();

  return (
    <ScrollView style={[styles.screen, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingTop: topContentInset(insets.top) + 14, paddingBottom: bottomContentInset(insets.bottom) + 30 }} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Ortga" onPress={() => router.back()} style={[styles.back, { backgroundColor: colors.white, borderColor: colors.border }]}><Feather name="arrow-left" size={20} color={colors.foreground} /></Pressable>
        <View style={styles.headerCopy}><Text style={[styles.kicker, { color: colors.primary }]}>RECENT SEARCHES</Text><Text style={[styles.title, { color: colors.foreground }]}>Qidiruv tarixi</Text></View>
        {searchHistory.length > 0 && <Pressable onPress={clearSearchHistory} hitSlop={8}><Text style={[styles.clear, { color: colors.error }]}>Tozalash</Text></Pressable>}
      </View>
      {searchHistory.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.softBlue }]}><Feather name="clock" size={27} color={colors.primary} /></View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Qidiruv tarixi bo‘sh</Text>
          <Text style={[styles.emptyCopy, { color: colors.mutedForeground }]}>Bosh sahifadagi qidiruvga so‘rov yuborsangiz, u shu yerda ko‘rinadi.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {searchHistory.map((query) => (
            <View key={query} style={[styles.row, { backgroundColor: colors.white, borderColor: colors.border }]}>
              <View style={[styles.rowIcon, { backgroundColor: colors.softBlue }]}><Feather name="search" size={16} color={colors.primary} /></View>
              <Text style={[styles.query, { color: colors.foreground }]}>{query}</Text>
              <Pressable accessibilityLabel={`${query} qidiruvini o‘chirish`} onPress={() => removeSearch(query)} hitSlop={8}><Feather name="x" size={17} color={colors.mutedForeground} /></Pressable>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 25, gap: 12 },
  back: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1 },
  kicker: { fontFamily: 'Inter_700Bold', fontSize: 10, lineHeight: 14, letterSpacing: 1.3 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 24, lineHeight: 31, marginTop: 2 },
  clear: { fontFamily: 'Inter_600SemiBold', fontSize: 12, lineHeight: 17 },
  list: { gap: 9 },
  row: { minHeight: 58, borderRadius: 16, borderWidth: 1, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 11 },
  rowIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  query: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 18 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 25, paddingVertical: 120, gap: 9 },
  emptyIcon: { width: 68, height: 68, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, lineHeight: 24 },
  emptyCopy: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, textAlign: 'center' },
});