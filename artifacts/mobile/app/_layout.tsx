import React, { useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ClerkLoaded, ClerkLoading, ClerkProvider, useAuth } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { setAuthTokenGetter, setBaseUrl } from '@workspace/api-client-react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
  useFonts,
} from '@expo-google-fonts/dm-sans';
import { Stack } from 'expo-router';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { CityProvider } from '@/context/CityContext';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

const queryClient = new QueryClient();
const domain = process.env.EXPO_PUBLIC_DOMAIN;
if (domain) setBaseUrl(`https://${domain}`);

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;
const proxyUrl = process.env.EXPO_PUBLIC_CLERK_PROXY_URL || undefined;

function ClerkApiBridge() {
  const { getToken, userId } = useAuth();
  const activeQueryClient = useQueryClient();
  const previousUserId = useRef<string | null>(userId ?? null);

  useEffect(() => {
    setAuthTokenGetter(() => getToken());
    return () => setAuthTokenGetter(null);
  }, [getToken]);

  useEffect(() => {
    const currentUserId = userId ?? null;
    if (previousUserId.current !== currentUserId) {
      activeQueryClient.clear();
      previousUserId.current = currentUserId;
    }
  }, [activeQueryClient, userId]);

  return null;
}

function RootLayoutNav() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const route = response.notification.request.content.data?.route;
      if (route === '/(tabs)/bookings') router.push('/(tabs)/bookings');
      else if (route === '/business-bookings') router.push('/business-bookings');
      else if (route === '/business-account') router.push('/business-account');
    });
    return () => subscription.remove();
  }, []);

  return (
    <Stack initialRouteName="(tabs)" screenOptions={{ headerBackTitle: 'Back', headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="business-auth" options={{ presentation: 'modal' }} />
      <Stack.Screen name="business-account" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    // Keep the existing font-family aliases so legacy screens also use the
    // Digital City admin's DM Sans typography without a broad style rewrite.
    Inter_400Regular: DMSans_400Regular,
    Inter_500Medium: DMSans_500Medium,
    Inter_600SemiBold: DMSans_600SemiBold,
    Inter_700Bold: DMSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError && Platform.OS !== 'web') return null;

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      tokenCache={tokenCache}
      proxyUrl={proxyUrl}
    >
      <SafeAreaProvider>
        <ErrorBoundary>
          <ClerkLoading>
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#F5F6FA',
              }}
              accessibilityRole="progressbar"
            >
              <ActivityIndicator color="#329477" />
              <Text
                style={{
                  marginTop: 12,
                  color: '#75808F',
                  fontFamily: fontsLoaded ? 'Inter_400Regular' : undefined,
                  fontSize: 14,
                }}
              >
                Hisob tekshirilmoqda…
              </Text>
            </View>
          </ClerkLoading>
          <ClerkLoaded>
            <QueryClientProvider client={queryClient}>
              <ClerkApiBridge />
              <CityProvider>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <KeyboardProvider>
                    <RootLayoutNav />
                  </KeyboardProvider>
                </GestureHandlerRootView>
              </CityProvider>
            </QueryClientProvider>
          </ClerkLoaded>
        </ErrorBoundary>
      </SafeAreaProvider>
    </ClerkProvider>
  );
}
