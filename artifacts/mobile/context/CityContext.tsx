import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

export type Booking = {
  id: string;
  businessId: string;
  businessName: string;
  serviceName: string;
  dateISO?: string;
  dateLabel: string;
  time: string;
  status: 'Tasdiqlandi' | 'Kutilmoqda' | 'Bekor qilindi';
};

type CityContextValue = {
  bookings: Booking[];
  favoriteIds: string[];
  searchHistory: string[];
  notificationsEnabled: boolean;
  isReady: boolean;
  addBooking: (booking: Omit<Booking, 'id' | 'status'>) => Promise<boolean>;
  toggleFavorite: (businessId: string) => void;
  isFavorite: (businessId: string) => boolean;
  addSearch: (query: string) => void;
  removeSearch: (query: string) => void;
  clearSearchHistory: () => void;
  setNotificationsEnabled: (enabled: boolean) => void;
};

const BOOKINGS_KEY = '@digital-city/bookings';
const FAVORITES_KEY = '@digital-city/favorites';
const SEARCH_HISTORY_KEY = '@digital-city/search-history';
// The old value represented an in-app display preference, not consent to OS
// push permissions. A new key prevents that setting from opting users in.
const NOTIFICATIONS_KEY = '@digital-city/push-opt-in:v2';

const CityContext = createContext<CityContextValue | null>(null);

async function readStoredValue(key: string) {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

async function writeStoredValue(key: string, value: string) {
  try {
    await AsyncStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function parseBookings(value: string | null): Booking[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((candidate): Booking[] => {
      if (candidate === null || typeof candidate !== 'object') return [];
      const item = candidate as Partial<Booking>;
      if (
        typeof item.id !== 'string' ||
        typeof item.businessId !== 'string' ||
        typeof item.businessName !== 'string' ||
        typeof item.serviceName !== 'string' ||
        typeof item.dateLabel !== 'string' ||
        typeof item.time !== 'string' ||
        !['Tasdiqlandi', 'Kutilmoqda', 'Bekor qilindi'].includes(String(item.status))
      ) return [];
      return [{
        id: item.id,
        businessId: item.businessId,
        businessName: item.businessName,
        serviceName: item.serviceName,
        dateISO: typeof item.dateISO === 'string' ? item.dateISO : undefined,
        dateLabel: item.dateLabel,
        time: item.time,
        // Older versions called locally saved requests "confirmed". No server
        // ever confirmed these records, so display them honestly after upgrade.
        status: item.status === 'Tasdiqlandi' ? 'Kutilmoqda' : item.status as Booking['status'],
      }];
    });
  } catch {
    return [];
  }
}

export function CityProvider({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    void Promise.all([
      readStoredValue(BOOKINGS_KEY),
      readStoredValue(FAVORITES_KEY),
      readStoredValue(SEARCH_HISTORY_KEY),
      readStoredValue(NOTIFICATIONS_KEY),
    ]).then(([storedBookings, storedFavorites, storedSearches, storedNotifications]) => {
      if (!active) return;
      setBookings(parseBookings(storedBookings));
      try {
        const parsedFavorites: unknown = storedFavorites ? JSON.parse(storedFavorites) : null;
        const parsedSearches: unknown = storedSearches ? JSON.parse(storedSearches) : null;
        if (Array.isArray(parsedFavorites)) setFavoriteIds(parsedFavorites.filter((item): item is string => typeof item === 'string'));
        if (Array.isArray(parsedSearches)) setSearchHistory(parsedSearches.filter((item): item is string => typeof item === 'string'));
      } catch { /* Ignore malformed optional settings independently. */ }
      if (storedNotifications !== null) setNotificationsEnabled(storedNotifications === 'true');
      setHydrated(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void writeStoredValue(BOOKINGS_KEY, JSON.stringify(bookings));
  }, [bookings, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    void writeStoredValue(FAVORITES_KEY, JSON.stringify(favoriteIds));
  }, [favoriteIds, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    void writeStoredValue(SEARCH_HISTORY_KEY, JSON.stringify(searchHistory));
  }, [searchHistory, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    void writeStoredValue(NOTIFICATIONS_KEY, String(notificationsEnabled));
  }, [hydrated, notificationsEnabled]);

  const value = useMemo<CityContextValue>(
    () => ({
      bookings,
      favoriteIds,
      searchHistory,
      notificationsEnabled,
      isReady: hydrated,
      addBooking: async (booking) => {
        if (!hydrated) return false;
        const nextBooking: Booking = {
          ...booking,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          status: 'Kutilmoqda',
        };
        const nextBookings = [nextBooking, ...bookings];
        if (!await writeStoredValue(BOOKINGS_KEY, JSON.stringify(nextBookings))) return false;
        setBookings(nextBookings);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
        return true;
      },
      toggleFavorite: (businessId) => {
        setFavoriteIds((current) =>
          current.includes(businessId)
            ? current.filter((id) => id !== businessId)
            : [...current, businessId],
        );
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      },
      isFavorite: (businessId) => favoriteIds.includes(businessId),
      addSearch: (query) => {
        const normalized = query.trim();
        if (!normalized) return;
        setSearchHistory((current) => [normalized, ...current.filter((item) => item.toLowerCase() !== normalized.toLowerCase())].slice(0, 8));
      },
      removeSearch: (query) => setSearchHistory((current) => current.filter((item) => item !== query)),
      clearSearchHistory: () => setSearchHistory([]),
      setNotificationsEnabled,
    }),
    [bookings, favoriteIds, hydrated, notificationsEnabled, searchHistory],
  );

  return (
    <CityContext.Provider value={value}>
      {hydrated ? (
        children
      ) : (
        <View style={[styles.loading, { backgroundColor: colors.background }]} accessibilityRole="progressbar">
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Saqlangan ma’lumotlar yuklanmoqda…</Text>
        </View>
      )}
    </CityContext.Provider>
  );
}

export function useCity() {
  const context = useContext(CityContext);
  if (!context) throw new Error('useCity must be used inside CityProvider');
  return context;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  loadingText: { fontFamily: 'Inter_400Regular', fontSize: 13, textAlign: 'center' },
});