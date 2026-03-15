import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { ClipboardList, BarChart3, UserCircle } from 'lucide-react-native';
import { Colors, DesignTokens } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

import { BiometricGate } from '../../components/BiometricGate';

export default function TabLayout() {
  const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const colors = Colors[colorScheme];

  return (
    <BiometricGate>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.tabIconDefault,
          tabBarLabelStyle: {
            fontFamily: DesignTokens.font.semibold,
            fontSize: 11,
            marginTop: -2,
          },
          tabBarStyle: {
            backgroundColor: colors.tabBarBackground,
            borderTopWidth: 0,
            height: Platform.OS === 'ios' ? 88 : 68,
            paddingBottom: Platform.OS === 'ios' ? 28 : 10,
            paddingTop: 10,
            ...DesignTokens.shadow.elevated,
            // Floating effect
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
          },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Requests',
            tabBarIcon: ({ color, focused }) => (
              <View style={focused ? styles.activeIconContainer : undefined}>
                <ClipboardList
                  color={color}
                  size={22}
                  strokeWidth={focused ? 2.5 : 2}
                />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: 'History',
            tabBarIcon: ({ color, focused }) => (
              <View style={focused ? styles.activeIconContainer : undefined}>
                <BarChart3
                  color={color}
                  size={22}
                  strokeWidth={focused ? 2.5 : 2}
                />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, focused }) => (
              <View style={focused ? styles.activeIconContainer : undefined}>
                <UserCircle
                  color={color}
                  size={24}
                  strokeWidth={focused ? 2.5 : 2}
                />
              </View>
            ),
          }}
        />
      </Tabs>
    </BiometricGate>
  );
}

const styles = StyleSheet.create({
  activeIconContainer: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
});
