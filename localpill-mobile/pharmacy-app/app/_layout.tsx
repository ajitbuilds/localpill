import { DefaultTheme, DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useNotifications } from '../hooks/useNotifications';
import { useColorScheme } from '../hooks/useColorScheme';
import database from '@react-native-firebase/database';
import firestore from '@react-native-firebase/firestore';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import crashlytics from '@react-native-firebase/crashlytics';
import perf from '@react-native-firebase/perf';
import analytics from '@react-native-firebase/analytics';
import remoteConfig from '@react-native-firebase/remote-config';
import inAppMessaging from '@react-native-firebase/in-app-messaging';
import appCheck from '@react-native-firebase/app-check';

import { ErrorBoundary } from '../components/ErrorBoundary';
import { OfflineBanner } from '../components/OfflineBanner';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Initialize App Check (Needs to happen early)
const rnfbProvider = appCheck().newReactNativeFirebaseAppCheckProvider();
rnfbProvider.configure({
  android: {
    provider: __DEV__ ? 'debug' : 'playIntegrity',
  },
  apple: {
    provider: __DEV__ ? 'debug' : 'appAttestWithDeviceCheckFallback',
  },
});
appCheck().initializeAppCheck({ provider: rnfbProvider, isTokenAutoRefreshEnabled: true });

// Initialize Crashlytics & Performance Monitoring
crashlytics().setCrashlyticsCollectionEnabled(true);
perf().setPerformanceCollectionEnabled(true);

// Initialize Remote Config Defaults
remoteConfig()
  .setDefaults({
    welcome_message: 'Welcome to LocalPill Pharmacy!',
    promo_banner_enabled: false,
  })
  .then(() => remoteConfig().fetchAndActivate())
  .then(fetchedRemotely => {
    if (fetchedRemotely) {
      console.log('Remote Configs fetched from backend and activated');
    }
  });

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  const { expoPushToken, devicePushToken } = usePushNotifications();
  // Call useNotifications at the root level so it initializes on startup
  useNotifications();

  useEffect(() => {
    if (loaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [loaded, fontError]);

  useEffect(() => {
    // Enable Offline Support for Firestore and RTDB
    const enableOffline = async () => {
         try {
             // Realtime database offline support
             database().goOnline();
             
             // Firestore offline persistence
             await firestore().settings({
                 persistence: true,
                 cacheSizeBytes: firestore.CACHE_SIZE_UNLIMITED,
             });
             console.log('Firebase Offline Persistence Enabled.');
         } catch (err) {
             console.log('Firebase Persistence error or already enabled', err);
         }
     };
    enableOffline();

    const timer = setTimeout(() => {
      SplashScreen.hideAsync();
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (devicePushToken) AsyncStorage.setItem('devicePushToken', devicePushToken);
    if (expoPushToken && expoPushToken.data) AsyncStorage.setItem('expoPushToken', expoPushToken.data);
  }, [devicePushToken, expoPushToken]);

  // Don't block on font loading - render even if fonts fail
  if (!loaded && !fontError) {
    return null;
  }

  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <OfflineBanner />
        <ErrorBoundary>
          <Stack screenOptions={{ animation: 'fade', headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="otp" />
            <Stack.Screen name="setup" />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
            <Stack.Screen name="chat" options={{ headerShown: false }} />
            <Stack.Screen name="customer-profile" options={{ presentation: 'modal', headerShown: false }} />
          </Stack>
        </ErrorBoundary>
      </ThemeProvider>
    </I18nextProvider>
  );
}
