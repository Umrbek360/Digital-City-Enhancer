import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { businesses as allBusinesses, type Business } from '@/data/businesses';
import { useColors } from '@/hooks/useColors';

export function MapPreview({
  onBusinessPress,
  onExplorePress,
  visibleBusinesses = allBusinesses,
}: {
  onBusinessPress: (id: string) => void;
  onExplorePress?: () => void;
  visibleBusinesses?: Business[];
}) {
  const colors = useColors();

  return (
    <View style={[styles.map, { backgroundColor: colors.mapBase }]}>
      <View style={[styles.water, { backgroundColor: colors.mapWater }]} />
      <View style={[styles.roadOne, { backgroundColor: colors.mapRoad }]} />
      <View style={[styles.roadTwo, { backgroundColor: colors.mapRoad }]} />
      <View style={[styles.roadThree, { backgroundColor: colors.mapRoad }]} />
      <View style={[styles.park, { backgroundColor: 'rgba(16,185,129,0.18)' }]} />
      <View style={styles.mapHeader}>
        <View style={[styles.locationChip, { backgroundColor: colors.white }]}>
          <Feather name="map" size={13} color={colors.primary} />
          <Text style={[styles.locationText, { color: colors.foreground }]} numberOfLines={1}>Shahar bo‘ylab joylar</Text>
        </View>
      </View>
      {visibleBusinesses.map((business) => (
        <Pressable
          key={business.id}
          accessibilityLabel={`${business.name} xaritada`}
          onPress={() => onBusinessPress(business.id)}
          style={[styles.pin, { top: `${business.pin.top}%`, left: `${business.pin.left}%` }]}
        >
          <View style={[styles.pinBubble, { backgroundColor: business.accent }]}>
            <Feather name="map-pin" size={15} color={colors.primaryForeground} />
          </View>
          <View style={[styles.pinShadow, { backgroundColor: 'rgba(17,24,39,0.12)' }]} />
        </Pressable>
      ))}
      {onExplorePress ? (
        <Pressable
          accessibilityLabel="Barcha bizneslarni ko‘rish"
          testID="map-nearby-places"
          onPress={onExplorePress}
          style={[styles.mapLabel, { backgroundColor: colors.white }]}
        >
            <Text style={[styles.mapLabelText, { color: colors.foreground }]}>Sxematik ko‘rinish</Text>
          <Feather name="arrow-up-right" size={14} color={colors.primary} />
        </Pressable>
      ) : (
        <View style={[styles.mapLabel, { backgroundColor: colors.white }]}>
          <Text style={[styles.mapLabelText, { color: colors.foreground }]}>Sxematik ko‘rinish</Text>
          <Feather name="arrow-up-right" size={14} color={colors.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  map: { height: 250, borderRadius: 24, overflow: 'hidden', position: 'relative' },
  water: { position: 'absolute', width: '56%', height: '32%', right: '-12%', top: '27%', borderRadius: 100, transform: [{ rotate: '-19deg' }] },
  roadOne: { position: 'absolute', width: '120%', height: 12, left: '-12%', top: '42%', transform: [{ rotate: '24deg' }], opacity: 0.85 },
  roadTwo: { position: 'absolute', width: '120%', height: 9, left: '-10%', top: '66%', transform: [{ rotate: '-34deg' }], opacity: 0.74 },
  roadThree: { position: 'absolute', width: 9, height: '130%', left: '56%', top: '-15%', transform: [{ rotate: '14deg' }], opacity: 0.65 },
  park: { position: 'absolute', width: '28%', height: '27%', left: '6%', top: '8%', borderRadius: 18, transform: [{ rotate: '-12deg' }] },
  mapHeader: { position: 'absolute', top: 14, left: 14, right: 14, flexDirection: 'row' },
  locationChip: { borderRadius: 13, paddingHorizontal: 12, height: 38, alignItems: 'center', flexDirection: 'row', gap: 7, borderWidth: 1, borderColor: 'rgba(17,24,39,0.05)' },
  locationText: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 11, lineHeight: 15 },
  pin: { position: 'absolute', alignItems: 'center', marginLeft: -14, marginTop: -24 },
  pinBubble: { width: 30, height: 30, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF' },
  pinShadow: { width: 8, height: 4, borderRadius: 99, marginTop: 2 },
  mapLabel: { position: 'absolute', bottom: 14, left: 14, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 5 },
  mapLabelText: { fontFamily: 'Inter_600SemiBold', fontSize: 11, lineHeight: 15 },
});