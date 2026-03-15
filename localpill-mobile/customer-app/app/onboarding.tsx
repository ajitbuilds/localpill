import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Animated, useWindowDimensions, Image } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppIcon } from '../components/icons/AppIcon';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { GradientButton } from '@/components/GradientButton';
import { Colors, Shadows, Radius, Gradients } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { LinearGradient } from 'expo-linear-gradient';

const getSlides = (colors: any) => [
    {
        id: '1',
        title: 'Find Medicines Fast',
        description: 'Locate hard-to-find medicines at pharmacies near you in seconds.',
        icon: 'search-circle',
        color: colors.tint,
    },
    {
        id: '2',
        title: 'Confirm Availability',
        description: 'Chat directly with pharmacies and confirm stock before you even leave home.',
        icon: 'chatbubbles',
        color: colors.success,
    },
    {
        id: '3',
        title: 'Pickup Instantly',
        description: 'Match with the closest verified pharmacy and pick up your prescription right away.',
        icon: 'basket',
        color: colors.success,
    },
    {
        id: '4',
        title: 'Upload Prescriptions',
        description: 'Snap a photo of your prescription — pharmacies will check if they have everything you need.',
        icon: 'camera',
        color: colors.warning,
    }
];

export default function OnboardingScreen() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollX = useRef(new Animated.Value(0)).current;
    const slidesRef = useRef<FlatList>(null);
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();  // supports rotation
    const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
    const colors = Colors[colorScheme];
    const slides = getSlides(colors);

    const viewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems[0]) {
            setCurrentIndex(viewableItems[0].index);
            Haptics.selectionAsync();
        }
    }).current;

    const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

    const scrollToNext = async () => {
        if (currentIndex < slides.length - 1) {
            slidesRef.current?.scrollToIndex({ index: currentIndex + 1 });
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await AsyncStorage.setItem('has_onboarded', 'true');
            // Request location permission here — natural context (user just read
            // "Find medicines near you"), so allow rate is highest at this moment.
            // We don't block on the result; LocationContext will pick it up immediately.
            Location.requestForegroundPermissionsAsync().catch(() => {});
            router.replace('/login');
        }
    };

    const skipOnboarding = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await AsyncStorage.setItem('has_onboarded', 'true');
        // Also request for users who skip — same reason, one-time prompt.
        Location.requestForegroundPermissionsAsync().catch(() => {});
        router.replace('/login');
    };

    const renderItem = ({ item, index }: { item: any; index: number }) => {
        const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
        const iconScale = scrollX.interpolate({ inputRange, outputRange: [0.6, 1, 0.6], extrapolate: 'clamp' });
        const iconRotate = scrollX.interpolate({ inputRange, outputRange: ['15deg', '0deg', '-15deg'], extrapolate: 'clamp' });
        const textOpacity = scrollX.interpolate({ inputRange, outputRange: [0, 1, 0], extrapolate: 'clamp' });
        const textTranslateY = scrollX.interpolate({ inputRange, outputRange: [30, 0, 30], extrapolate: 'clamp' });

        return (
            <View style={[styles.slide, { width, backgroundColor: colors.background }]}>
                {/* Decorative floating circles */}
                <Animated.View style={[styles.decoCircle, styles.decoCircle1, { backgroundColor: item.color + '12', transform: [{ scale: iconScale }] }]} />
                <Animated.View style={[styles.decoCircle, styles.decoCircle2, { backgroundColor: item.color + '08', transform: [{ scale: iconScale }] }]} />

                <Animated.View style={[styles.iconContainer, { transform: [{ scale: iconScale }, { rotate: iconRotate }] }]}>
                    <LinearGradient
                        colors={item.color === colors.tint ? (colorScheme === 'dark' ? Gradients.heroDark : Gradients.hero) : [colors.successSoft, colors.success + '20']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={styles.iconGradient}
                    >
                        <AppIcon name={item.icon as any} size={120} color={item.color} />
                    </LinearGradient>
                </Animated.View>
                <Animated.View style={{ opacity: textOpacity, transform: [{ translateY: textTranslateY }] }}>
                    <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
                    <Text style={[styles.description, { color: colors.textMuted }]}>{item.description}</Text>
                </Animated.View>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={[styles.header, { paddingTop: Math.max(insets.top + 12, 44) }]}>
                <Image
                    source={require('../assets/images/localpill-logo-full.png')}
                    style={{ width: 130, height: 36, resizeMode: 'contain', tintColor: colorScheme === 'dark' ? colors.tint : undefined }}
                />
                <Button
                    title="Skip"
                    variant="ghost"
                    onPress={skipOnboarding}
                    textStyle={{ color: colors.textMuted, fontFamily: 'Inter_700Bold' }}
                    style={{ paddingHorizontal: 0 }}
                />
            </View>

            <Animated.FlatList
                data={slides}
                renderItem={renderItem}
                horizontal
                showsHorizontalScrollIndicator={false}
                pagingEnabled
                bounces={false}
                keyExtractor={(item: any) => item.id}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
                    useNativeDriver: false,
                })}
                onViewableItemsChanged={viewableItemsChanged}
                viewabilityConfig={viewConfig}
                scrollEventThrottle={32}
                ref={slidesRef}
            />

            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 16, 40) }]}>
                <View style={styles.indicatorContainer}>
                    {slides.map((_, i) => {
                        const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
                        const dotWidth = scrollX.interpolate({
                            inputRange,
                            outputRange: [8, 24, 8],
                            extrapolate: 'clamp',
                        });
                        const opacity = scrollX.interpolate({
                            inputRange,
                            outputRange: [0.3, 1, 0.3],
                            extrapolate: 'clamp',
                        });
                        return <Animated.View style={[styles.dot, { width: dotWidth, opacity, backgroundColor: colors.tint }]} key={i.toString()} />;
                    })}
                </View>

                {currentIndex === slides.length - 1 ? (
                    <GradientButton
                        label="Get Started"
                        onPress={scrollToNext}
                        colors={colorScheme === 'dark' ? Gradients.primaryDark : Gradients.primary}
                        icon={<AppIcon name="rocket" size={18} color="#fff" />}
                    />
                ) : (
                    <Button
                        title="Continue"
                        onPress={scrollToNext}
                        size="large"
                        icon={<AppIcon name="arrow-forward" size={20} color={colors.white} />}
                        style={[styles.shadow, { shadowColor: colors.shadow }]}
                    />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingBottom: 20,
    },
    slide: {
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingTop: 40,
    },
    iconContainer: {
        width: 240, height: 240, borderRadius: 120,
        alignItems: 'center', justifyContent: 'center', marginBottom: 40,
        overflow: 'hidden',
    },
    iconGradient: {
        width: 240, height: 240, borderRadius: 120,
        alignItems: 'center', justifyContent: 'center',
    },
    decoCircle: { position: 'absolute', borderRadius: 999 },
    decoCircle1: { width: 300, height: 300, top: -10, left: -30 },
    decoCircle2: { width: 380, height: 380, top: -50, right: -50 },
    title: {
        fontSize: 28, fontFamily: 'Inter_800ExtraBold',
        marginBottom: 16, textAlign: 'center', letterSpacing: -0.5,
    },
    description: {
        fontSize: 16, textAlign: 'center',
        lineHeight: 24, fontFamily: 'Inter_500Medium',
    },
    footer: { paddingHorizontal: 24, justifyContent: 'space-between' },
    indicatorContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 32 },
    dot: { height: 8, borderRadius: 4, marginHorizontal: 4 },
    shadow: {
        ...Shadows.md,
    }
});
