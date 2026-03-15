import React, { useRef, useCallback } from 'react';
import { TouchableOpacity, TouchableOpacityProps, Animated, Easing } from 'react-native';
import * as Haptics from 'expo-haptics';

const AnimatedComponent = Animated.createAnimatedComponent(TouchableOpacity);

export interface AnimatedTouchableProps extends TouchableOpacityProps {
    children?: React.ReactNode;
    /** Scale intensity: 'subtle' (0.97), 'medium' (0.94), 'strong' (0.90) */
    intensity?: 'subtle' | 'medium' | 'strong';
    /** Haptic style. Set to 'none' to disable */
    hapticStyle?: 'light' | 'medium' | 'heavy' | 'none';
    /** Disable the scale animation entirely */
    disableAnimation?: boolean;
}

const SCALE_MAP = {
    subtle: 0.97,
    medium: 0.94,
    strong: 0.90,
};

export function AnimatedTouchable({
    children,
    onPress,
    onPressIn,
    onPressOut,
    style,
    intensity = 'medium',
    hapticStyle = 'light',
    disableAnimation = false,
    ...props
}: AnimatedTouchableProps) {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const opacityAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = useCallback((e: any) => {
        if (!disableAnimation) {
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: SCALE_MAP[intensity],
                    useNativeDriver: true,
                    friction: 5,
                    tension: 160,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 0.85,
                    duration: 80,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
            ]).start();
        }
        onPressIn?.(e);
    }, [intensity, disableAnimation, onPressIn]);

    const handlePressOut = useCallback((e: any) => {
        if (!disableAnimation) {
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    useNativeDriver: true,
                    friction: 3,
                    tension: 200,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 150,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
            ]).start();
        }
        onPressOut?.(e);
    }, [disableAnimation, onPressOut]);

    const handlePress = useCallback((e: any) => {
        if (hapticStyle !== 'none') {
            const feedbackMap = {
                light: Haptics.ImpactFeedbackStyle.Light,
                medium: Haptics.ImpactFeedbackStyle.Medium,
                heavy: Haptics.ImpactFeedbackStyle.Heavy,
            };
            Haptics.impactAsync(feedbackMap[hapticStyle]);
        }
        onPress?.(e);
    }, [hapticStyle, onPress]);

    return (
        <AnimatedComponent
            {...props}
            activeOpacity={1}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={handlePress}
            style={[
                style,
                {
                    transform: [{ scale: scaleAnim }],
                    opacity: opacityAnim,
                },
            ]}
        >
            {children}
        </AnimatedComponent>
    );
}
