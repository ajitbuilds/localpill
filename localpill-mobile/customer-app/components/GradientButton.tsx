import React, { useRef, useCallback } from 'react';
import { Animated, StyleSheet, StyleProp, ViewStyle, TextStyle, Text, Easing, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors, Shadows, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface GradientButtonProps {
    onPress: () => void;
    label: string;
    style?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
    disabled?: boolean;
    loading?: boolean;
    icon?: React.ReactNode;
    colors?: [string, string];
    /** Haptic intensity */
    hapticStyle?: 'light' | 'medium' | 'heavy';
}

/**
 * GradientButton — premium CTA with gradient, spring scale, opacity fade, and haptic feedback.
 * Fixed: no longer double-scales (removed AnimatedTouchable wrapper).
 */
export function GradientButton({
    onPress,
    label,
    style,
    textStyle,
    disabled = false,
    loading = false,
    icon,
    colors: gradientColors,
    hapticStyle = 'medium',
}: GradientButtonProps) {
    const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
    const themeColors = Colors[colorScheme];
    const resolvedGradient: [string, string] = gradientColors ?? [themeColors.tint, themeColors.tint + 'CC'];

    const scaleAnim = useRef(new Animated.Value(1)).current;
    const opacityAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = useCallback(() => {
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: 0.93,
                friction: 5,
                tension: 180,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 0.85,
                duration: 60,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const handlePressOut = useCallback(() => {
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 3,
                tension: 220,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 120,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const handlePress = useCallback(() => {
        const feedbackMap = {
            light: Haptics.ImpactFeedbackStyle.Light,
            medium: Haptics.ImpactFeedbackStyle.Medium,
            heavy: Haptics.ImpactFeedbackStyle.Heavy,
        };
        Haptics.impactAsync(feedbackMap[hapticStyle]);
        onPress();
    }, [onPress, hapticStyle]);

    return (
        <Animated.View style={[
            {
                transform: [{ scale: scaleAnim }],
                opacity: disabled ? 0.5 : opacityAnim,
            },
        ]}>
            <Pressable
                onPress={handlePress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={disabled || loading}
            >
                <LinearGradient
                    colors={disabled ? ['#CBD5E1', '#CBD5E1'] : resolvedGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.button, { shadowColor: themeColors.tint }, style]}
                >
                    {icon}
                    <Text style={[styles.text, { color: themeColors.white ?? '#ffffff' }, textStyle]}>{label}</Text>
                </LinearGradient>
            </Pressable>
        </Animated.View>
    );
}


const styles = StyleSheet.create({
    button: {
        height: 54,
        borderRadius: Radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
        ...Shadows.md,
    },
    text: {
        fontSize: 16,
        fontFamily: 'Inter_700Bold',
    },
});
