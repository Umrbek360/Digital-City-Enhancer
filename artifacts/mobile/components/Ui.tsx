import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import {
  Image,
  ImageSourcePropType,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { useColors } from '@/hooks/useColors';

export function LogoMark({ size = 38 }: { size?: number }) {
  const colors = useColors();
  return (
    <View style={[styles.logoMark, { width: size, height: size, borderRadius: size * 0.32, backgroundColor: colors.primary }]}>
      <Feather name="map-pin" size={size * 0.48} color={colors.primaryForeground} />
      <View style={[styles.logoDot, { backgroundColor: colors.success, width: size * 0.17, height: size * 0.17 }]} />
    </View>
  );
}

export function IconButton({
  icon,
  onPress,
  label,
  active = false,
  style,
}: {
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  label: string;
  active?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityLabel={label}
      testID={`icon-${label}`}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        styles.iconButton,
        { backgroundColor: active ? colors.softBlue : colors.white, borderColor: active ? colors.primary : colors.border },
        pressed && styles.pressed,
        style,
      ]}
    >
      <Feather name={icon} size={20} color={active ? colors.primary : colors.foreground} />
    </Pressable>
  );
}

export function StatusBadge({ status }: { status: 'Ochiq' | 'Yopiq' | 'Tasdiqlandi' | 'Kutilmoqda' | 'Bekor qilindi' }) {
  const colors = useColors();
  const isOpen = status === 'Ochiq' || status === 'Tasdiqlandi';
  const isPending = status === 'Kutilmoqda';
  const color = isOpen ? colors.success : isPending ? colors.warning : colors.error;
  const backgroundColor = isOpen ? colors.softGreen : isPending ? colors.softOrange : colors.softRose;
  return (
    <View style={[styles.badge, { backgroundColor }]}>
      <View style={[styles.badgeDot, { backgroundColor: color }]} />
      <Text style={[styles.badgeText, { color }]}>{status}</Text>
    </View>
  );
}

export function Rating({ rating, reviews, light = false }: { rating: string; reviews?: number; light?: boolean }) {
  const colors = useColors();
  return (
    <View style={styles.ratingRow}>
      <Feather name="star" size={14} color={colors.warning} fill={colors.warning} />
      <Text style={[styles.rating, { color: light ? '#ffffff' : colors.foreground }]}>{rating}</Text>
      {reviews !== undefined && <Text style={[styles.reviewCount, { color: light ? 'rgba(255,255,255,0.75)' : colors.mutedForeground }]}>({reviews})</Text>}
    </View>
  );
}

export function BusinessCard({
  name,
  category,
  address,
  distance,
  rating,
  reviewCount,
  status,
  image,
  accent,
  isExample = false,
  onPress,
  onFavorite,
  favorite,
}: {
  name: string;
  category: string;
  address: string;
  distance?: string;
  rating?: string;
  reviewCount: number;
  status: 'Ochiq' | 'Yopiq' | 'Tasdiqlandi';
  image?: ImageSourcePropType | null;
  accent?: string;
  isExample?: boolean;
  onPress: () => void;
  onFavorite?: () => void;
  favorite?: boolean;
}) {
  const colors = useColors();
  const categoryIcon: keyof typeof Feather.glyphMap =
    category === 'Ovqatlanish'
      ? 'coffee'
      : category === 'Go‘zallik'
        ? 'scissors'
        : category === 'Sog‘liq'
          ? 'heart'
          : 'book-open';
  return (
    <View style={[styles.businessCard, { backgroundColor: colors.white, borderColor: colors.border }]}>
      <Pressable
        accessibilityRole="button"
        testID={`business-card-${name}`}
        onPress={onPress}
        style={({ pressed }) => [styles.businessCardLink, pressed && styles.pressed]}
      >
        {image ? (
          <Image source={image} style={styles.businessImage} />
        ) : (
          <View style={[styles.businessImage, styles.businessImagePlaceholder, { backgroundColor: colors.softGreen }]}>
            <Feather name={categoryIcon} size={27} color={accent ?? colors.primary} />
          </View>
        )}
        <View style={styles.businessInfo}>
          <View style={styles.cardTitleRow}>
            <View style={styles.cardTitleCopy}>
              <Text style={[styles.eyebrow, { color: colors.primary }]}>{category}</Text>
              <Text style={[styles.businessName, { color: colors.foreground }]} numberOfLines={1}>{name}</Text>
            </View>
          </View>
          <View style={styles.cardMetaRow}>
            {rating ? <Rating rating={rating} reviews={reviewCount} /> : <Text style={[styles.newListingText, { color: colors.mutedForeground }]}>{isExample ? 'Namuna ma’lumotlari' : 'Reyting yo‘q'}</Text>}
            {distance ? (
              <View style={[styles.distancePill, { backgroundColor: colors.muted }]}>
                <Feather name="navigation" size={11} color={colors.mutedForeground} />
                <Text style={[styles.distanceText, { color: colors.mutedForeground }]}>{distance}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.cardBottomRow}>
            <View style={styles.addressRow}>
              <Feather name="map-pin" size={13} color={colors.mutedForeground} />
              <Text style={[styles.address, { color: colors.mutedForeground }]} numberOfLines={1}>{address}</Text>
            </View>
            {isExample ? (
              <View style={[styles.exampleBadge, { backgroundColor: colors.softOrange }]}>
                <Text style={[styles.exampleBadgeText, { color: colors.warning }]}>Namuna</Text>
              </View>
            ) : (
              <StatusBadge status={status} />
            )}
          </View>
        </View>
      </Pressable>
      {onFavorite && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={favorite ? 'Sevimlilardan olib tashlash' : 'Sevimliga qo‘shish'}
          accessibilityState={{ selected: favorite }}
          onPress={onFavorite}
          hitSlop={8}
          style={[styles.favoriteButton, { backgroundColor: colors.white }]}
        >
          <Feather name="heart" size={20} color={favorite ? colors.error : colors.mutedForeground} fill={favorite ? colors.error : 'transparent'} />
        </Pressable>
      )}
    </View>
  );
}

