import {
    Pressable, Text, StyleSheet, ViewStyle, TextStyle,
    ActivityIndicator, Animated, View, StyleProp, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Shadows, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRef, useEffect, useCallback } from 'react';
import * as Haptics from 'expo-haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ButtonProps {
    onPress: () => void;
    title: string;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'small' | 'medium' | 'large';
    disabled?: boolean;
    loading?: boolean;
    /** Show a success state with checkmark bounce */
    success?: boolean;
    style?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
    icon?: React.ReactNode;
    /** Haptic feedback style */
    hapticStyle?: 'light' | 'medium' | 'heavy';
}

export function Button({
    onPress,
    title,
    variant = 'primary',
    size = 'medium',
    disabled = false,
    loading = false,
    success = false,
    style,
    textStyle,
    icon,
    hapticStyle = 'light',
}: ButtonProps) {
    const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
    const colors = Colors[colorScheme];

    // ── Animations ──
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const opacityAnim = useRef(new Animated.Value(1)).current;
    const shimmerAnim = useRef(new Animated.Value(0)).current;
    const successScale = useRef(new Animated.Value(0)).current;

    // Loading shimmer
    useEffect(() => {
        if (loading) {
            const loop = Animated.loop(
                Animated.timing(shimmerAnim, {
                    toValue: 1,
                    duration: 1200,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            );
            loop.start();
            return () => loop.stop();
        } else {
            shimmerAnim.setValue(0);
        }
    }, [loading]);

    // Success bounce
    useEffect(() => {
        if (success) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Animated.sequence([
                Animated.spring(successScale, {
                    toValue: 1.08,
                    friction: 3,
                    tension: 200,
                    useNativeDriver: true,
                }),
                Animated.spring(successScale, {
                    toValue: 1,
                    friction: 4,
                    tension: 120,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            successScale.setValue(0);
        }
    }, [success]);

    const handlePressIn = useCallback(() => {
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: variant === 'ghost' ? 0.97 : 0.93,
                useNativeDriver: true,
                friction: 5,
                tension: 180,
            }),
            Animated.timing(opacityAnim, {
                toValue: 0.8,
                duration: 60,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
        ]).start();
    }, [variant]);

    const handlePressOut = useCallback(() => {
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: 1,
                useNativeDriver: true,
                friction: 3,
                tension: 220,
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
    }, [hapticStyle, onPress]);

    // ── Colors ──
    const getTextColor = () => {
        if (disabled) return colors.textMuted;
        switch (variant) {
            case 'primary': return '#ffffff';
            case 'secondary': return colors.text;
            case 'outline': return colors.tint;
            case 'ghost': return colors.tint;
            case 'danger': return '#ffffff';
            default: return '#ffffff';
        }
    };

    const getBorderColor = () => {
        if (disabled) return colors.border;
        if (variant === 'outline') return colors.tint;
        if (variant === 'secondary') return colors.border;
        if (variant === 'danger') return 'transparent';
        return 'transparent';
    };

    const getNonGradientBg = () => {
        if (disabled) return colors.border;
        switch (variant) {
            case 'secondary': return colors.surface;
            case 'outline': return 'transparent';
            case 'ghost': return 'transparent';
            case 'danger': return '#EF4444';
            default: return colors.tint;
        }
    };

    const isPrimary = variant === 'primary' && !disabled;
    const isDanger = variant === 'danger' && !disabled;

    // Shimmer overlay opacity
    const shimmerOpacity = shimmerAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0.3, 0.6, 0.3],
    });

    const content = (
        <>
            {loading ? (
                <View style={styles.loadingRow}>
                    <ActivityIndicator color={getTextColor()} size="small" />
                    <Animated.View style={{ opacity: shimmerOpacity }}>
                        <Text style={[styles.text, styles[`text-${size}`], { color: getTextColor() }, textStyle]}>
                            {title}
                        </Text>
                    </Animated.View>
                </View>
            ) : (
                <>
                    {icon && icon}
                    <Text style={[styles.text, styles[`text-${size}`], { color: getTextColor() }, textStyle]}>
                        {success ? '✓ Done' : title}
                    </Text>
                </>
            )}
        </>
    );

    const resolvedScale = success
        ? Animated.multiply(scaleAnim, successScale)
        : scaleAnim;

    return (
        <AnimatedPressable
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={handlePress}
            disabled={disabled || loading}
            style={[
                {
                    transform: [{ scale: resolvedScale }],
                    opacity: opacityAnim,
                },
                style,
            ]}
        >
            {(isPrimary || isDanger) ? (
                <LinearGradient
                    colors={
                        isDanger
                            ? ['#EF4444', '#DC2626']
                            : [colors.tint, colors.tint + 'CC']
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                        styles.base,
                        styles[size],
                        {
                            shadowColor: isDanger ? '#EF4444' : colors.accent,
                            ...Shadows.md,
                        },
                    ]}
                >
                    {content}
                </LinearGradient>
            ) : (
                <View
                    style={[
                        styles.base,
                        styles[size],
                        {
                            backgroundColor: getNonGradientBg(),
                            borderColor: getBorderColor(),
                            borderWidth: variant === 'outline' || variant === 'secondary' ? 1 : 0,
                        },
                    ]}
                >
                    {content}
                </View>
            )}
        </AnimatedPressable>
    );
}

const styles = StyleSheet.create({
    base: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Radius.md,
        gap: 8,
        overflow: 'hidden',
    },
    small: {
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    medium: {
        paddingVertical: 14,
        paddingHorizontal: 24,
    },
    large: {
        paddingVertical: 18,
        paddingHorizontal: 32,
    },
    text: {
        fontWeight: '600',
        textAlign: 'center',
        fontFamily: 'Inter_700Bold',
    },
    'text-small': {
        fontSize: 14,
    },
    'text-medium': {
        fontSize: 16,
    },
    'text-large': {
        fontSize: 18,
    },
    loadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
});
