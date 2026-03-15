import { useRef, useEffect } from 'react';
import { Animated, ViewStyle } from 'react-native';

interface UseFadeInOptions {
    /** Initial vertical offset before animation starts. Default: 20 */
    slideDistance?: number;
    /** Duration of fade animation in ms. Default: 500 */
    duration?: number;
    /** Delay before animation starts in ms. Default: 0 */
    delay?: number;
}

/**
 * useFadeIn — reusable entrance animation hook.
 * Replaces the copy-pasted fadeAnim + slideAnim pattern across all screens.
 *
 * Usage:
 *   const { style } = useFadeIn();
 *   <Animated.View style={style}>...</Animated.View>
 */
export function useFadeIn(options: UseFadeInOptions = {}) {
    const { slideDistance = 20, duration = 500, delay = 0 } = options;

    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(slideDistance)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, {
                toValue: 1,
                duration,
                delay,
                useNativeDriver: true,
            }),
            Animated.spring(translateY, {
                toValue: 0,
                tension: 60,
                friction: 12,
                delay,
                useNativeDriver: true,
            }),
        ]).start();
    }, [opacity, translateY, duration, delay]);

    const style: Animated.WithAnimatedObject<ViewStyle> = {
        opacity,
        transform: [{ translateY }],
    };

    return { opacity, translateY, style };
}