export function PrimaryButton({
  title,
  onPress,
  icon,
  disabled = false,
  style,
}: {
  title: string;
  onPress: () => void;
  icon?: keyof typeof Feather.glyphMap;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useColors();
  return (
    <Pressable
      testID={`button-${title}`}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress();
      }}
      style={({ pressed }) => [
        styles.primaryButton,
        { backgroundColor: disabled ? colors.muted : colors.primary },
        pressed && styles.pressed,
        style,
      ]}
    >
      {icon && <Feather name={icon} size={17} color={disabled ? colors.mutedForeground : colors.primaryForeground} />}
      <Text style={[styles.primaryButtonText, { color: disabled ? colors.mutedForeground : colors.primaryForeground }]}>{title}</Text>
    </Pressable>
  );
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const colors = useColors();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      {action && onAction && (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={[styles.sectionAction, { color: colors.primary }]}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  logoMark: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  logoDot: { position: 'absolute', right: 5, top: 5, borderRadius: 99 },
  iconButton: { width: 42, height: 42, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  badge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 5 },
  badgeDot: { width: 5, height: 5, borderRadius: 99 },
  badgeText: { fontFamily: 'Inter_600SemiBold', fontSize: 10, lineHeight: 13 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rating: { fontFamily: 'Inter_600SemiBold', fontSize: 13, lineHeight: 17 },
  reviewCount: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 16 },
  businessCard: { borderRadius: 20, borderWidth: 1, overflow: 'hidden', minHeight: 132, position: 'relative' },
  businessCardLink: { flexDirection: 'row', minHeight: 132 },
  businessImage: { width: 112, height: 132 },
  businessImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  businessInfo: { padding: 14, flex: 1, justifyContent: 'space-between' },
  cardTitleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 },
  cardTitleCopy: { flex: 1 },
  favoriteButton: { position: 'absolute', top: 8, right: 8, zIndex: 1, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontFamily: 'Inter_600SemiBold', fontSize: 10, lineHeight: 13, letterSpacing: 0.4, textTransform: 'uppercase' },
  businessName: { fontFamily: 'Inter_700Bold', fontSize: 16, lineHeight: 21, marginTop: 2 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 6 },
  newListingText: { fontFamily: 'Inter_600SemiBold', fontSize: 11, lineHeight: 15 },
  distancePill: { borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 3 },
  distanceText: { fontFamily: 'Inter_500Medium', fontSize: 11, lineHeight: 14 },
  cardBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6, marginTop: 9 },
  addressRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  address: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 15 },
  exampleBadge: { borderRadius: 9, paddingHorizontal: 8, paddingVertical: 5 },
  exampleBadgeText: { fontFamily: 'Inter_600SemiBold', fontSize: 10, lineHeight: 13 },
  primaryButton: { minHeight: 54, borderRadius: 17, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 22 },
  primaryButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, lineHeight: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 13 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, lineHeight: 27 },
  sectionAction: { fontFamily: 'Inter_600SemiBold', fontSize: 13, lineHeight: 18 },
});