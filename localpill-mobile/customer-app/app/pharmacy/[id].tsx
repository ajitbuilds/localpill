import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, Image, Animated,
    StatusBar, Linking, FlatList, Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../../components/icons/AppIcon';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import firestore from '@react-native-firebase/firestore';
import { AnimatedTouchable } from '../../components/ui/AnimatedTouchable';
import { useAuth } from '../../contexts/AuthContext';
import { Colors, Shadows, Radius, Gradients } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Skeleton } from '../../components/Skeleton';
import { LinearGradient } from 'expo-linear-gradient';
import { useScreenTracking } from '../../hooks/useScreenTracking';
import { reportError } from '../../utils/crashReporter';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GALLERY_IMAGE_SIZE = (SCREEN_WIDTH - 40 - 24) / 4; // 4 per row, 20px pad each side, 8px gaps

// ── Haversine distance (km) ─────────────────────────────────────
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export default function PharmacyProfileScreen() {
    useScreenTracking('PharmacyDetailScreen');

    const { id, requestId } = useLocalSearchParams<{ id: string; requestId?: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
    const colors = Colors[colorScheme];
    const { isLoggedIn, isLoading: authLoading } = useAuth();

    const [pharmacy, setPharmacy] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [distance, setDistance] = useState<number | null>(null);
    const [galleryIndex, setGalleryIndex] = useState<number | null>(null);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        if (!authLoading && !isLoggedIn) {
            router.replace('/login');
        }
    }, [authLoading, isLoggedIn]);

    // Fetch pharmacy data
    useEffect(() => {
        if (!id) { setError('Invalid pharmacy.'); setLoading(false); return; }

        const unsub = firestore()
            .collection('pharmacies')
            .doc(id)
            .onSnapshot((snap) => {
                if (snap.exists()) {
                    setPharmacy({ id: snap.id, ...snap.data() });
                    Animated.parallel([
                        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
                        Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
                    ]).start();
                } else {
                    setError('Pharmacy not found.');
                }
                setLoading(false);
            }, (err) => {
                reportError(err, 'PharmacyDetail.fetchPharmacy', { pharmacyId: id });
                setError('Failed to load pharmacy details.');
                setLoading(false);
            });
        return () => unsub();
    }, [id]);

    // Calculate distance from user
    useEffect(() => {
        if (!pharmacy) return;
        const lat = pharmacy?.location?.latitude || pharmacy?.location?.lat;
        const lng = pharmacy?.location?.longitude || pharmacy?.location?.lng;
        if (!lat || !lng) return;

        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') return;
                const loc = await Location.getLastKnownPositionAsync();
                if (loc) {
                    setDistance(calculateDistance(loc.coords.latitude, loc.coords.longitude, lat, lng));
                }
            } catch (e) { /* silently skip */ }
        })();
    }, [pharmacy]);

    // ── Actions ──────────────────────────────────────────────────
    const handleCall = () => {
        const phoneNumber = pharmacy?.phone || pharmacy?.mobile;
        if (!phoneNumber) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Linking.openURL(`tel:${phoneNumber}`);
    };

    const handleChat = async () => {
        if (!requestId) {
            const { Alert } = require('react-native');
            Alert.alert('No Active Request', 'You need an active medicine request to start a chat with this pharmacy. Please search for a medicine first.');
            return;
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({ pathname: '/chat', params: { id: requestId, pharmacyId: id, pharmacyName: pharmacy?.pharmacyName || pharmacy?.name || 'Pharmacy' } });
    };

    const handleDirections = () => {
        const lat = pharmacy?.location?.latitude || pharmacy?.location?.lat;
        const lng = pharmacy?.location?.longitude || pharmacy?.location?.lng;
        if (!lat || !lng) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Linking.openURL(`https://maps.google.com/?q=${lat},${lng}`);
    };

    const handleEmail = () => {
        if (!pharmacy?.email) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Linking.openURL(`mailto:${pharmacy.email}`);
    };

    // ── Derived data ────────────────────────────────────────────
    const isOnline = pharmacy?.isOnline;
    const isFastResponder = pharmacy?.isFastResponder;
    const isVerified = pharmacy?.isVerified;
    const hasDelivery = pharmacy?.hasDelivery || pharmacy?.delivery;
    const discountPct = Number(pharmacy?.discountPercentage) || 0;
    const allImages: string[] = [
        ...(pharmacy?.frontPhotoUrl ? [pharmacy.frontPhotoUrl] : []),
        ...(pharmacy?.pharmacyImages || []),
    ];

    // ── Loading skeleton ────────────────────────────────────────
    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <StatusBar barStyle="light-content" />
                <Skeleton width="100%" height={160} borderRadius={0} />
                <View style={{ padding: 20, gap: 12 }}>
                    <Skeleton width={200} height={26} borderRadius={8} />
                    <Skeleton width={160} height={16} borderRadius={6} />
                    <Skeleton width="100%" height={60} borderRadius={16} />
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <Skeleton width={100} height={48} borderRadius={12} />
                        <Skeleton width={100} height={48} borderRadius={12} />
                        <Skeleton width={100} height={48} borderRadius={12} />
                    </View>
                    <Skeleton width="100%" height={100} borderRadius={16} />
                </View>
            </View>
        );
    }

    // ── Error state ─────────────────────────────────────────────
    if (error) {
        return (
            <View style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <AppIcon name="alert-circle-outline" size={52} color={colors.danger} />
                <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
                <AnimatedTouchable style={[styles.backBtn, { backgroundColor: colors.tint }]} onPress={() => router.back()}>
                    <Text style={[styles.backBtnText, { color: colors.white }]}>Go Back</Text>
                </AnimatedTouchable>
            </View>
        );
    }

    // ── Main render ─────────────────────────────────────────────
    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="light-content" />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
                {/* ═══ Compact Hero Header ═══ */}
                <View style={styles.heroBanner}>
                    <LinearGradient colors={colorScheme === 'dark' ? Gradients.heroDark : Gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
                    <View style={[styles.heroCircle1, { backgroundColor: colors.white + '12' }]} />
                    <View style={[styles.heroCircle2, { backgroundColor: colors.white + '08' }]} />

                    {/* Back button */}
                    <AnimatedTouchable
                        style={[styles.backCircleBtn, { marginTop: Math.max(insets.top, 16), backgroundColor: colors.white + '26' }]}
                        onPress={() => router.back()}
                    >
                        <AppIcon name="chevron-back" size={22} color={colors.white} />
                    </AnimatedTouchable>

                    {/* Avatar + Name inline */}
                    <View style={[styles.heroContent, { paddingBottom: 24 }]}>
                        <View style={[styles.heroAvatarWrapper, { borderColor: colors.background }]}>
                            {(pharmacy?.profilePic || pharmacy?.profilePicUrl) ? (
                                <Image source={{ uri: pharmacy?.profilePic || pharmacy?.profilePicUrl }} style={styles.heroAvatarImage} />
                            ) : (
                                <View style={[styles.heroAvatarPlaceholder, { backgroundColor: colors.white + '33' }]}>
                                    <AppIcon name="storefront" size={28} color={colors.white} />
                                </View>
                            )}
                            {isOnline && <View style={[styles.onlineDot, { borderColor: colors.background, backgroundColor: colors.success }]} />}
                        </View>

                        <View style={styles.heroInfo}>
                            <Text style={[styles.heroName, { color: colors.white }]} numberOfLines={2}>
                                {pharmacy?.pharmacyName || pharmacy?.name || 'Pharmacy'}
                            </Text>
                            <View style={styles.heroBadgeRow}>
                                {isVerified && (
                                    <View style={[styles.heroBadge, { backgroundColor: colors.white + '26' }]}>
                                        <AppIcon name="shield-checkmark" size={11} color={colors.white} />
                                        <Text style={styles.heroBadgeText}>Verified</Text>
                                    </View>
                                )}
                                {isFastResponder && (
                                    <View style={[styles.heroBadge, { backgroundColor: colors.white + '26' }]}>
                                        <AppIcon name="flash" size={11} color="#FBBF24" />
                                        <Text style={styles.heroBadgeText}>Fast</Text>
                                    </View>
                                )}
                                <View style={[styles.heroBadge, { backgroundColor: isOnline ? colors.success + '40' : colors.white + '20' }]}>
                                    <View style={[styles.statusDotSmall, { backgroundColor: isOnline ? colors.success : colors.white + '80' }]} />
                                    <Text style={styles.heroBadgeText}>{isOnline ? 'Online' : 'Offline'}</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

                    {/* ═══ Quick Stats Row ═══ */}
                    <View style={styles.statsRow}>
                        {distance !== null && (
                            <View style={[styles.statChip, { backgroundColor: colors.accentSoft }]}>
                                <AppIcon name="location" size={14} color={colors.accent} />
                                <Text style={[styles.statChipText, { color: colors.accent }]}>{distance.toFixed(1)} km</Text>
                            </View>
                        )}
                        {discountPct > 0 && (
                            <View style={[styles.statChip, { backgroundColor: colors.successSoft || '#E8F5E9' }]}>
                                <AppIcon name="pricetag" size={14} color={colors.success} />
                                <Text style={[styles.statChipText, { color: colors.success }]}>{discountPct}% off</Text>
                            </View>
                        )}
                        {hasDelivery && (
                            <View style={[styles.statChip, { backgroundColor: colors.accentSoft }]}>
                                <AppIcon name="bicycle" size={14} color={colors.accent} />
                                <Text style={[styles.statChipText, { color: colors.accent }]}>Delivery</Text>
                            </View>
                        )}
                        {isVerified && !distance && !discountPct && !hasDelivery && (
                            <View style={[styles.statChip, { backgroundColor: colors.accentSoft }]}>
                                <AppIcon name="shield-checkmark" size={14} color={colors.accent} />
                                <Text style={[styles.statChipText, { color: colors.accent }]}>Verified</Text>
                            </View>
                        )}
                    </View>

                    {/* ═══ Action Buttons ═══ */}
                    <View style={styles.actionRow}>
                        <AnimatedTouchable
                            style={[styles.actionBtn, { backgroundColor: colors.tint, shadowColor: colors.tint }]}
                            onPress={handleChat}
                        >
                            <AppIcon name="chatbubble-ellipses" size={18} color={colors.white} />
                            <Text style={[styles.actionBtnText, { color: colors.white }]}>Chat</Text>
                        </AnimatedTouchable>

                        {(pharmacy?.phone || pharmacy?.mobile) && (
                            <AnimatedTouchable
                                style={[styles.actionBtn, styles.actionBtnOutline, { borderColor: colors.border, backgroundColor: colors.surface }]}
                                onPress={handleCall}
                            >
                                <AppIcon name="call-outline" size={18} color={colors.text} />
                                <Text style={[styles.actionBtnText, { color: colors.text }]}>Call</Text>
                            </AnimatedTouchable>
                        )}

                        {(pharmacy?.location?.latitude || pharmacy?.location?.lat) && (
                            <AnimatedTouchable
                                style={[styles.actionBtn, styles.actionBtnOutline, { borderColor: colors.border, backgroundColor: colors.surface }]}
                                onPress={handleDirections}
                            >
                                <AppIcon name="navigate-outline" size={18} color={colors.text} />
                                <Text style={[styles.actionBtnText, { color: colors.text }]}>Directions</Text>
                            </AnimatedTouchable>
                        )}
                    </View>

                    {/* ═══ Address Card ═══ */}
                    {pharmacy?.address && (
                        <View style={styles.sectionPad}>
                            <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                <AppIcon name="location-outline" size={18} color={colors.tint} style={{ flexShrink: 0, marginTop: 1 }} />
                                <Text style={[styles.infoText, { color: colors.text }]}>{pharmacy.address}</Text>
                            </View>
                        </View>
                    )}

                    {/* ═══ Store Details Card ═══ */}
                    <View style={styles.sectionPad}>
                        <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <LinearGradient colors={colorScheme === 'dark' ? Gradients.heroDark : Gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.detailCardAccent} />
                            <Text style={[styles.detailCardTitle, { color: colors.text }]}>Store Information</Text>

                            {/* Owner Name */}
                            {pharmacy?.ownerName && (
                                <View style={styles.detailRow}>
                                    <AppIcon name="person-outline" size={16} color={colors.textMuted} />
                                    <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Owner</Text>
                                    <Text style={[styles.detailValue, { color: colors.text }]}>{pharmacy.ownerName}</Text>
                                </View>
                            )}

                            {/* Business Hours */}
                            {(pharmacy?.businessHours || (pharmacy?.openTime && pharmacy?.closeTime)) && (
                                <View style={styles.detailRow}>
                                    <AppIcon name="time-outline" size={16} color={colors.textMuted} />
                                    <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Hours</Text>
                                    <Text style={[styles.detailValue, { color: colors.text }]}>
                                        {pharmacy.businessHours || `${pharmacy.openTime} — ${pharmacy.closeTime}`}
                                    </Text>
                                </View>
                            )}

                            {/* Phone */}
                            {(pharmacy?.phone || pharmacy?.mobile) && (
                                <View style={styles.detailRow}>
                                    <AppIcon name="call-outline" size={16} color={colors.textMuted} />
                                    <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Phone</Text>
                                    <Text style={[styles.detailValue, { color: colors.tint }]}>{pharmacy.phone || pharmacy.mobile}</Text>
                                </View>
                            )}

                            {/* Email */}
                            {pharmacy?.email && (
                                <AnimatedTouchable onPress={handleEmail} style={styles.detailRow}>
                                    <AppIcon name="mail-outline" size={16} color={colors.textMuted} />
                                    <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Email</Text>
                                    <Text style={[styles.detailValue, { color: colors.tint }]} numberOfLines={1}>{pharmacy.email}</Text>
                                </AnimatedTouchable>
                            )}

                            {/* License */}
                            {pharmacy?.licenseNumber && (
                                <View style={styles.detailRow}>
                                    <AppIcon name="card-outline" size={16} color={colors.textMuted} />
                                    <Text style={[styles.detailLabel, { color: colors.textMuted }]}>License</Text>
                                    <Text style={[styles.detailValue, { color: colors.text }]}>{pharmacy.licenseNumber}</Text>
                                </View>
                            )}

                            {/* Distance */}
                            {distance !== null && (
                                <View style={styles.detailRow}>
                                    <AppIcon name="navigate-outline" size={16} color={colors.textMuted} />
                                    <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Distance</Text>
                                    <Text style={[styles.detailValue, { color: colors.accent }]}>{distance.toFixed(1)} km away</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* ═══ Delivery & Offers Card ═══ */}
                    {(hasDelivery || discountPct > 0) && (
                        <View style={styles.sectionPad}>
                            <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                <Text style={[styles.detailCardTitle, { color: colors.text }]}>Delivery & Offers</Text>

                                {hasDelivery && (
                                    <>
                                        <View style={styles.detailRow}>
                                            <AppIcon name="bicycle-outline" size={16} color={colors.success} />
                                            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Home Delivery</Text>
                                            <View style={[styles.availablePill, { backgroundColor: colors.success + '1A' }]}>
                                                <Text style={[styles.availablePillText, { color: colors.success }]}>Available</Text>
                                            </View>
                                        </View>
                                        {pharmacy?.freeDeliveryRadiusKm > 0 && (
                                            <View style={styles.detailRow}>
                                                <AppIcon name="map-outline" size={16} color={colors.textMuted} />
                                                <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Free within</Text>
                                                <Text style={[styles.detailValue, { color: colors.text }]}>{pharmacy.freeDeliveryRadiusKm} km</Text>
                                            </View>
                                        )}
                                        {pharmacy?.minOrderForFreeDelivery > 0 && (
                                            <View style={styles.detailRow}>
                                                <AppIcon name="cart-outline" size={16} color={colors.textMuted} />
                                                <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Min order</Text>
                                                <Text style={[styles.detailValue, { color: colors.text }]}>₹{pharmacy.minOrderForFreeDelivery}</Text>
                                            </View>
                                        )}
                                    </>
                                )}

                                {discountPct > 0 && (
                                    <View style={styles.detailRow}>
                                        <AppIcon name="pricetag-outline" size={16} color={colors.success} />
                                        <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Discount</Text>
                                        <View style={[styles.discountBadge, { backgroundColor: colors.success + '1A' }]}>
                                            <Text style={[styles.discountBadgeText, { color: colors.success }]}>{discountPct}% OFF</Text>
                                        </View>
                                    </View>
                                )}
                            </View>
                        </View>
                    )}

                    {/* ═══ Store Gallery ═══ */}
                    {allImages.length > 0 && (
                        <View style={styles.sectionPad}>
                            <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                <Text style={[styles.detailCardTitle, { color: colors.text }]}>Store Photos</Text>
                                <View style={styles.galleryGrid}>
                                    {allImages.map((url, idx) => (
                                        <AnimatedTouchable key={idx} onPress={() => setGalleryIndex(idx)}>
                                            <Image source={{ uri: url }} style={[styles.galleryImage, { backgroundColor: colors.border }]} />
                                        </AnimatedTouchable>
                                    ))}
                                </View>
                            </View>
                        </View>
                    )}

                    {/* ═══ About / Description ═══ */}
                    {pharmacy?.description && (
                        <View style={styles.sectionPad}>
                            <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                <Text style={[styles.detailCardTitle, { color: colors.text }]}>About</Text>
                                <Text style={[styles.aboutText, { color: colors.textMuted }]}>{pharmacy.description}</Text>
                            </View>
                        </View>
                    )}

                    {/* ═══ Notice ═══ */}
                    <View style={styles.sectionPad}>
                        <View style={[styles.noticeCard, { backgroundColor: colors.warning + '1A', borderColor: colors.warning + '4D' }]}>
                            <AppIcon name="information-circle-outline" size={16} color={colors.warning} />
                            <Text style={[styles.noticeText, { color: colors.warning }]}>
                                LocalPill is an enquiry platform. Please visit the store to collect your medicines.
                            </Text>
                        </View>
                    </View>

                </Animated.View>
            </ScrollView>

            {/* ═══ Fullscreen Image Viewer ═══ */}
            {galleryIndex !== null && (
                <View style={styles.imageViewerOverlay}>
                    <StatusBar barStyle="light-content" />
                    <FlatList
                        data={allImages}
                        horizontal
                        pagingEnabled
                        initialScrollIndex={galleryIndex}
                        getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={(_, i) => `img-${i}`}
                        renderItem={({ item }) => (
                            <Image source={{ uri: item }} style={{ width: SCREEN_WIDTH, height: '100%' }} resizeMode="contain" />
                        )}
                    />
                    <AnimatedTouchable
                        style={[styles.imageViewerClose, { top: Math.max(insets.top, 16) + 8 }]}
                        onPress={() => setGalleryIndex(null)}
                    >
                        <AppIcon name="close" size={24} color="#FFF" />
                    </AnimatedTouchable>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    centerContent: { justifyContent: 'center', alignItems: 'center', padding: 40, gap: 16 },

    // ── Hero ──
    heroBanner: { paddingHorizontal: 20, overflow: 'hidden' },
    heroCircle1: { position: 'absolute', top: -30, right: -30, width: 160, height: 160, borderRadius: 80 },
    heroCircle2: { position: 'absolute', bottom: -40, left: -40, width: 200, height: 200, borderRadius: 100 },
    backCircleBtn: { position: 'absolute', top: 0, left: 16, width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', zIndex: 10 },

    heroContent: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 70 },
    heroAvatarWrapper: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, overflow: 'visible' },
    heroAvatarImage: { width: '100%', height: '100%', borderRadius: 36 },
    heroAvatarPlaceholder: { width: '100%', height: '100%', borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
    onlineDot: { position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
    heroInfo: { flex: 1 },
    heroName: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5, marginBottom: 6 },
    heroBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
    heroBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
    statusDotSmall: { width: 6, height: 6, borderRadius: 3 },

    // ── Stats row ──
    statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20, marginTop: 16 },
    statChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.md },
    statChipText: { fontSize: 13, fontWeight: '700' },

    // ── Actions ──
    actionRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginTop: 16 },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: Radius.lg, ...Shadows.md },
    actionBtnOutline: { shadowOpacity: 0, elevation: 0, borderWidth: 1.5 },
    actionBtnText: { fontSize: 14, fontWeight: '700' },

    // ── Section padding ──
    sectionPad: { paddingHorizontal: 20, marginTop: 14 },

    // ── Info card ──
    infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1, borderRadius: Radius.lg, padding: 14 },
    infoText: { fontSize: 14, fontWeight: '500', flex: 1, lineHeight: 20 },

    // ── Detail card ──
    detailCard: { borderWidth: 1, borderRadius: Radius.lg, padding: 16, overflow: 'hidden' },
    detailCardAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg },
    detailCardTitle: { fontSize: 14, fontWeight: '700', marginBottom: 14, letterSpacing: -0.3 },
    detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
    detailLabel: { fontSize: 13, fontWeight: '500', width: 70 },
    detailValue: { fontSize: 14, fontWeight: '600', flex: 1, textAlign: 'right' },

    // ── Delivery / offers ──
    availablePill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, marginLeft: 'auto' },
    availablePillText: { fontSize: 12, fontWeight: '700' },
    discountBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, marginLeft: 'auto' },
    discountBadgeText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },

    // ── Gallery ──
    galleryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    galleryImage: { width: GALLERY_IMAGE_SIZE, height: GALLERY_IMAGE_SIZE, borderRadius: Radius.md },

    // ── About ──
    aboutText: { fontSize: 14, fontWeight: '500', lineHeight: 22 },

    // ── Notice ──
    noticeCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: Radius.md, borderWidth: 1, padding: 14 },
    noticeText: { fontSize: 12, fontWeight: '500', flex: 1, lineHeight: 18 },

    // ── Image viewer ──
    imageViewerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000', zIndex: 100 },
    imageViewerClose: { position: 'absolute', right: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },

    // ── Error ──
    errorText: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
    backBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: Radius.md },
    backBtnText: { fontWeight: '700', fontSize: 14 },
});
