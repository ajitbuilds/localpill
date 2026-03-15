import { Pressable, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator, Animated, StyleProp } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useRef } from 'react';
import * as Haptics from 'expo-haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ButtonProps {
    onPress: () => void;
    title: string;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    size?: 'small' | 'medium' | 'large';
    disabled?: boolean;
    loading?: boolean;
    style?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
    icon?: React.ReactNode;
}

export function Button({
    onPress,
    title,
    variant = 'primary',
    size = 'medium',
    disabled = false,
    loading = false,
    style,
    textStyle,
    icon,
}: ButtonProps) {
    const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
    const colors = Colors[colorScheme];

    const getBackgroundColor = () => {
        if (disabled) return colors.border;
        switch (variant) {
            case 'primary': return colors.tint;
            case 'secondary': return colors.surface;
            case 'outline': return 'transparent';
            case 'ghost': return 'transparent';
            default: return colors.tint;
        }
    };

    const getTextColor = () => {
        if (disabled) return colors.textMuted;
        switch (variant) {
            case 'primary': return '#ffffff';
            case 'secondary': return colors.text;
            case 'outline': return colors.tint;
            case 'ghost': return colors.tint;
            default: return '#ffffff';
        }
    };

    const getBorderColor = () => {
        if (disabled) return colors.border;
        if (variant === 'outline') return colors.tint;
        if (variant === 'secondary') return colors.border;
        return 'transparent';
    };

    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.95,
            useNativeDriver: true,
            speed: 30,
            bounciness: 12,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            speed: 30,
            bounciness: 12,
        }).start();
    };

    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
    };

    return (
        <AnimatedPressable
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={handlePress}
            disabled={disabled || loading}
            style={({ pressed }: any) => [
                styles.base,
                styles[size],
                {
                    backgroundColor: getBackgroundColor(),
                    borderColor: getBorderColor(),
                    borderWidth: variant === 'outline' || variant === 'secondary' ? 1 : 0,
                    opacity: pressed ? 0.9 : 1,
                    transform: [{ scale: scaleAnim }],
                },
                style,
            ]}
        >
            {loading ? (
                <ActivityIndicator color={getTextColor()} />
            ) : (
                <>
                    {icon && icon}
                    <Text style={[styles.text, styles[`text-${size}`], { color: getTextColor() }, textStyle]}>
                        {title}
                    </Text>
                </>
            )}
        </AnimatedPressable>
    );
}

const styles = StyleSheet.create({
    base: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12, // Premium modern pill shape
        gap: 8,
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
});
