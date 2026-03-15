import React from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface AnimatedCardProps {
    index: number;
    children: React.ReactNode;
    style?: any;
}

/**
 * AnimatedCard — wraps any card with a staggered FadeInDown entrance animation.
 * Each subsequent card enters 60ms after the previous one.
 */
export function AnimatedCard({ index, children, style }: AnimatedCardProps) {
    return (
        <Animated.View
            entering={FadeInDown.delay(index * 60).duration(400).springify().damping(15)}
            style={style}
        >
            {children}
        </Animated.View>
    );
}
