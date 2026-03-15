import React, { useRef, useCallback } from 'react';
import {
    Animated,
    TouchableOpacity,
    StyleProp,
    ViewStyle,
    Easing,
} from 'react-native';
import * as Haptics from 'expo-haptics';

interface AnimatedButtonProps {
    onPress: () => void;
    style?: StyleProp<ViewStyle>;
    children: React.ReactNode;
    activeOpacity?: number;
    disabled?: boolean;
    /** Enable/disable haptic feedback */
    haptic?: boolean;
    /** Haptic intensity */
    hapticStyle?: 'light' | 'medium' | 'heavy';
    /** Scale intensity on press */
    scaleDown?: number;
}

/**
 * AnimatedButton — drop-in replacement for TouchableOpacity.
 * Adds a snappy spring scale-down + opacity fade on press for a premium micro-interaction.
 */
export function AnimatedButton({
    onPress,
    style,
    children,
    activeOpacity = 1,
    disabled = false,
    haptic = true,
    hapticStyle = 'light',
    scaleDown = 0.94,
}: AnimatedButtonProps) {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const opacityAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = useCallback(() => {
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: scaleDown,
                friction: 5,
                tension: 180,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 0.8,
                duration: 60,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
        ]).start();
    }, [scaleDown]);

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
        if (haptic) {
            const feedbackMap = {
                light: Haptics.ImpactFeedbackStyle.Light,
                medium: Haptics.ImpactFeedbackStyle.Medium,
                heavy: Haptics.ImpactFeedbackStyle.Heavy,
            };
            Haptics.impactAsync(feedbackMap[hapticStyle]);
        }
        onPress();
    }, [onPress, haptic, hapticStyle]);

    return (
        <TouchableOpacity
            onPress={handlePress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={activeOpacity}
            disabled={disabled}
            style={{ opacity: disabled ? 0.5 : 1 }}
        >
            <Animated.View style={[
                style,
                {
                    transform: [{ scale: scaleAnim }],
                    opacity: opacityAnim,
                },
            ]}>
                {children}
            </Animated.View>
        </TouchableOpacity>
    );
}
