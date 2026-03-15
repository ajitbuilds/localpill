import React, { useState, useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, Platform, View } from 'react-native';
import { Shadows, Radius } from '@/constants/theme';
import { AppIcon } from './icons/AppIcon';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ToastType = 'success' | 'error' | 'info';

interface ToastData {
    message: string;
    type: ToastType;
}

// Global emitter for generic toast without context
let toastListener: ((data: ToastData) => void) | null = null;

export const showToast = (message: string, type: ToastType = 'info') => {
    if (toastListener) {
        toastListener({ message, type });
    }
};

export function GlobalToast() {
    const insets = useSafeAreaInsets();
    const [toast, setToast] = useState<ToastData | null>(null);
    const translateY = useRef(new Animated.Value(-150)).current;
    const hideTimeout = useRef<any>(null);

    useEffect(() => {
        toastListener = (data: ToastData) => {
            setToast(data);
            if (data.type === 'success') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else if (data.type === 'error') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            } else {
            }

            Animated.spring(translateY, {
                toValue: Math.max(insets.top + 10, 40),
                useNativeDriver: true,
                friction: 5,
            }).start();

            if (hideTimeout.current) clearTimeout(hideTimeout.current);

            hideTimeout.current = setTimeout(() => {
                Animated.timing(translateY, {
                    toValue: -150,
                    duration: 300,
                    useNativeDriver: true,
                }).start(() => setToast(null));
            }, 3000);
        };

        return () => {
            toastListener = null;
            if (hideTimeout.current) clearTimeout(hideTimeout.current);
        };
    }, [insets.top, translateY]);

    if (!toast) return null;

    const getIcon = () => {
        switch (toast.type) {
            case 'success': return 'checkmark-circle';
            case 'error': return 'warning';
            default: return 'information-circle';
        }
    };

    const getColors = () => {
        switch (toast.type) {
            case 'success': return { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' };
            case 'error': return { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' };
            default: return { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' };
        }
    };

    const colors = getColors();

    return (
        <Animated.View style={[styles.container, { transform: [{ translateY }], backgroundColor: colors.bg, borderColor: colors.border }]}>
            <AppIcon name={getIcon() as any} size={20} color={colors.text} />
            <Text style={[styles.message, { color: colors.text }]}>{toast.message}</Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 20,
        right: 20,
        zIndex: 9999,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: Radius.md,
        borderWidth: 1,
        ...Shadows.md,
        gap: 8,
    },
    message: {
        fontSize: 14,
        fontWeight: '700',
        flex: 1,
    },
});
