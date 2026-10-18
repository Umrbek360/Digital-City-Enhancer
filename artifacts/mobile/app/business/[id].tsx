import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton, PrimaryButton, Rating, StatusBadge } from '@/components/Ui';
import { getBusiness, mapPublicBusinessToDirectory } from '@/data/businesses';
import { useCity } from '@/context/CityContext';
import { useColors } from '@/hooks/useColors';
import { bottomContentInset, topContentInset } from '@/hooks/usePlatformInsets';
import { getGetPublicBusinessQueryKey, useGetPublicBusiness } from '@workspace/api-client-react';

export default function BusinessDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const businessId = Array.isArray(id) ? id[0] : id ?? '';
  const localBusiness = getBusiness(businessId);
  const publicBusinessQuery = useGetPublicBusiness(businessId, {
    query: {
      queryKey: getGetPublicBusinessQueryKey(businessId),
      enabled: Boolean(businessId) && !localBusiness,
    },
  });
  const business = localBusiness ?? (publicBusinessQuery.data ? mapPublicBusinessToDirectory(publicBusinessQuery.data) : undefined);
  const { isFavorite, toggleFavorite } = useCity();
  const [activeTab, setActiveTab] = useState<'Xizmatlar' | 'Sharhlar' | 'Ma’lumot'>('Xizmatlar');

  if (!business) {
    if (publicBusinessQuery.isPending) {
      return (
        <View style={[styles.notFound, { backgroundColor: colors.background }]}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.notFoundTitle, { color: colors.mutedForeground }]}>Biznes ma’lumotlari yuklanmoqda…</Text>
        </View>
      );
    }
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        <Text style={[styles.notFoundTitle, { color: colors.foreground }]}>
          {publicBusinessQuery.isError ? 'Ma’lumotlarni yuklab bo‘lmadi' : 'Joy topilmadi'}
        </Text>
        {publicBusinessQuery.isError && (
          <Pressable accessibilityRole="button" onPress={() => void publicBusinessQuery.refetch()} style={styles.notFoundActionButton}>
            <Text style={[styles.notFoundAction, { color: colors.primary }]}>Qayta urinish</Text>
          </Pressable>
        )}
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.notFoundActionButton}>
          <Text style={[styles.notFoundAction, { color: colors.primary }]}>Ortga qaytish</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomContentInset(insets.bottom) + 108 }}>
        <View style={styles.hero}>
          {business.image ? (
            <>
              <Image source={business.image} style={styles.heroImage} />
              <View style={[styles.heroOverlay, { backgroundColor: 'rgba(17,24,39,0.24)' }]} />
            </>
          ) : (
            <View style={[styles.heroPlaceholder, { backgroundColor: colors.softGreen }]}>
              <Feather name={categoryIcon(business.category)} size={72} color={business.accent} />
            </View>
          )}
          <View style={[styles.heroControls, { top: topContentInset(insets.top) + 12 }]}>
            <IconButton icon="arrow-left" label="Ortga" onPress={() => router.back()} />
            <IconButton icon="heart" label={isFavorite(business.id) ? 'Sevimlilardan olib tashlash' : 'Sevimliga qo‘shish'} active={isFavorite(business.id)} onPress={() => toggleFavorite(business.id)} />
          </View>
          <View style={styles.heroText}>
          <Text style={[styles.heroCategory, { color: business.image ? '#ffffff' : colors.foreground }]}>{business.category}</Text>
            <Text style={[styles.heroTitle, { color: business.image ? '#ffffff' : colors.foreground }]}>{business.name}</Text>
          </View>
        </View>
        <View style={styles.content}>
          <View style={styles.businessSummary}>
            <View style={styles.summaryCopy}>
              <View style={styles.summaryRating}>
                {business.rating ? (
                  <>
                    <Rating rating={business.rating} reviews={business.reviewCount} />
                    {business.distance ? <Text style={[styles.dot, { color: colors.mutedForeground }]}>•</Text> : null}
                    {business.distance ? <Text style={[styles.distance, { color: colors.mutedForeground }]}>{business.distance}</Text> : null}
                  </>
                ) : (
                  <Text style={[styles.newListing, { color: colors.mutedForeground }]}>Reyting yo‘q</Text>
                )}
              </View>
              <View style={styles.summaryAddress}><Feather name="map-pin" size={14} color={colors.mutedForeground} /><Text style={[styles.address, { color: colors.mutedForeground }]}>{business.address}</Text></View>
            </View>
            {business.isExample ? (
              <Text style={[styles.exampleNotice, { color: colors.warning }]}>Namuna biznes</Text>
            ) : (
              <StatusBadge status={business.status} />
            )}
          </View>
          <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
            {(['Xizmatlar', 'Sharhlar', 'Ma’lumot'] as const).map((tab) => (
              <Pressable key={tab} onPress={() => setActiveTab(tab)} style={[styles.tab, activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}>
                <Text style={[styles.tabText, { color: activeTab === tab ? colors.primary : colors.mutedForeground }]}>{tab}</Text>
              </Pressable>
            ))}
          </View>
          {activeTab === 'Xizmatlar' && (
            <View style={styles.serviceList}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Xizmatlar</Text>
              {business.services.length === 0 ? (
                <Text style={[styles.infoText, { color: colors.mutedForeground }]}>Xizmatlar haqida ma’lumotni biznes bilan bog‘lanib olishingiz mumkin.</Text>
              ) : business.services.map((service) => (
                <View key={service.id} style={[styles.serviceRow, { backgroundColor: colors.white, borderColor: colors.border }]}>
                  <View style={[styles.serviceIcon, { backgroundColor: colors.softBlue }]}><Feather name="star" size={17} color={colors.primary} /></View>
                  <View style={styles.serviceCopy}><Text style={[styles.serviceName, { color: colors.foreground }]}>{service.name}</Text><Text style={[styles.serviceDuration, { color: colors.mutedForeground }]}>{service.duration}</Text></View>
                  <Text style={[styles.servicePrice, { color: colors.foreground }]}>{service.price}</Text>
                </View>
              ))}
              {business.isExample ? (
                <Text style={[styles.exampleDisclaimer, { color: colors.mutedForeground }]}>Xizmatlar va narxlar namuna uchun berilgan.</Text>
              ) : null}
            </View>
          )}
          {activeTab === 'Sharhlar' && (
            <View style={styles.infoBlock}>
              <Text style={[styles.infoText, { color: colors.mutedForeground }]}>Bu biznes uchun tasdiqlangan mijozlar sharhlari hali yo‘q.</Text>
            </View>
          )}
          {activeTab === 'Ma’lumot' && (
            <View style={styles.infoBlock}>
              <Text style={[styles.infoTitle, { color: colors.foreground }]}>Biznes haqida</Text>
              <Text style={[styles.infoText, { color: colors.mutedForeground }]}>{business.description}</Text>
              {business.hours ? <View style={styles.infoLine}><Feather name="clock" size={16} color={colors.primary} /><Text style={[styles.infoLineText, { color: colors.foreground }]}>{business.hours}</Text></View> : null}
              {business.phone ? (
                <View style={styles.infoLine}><Feather name="phone" size={16} color={colors.primary} /><Text style={[styles.infoLineText, { color: colors.foreground }]}>{business.phone}</Text></View>
              ) : null}
              {business.isExample ? (
                <Text style={[styles.exampleDisclaimer, { color: colors.mutedForeground }]}>Bu ko‘rgazmali namuna; telefon va manzil haqiqiy xizmat ma’lumoti emas.</Text>
              ) : null}
            </View>
          )}
        </View>
      </ScrollView>
      <View style={[styles.stickyFooter, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: bottomContentInset(insets.bottom) + 10 }]}>
        <PrimaryButton
          title="Vaqt so‘rash"
          icon="calendar"
          onPress={() => router.push({ pathname: '/business/[id]/book', params: { id: business.id } })}
          style={styles.bookButton}
        />
      </View>
    </View>
  );
}

