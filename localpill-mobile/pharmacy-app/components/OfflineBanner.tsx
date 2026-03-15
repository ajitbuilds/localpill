import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

/**
 * Animated offline banner — shows when network is unavailable.
 */
export const OfflineBanner = () => {
    const [isOffline, setIsOffline] = useState(false);
    const slideAnim = useState(new Animated.Value(-50))[0];

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            const offline = !(state.isConnected && state.isInternetReachable !== false);
            setIsOffline(offline);
            Animated.spring(slideAnim, {
                toValue: offline ? 0 : -50,
                useNativeDriver: true,
            }).start();
        });
        return () => unsubscribe();
    }, [slideAnim]);

    if (!isOffline) return null;

    return (
        <Animated.View style={[styles.banner, { transform: [{ translateY: slideAnim }] }]}>
            <Text style={styles.text}>📡 You're offline — some features may be limited</Text>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    banner: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FF6B6B',
        paddingVertical: 8,
        paddingHorizontal: 16,
        zIndex: 9999,
        alignItems: 'center',
    },
    text: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },
});
