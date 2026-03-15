import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView, Animated, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Shadows, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppIcon } from '../../components/icons/AppIcon';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../contexts/AuthContext';
import { Skeleton } from '../../components/Skeleton';
import { timeAgo } from '../../utils/time';
import { getHistoryStatusConfig } from '../../utils/status';
import firestore from '@react-native-firebase/firestore';
import { AnimatedEmptyState } from '../../components/AnimatedEmptyState';
import { AnimatedTouchable } from '../../components/ui/AnimatedTouchable';
import { useScreenTracking } from '../../hooks/useScreenTracking';
import { reportError } from '../../utils/crashReporter';

/** Group history requests into date buckets */
function getHistoryDateLabel(timestampMs: number): string {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;
    const weekStart = todayStart - 6 * 86400000;
    if (timestampMs >= todayStart) return 'Today';
    if (timestampMs >= yesterdayStart) return 'Yesterday';
    if (timestampMs >= weekStart) return 'This Week';
    return 'Earlier';
}

export default function HistoryScreen() {
    const router = useRouter();
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [requests, setRequests] = useState<any[]>([]);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme() ?? 'light';
    const activeColors = Colors[colorScheme as 'light' | 'dark'];
    const { uid } = useAuth();
    useScreenTracking('HistoryScreen');

    const fetchData = useCallback(async () => {
        try {
            if (uid) {
                // Real Firestore query
                const unsub = firestore()
                    .collection('medicineRequests')
                    .where('userId', '==', uid)
                    .orderBy('createdAt', 'desc')
                    .onSnapshot((snap) => {
                        const docs = snap.docs.map(d => {
                            const data = d.data();
                            return {
                                id: d.id,
                                ...data,
                                // Ensure createdAt converts properly from Firestore Timestamp to ms for timeAgo
                                createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now(),
                            };
                        });
                        setRequests(docs.length > 0 ? docs : []);
                        setLoading(false);
                        setRefreshing(false);
                        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
                    });
                return unsub;
            } else {
                setRequests([]);
            }
        } catch (err) {
            if (__DEV__) console.error('History fetch error:', err);
            reportError(err, 'HistoryScreen.fetchData');
            setRequests([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
            Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
        }
    }, [fadeAnim, uid]);

    useEffect(() => {
        let unsubscribe: any;
        fetchData().then(unsub => {
            if (typeof unsub === 'function') unsubscribe = unsub;
        });
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [fetchData]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        // Data is already live via onSnapshot — just show refresh indicator briefly
        setTimeout(() => setRefreshing(false), 800);
    }, []);

    const filteredRequests = requests.filter(req => {
        if (filter === 'all') return true;
        if (filter === 'expired') return req.status === 'expired' || req.status === 'timeout' || req.status === 'closed';
        return req.status === filter;
    });

    // Skeleton loader
    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: activeColors.background, paddingHorizontal: 20, paddingTop: Math.max(insets.top, 20) }]}>
                <Skeleton width={200} height={28} borderRadius={8} style={{ marginBottom: 4 }} />
                <Skeleton width={260} height={16} borderRadius={6} style={{ marginBottom: 20 }} />
                <View style={{ flexDirection: 'row', marginBottom: 20, gap: 10 }}>
                    <Skeleton width={60} height={36} borderRadius={12} />
                    <Skeleton width={80} height={36} borderRadius={12} />
                    <Skeleton width={90} height={36} borderRadius={12} />
                </View>
                {[1, 2, 3, 4].map(i => (
                    <Skeleton key={i} width="100%" height={120} borderRadius={18} style={{ marginBottom: 12 }} />
                ))}
            </View>
        );
    }

    return (
        <Animated.View style={[styles.container, { backgroundColor: activeColors.background, opacity: fadeAnim, paddingTop: Math.max(insets.top, 20) }]}>
            <View style={{ paddingHorizontal: 20 }}>
                <Text style={[styles.title, { color: activeColors.text }]}>My Request History</Text>
                <Text style={[styles.headerSub, { color: activeColors.textMuted }]}>All your past medicine searches</Text>
            </View>

            <View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer} contentContainerStyle={{ paddingHorizontal: 20, paddingRight: 40 }}>
                    {['all', 'pending', 'matched', 'completed', 'expired', 'cancelled'].map(f => (
                        <AnimatedTouchable key={f} style={[styles.filterChip, { backgroundColor: activeColors.surface, borderColor: activeColors.border }, filter === f && { backgroundColor: activeColors.accent, borderColor: activeColors.accent }]} onPress={() => {
                            Haptics.selectionAsync();
                            setFilter(f);
                        }}>
                            <Text style={[styles.filterText, { color: activeColors.textMuted }, filter === f && { color: activeColors.background, fontFamily: 'Inter_700Bold' }]}>
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                            </Text>
                        </AnimatedTouchable>
                    ))}
                </ScrollView>
            </View>

            {filteredRequests.length === 0 ? (
                <AnimatedEmptyState
                    icon="folder-open-outline"
                    title="No requests found"
                    subtitle="You don't have any medicine requests in this category."
                />
            ) : (
                <FlatList
                    data={filteredRequests}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={activeColors.accent} colors={[activeColors.accent]} />}
                    renderItem={({ item, index }) => {
                        const cfg = getHistoryStatusConfig(item.status, activeColors);
                        const label = getHistoryDateLabel(item.createdAt);
                        const showSectionHeader = index === 0 || label !== getHistoryDateLabel(filteredRequests[index - 1]?.createdAt);
                        return (
                            <View>
                                {showSectionHeader && (
                                    <Text style={[styles.dateSectionLabel, { color: activeColors.textMuted }]}>{label}</Text>
                                )}
                                <AnimatedTouchable style={[styles.card, { backgroundColor: activeColors.surface, borderColor: activeColors.border, shadowColor: activeColors.shadow }]} onPress={() => {
                                    router.push(`/request/${item.id}`);
                                }} >
                                {/* Left accent bar */}
                                <View style={[styles.accentBar, { backgroundColor: cfg.dot }]} />
                                <View style={styles.cardHeader}>
                                    <View style={[styles.cardIconCircle, { backgroundColor: activeColors.background, borderColor: activeColors.border }]}>
                                        <Text style={{ fontSize: 13 }}>{cfg.icon}</Text>
                                    </View>
                                    <View style={{ flex: 1, marginRight: 10 }}>
                                        <Text style={[styles.cardTitle, { color: activeColors.text }]} numberOfLines={1}>
                                            {item.typedMedicines ? item.typedMedicines.join(', ') : 'Prescription Upload'}
                                        </Text>
                                    </View>
                                    <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                                        <View style={[styles.statusDot, { backgroundColor: cfg.dot }]} />
                                        <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                                    </View>
                                </View>

                                {item.matchedPharmacyName && (
                                    <View style={[styles.matchedPharmacyBox, { backgroundColor: activeColors.accentSoft }]}>
                                        <AppIcon name="storefront" size={14} color={activeColors.accent} />
                                        <Text style={[styles.matchedPharmacyText, { color: activeColors.accent }]}>{item.matchedPharmacyName} responded</Text>
                                    </View>
                                )}

                                <View style={[styles.cardFooter, { borderTopColor: activeColors.border }]}>
                                    <Text style={[styles.dateText, { color: activeColors.textMuted }]}><AppIcon name="time-outline" size={12} color={activeColors.textMuted} /> {timeAgo(item.createdAt)}</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        {item.responsesCount > 0 && (
                                            <View style={[styles.responseCountBadge, { backgroundColor: activeColors.background }]}>
                                                <Text style={[styles.responseCountText, { color: activeColors.textMuted }]}>{item.responsesCount} response{item.responsesCount !== 1 ? 's' : ''}</Text>
                                            </View>
                                        )}
                                        {item.typedMedicines && item.typedMedicines.length > 0 && (
                                            <AnimatedTouchable
                                                style={[styles.searchAgainBtn, { backgroundColor: activeColors.accentSoft, borderColor: activeColors.border }]}
                                                onPress={() => {
                                                    router.push({ pathname: '/(tabs)/search', params: { prefill: item.typedMedicines.join(', ') } });
                                                }}
                                            >
                                                <AppIcon name="refresh" size={11} color={activeColors.accent} />
                                                <Text style={[styles.searchAgainText, { color: activeColors.accent }]}>Search Again</Text>
                                            </AnimatedTouchable>
                                        )}
                                        <AnimatedTouchable style={[styles.detailBtn, { backgroundColor: activeColors.tintSurface }]} onPress={() => router.push(`/request/${item.id}`)}>
                                            <Text style={[styles.viewDetailText, { color: activeColors.accent }]}>Details</Text>
                                            <AppIcon name="chevron-forward" size={12} color={activeColors.accent} />
                                        </AnimatedTouchable>
                                    </View>
                                </View>
                            </AnimatedTouchable>
                            </View>
                        );
                    }}
                />
            )}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    title: { fontSize: 28, fontFamily: 'Inter_800ExtraBold', marginBottom: 4, letterSpacing: -0.8 },
    headerSub: { fontSize: 14, marginBottom: 20, fontFamily: 'Inter_500Medium' },
    filterContainer: { height: 46, marginBottom: 16 },
    filterChip: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 12, marginRight: 8, alignSelf: 'flex-start', borderWidth: 1 },
    filterText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
    filterTextActive: { fontFamily: 'Inter_700Bold' },
    listContainer: { paddingHorizontal: 20, paddingBottom: 150 },
    dateSectionLabel: { fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 14, marginBottom: 6, paddingHorizontal: 2 },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 40 },
    emptyTitle: { fontSize: 18, fontFamily: 'Inter_800ExtraBold', marginTop: 14 },
    emptySubtitle: { fontSize: 14, marginTop: 6, textAlign: 'center', fontFamily: 'Inter_500Medium' },
    card: { borderRadius: Radius.lg, padding: 18, paddingLeft: 22, marginBottom: 12, ...Shadows.sm, borderWidth: 1, overflow: 'hidden' },
    accentBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3.5, borderTopLeftRadius: Radius.lg, borderBottomLeftRadius: Radius.lg },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14, gap: 12 },
    cardIconCircle: { width: 36, height: 36, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    cardTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', marginTop: 6 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.sm, gap: 5 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontSize: 10, fontFamily: 'Inter_700Bold' },
    matchedPharmacyBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.sm, marginBottom: 14, gap: 8 },
    matchedPharmacyText: { fontSize: 13, fontWeight: '700' },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, borderTopWidth: 1 },
    dateText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
    responseCountBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.sm },
    responseCountText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
    viewDetailText: { fontSize: 12, fontFamily: 'Inter_700Bold' },
    detailBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.sm },
    searchAgainBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: Radius.sm, borderWidth: 1 },
    searchAgainText: { fontSize: 11, fontFamily: 'Inter_700Bold' },
});
