import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { AppIcon } from './icons/AppIcon';
import { Colors, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface AnimatedEmptyStateProps {
    icon: any;
    title: string;
    subtitle: string;
    color?: string;
}

/**
 * AnimatedEmptyState — premium animated empty state with floating icon,
 * fade-in text, and a soft pulsing glow ring. Theme-aware for dark mode.
 */
export function AnimatedEmptyState({
    icon,
    title,
    subtitle,
    color,
}: AnimatedEmptyStateProps) {
    const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
    const colors = Colors[colorScheme];
    const accentColor = color ?? colors.tint;

    const floatY = useRef(new Animated.Value(0)).current;
    const iconScale = useRef(new Animated.Value(0.5)).current;
    const textOpacity = useRef(new Animated.Value(0)).current;
    const ringScale = useRef(new Animated.Value(0.8)).current;
    const ringOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Icon entrance
        Animated.spring(iconScale, {
            toValue: 1,
            friction: 4,
            tension: 100,
            useNativeDriver: true,
        }).start();

        // Text fade in after icon
        Animated.timing(textOpacity, {
            toValue: 1,
            duration: 500,
            delay: 300,
            useNativeDriver: true,
        }).start();

        // Continuous float
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatY, {
                    toValue: -8,
                    duration: 1500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(floatY, {
                    toValue: 0,
                    duration: 1500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Pulsing ring
        Animated.loop(
            Animated.sequence([
                Animated.parallel([
                    Animated.timing(ringScale, { toValue: 1.3, duration: 1200, useNativeDriver: true }),
                    Animated.timing(ringOpacity, { toValue: 0.3, duration: 600, useNativeDriver: true }),
                ]),
                Animated.parallel([
                    Animated.timing(ringScale, { toValue: 0.8, duration: 1200, useNativeDriver: true }),
                    Animated.timing(ringOpacity, { toValue: 0, duration: 600, useNativeDriver: true }),
                ]),
            ])
        ).start();
    }, []);

    return (
        <View style={styles.container}>
            <View style={styles.iconWrapper}>
                {/* Pulsing ring */}
                <Animated.View
                    style={[
                        styles.ring,
                        {
                            borderColor: accentColor,
                            transform: [{ scale: ringScale }],
                            opacity: ringOpacity,
                        },
                    ]}
                />
                {/* Floating icon */}
                <Animated.View
                    style={[
                        styles.iconCircle,
                        {
                            backgroundColor: accentColor + '15',
                            transform: [{ translateY: floatY }, { scale: iconScale }],
                        },
                    ]}
                >
                    <AppIcon name={icon as any} size={48} color={accentColor} />
                </Animated.View>
            </View>

            <Animated.View style={{ opacity: textOpacity }}>
                <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
        paddingHorizontal: 32,
    },
    iconWrapper: {
        width: 120,
        height: 120,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    ring: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 2,
    },
    iconCircle: {
        width: 96,
        height: 96,
        borderRadius: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 20,
        fontFamily: 'Inter_700Bold',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        fontFamily: 'Inter_500Medium',
        textAlign: 'center',
        lineHeight: 20,
    },
});