function categoryIcon(category: string): keyof typeof Feather.glyphMap {
  if (category === 'Ovqatlanish') return 'coffee';
  if (category === 'Go‘zallik') return 'scissors';
  if (category === 'Sog‘liq') return 'heart';
  return 'book-open';
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  hero: { height: 350, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  heroOverlay: { ...StyleSheet.absoluteFill },
  heroControls: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between' },
  heroText: { position: 'absolute', bottom: 24, left: 20, right: 20 },
  heroCategory: { fontFamily: 'Inter_600SemiBold', fontSize: 11, lineHeight: 15, textTransform: 'uppercase', letterSpacing: 1 },
  heroTitle: { fontFamily: 'Inter_700Bold', fontSize: 31, lineHeight: 38, letterSpacing: -0.7, marginTop: 3 },
  content: { paddingHorizontal: 20 },
  businessSummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 19 },
  summaryCopy: { flex: 1 },
  summaryRating: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  newListing: { fontFamily: 'Inter_600SemiBold', fontSize: 12, lineHeight: 16 },
  dot: { fontSize: 15 },
  distance: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 16 },
  summaryAddress: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 7 },
  address: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 16 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, marginHorizontal: -20 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 13 },
  tabText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, lineHeight: 17 },
  serviceList: { paddingTop: 24 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 19, lineHeight: 25, marginBottom: 12 },
  serviceRow: { minHeight: 73, borderRadius: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', padding: 11, gap: 11, marginBottom: 9 },
  serviceIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  serviceCopy: { flex: 1 },
  serviceName: { fontFamily: 'Inter_600SemiBold', fontSize: 13, lineHeight: 18 },
  serviceDuration: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 15, marginTop: 2 },
  servicePrice: { fontFamily: 'Inter_700Bold', fontSize: 12, lineHeight: 16 },
  infoBlock: { paddingTop: 25 },
  bigRating: { alignSelf: 'flex-start', borderRadius: 15, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  bigRatingNumber: { fontFamily: 'Inter_700Bold', fontSize: 25, lineHeight: 30 },
  infoTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, lineHeight: 24, marginTop: 26, marginBottom: 9 },
  infoText: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21 },
  infoAuthor: { fontFamily: 'Inter_600SemiBold', fontSize: 12, lineHeight: 16, marginTop: 10 },
  infoLine: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20 },
  infoLineText: { fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 18 },
  stickyFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, paddingHorizontal: 20, paddingTop: 10 },
  bookButton: { width: '100%' },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  notFoundTitle: { fontFamily: 'Inter_700Bold', fontSize: 20 },
  notFoundAction: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  notFoundActionButton: { paddingHorizontal: 10, paddingVertical: 6 },
  exampleNotice: { fontFamily: 'Inter_600SemiBold', fontSize: 11, lineHeight: 15 },
  exampleDisclaimer: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 17, marginTop: 11 },
});