import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Image, Modal, Platform, Animated, StatusBar, Linking } from 'react-native';
import ImageViewing from 'react-native-image-viewing';
import MapView, { Marker, Callout } from 'react-native-maps';
import { showToast } from '../../components/Toast';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { AppIcon } from '../../components/icons/AppIcon';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import firestore from '@react-native-firebase/firestore';

import { AnimatedTouchable } from '../../components/ui/AnimatedTouchable';
import { Skeleton } from '../../components/Skeleton';
import { Colors, Shadows, Radius, Gradients } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { reportError } from '../../utils/crashReporter';
import { logRequestCancelled, logSearchExpanded } from '../../utils/analyticsEvents';
import { useScreenTracking } from '../../hooks/useScreenTracking';

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((R * c).toFixed(1)); // Distance in km
}

function timeAgo(date: Date): string {
    const now = Date.now();
    const diffMs = now - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

export default function RequestDetailsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
    const colors = Colors[colorScheme];
    const { isLoggedIn, isLoading: authLoading, uid } = useAuth();
    useScreenTracking('RequestDetailsScreen');

    const [requestData, setRequestData] = useState<any>(null);
    const [responses, setResponses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [unauthorized, setUnauthorized] = useState(false);
    const [imageViewerVisible, setImageViewerVisible] = useState(false);
    const [imageViewerIndex, setImageViewerIndex] = useState(0);
    const [detailsSheetVisible, setDetailsSheetVisible] = useState(false);
    const [viewMode, setViewMode] = useState('list');
    const [showNotAvailable, setShowNotAvailable] = useState(false);
    const [timeLeft, setTimeLeft] = useState(300); // 5 minutes (300 seconds)
    const [sortMode, setSortMode] = useState<'nearest' | 'fastest'>('nearest');

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const progressWidth = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const slideAnim = useRef(new Animated.Value(300)).current;

    // Match Celebration Animations
    const matchScale = useRef(new Animated.Value(0.5)).current;
    const matchOpacity = useRef(new Animated.Value(0)).current;
    const animStarted = useRef(false);

    useEffect(() => {
        if (!authLoading && !isLoggedIn) {
            router.replace('/login');
        }
    }, [authLoading, isLoggedIn]);

    const prevStatusRef = useRef('pending');

    useEffect(() => {
        if (!id) return;
        const requestId = typeof id === 'string' ? id : id[0];

        // 1. Watch the request document
        const unsubReq = firestore().collection('medicineRequests').doc(requestId).onSnapshot((snap) => {
            if (!snap.exists()) { setLoading(false); return; }
            const data = { id: snap.id, ...snap.data() };

            // IDOR check: verify current user owns this request
            if (uid && (data as any).userId && (data as any).userId !== uid) {
                setUnauthorized(true);
                setLoading(false);
                return;
            }

            setRequestData(data);
            setLoading(false);

            // Animate progress bar
            const total = (data as any).notifiedPharmaciesCount || 5;
            const replied = (data as any).responsesCount || 0;
            Animated.spring(progressWidth, { toValue: replied / total, useNativeDriver: false }).start();

            if (prevStatusRef.current === 'pending' && (data as any).status === 'matched') {
                // Celebration!
                Animated.parallel([
                    Animated.spring(matchScale, { toValue: 1, friction: 4, tension: 40, useNativeDriver: true }),
                    Animated.timing(matchOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
                ]).start();
            }
            prevStatusRef.current = (data as any).status;

            // Calculate precise time left based on expiresAt instead of 300s default
            if ((data as any).expiresAt) {
                const expiresTime = (data as any).expiresAt.toMillis();
                const now = Date.now();
                const diffSecs = Math.max(0, Math.floor((expiresTime - now) / 1000));
                setTimeLeft(diffSecs);
            }

            Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
            if (!animStarted.current) {
                animStarted.current = true;
                Animated.loop(Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
                ])).start();
            }
        });

        // 2. Watch the pharmacyResponses subcollection
        const responsesQ = firestore()
            .collection('medicineRequests')
            .doc(requestId)
            .collection('pharmacyResponses')
            .orderBy('respondedAt', 'asc');
        const unsubResponses = responsesQ.onSnapshot(async (snap) => {
            if (!snap.empty) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
            }

            let reqLoc: any = null;
            try {
                const reqSnap = await firestore().collection('medicineRequests').doc(requestId).get();
                if (reqSnap.exists()) {
                    reqLoc = reqSnap.data()?.location || null;
                }
            } catch (e) { }

            const resps = await Promise.all(snap.docs.map(async d => {
                const baseData = {
                    id: d.id,
                    pharmacyName: d.data().pharmacyName || 'Pharmacy',
                    responseType: d.data().responseType || 'available',
                    distance: d.data().distanceKm || d.data().distance || null,
                    phone: d.data().phone || null,
                    respondedAt: d.data().respondedAt?.toDate?.() || new Date(),
                    verified: d.data().verified || false,
                    isFastResponder: d.data().isFastResponder || false,
                };
                try {
                    const pRef = firestore().collection('pharmacies').doc(d.id);
                    const pSnap = await pRef.get();
                    if (pSnap.exists()) {
                        const pData = pSnap.data();

                        let computedDistance = baseData.distance;
                        if (!computedDistance && reqLoc && pData?.location) {
                            computedDistance = calculateDistance(
                                reqLoc.latitude, reqLoc.longitude,
                                pData.location.latitude, pData.location.longitude
                            );
                        }

                        return {
                            ...baseData,
                            pharmacyName: baseData.pharmacyName !== 'Pharmacy' ? baseData.pharmacyName : (pData?.pharmacyName || 'Pharmacy'),
                            distance: computedDistance,
                            address: pData?.address || null,
                            discountPercentage: pData?.discountPercentage || 0,
                            hasDelivery: pData?.hasDelivery || false,
                            ownerName: pData?.ownerName || '',
                            ownerAvatar: pData?.profilePicUrl || pData?.ownerPhotoURL || pData?.profilePhoto || pData?.ownerAvatar || '',
                            storeImages: pData?.pharmacyImages || pData?.storeImages || [],
                            location: pData?.location || null,
                            verified: pData?.isVerified || pData?.verified || baseData.verified
                        };
                    }
                } catch (e) {
                    if (__DEV__) console.log("Error enriching pharmacy data", e);
                }
                return baseData as any;
            }));

            // Sort responses: full-stock first, then partial-stock, then sort by distance if available
            resps.sort((a, b) => {
                if (a.responseType === 'available' && b.responseType !== 'available') return -1;
                if (b.responseType === 'available' && a.responseType !== 'available') return 1;
                const distA = typeof a.distance === 'number' ? a.distance : 999;
                const distB = typeof b.distance === 'number' ? b.distance : 999;
                return distA - distB;
            });

            setResponses(resps);
        });

        // 3. Live countdown timer
        const searchTimer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(searchTimer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => { unsubReq(); unsubResponses(); clearInterval(searchTimer); };
    }, [id]);

    const handleCancelRequest = () => {
        Alert.alert('Cancel Request', 'Are you sure you want to cancel this search?', [
            { text: 'No, Keep searching', style: 'cancel' },
            {
                text: 'Yes, Cancel', style: 'destructive',
                onPress: async () => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                    try {
                        // Ownership guard
                        if (!uid || (requestData && requestData.userId !== uid)) {
                            showToast('You cannot cancel this request', 'error');
                            return;
                        }
                        const requestId = typeof id === 'string' ? id : id[0];
                        await firestore().collection('medicineRequests').doc(requestId).update({ status: 'cancelled', cancelledAt: firestore.FieldValue.serverTimestamp() });
                        logRequestCancelled({ requestId });
                        showToast('Request cancelled', 'success');
                        setTimeout(() => router.back(), 1000);
                    } catch (e) {
                        if (__DEV__) console.error('Cancel request failed:', e);
                        reportError(e, 'RequestDetailsScreen.cancelRequest');
                        showToast('Failed to cancel request', 'error');
                    }
                }
            }
        ]);
    };

    const handleExpandSearch = async () => {
        try {
            if (!uid || (requestData && requestData.userId !== uid)) {
                showToast('You cannot modify this request', 'error');
                return;
            }
            const requestId = typeof id === 'string' ? id : id[0];
            const newExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
            await firestore().collection('medicineRequests').doc(requestId).update({
                searchRadiusKm: 10,
                status: 'pending',
                expiresAt: firestore.Timestamp.fromDate(newExpiresAt),
            });
            logSearchExpanded({ requestId, newRadiusKm: 10 });
            showToast('Search radius expanded to 10km', 'success');
            setTimeLeft(300);
        } catch (e) {
            reportError(e, 'RequestDetailsScreen.expandSearch');
            showToast('Failed to expand search', 'error');
        }
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (loading) {
        return (
            <View style={[styles.container, { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 48, backgroundColor: colors.background }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                    <Skeleton width={40} height={40} borderRadius={12} style={{ marginRight: 15 }} />
                    <View>
                        <Skeleton width={180} height={24} borderRadius={6} style={{ marginBottom: 6 }} />
                        <Skeleton width={120} height={14} borderRadius={4} />
                    </View>
                </View>
                <Skeleton width="100%" height={140} borderRadius={20} style={{ marginBottom: 24 }} />
                <Skeleton width={140} height={20} borderRadius={6} style={{ marginBottom: 16 }} />
                {[1, 2].map(i => (
                    <Skeleton key={i} width="100%" height={100} borderRadius={16} style={{ marginBottom: 12 }} />
                ))}
            </View>
        );
    }

    if (!requestData) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                <Stack.Screen options={{ title: 'Not Found' }} />
                <Text style={{ color: colors.textMuted }}>Request not found.</Text>
            </View>
        );
    }

    if (unauthorized) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                <Stack.Screen options={{ title: 'Unauthorized' }} />
                <AppIcon name="lock-closed" size={48} color={colors.textMuted} style={{ marginBottom: 12 }} />
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 8 }}>Access Denied</Text>
                <Text style={{ color: colors.textMuted, textAlign: 'center', paddingHorizontal: 40 }}>You don't have permission to view this request.</Text>
                <AnimatedTouchable style={{ marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: colors.accent, borderRadius: 12 }} onPress={() => router.back()}>
                    <Text style={{ color: '#fff', fontWeight: '600' }}>Go Back</Text>
                </AnimatedTouchable>
            </View>
        );
    }

    const availableResps = responses.filter(r => r.responseType === 'available');
    const partialResps = responses.filter(r => r.responseType === 'partial');
    const notAvailResps = responses.filter(r => r.responseType === 'not_available');

    // Progress bar width animation
    const fillWidth = progressWidth.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
        extrapolate: 'clamp'
    });

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />

            <ScrollView contentContainerStyle={{ padding: 20, paddingTop: Math.max(insets.top, 20), paddingBottom: Math.max(insets.bottom, 20) }} showsVerticalScrollIndicator={false}>
                <Animated.View style={{ opacity: fadeAnim }}>
                    <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
                    <View style={styles.headerRow}>
                        <AnimatedTouchable style={[styles.backBtnWrapper, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.shadow }]} onPress={() => { router.back(); }} activeOpacity={0.7}>
                            <AppIcon name="arrow-back" size={18} color={colors.text} />
                        </AnimatedTouchable>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.title, { color: colors.text }]}>Tracking Request</Text>
                            <Text style={[styles.subtitle, { color: colors.textMuted }]}>{requestData.typedMedicines ? requestData.typedMedicines.join(', ') : 'Prescription Upload'}</Text>
                        </View>
                    </View>

                    <AnimatedTouchable onPress={() => {
                        setDetailsSheetVisible(true);
                        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 40, friction: 8 }).start();
                    }} style={[styles.viewDetailsBtn, { backgroundColor: colors.accentSoft, borderColor: colors.accent }]} activeOpacity={0.8}>
                        <AppIcon name="document-text" size={16} color={colors.accent} />
                        <Text style={[styles.viewDetailsText, { color: colors.accent }]}> View Request Details</Text>
                    </AnimatedTouchable>

                    {/* Vertical Status Timeline */}
                    <View style={[styles.stTimelineCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        {[
                            { label: 'Submitted', icon: 'checkmark-circle', done: true },
                            { label: `Notified ${requestData.notifiedPharmaciesCount || 0} Pharmacies`, icon: 'notifications', done: (requestData.notifiedPharmaciesCount || 0) > 0 },
                            { label: `${requestData.responsesCount || 0} Response(s)`, icon: 'chatbubbles', done: (requestData.responsesCount || 0) > 0 },
                            { label: requestData.status === 'matched' ? 'Matched!' : requestData.status === 'timeout' || requestData.status === 'closed' ? 'Timed Out' : requestData.status === 'cancelled' ? 'Cancelled' : 'Awaiting Match', icon: requestData.status === 'matched' ? 'star' : requestData.status === 'timeout' || requestData.status === 'closed' ? 'alarm' : requestData.status === 'cancelled' ? 'ban' : 'hourglass', done: requestData.status === 'matched' || requestData.status === 'timeout' || requestData.status === 'closed' || requestData.status === 'cancelled' },
                        ].map((step, idx, arr) => {
                            const stepColor = step.done ? (step.label === 'Timed Out' ? colors.danger : step.label === 'Cancelled' ? colors.textMuted : step.label === 'Matched!' ? colors.success : colors.tint) : colors.border;
                            return (
                                <View key={idx} style={styles.stTimelineRow}>
                                    <View style={styles.stTimelineCol}>
                                        <View style={[styles.stTimelineDot, { backgroundColor: step.done ? stepColor : colors.background, borderColor: stepColor }]}>
                                            {step.done && <AppIcon name={step.icon as any} size={12} color={colors.white} />}
                                        </View>
                                        {idx < arr.length - 1 && <View style={[styles.stTimelineLine, { backgroundColor: arr[idx + 1].done ? colors.tint : colors.border }]} />}
                                    </View>
                                    <Text style={[styles.stTimelineLabel, { color: step.done ? colors.text : colors.textMuted }]}>{step.label}</Text>
                                </View>
                            );
                        })}
                    </View>

                    {/* Remote Search Indicator */}
                    {requestData.searchMode === 'remote' && (
                        <View style={[styles.matchCard, { backgroundColor: colors.warningSoft, borderColor: colors.border, marginBottom: 16 }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <View style={[styles.matchIconWrapper, { backgroundColor: colors.warningSoft }]}>
                                    <AppIcon name="location" size={14} color={colors.warning} />
                                </View>
                                <Text style={[styles.matchTitle, { color: colors.warning }]}>REMOTE SEARCH</Text>
                            </View>
                            <Text style={[styles.matchPharmacyName, { color: colors.text, fontSize: 13, textTransform: 'none' }]}>Searching for pharmacies in:</Text>
                            <Text style={[styles.matchAddress, { color: colors.textMuted, marginTop: 4 }]}>
                                <AppIcon name="location" size={14} color={colors.warning} /> {requestData.remoteAddress || 'Selected Location'}
                            </Text>
                            {(requestData.remotePatientName || requestData.remotePatientPhone) && (
                                <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
                                    <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '600' }}>Patient Details Provided:</Text>
                                    <Text style={{ color: colors.text, fontSize: 13, marginTop: 2, fontWeight: '500' }}>
                                        {requestData.remotePatientName}
                                        {requestData.remotePatientPhone ? ` • ${requestData.remotePatientPhone}` : ''}
                                    </Text>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Match Found Card */}
                    {(requestData.status === 'matched' || requestData.matchedPharmacyName) ? (
                        <Animated.View style={[styles.matchCard, { opacity: matchOpacity, transform: [{ scale: matchScale }], backgroundColor: colorScheme === 'dark' ? colors.surface : '#111827', shadowColor: colors.shadow }]}>
                            <View style={[styles.matchCardBg, { backgroundColor: colors.success, opacity: colorScheme === 'dark' ? 0.05 : 0.1 }]} />
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <View style={[styles.matchIconWrapper, { backgroundColor: colors.successSoft, opacity: 0.8 }]}><AppIcon name="star" size={14} color={colors.success} /></View>
                                <Text style={[styles.matchTitle, { color: colors.success }]}>MATCH FOUND!</Text>
                            </View>
                            <Text style={[styles.matchPharmacyName, { color: colors.white }]}>{requestData.matchedPharmacyName}</Text>
                            <Text style={[styles.matchAddress, { color: colors.textMuted }]}><AppIcon name="location" size={14} color={colors.textMuted} /> {requestData.matchedPharmacyAddress || 'Location Confirmed'}</Text>
                            {requestData.matchedDistanceKm != null && (
                                <View style={[styles.matchDistanceBadge, { backgroundColor: colors.successSoft, borderColor: colors.success, opacity: 0.8 }]}>
                                    <Text style={[styles.matchDistanceText, { color: colors.success }]}><AppIcon name="navigate" size={12} color={colors.success} /> {requestData.matchedDistanceKm} km away</Text>
                                </View>
                            )}
                            <AnimatedTouchable style={[styles.matchChatBtn, { backgroundColor: colors.success, shadowColor: colors.shadow }]} onPress={() => {
                                if (!requestData.matchedPharmacyId) {
                                    Alert.alert('Error', 'Pharmacy info not available yet. Please wait or try again.');
                                    return;
                                }
                                router.push(`/chat?id=${id}&pharmacyId=${requestData.matchedPharmacyId}&pharmacyName=${encodeURIComponent(requestData.matchedPharmacyName || 'Pharmacy')}`);
                            }} activeOpacity={0.85}>
                                <AppIcon name="chatbubble" size={16} color={colors.white} />
                                <Text style={[styles.matchChatBtnText, { color: colors.white }]}>  Open Chat</Text>
                            </AnimatedTouchable>
                        </Animated.View>
                    ) : requestData.status === 'pending' ? (
                        /* Live Searching Status Card */
                        <View style={[styles.liveSearchCard, { backgroundColor: colors.warningSoft, borderColor: colors.border, overflow: 'hidden' }]}>
                            <LinearGradient colors={colorScheme === 'dark' ? Gradients.heroDark : Gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg }} />
                            <View style={styles.liveSearchHeader}>
                                <Animated.View style={[styles.pulseDot, { transform: [{ scale: pulseAnim }], backgroundColor: colors.accent, shadowColor: colors.shadow }]} />
                                <View>
                                    <Text style={[styles.liveSearchTitle, { color: colors.text }]}>Searching Nearby Pharmacies...</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                        <View style={[styles.timerPill, { backgroundColor: colors.warning + '22' }]}>
                                            <AppIcon name="time" size={14} color={colors.warning} />
                                            <Text style={[styles.liveSearchTimer, { color: colors.warning }]}>{Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.progressRingContainer}>
                                <View style={styles.progressLabels}>
                                    <Text style={[styles.progressLabelLeft, { color: colors.textMuted }]}>Sending to {requestData.notifiedPharmaciesCount}</Text>
                                    <Text style={[styles.progressLabelRight, { color: colors.text }]}>{requestData.responsesCount} Replied</Text>
                                </View>
                                <View style={[styles.progressBarWrapper, { backgroundColor: colors.border }]}>
                                    <Animated.View style={[styles.progressBarFillAnim, { width: fillWidth, backgroundColor: colors.warning }]} />
                                </View>
                            </View>

                            <AnimatedTouchable style={styles.cancelLinkBtn} onPress={handleCancelRequest}>
                                <Text style={[styles.cancelLinkText, { color: colors.textMuted }]}>Cancel Search</Text>
                            </AnimatedTouchable>
                        </View>
                    ) : (
                        /* Empty/Failed State */
                        <View style={[styles.emptyResponses, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <View style={[styles.emptyIconCircle, { backgroundColor: colors.background }]}>
                                <AppIcon name={requestData.status === 'cancelled' ? 'ban' : (requestData.status === 'timeout' || requestData.status === 'closed') ? 'alarm' : 'close'} size={32} color={colors.textMuted} />
                            </View>
                            <Text style={[styles.emptyRespTitle, { color: colors.text }]}>
                                {requestData.status === 'cancelled' ? 'Request Cancelled' : (requestData.status === 'timeout' || requestData.status === 'closed') ? 'Timeout Reached' : 'No Match Found'}
                            </Text>
                            <Text style={[styles.emptyRespSub, { color: colors.textMuted }]}>
                                {requestData.status === 'cancelled' ? 'This request was safely cancelled.'
                                    : (requestData.status === 'timeout' || requestData.status === 'closed') ? 'Pharmacies in your area are busy.'
                                        : 'Please try searching again later.'}
                            </Text>
                            {(requestData.status === 'timeout' || requestData.status === 'closed') && (
                                <View style={{ gap: 12, marginTop: 10, width: '100%', paddingHorizontal: 20 }}>
                                    <AnimatedTouchable style={[styles.expandRadiusBtn, { backgroundColor: colors.accent, shadowColor: colors.shadow }]} onPress={handleExpandSearch} activeOpacity={0.8}>
                                        <Text style={[styles.expandRadiusBtnText, { color: colors.white }]}>Expand Search to 10km</Text>
                                    </AnimatedTouchable>
                                    <AnimatedTouchable style={[styles.retryBtn, { backgroundColor: colors.border }]} onPress={() => router.back()} activeOpacity={0.8}>
                                        <Text style={[styles.retryBtnText, { color: colors.text }]}>Try New Search</Text>
                                    </AnimatedTouchable>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Timeline / View Modes + Sort */}
                    {responses.length > 0 && (
                        <View>
                            <View style={styles.responsesSectionHeader}>
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>Responses ({responses.length})</Text>
                                <View style={[styles.viewModes, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                    <AnimatedTouchable style={[styles.viewBtn, viewMode === 'list' && [styles.viewBtnActive, { backgroundColor: colors.background, shadowColor: colors.shadow }]]} onPress={() => { Haptics.selectionAsync(); setViewMode('list'); }}>
                                        <Text style={[viewMode === 'list' ? styles.viewBtnTextActive : styles.viewBtnText, { color: viewMode === 'list' ? colors.text : colors.textMuted }]}><AppIcon name="list" size={14} /></Text>
                                    </AnimatedTouchable>
                                    <AnimatedTouchable style={[styles.viewBtn, viewMode === 'map' && [styles.viewBtnActive, { backgroundColor: colors.background, shadowColor: colors.shadow }]]} onPress={() => { Haptics.selectionAsync(); setViewMode('map'); }}>
                                        <Text style={[viewMode === 'map' ? styles.viewBtnTextActive : styles.viewBtnText, { color: viewMode === 'map' ? colors.text : colors.textMuted }]}><AppIcon name="map" size={14} /></Text>
                                    </AnimatedTouchable>
                                </View>
                            </View>
                            {viewMode === 'list' && (
                                <View style={styles.sortPillRow}>
                                    <AnimatedTouchable style={[styles.sortPill, { borderColor: colors.border }, sortMode === 'nearest' && { backgroundColor: colors.accent, borderColor: colors.accent }]} onPress={() => { Haptics.selectionAsync(); setSortMode('nearest'); }}>
                                        <AppIcon name="navigate-outline" size={12} color={sortMode === 'nearest' ? '#fff' : colors.textMuted} />
                                        <Text style={[styles.sortPillText, { color: sortMode === 'nearest' ? '#fff' : colors.textMuted }]}>Nearest First</Text>
                                    </AnimatedTouchable>
                                    <AnimatedTouchable style={[styles.sortPill, { borderColor: colors.border }, sortMode === 'fastest' && { backgroundColor: colors.accent, borderColor: colors.accent }]} onPress={() => { Haptics.selectionAsync(); setSortMode('fastest'); }}>
                                        <AppIcon name="flash-outline" size={12} color={sortMode === 'fastest' ? '#fff' : colors.textMuted} />
                                        <Text style={[styles.sortPillText, { color: sortMode === 'fastest' ? '#fff' : colors.textMuted }]}>Fastest Reply</Text>
                                    </AnimatedTouchable>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Map View */}
                    {viewMode === 'map' && responses.length > 0 && (
                        <View style={[styles.mapContainer, { borderColor: colors.border }]}>
                            {requestData.location ? (
                                <MapView
                                    style={styles.mapView}
                                    initialRegion={{
                                        latitude: requestData.location.latitude,
                                        longitude: requestData.location.longitude,
                                        latitudeDelta: 0.05,
                                        longitudeDelta: 0.05,
                                    }}
                                >
                                    {/* User Marker */}
                                    <Marker
                                        coordinate={{
                                            latitude: requestData.location.latitude,
                                            longitude: requestData.location.longitude,
                                        }}
                                        title="You"
                                        pinColor={colors.accent}
                                    />

                                    {/* Pharmacy Markers */}
                                    {responses.map((resp, i) => {
                                        if (!resp.location) return null;
                                        return (
                                            <Marker
                                                key={i}
                                                coordinate={{
                                                    latitude: resp.location.latitude,
                                                    longitude: resp.location.longitude,
                                                }}
                                                pinColor={resp.responseType === 'available' ? colors.success : resp.responseType === 'partial' ? colors.warning : colors.textMuted}
                                            >
                                                <Callout tooltip onPress={() => router.push(`/chat?id=${id}&pharmacyId=${resp.id}&pharmacyName=${encodeURIComponent(resp.pharmacyName)}`)}>
                                                    <View style={[styles.mapCallout, { backgroundColor: colors.surface }]}>
                                                        <Text style={[styles.mapCalloutTitle, { color: colors.text }]}>{resp.pharmacyName}</Text>
                                                        <Text style={[styles.mapCalloutText, { color: colors.textMuted }]}>
                                                            {resp.responseType === 'available' ? 'Available' : resp.responseType === 'partial' ? 'Partial' : 'Not Available'}
                                                        </Text>
                                                        <Text style={styles.mapCalloutLink}>Tap to chat</Text>
                                                    </View>
                                                </Callout>
                                            </Marker>
                                        );
                                    })}
                                </MapView>
                            ) : (
                                <View style={[styles.mapPlaceholder, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                    <Text style={{ color: colors.textMuted }}>Location data unavailable</Text>
                                </View>
                            )}
                        </View>
                    )}

                    {/* List View with Timeline */}
                    {viewMode === 'list' && responses.length > 0 && !(requestData.status === 'matched' || requestData.matchedPharmacyName) && (() => {
                        const activeResps = [...availableResps, ...partialResps];
                        const sortedResps = sortMode === 'fastest'
                            ? [...activeResps].sort((a, b) => (a.respondedAt?.getTime?.() || 0) - (b.respondedAt?.getTime?.() || 0))
                            : [...activeResps].sort((a, b) => (typeof a.distance === 'number' ? a.distance : 999) - (typeof b.distance === 'number' ? b.distance : 999));
                        const fastestId = activeResps.length > 0
                            ? [...activeResps].sort((a, b) => (a.respondedAt?.getTime?.() || 0) - (b.respondedAt?.getTime?.() || 0))[0]?.id
                            : null;
                        return (
                        <View style={styles.timelineContainer}>
                            {sortedResps.map((resp, i) => (
                                <View key={resp.id || i} style={styles.timelineItem}>
                                    <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
                                    <View style={[styles.timelineDot, resp.responseType === 'available' ? { backgroundColor: colors.success, borderColor: colors.successSoft } : { backgroundColor: colors.warning, borderColor: colors.warningSoft }]} />

                                    <View style={[styles.responseCard, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.shadow }]}>
                                        {/* Avatar */}
                                        <AnimatedTouchable onPress={() => router.push(`/pharmacy/${resp.id}` as any)} style={styles.respAvatarWrap}>
                                            {resp.ownerAvatar ? (
                                                <Image source={{ uri: resp.ownerAvatar }} style={[styles.respAvatar, { backgroundColor: colors.border }]} />
                                            ) : (
                                                <View style={[styles.respAvatar, { backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }]}>
                                                    <Text style={{ fontSize: 16, fontWeight: '800', color: colors.accent }}>{(resp.pharmacyName || 'P').charAt(0)}</Text>
                                                </View>
                                            )}
                                        </AnimatedTouchable>

                                        <View style={{ flex: 1, marginLeft: 12 }}>
                                            {/* Name + Badges */}
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                                                <AnimatedTouchable onPress={() => router.push(`/pharmacy/${resp.id}` as any)}>
                                                    <Text style={[styles.pharmacyName, { color: colors.tint }]}>{resp.pharmacyName}</Text>
                                                </AnimatedTouchable>
                                                {!!resp.verified && <View style={[styles.verifiedBadge, { backgroundColor: colors.successSoft }]}><AppIcon name="checkmark-circle" size={10} color={colors.success} /><Text style={[styles.verifiedText, { color: colors.success }]}>Verified</Text></View>}
                                                {resp.id === fastestId && (
                                                    <View style={[styles.fastestBadge, { backgroundColor: '#FFF3E0' }]}>
                                                        <AppIcon name="flash" size={10} color="#F57C00" />
                                                        <Text style={styles.fastestBadgeText}>Fastest</Text>
                                                    </View>
                                                )}
                                            </View>

                                            {/* Full Address */}
                                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: 2 }}>
                                                <AppIcon name="location" size={12} color={colors.textMuted} style={{ marginTop: 2 }} />
                                                <Text style={[styles.metaText, { color: colors.textMuted, flex: 1, marginTop: 0 }]}>
                                                    {resp.distance != null ? `${resp.distance} km` : '—'}
                                                    {resp.address ? ` • ${resp.address}` : ''}
                                                </Text>
                                            </View>
                                            <Text style={{ fontSize: 11, color: colors.textMuted, opacity: 0.6, marginTop: 2 }}>{resp.respondedAt ? timeAgo(resp.respondedAt) : 'Just now'}</Text>

                                            {/* Status + Delivery Badges */}
                                            <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                                                <View style={[styles.badge, resp.responseType === 'available' ? [styles.badgeAvail, { backgroundColor: colors.successSoft }] : [styles.badgePartial, { backgroundColor: colors.warningSoft }]]}>
                                                    <Text style={[styles.badgeText, resp.responseType === 'available' ? [styles.badgeTextAvail, { color: colors.success }] : [styles.badgeTextPartial, { color: colors.warning }]]}>
                                                        {resp.responseType === 'available' ? '✓ In Stock' : '⚠ Partial Stock'}
                                                    </Text>
                                                </View>
                                                {resp.discountPercentage > 0 && (
                                                    <View style={{ backgroundColor: colors.dangerSoft, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                                                        <Text style={{ fontSize: 11, fontWeight: '800', color: colors.danger }}>{resp.discountPercentage}% Off</Text>
                                                    </View>
                                                )}
                                                {resp.hasDelivery && (
                                                    <View style={{ backgroundColor: colors.accentSoft, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                                        <AppIcon name="bicycle" size={10} color={colors.accent} />
                                                        <Text style={{ fontSize: 11, fontWeight: '800', color: colors.accent }}>Delivery</Text>
                                                    </View>
                                                )}
                                            </View>

                                            {/* Action Bar — Chat + Call + Directions */}
                                            <View style={styles.actionBar}>
                                                <AnimatedTouchable style={[styles.actionBtn, { backgroundColor: colors.accentSoft }]} onPress={() => router.push(`/chat?id=${id}&pharmacyId=${resp.id}&pharmacyName=${encodeURIComponent(resp.pharmacyName)}`)} activeOpacity={0.8}>
                                                    <AppIcon name="chatbubble" size={14} color={colors.accent} />
                                                    <Text style={[styles.actionBtnText, { color: colors.accent }]}>Chat</Text>
                                                </AnimatedTouchable>
                                                <AnimatedTouchable style={[styles.actionBtn, { backgroundColor: colors.successSoft }]} onPress={() => { if (resp.phone) { Linking.openURL(`tel:${resp.phone}`); } else { showToast('Phone number not available', 'error'); } }} activeOpacity={0.8}>
                                                    <AppIcon name="call" size={14} color={colors.success} />
                                                    <Text style={[styles.actionBtnText, { color: colors.success }]}>Call</Text>
                                                </AnimatedTouchable>
                                                {resp.location && (
                                                    <AnimatedTouchable style={[styles.actionBtn, { backgroundColor: colors.warningSoft }]} onPress={() => { Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${resp.location.latitude},${resp.location.longitude}`); }} activeOpacity={0.8}>
                                                        <AppIcon name="navigate" size={14} color={colors.warning} />
                                                        <Text style={[styles.actionBtnText, { color: colors.warning }]}>Directions</Text>
                                                    </AnimatedTouchable>
                                                )}
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </View>);
                    })()}

                    {/* Not Available Collapse */}
                    {viewMode === 'list' && notAvailResps.length > 0 && !(requestData.status === 'matched' || requestData.matchedPharmacyName) && (
                        <View style={[styles.timelineContainer, { marginTop: 0 }]}>
                            <View style={[styles.timelineItem, { paddingBottom: 0 }]}>
                                <View style={[styles.timelineDot, { backgroundColor: colors.textMuted, borderColor: colors.border }]} />

                                <View style={{ flex: 1, marginLeft: 16 }}>
                                    <AnimatedTouchable
                                        style={[styles.collapseBtn, { backgroundColor: colors.surface, borderColor: colors.border }, showNotAvailable && { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]}
                                        onPress={() => { Haptics.selectionAsync(); setShowNotAvailable(!showNotAvailable); }}
                                        activeOpacity={0.8}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <AppIcon name="close-circle" size={16} color={colors.danger} style={{ marginRight: 6 }} />
                                            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 14 }}>Not Available ({notAvailResps.length})</Text>
                                        </View>
                                        <AppIcon name={showNotAvailable ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
                                    </AnimatedTouchable>

                                    {showNotAvailable && (
                                        <View style={[styles.collapseContent, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                            {notAvailResps.map((resp, i) => (
                                                <View key={i} style={[styles.collapseItem, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                                                    <View>
                                                        <Text style={{ fontWeight: '700', color: colors.textMuted, fontSize: 13, marginBottom: 2 }}>{resp.pharmacyName}</Text>
                                                        <Text style={{ fontSize: 11, color: colors.textMuted }}><AppIcon name="location" size={10} color={colors.textMuted} /> {resp.distance != null ? `${resp.distance} km away` : 'Location unknown'}</Text>
                                                    </View>
                                                </View>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            </View>
                        </View>
                    )}
                </Animated.View>
            </ScrollView>

            {/* Bottom Sheet for Details */}
            {detailsSheetVisible && (
                <Modal transparent animationType="fade" visible={detailsSheetVisible} onRequestClose={() => {
                    Animated.timing(slideAnim, { toValue: 500, duration: 250, useNativeDriver: true }).start(() => setDetailsSheetVisible(false));
                }}>
                    <View style={styles.sheetOverlay}>
                        <AnimatedTouchable style={styles.sheetDismissArea} onPress={() => {
                            Animated.timing(slideAnim, { toValue: 500, duration: 250, useNativeDriver: true }).start(() => setDetailsSheetVisible(false));
                        }} />
                        <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: slideAnim }], backgroundColor: colors.surface, shadowColor: colors.shadow }]}>
                            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
                            <Text style={[styles.sheetTitle, { color: colors.text }]}>Request Details</Text>

                            <View style={styles.detailSection}>
                                <Text style={styles.detailLabel}>Requested Items</Text>
                                {requestData.typedMedicines && requestData.typedMedicines.length > 0 ? (
                                    requestData.typedMedicines.map((med: string, i: number) => (
                                        <View key={i} style={[styles.medItemBadge, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                            <AppIcon name="medical" size={12} color={colors.success} />
                                            <Text style={[styles.medItemText, { color: colors.text }]}>{med}</Text>
                                        </View>
                                    ))
                                ) : (
                                    <View style={[styles.medItemBadge, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                        <AppIcon name="document-attach" size={12} color={colors.success} />
                                        <Text style={[styles.medItemText, { color: colors.text }]}>Prescription Attached</Text>
                                    </View>
                                )}
                            </View>

                            {(() => {
                                const urls = requestData.prescriptionUrls || (requestData.prescriptionUrl ? [requestData.prescriptionUrl] : []);
                                if (urls.length === 0) return null;
                                return (
                                    <View style={styles.detailSection}>
                                        <Text style={styles.detailLabel}>Prescription ({urls.length} file{urls.length > 1 ? 's' : ''})</Text>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, marginTop: 8 }}>
                                            {urls.map((url: string, idx: number) => (
                                                <AnimatedTouchable
                                                    key={idx}
                                                    onPress={() => {
                                                        setDetailsSheetVisible(false);
                                                        setTimeout(() => {
                                                            setImageViewerIndex(idx);
                                                            setImageViewerVisible(true);
                                                        }, 300);
                                                    }}
                                                    style={[styles.prescriptionThumb, { borderColor: colors.border }]}
                                                >
                                                    <Image source={{ uri: url }} style={styles.prescriptionThumbImage} borderRadius={8} />
                                                    <View style={styles.prescriptionThumbOverlay}>
                                                        <AppIcon name="expand-outline" size={16} color="#fff" />
                                                    </View>
                                                </AnimatedTouchable>
                                            ))}
                                        </ScrollView>
                                    </View>
                                );
                            })()}

                        </Animated.View>
                    </View>
                </Modal>
            )}

            {/* ── Prescription Image Viewer (Zoom + Swipe) ── */}
            <ImageViewing
                images={(() => {
                    const urls = requestData?.prescriptionUrls || (requestData?.prescriptionUrl ? [requestData.prescriptionUrl] : []);
                    return urls.map((url: string) => ({ uri: url }));
                })()}
                imageIndex={imageViewerIndex}
                visible={imageViewerVisible}
                onRequestClose={() => setImageViewerVisible(false)}
            />

        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
    backBtnWrapper: { width: 44, height: 44, borderRadius: Radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 16, ...Shadows.sm },
    title: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
    subtitle: { fontSize: 14, fontWeight: '600', marginTop: 2 },

    viewDetailsBtn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: Radius.md, borderWidth: 1, marginBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    viewDetailsText: { fontWeight: '800', fontSize: 14 },

    // Live Search Card (replaces basic stats)
    liveSearchCard: { borderRadius: Radius.lg, padding: 24, borderWidth: 1, marginBottom: 24, alignItems: 'center' },
    liveSearchHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
    pulseDot: { width: 12, height: 12, borderRadius: 6, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 8, elevation: 6 },
    liveSearchTitle: { fontSize: 16, fontFamily: 'Inter_800ExtraBold' },
    liveSearchTimer: { fontSize: 13, fontFamily: 'Inter_700Bold' },
    timerPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    progressRingContainer: { width: '100%', marginBottom: 16 },
    progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    progressLabelLeft: { fontSize: 12, fontWeight: '600' },
    progressLabelRight: { fontSize: 12, fontWeight: '800' },
    progressBarWrapper: { height: 8, borderRadius: 4, width: '100%', overflow: 'hidden' },
    progressBarFillAnim: { height: '100%', borderRadius: 4 },
    cancelLinkBtn: { padding: 8 },
    cancelLinkText: { fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' },

    // Match Card
    matchCard: { borderRadius: Radius.lg, padding: 26, overflow: 'hidden', ...Shadows.lg, marginBottom: 24 },
    matchCardBg: { position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: 80 },
    matchIconWrapper: { width: 28, height: 28, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
    matchTitle: { fontWeight: '800', fontSize: 12, letterSpacing: 1 },
    matchPharmacyName: { fontSize: 26, fontWeight: '800', marginBottom: 6, letterSpacing: -0.5 },
    matchAddress: { fontSize: 14, marginBottom: 16, fontWeight: '500' },
    matchDistanceBadge: { borderWidth: 1, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.md, marginBottom: 24 },
    matchDistanceText: { fontSize: 12, fontWeight: '800' },
    matchChatBtn: { paddingVertical: 16, borderRadius: Radius.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', ...Shadows.md },
    matchChatBtnText: { fontWeight: '800', fontSize: 16 },

    // Header for responses
    responsesSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    sectionTitle: { fontSize: 18, fontWeight: '800' },
    viewModes: { padding: 4, borderRadius: Radius.sm, flexDirection: 'row', borderWidth: 1 },
    viewBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.sm },
    viewBtnActive: { ...Shadows.sm },
    viewBtnText: { fontSize: 13, fontWeight: '800' },
    viewBtnTextActive: { fontSize: 13, fontWeight: '800' },

    // Timeline Design
    timelineContainer: { paddingLeft: 10 },
    timelineItem: { position: 'relative', paddingLeft: 24, paddingBottom: 16 },
    timelineLine: { position: 'absolute', left: 5, top: 12, bottom: -12, width: 2, zIndex: -1 },
    timelineDot: { position: 'absolute', left: 0, top: 22, width: 12, height: 12, borderRadius: 6, borderWidth: 3 },

    // Cards within timeline
    responseCard: { borderRadius: Radius.lg, padding: 16, borderWidth: 1.5, flexDirection: 'row', alignItems: 'flex-start', ...Shadows.sm },
    respAvatarWrap: { flexShrink: 0, marginTop: 2 },
    respAvatar: { width: 42, height: 42, borderRadius: 21, overflow: 'hidden' },
    responseCardAvail: { },
    responseCardPartial: { },
    pharmacyName: { fontSize: 15, fontWeight: '800' },
    verifiedBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, gap: 3 },
    verifiedText: { fontSize: 10, fontWeight: '800' },
    metaText: { fontSize: 12, marginTop: 4, fontWeight: '500' },

    badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.sm },
    badgeAvail: { },
    badgePartial: { },
    badgeText: { fontSize: 11, fontWeight: '800' },
    badgeTextAvail: { },
    badgeTextPartial: { },

    chatBtn: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },

    // Empty Fallback
    emptyResponses: { alignItems: 'center', padding: 32, borderRadius: Radius.lg, borderWidth: 1, marginBottom: 24 },
    emptyIconCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    emptyRespTitle: { fontSize: 18, fontFamily: 'Inter_800ExtraBold', marginBottom: 6 },
    emptyRespSub: { textAlign: 'center', lineHeight: 20, fontFamily: 'Inter_500Medium' },
    expandRadiusBtn: { width: '100%', paddingVertical: 14, borderRadius: Radius.md, alignItems: 'center', ...Shadows.sm },
    expandRadiusBtnText: { fontFamily: 'Inter_700Bold', fontSize: 15 },
    retryBtn: { width: '100%', paddingVertical: 14, borderRadius: Radius.md, alignItems: 'center' },
    retryBtnText: { fontFamily: 'Inter_700Bold', fontSize: 15 },

    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    closeModalBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10 },

    collapseBtn: { borderRadius: Radius.lg, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1 },
    collapseContent: { borderWidth: 1, borderTopWidth: 0, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, overflow: 'hidden' },
    collapseItem: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

    mapPlaceholder: { height: 280, borderRadius: Radius.lg, borderWidth: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },

    mapContainer: { height: 350, borderRadius: Radius.lg, overflow: 'hidden', borderWidth: 1, marginBottom: 20 },
    mapView: { width: '100%', height: '100%' },
    mapCallout: { padding: 12, borderRadius: Radius.md, ...Shadows.sm, width: 140 },
    mapCalloutTitle: { fontSize: 13, fontWeight: '800', marginBottom: 2 },
    mapCalloutText: { fontSize: 11, marginBottom: 6 },
    mapCalloutLink: { fontSize: 11, fontWeight: '700' },

    // Bottom Sheet
    sheetOverlay: { flex: 1, justifyContent: 'flex-end' },
    sheetDismissArea: { flex: 1 },
    bottomSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, ...Shadows.lg },
    sheetHandle: { width: 40, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
    sheetTitle: { fontSize: 20, fontWeight: '800', marginBottom: 24 },
    detailSection: { marginBottom: 20 },
    detailLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
    medItemBadge: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: Radius.md, borderWidth: 1, marginBottom: 8 },
    medItemText: { marginLeft: 8, fontWeight: '700', fontSize: 15 },
    prescriptionPreviewBtn: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: Radius.md, borderWidth: 1, borderStyle: 'dashed' },
    prescriptionThumb: { width: 80, height: 80, borderRadius: 10, borderWidth: 1, overflow: 'hidden', position: 'relative' },
    prescriptionThumbImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    prescriptionThumbOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 26, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },

    // Sort Pills
    sortPillRow: { flexDirection: 'row', gap: 8, marginTop: 4, marginBottom: 12 },
    sortPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
    sortPillText: { fontSize: 12, fontWeight: '700' },

    // Fastest Reply Badge
    fastestBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    fastestBadgeText: { fontSize: 10, fontWeight: '800', color: '#F57C00' },

    // Action Bar
    actionBar: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(128,128,128,0.2)' },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderRadius: Radius.md },
    actionBtnText: { fontSize: 12, fontWeight: '700' },

    // Status Timeline
    stTimelineCard: { borderRadius: Radius.lg, borderWidth: 1, padding: 18, marginBottom: 16 },
    stTimelineRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    stTimelineCol: { alignItems: 'center', width: 26 },
    stTimelineDot: { width: 26, height: 26, borderRadius: 13, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
    stTimelineLine: { width: 2.5, height: 20, borderRadius: 2, marginVertical: 2 },
    stTimelineLabel: { fontSize: 14, fontFamily: 'Inter_600SemiBold', paddingTop: 3, flex: 1 },
});
