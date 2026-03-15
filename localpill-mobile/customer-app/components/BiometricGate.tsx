import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, AppState, AppStateStatus } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppIcon } from './icons/AppIcon';
import { Colors } from '../constants/theme';
import { useColorScheme } from '../hooks/use-color-scheme';
import { AnimatedTouchable } from './ui/AnimatedTouchable';

export function BiometricGate({ children }: { children: React.ReactNode }) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const checkEnabled = async () => {
    const val = await AsyncStorage.getItem('biometric_enabled');
    if (val === 'true') {
      setIsEnabled(true);
      authenticate();
    } else {
      setIsEnabled(false);
      setIsUnlocked(true);
    }
  };

  const authenticate = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (!hasHardware || !isEnrolled) {
      setIsUnlocked(true);
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock App',
      fallbackLabel: 'Use Passcode',
      disableDeviceFallback: false,
    });

    if (result.success) {
      setIsUnlocked(true);
    }
  };

  useEffect(() => {
    checkEnabled();

    // Re-authenticate when app comes to foreground if enabled
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        AsyncStorage.getItem('biometric_enabled').then(val => {
          if (val === 'true' && !isUnlocked) {
            authenticate();
          }
        });
      } else if (nextAppState === 'background') {
        const checkBackground = async () => {
           const val = await AsyncStorage.getItem('biometric_enabled');
           if (val === 'true') {
               setIsUnlocked(false);
           }
        }
        checkBackground();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  if (!isEnabled || isUnlocked) {
    return <>{children}</>;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppIcon name="lock-closed" size={64} color={colors.tint} style={{ marginBottom: 20 }} />
      <Text style={[styles.title, { color: colors.text }]}>App Locked</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>Unlock to view your data.</Text>
      <AnimatedTouchable
        style={[styles.button, { backgroundColor: colors.tint }]}
        onPress={authenticate}
      >
        <Text style={styles.buttonText}>Unlock</Text>
      </AnimatedTouchable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    marginBottom: 32,
  },
  button: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
});
