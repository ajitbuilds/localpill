import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState, useRef } from 'react';
import Constants from 'expo-constants';
import 'react-native-reanimated';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';

import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';

import { useColorScheme } from '../hooks/use-color-scheme';
import { GlobalToast } from '../components/Toast';
import { usePushNotifications } from '../hooks/usePushNotifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import crashlytics from '@react-native-firebase/crashlytics';
import perf from '@react-native-firebase/perf';
import analytics from '@react-native-firebase/analytics';
import remoteConfig from '@react-native-firebase/remote-config';
import appCheck from '@react-native-firebase/app-check';
import database from '@react-native-firebase/database';
import firestore from '@react-native-firebase/firestore';
import { LocationProvider } from '../contexts/LocationContext';
import { AuthProvider } from '../contexts/AuthContext';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { OfflineBanner } from '../components/OfflineBanner';
import { View, Text, Animated, StyleSheet, Image, Alert, Linking } from 'react-native';
import { Colors } from '../constants/theme';

SplashScreen.preventAutoHideAsync();
if (__DEV__) console.log('RootLayout file execution started');


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

// Initialize Crashlytics & Performance monitoring
crashlytics().setCrashlyticsCollectionEnabled(true);
perf().setPerformanceCollectionEnabled(true);

// Initialize Remote Config Defaults
remoteConfig()
  .setDefaults({
    welcome_message: 'Welcome to LocalPill!',
    promo_banner_enabled: false,
    min_app_version: '1.0.0',
  })
  .then(() => remoteConfig().fetchAndActivate())
  .then(fetchedRemotely => {
    if (fetchedRemotely) {
      if (__DEV__) console.log('Remote Configs fetched from backend and activated');
    }
  });

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontTimeout, setFontTimeout] = useState(false);
  const [appReady, setAppReady] = useState(false);
  const [splashAnimationDone, setSplashAnimationDone] = useState(false);

  const splashOpacity = useRef(new Animated.Value(1)).current;
  const splashScale = useRef(new Animated.Value(1)).current;

  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  const { expoPushToken, devicePushToken } = usePushNotifications();

  useEffect(() => {
    if (fontsLoaded || fontError || fontTimeout) {
      setAppReady(true);
    }
  }, [fontsLoaded, fontError, fontTimeout]);

  useEffect(() => {
    if (appReady) {
      SplashScreen.hideAsync().then(() => {
        Animated.parallel([
          Animated.timing(splashOpacity, { toValue: 0, duration: 450, useNativeDriver: true, delay: 400 }),
          Animated.timing(splashScale, { toValue: 1.15, duration: 450, useNativeDriver: true, delay: 400 }),
        ]).start(() => setSplashAnimationDone(true));
      }).catch(() => setSplashAnimationDone(true));
    }
  }, [appReady]);

  useEffect(() => {
    // Enable Offline Support for Firestore and RTDB
    const enableOffline = async () => {
      try {
        // Realtime database offline support
        database().goOnline(); // goOnline will reconnect if it was offline, but by default it persists in react-native-firebase

        // Firestore offline persistence
        await firestore().settings({
          persistence: true,
          cacheSizeBytes: firestore.CACHE_SIZE_UNLIMITED,
        });
        if (__DEV__) console.log('Firebase Offline Persistence Enabled.');
      } catch (err) {
        if (__DEV__) console.log('Firebase Persistence error or already enabled', err);
      }
    };

    const timer = setTimeout(() => {
      setFontTimeout(true);
      if (__DEV__) console.log('Splash screen force hidden after timeout');
    }, 5000);

    enableOffline();
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Cache the device token globally so other screens (like login/index) can grab it
    // and sync it to the `users` document in Firestore.
    if (devicePushToken) AsyncStorage.setItem('devicePushToken', devicePushToken);
    if (expoPushToken?.data) AsyncStorage.setItem('expoPushToken', expoPushToken.data);
  }, [devicePushToken, expoPushToken]);

  const router = useRouter();

  // Check for deep links from push notifications on startup
  useEffect(() => {
    if (fontsLoaded || fontError || fontTimeout) {
      const checkPendingRoutes = async () => {
        try {
          const navStr = await AsyncStorage.getItem('pendingNavigation');
          if (navStr) {
            await AsyncStorage.removeItem('pendingNavigation');
            const nav = JSON.parse(navStr);
            if (nav.pathname) {
              setTimeout(() => {
                router.push(nav.pathname);
              }, 500);
            }
          }
        } catch (e) {
          if (__DEV__) console.error("Error reading pending navigation:", e);
        }
      };
      checkPendingRoutes();
    }
  }, [fontsLoaded, fontError, fontTimeout, router]);

  // ── App Update Check via Remote Config ──
  useEffect(() => {
    const checkForUpdate = async () => {
      try {
        const minVersion = remoteConfig().getValue('min_app_version').asString();
        const currentVersion = Constants.expoConfig?.version ?? '1.0.0';

        if (minVersion && isVersionOlder(currentVersion, minVersion)) {
          Alert.alert(
            '🔄 Update Available',
            'A new version of LocalPill is available. Please update for the best experience.',
            [
              { text: 'Later', style: 'cancel' },
              {
                text: 'Update Now',
                onPress: () => Linking.openURL('https://play.google.com/store/apps/details?id=com.localpill.customer'),
              },
            ],
          );
        }
      } catch (e) {
        if (__DEV__) console.log('Update check failed:', e);
      }
    };

    // Simple semver compare: returns true if current < minimum
    const isVersionOlder = (current: string, minimum: string): boolean => {
      const cParts = current.split('.').map(Number);
      const mParts = minimum.split('.').map(Number);
      for (let i = 0; i < 3; i++) {
        if ((cParts[i] || 0) < (mParts[i] || 0)) return true;
        if ((cParts[i] || 0) > (mParts[i] || 0)) return false;
      }
      return false; // equal = not older
    };

    // Delay check to avoid blocking the initial render
    const timer = setTimeout(checkForUpdate, 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!appReady) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <OfflineBanner />
      <AuthProvider>
        <LocationProvider>
          <ErrorBoundary>
            <Stack screenOptions={{ animation: 'fade', headerShown: false }}>
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="login" options={{ headerShown: false }} />
              <Stack.Screen name="otp" options={{ headerShown: false, presentation: 'modal' }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
              <Stack.Screen name="location-modal" options={{ presentation: 'modal', headerShown: false }} />
              <Stack.Screen name="chat" options={{ headerShown: false }} />
              <Stack.Screen name="request/[id]" options={{ headerShown: false }} />
              <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            </Stack>
            <GlobalToast />
            <StatusBar style="auto" />
          </ErrorBoundary>
        </LocationProvider>
      </AuthProvider>
      
      {!splashAnimationDone && (
        <Animated.View 
          style={[
            StyleSheet.absoluteFill,
            { 
              backgroundColor: Colors[colorScheme || 'light'].background, 
              justifyContent: 'center', 
              alignItems: 'center', 
              zIndex: 9999,
              opacity: splashOpacity 
            }
          ]}
          pointerEvents="none"
        >
          <Animated.Image 
            source={require('../assets/images/splash-icon.png')}
            style={{ width: 200, height: 200, resizeMode: 'contain', transform: [{ scale: splashScale }] }} 
          />
        </Animated.View>
      )}
    </ThemeProvider>
  );
}
