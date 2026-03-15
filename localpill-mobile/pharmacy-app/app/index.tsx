import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import auth from '@react-native-firebase/auth';
import { LinearGradient } from 'expo-linear-gradient';
import { Pill } from 'lucide-react-native';
import { DesignTokens } from '@/constants/Colors';

export default function Index() {
    const router = useRouter();
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;
    const loaderAnim = useRef(new Animated.Value(-1)).current;

    useEffect(() => {
        // Entrance animation
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 800,
                useNativeDriver: true,
            }),
        ]).start();

        // Pulse animation for the icon
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.08,
                    duration: 1200,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1200,
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Loader bar animation (slides back and forth)
        Animated.loop(
            Animated.sequence([
                Animated.timing(loaderAnim, {
                    toValue: 1,
                    duration: 1200,
                    useNativeDriver: true,
                }),
                Animated.timing(loaderAnim, {
                    toValue: -1,
                    duration: 1200,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    useEffect(() => {
        let navigated = false;
        const unsubscribe = auth().onAuthStateChanged((user) => {
            // Navigate immediately when auth state is known
            if (navigated) return;
            navigated = true;
            if (user) {
                router.replace('/(tabs)');
            } else {
                router.replace('/login');
            }
        });
        return () => {
            navigated = true;
            unsubscribe();
        };
    }, [router]);

    return (
        <LinearGradient
            colors={['#0F172A', '#1E3A8A', '#3B82F6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.container}
        >
            {/* Decorative circles */}
            <View style={styles.decorCircle1} />
            <View style={styles.decorCircle2} />

            <Animated.View
                style={[
                    styles.content,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                    },
                ]}
            >
                {/* Icon with pulse */}
                <Animated.View
                    style={[
                        styles.iconContainer,
                        { transform: [{ scale: pulseAnim }] },
                    ]}
                >
                    <View style={styles.iconInner}>
                        <Pill size={52} color="#FFFFFF" strokeWidth={2.5} />
                    </View>
                    <View style={styles.iconGlow} />
                </Animated.View>

                {/* Brand */}
                <Text style={styles.brandName}>LocalPill</Text>
                <Text style={styles.brandSubtitle}>Pharmacy Partner</Text>

                {/* Loading indicator */}
                <View style={styles.loaderContainer}>
                    <View style={styles.loaderTrack}>
                        <Animated.View style={[styles.loaderFill, {
                            transform: [{
                                translateX: loaderAnim.interpolate({
                                    inputRange: [-1, 1],
                                    outputRange: [-60, 60],
                                })
                            }],
                        }]} />
                    </View>
                    <Text style={styles.loadingText}>Connecting...</Text>
                </View>
            </Animated.View>

            {/* Footer */}
            <Text style={styles.footerText}>Powered by LocalPill Healthcare</Text>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    decorCircle1: {
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: 'rgba(59, 130, 246, 0.08)',
        top: -80,
        right: -60,
    },
    decorCircle2: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(59, 130, 246, 0.06)',
        bottom: -40,
        left: -50,
    },
    content: {
        alignItems: 'center',
    },
    iconContainer: {
        width: 120,
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 28,
    },
    iconInner: {
        width: 100,
        height: 100,
        borderRadius: 30,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    iconGlow: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        zIndex: -1,
    },
    brandName: {
        fontFamily: DesignTokens.font.extrabold,
        fontSize: 36,
        color: '#FFFFFF',
        letterSpacing: -0.5,
    },
    brandSubtitle: {
        fontFamily: DesignTokens.font.medium,
        fontSize: 15,
        color: 'rgba(255, 255, 255, 0.6)',
        marginTop: 6,
        letterSpacing: 2,
        textTransform: 'uppercase',
    },
    loaderContainer: {
        marginTop: 48,
        alignItems: 'center',
    },
    loaderTrack: {
        width: 140,
        height: 3,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 2,
        overflow: 'hidden',
    },
    loaderFill: {
        width: '40%',
        height: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        borderRadius: 2,
    },
    loadingText: {
        fontFamily: DesignTokens.font.regular,
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.45)',
        marginTop: 12,
    },
    footerText: {
        position: 'absolute',
        bottom: 60,
        fontFamily: DesignTokens.font.regular,
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.3)',
    },
});
