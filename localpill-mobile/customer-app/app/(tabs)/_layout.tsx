import { Tabs } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Platform, View, StyleSheet, Animated, Text, useColorScheme as useRNColorScheme } from 'react-native';
import { AppIcon } from '../../components/icons/AppIcon';
import { HapticTab } from '../../components/haptic-tab';

import { Colors, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type TabName = 'home' | 'search' | 'time' | 'person' | 'map';
const ICON_MAP: Record<TabName, {
  active: any;
  inactive: any;
}> = {
  home: { active: 'home', inactive: 'home-outline' },
  search: { active: 'search', inactive: 'search' },
  time: { active: 'time', inactive: 'time-outline' },
  person: { active: 'person', inactive: 'person-outline' },
  map: { active: 'map', inactive: 'map-outline' },
};

/**
 * Premium 3-layer tab indicator:
 *  1. Animated top accent line — expands from center on active
 *  2. Glowing pill background — fades in behind icon
 *  3. Icon bounce — subtle upward spring + scale
 */
function TabIcon({ name, label, focused }: { name: TabName; label: string; focused: boolean }) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme as 'light' | 'dark'];

  // Layer 1: top line
  const lineWidth = useRef(new Animated.Value(focused ? 32 : 0)).current;

  // Layer 2: pill
  const pillOpacity = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const pillScale = useRef(new Animated.Value(focused ? 1 : 0.7)).current;

  // Layer 3: icon
  const iconScale = useRef(new Animated.Value(focused ? 1.1 : 1)).current;
  const iconTransY = useRef(new Animated.Value(focused ? -1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      // Top accent line
      Animated.spring(lineWidth, {
        toValue: focused ? 32 : 0,
        friction: 6,
        tension: 160,
        useNativeDriver: false,
      }),
      // Pill fade + scale
      Animated.timing(pillOpacity, {
        toValue: focused ? 1 : 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.spring(pillScale, {
        toValue: focused ? 1 : 0.7,
        friction: 5,
        tension: 150,
        useNativeDriver: true,
      }),
      // Icon bounce up
      Animated.spring(iconScale, {
        toValue: focused ? 1.14 : 1,
        friction: 4,
        tension: 120,
        useNativeDriver: true,
      }),
      Animated.spring(iconTransY, {
        toValue: focused ? -1.5 : 0,
        friction: 5,
        tension: 140,
        useNativeDriver: true,
      }),
    ]).start();
  }, [focused, lineWidth, pillOpacity, pillScale, iconScale, iconTransY]);

  return (
    <View style={tabStyles.tabItem}>

      {/* Layer 1: Animated top accent line */}
      <Animated.View
        style={[
          tabStyles.topLine,
          {
            width: lineWidth,
            backgroundColor: colors.tint,
            shadowColor: colors.tint,
            shadowOpacity: focused ? 0.6 : 0,
          },
        ]}
      />

      {/* Layer 2 + 3: Pill + Icon stacked */}
      <View style={tabStyles.iconArea}>
        <Animated.View
          style={[
            tabStyles.pill,
            {
              backgroundColor: colors.accentSoft,
              opacity: pillOpacity,
              transform: [{ scale: pillScale }],
            },
          ]}
        />
        <Animated.View
          style={{
            transform: [{ scale: iconScale }, { translateY: iconTransY }],
            zIndex: 1,
          }}
        >
          <AppIcon
            name={focused ? ICON_MAP[name].active : ICON_MAP[name].inactive}
            size={22}
            color={focused ? colors.tint : colors.tabIconDefault}
          />
        </Animated.View>
      </View>

      {/* Label */}
      <Text
        style={[
          tabStyles.label,
          {
            color: focused ? colors.tint : colors.tabIconDefault,
            fontFamily: focused ? 'Inter_700Bold' : 'Inter_500Medium',
          },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>

    </View>
  );
}

import { BiometricGate } from '../../components/BiometricGate';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme as 'light' | 'dark'];
  const { isLoggedIn, isLoading } = useAuth();
  const router = useRouter();

  // ── Auth Guard: kick out if not logged in ──────────────────────
  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.replace('/login');
    }
  }, [isLoggedIn, isLoading, router]);

  // Don't render tabs until auth is resolved
  if (isLoading || !isLoggedIn) return null;

  return (
    <BiometricGate>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarShowLabel: false,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            height: Platform.OS === 'ios' ? 92 : 72,
            paddingTop: 4,
            shadowColor: colors.shadow,
            ...Shadows.lg,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon name="home" label="Home" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="map"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon name="map" label="Map" focused={focused} />
            ),
          }}
        />

        <Tabs.Screen
          name="search"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon name="time" label="History" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon name="person" label="Profile" focused={focused} />
            ),
          }}
        />
      </Tabs>
    </BiometricGate>
  );
}

const tabStyles = StyleSheet.create({
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 0,
    height: 64,
  },

  // Top accent line
  topLine: {
    height: 3.5,
    borderRadius: 1.5,
    marginBottom: 5,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
  },

  // Pill background behind icon
  iconArea: {
    width: 50,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  pill: {
    position: 'absolute',
    width: 50,
    height: 30,
    borderRadius: 14,
  },

  label: {
    fontSize: 10,
    letterSpacing: 0.1,
    width: '100%',
    textAlign: 'center',
  },
});
