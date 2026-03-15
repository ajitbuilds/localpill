import React, { useRef } from 'react';
import { TouchableOpacity, TouchableOpacityProps, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';

const AnimatedComponent = Animated.createAnimatedComponent(TouchableOpacity);

export interface AnimatedTouchableProps extends TouchableOpacityProps {
    children?: React.ReactNode;
}

export function AnimatedTouchable({ children, onPress, onPressIn, onPressOut, style, ...props }: AnimatedTouchableProps) {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = (e: any) => {
        Animated.spring(scaleAnim, {
            toValue: 0.95,
            useNativeDriver: true,
            speed: 30,
            bounciness: 12,
        }).start();
        if (onPressIn) onPressIn(e);
    };

    const handlePressOut = (e: any) => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            speed: 30,
            bounciness: 12,
        }).start();
        if (onPressOut) onPressOut(e);
    };

    const handlePress = (e: any) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (onPress) onPress(e);
    };

    return (
        <AnimatedComponent
            {...props}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={handlePress}
            style={[style, { transform: [{ scale: scaleAnim }] }]}
        >
            {children}
        </AnimatedComponent>
    );
}
