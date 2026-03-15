import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Animated } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { AppIcon } from '../components/icons/AppIcon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../contexts/AuthContext';
import firestore from '@react-native-firebase/firestore';
import { AnimatedTouchable } from '../components/ui/AnimatedTouchable';
import { showToast } from '../components/Toast';
import { timeAgo } from '../utils/time';
import { AnimatedEmptyState } from '../components/AnimatedEmptyState';

import { Colors, Shadows, Radius } from '../constants/theme';
import { useColorScheme } from '../hooks/use-color-scheme';
import { Skeleton } from '../components/Skeleton';
import { reportError } from '../utils/crashReporter';
import { logNotificationClicked } from '../utils/analyticsEvents';
import { useScreenTracking } from '../hooks/useScreenTracking';

const getNotificationUI = (type: string, activeColors: any) => {
    switch (type) {
        case 'PHARMACY_RESPONSE': return { icon: 'storefront', color: activeColors.tint, bg: activeColors.accentSoft, accent: activeColors.tint };
        case 'MATCH_FOUND': return { icon: 'checkmark-circle', color: activeColors.success, bg: activeColors.successSoft, accent: activeColors.success };
        case 'CHAT_MESSAGE': return { icon: 'chatbubble-ellipses', color: activeColors.tint, bg: activeColors.accentSoft, accent: '#818CF8' };
        case 'TIMEOUT': return { icon: 'time', color: activeColors.danger, bg: activeColors.dangerSoft, accent: activeColors.danger };
        case 'WELCOME':
        case 'PROFILE_INCOMPLETE': return { icon: type === 'WELCOME' ? 'hand-left' : 'person-circle', color: activeColors.warning, bg: activeColors.warningSoft, accent: activeColors.warning };
        case 'ADMIN_BROADCAST': return { icon: 'megaphone', color: activeColors.tint, bg: activeColors.accentSoft, accent: activeColors.tint };
        default: return { icon: 'notifications', color: activeColors.textMuted, bg: activeColors.border, accent: activeColors.textMuted };
    }
};

export default function NotificationsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
    const activeColors = Colors[colorScheme];
    const styles = React.useMemo(() => getStyles(activeColors, colorScheme), [activeColors, colorScheme]);
    const { uid, isLoggedIn, isLoading: authLoading } = useAuth();
    useScreenTracking('NotificationsScreen');

    // Auth guard — redirect if not logged in
    useEffect(() => {
        if (!authLoading && !isLoggedIn) {
            router.replace('/login');
        }
    }, [authLoading, isLoggedIn]);

    useEffect(() => {
        let unsubscribe: any;

        const connectFirestore = async () => {
            if (!uid) {
                setNotifications([]);
                setLoading(false);
                return;
            }

            const q = firestore()
                .collection('notifications')
                .doc(uid)
                .collection('userNotifications')
                .orderBy('createdAt', 'desc')
                .limit(30);

            unsubscribe = q.onSnapshot((snapshot) => {
                const fetched: any[] = [];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    fetched.push({
                        id: doc.id,
                        ...data,
                        time: data.createdAt?.toMillis ? timeAgo(data.createdAt.toMillis()) : 'Just now',
                        read: data.isRead || false,
                    });
                });
                setNotifications(fetched);
                setLoading(false);
            }, (error) => {
                if (__DEV__) console.error("Error fetching notifications:", error);
                setLoading(false);
            });
        };

        connectFirestore();
        return () => { if (unsubscribe) unsubscribe(); };
    }, [uid]);

    const handleMarkAllRead = async () => {

        if (!uid) return;

        const unread = notifications.filter(n => !n.read);
        if (unread.length === 0) return;

        try {
            const batch = firestore().batch();
            unread.forEach(n => {
                const ref = firestore().collection('notifications').doc(uid).collection('userNotifications').doc(n.id);
                batch.update(ref, { isRead: true });
            });
            await batch.commit();
        } catch (e) {
            if (__DEV__) console.error('Mark all read failed:', e);
            showToast('Failed to mark notifications as read', 'error');
        }
    };

    const handleDeleteNotification = useCallback(async (notifId: string) => {
        if (!uid) return;
        try {
            await firestore().collection('notifications').doc(uid).collection('userNotifications').doc(notifId).delete();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e) {
            if (__DEV__) console.error('Delete notification failed:', e);
            showToast('Failed to delete notification', 'error');
        }
    }, [uid]);

    const getNotifDateLabel = (item: any): string => {
        if (!item.createdAt?.toMillis) return '';
        const ts = item.createdAt.toMillis();
        const now = new Date();
        const d = new Date(ts);
        const isToday = d.toDateString() === now.toDateString();
        if (isToday) return 'Today';
        return 'Earlier';
    };

    const handleNotificationClick = async (item: any) => {
        Haptics.selectionAsync();
        logNotificationClicked({ type: item.type || 'UNKNOWN' });
        if (!item.read) {
            if (uid) {
                await firestore().collection('notifications').doc(uid).collection('userNotifications').doc(item.id).update({ isRead: true });
            }
        }

        if (item.type === 'PHARMACY_RESPONSE' || item.type === 'MATCH_FOUND' || item.type === 'TIMEOUT') {
            const reqId = item.relatedId || (item.data && item.data.requestId);
            if (reqId) {
                router.push(`/request/${reqId}`);
            } else {
                router.push('/');
            }
        } else if (item.type === 'CHAT_MESSAGE') {
            const parts = item.relatedId ? item.relatedId.split('_') : [];
            const reqId = parts[0];
            const pharmId = parts[1];
            if (reqId && pharmId) {
                router.push({ pathname: '/chat', params: { id: reqId, pharmacyId: pharmId } });
            }
        } else if (item.type === 'PROFILE_INCOMPLETE') {
            router.push('/profile');
        } else {
            // WELCOME, ADMIN_BROADCAST, and other types — go to home
            router.push('/');
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: Math.max(insets.top + 12, 44) }]}>
                <AnimatedTouchable style={styles.backBtn} onPress={() => router.back()} accessibilityLabel="Go back">
                    <AppIcon name="arrow-back" size={20} color={activeColors.text} />
                </AnimatedTouchable>
                <Text style={styles.headerTitle}>Notifications</Text>
                <AnimatedTouchable style={styles.clearBtn} onPress={handleMarkAllRead} accessibilityLabel="Mark all as read">
                    <Text style={styles.clearText}>Mark all read</Text>
                </AnimatedTouchable>
            </View>

            {loading ? (
                <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
                    {[1, 2, 3, 4].map(i => (
                        <View key={i} style={{ flexDirection: 'row', gap: 14, marginBottom: 12, backgroundColor: activeColors.surface, borderRadius: Radius.lg, padding: 16, borderWidth: 1, borderColor: activeColors.border }}>
                            <Skeleton width={48} height={48} borderRadius={Radius.md} />
                            <View style={{ flex: 1, gap: 6 }}>
                                <Skeleton width="70%" height={16} borderRadius={6} />
                                <Skeleton width="90%" height={14} borderRadius={6} />
                                <Skeleton width={60} height={12} borderRadius={4} />
                            </View>
                        </View>
                    ))}
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={item => item.id}
                    contentContainerStyle={[styles.list, { paddingBottom: Math.max(insets.bottom + 20, 32) }]}
                    showsVerticalScrollIndicator={false}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                    ListEmptyComponent={
                        <AnimatedEmptyState
                            icon="notifications-off-outline"
                            title="No notifications"
                            subtitle="You're all caught up!"
                        />
                    }
                    renderItem={({ item, index }) => {
                        // Date section header
                        const dateLabel = getNotifDateLabel(item);
                        const prevLabel = index > 0 ? getNotifDateLabel(notifications[index - 1]) : '';
                        const showHeader = dateLabel && dateLabel !== prevLabel;
                        const ui = getNotificationUI(item.type, activeColors);
                        return (
                            <>
                                {showHeader && (
                                    <Text style={styles.sectionHeader}>{dateLabel}</Text>
                                )}
                                <AnimatedTouchable
                                    style={[styles.card, !item.read && styles.cardUnread]}
                                    activeOpacity={0.7}
                                    onPress={() => handleNotificationClick(item)}
                                    onLongPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                        const { Alert } = require('react-native');
                                        Alert.alert('Delete Notification', 'Are you sure you want to delete this notification?', [
                                            { text: 'Cancel', style: 'cancel' },
                                            { text: 'Delete', style: 'destructive', onPress: () => handleDeleteNotification(item.id) },
                                        ]);
                                    }}
                                    accessibilityLabel={item.title}
                                    accessibilityHint="Long press to delete"
                                >
                                    {/* Left Accent Bar */}
                                    <View style={[styles.accentBar, { backgroundColor: ui.accent }]} />

                                    {/* Unread dot */}
                                    {!item.read && <View style={styles.unreadDot} />}

                                    <View style={[styles.iconCircle, { backgroundColor: ui.bg }]}>
                                        <AppIcon name={ui.icon as any} size={22} color={ui.color} />
                                    </View>

                                    <View style={styles.content}>
                                        <Text style={[styles.title, !item.read && styles.titleUnread]}>
                                            {item.title}
                                        </Text>
                                        <Text style={styles.body} numberOfLines={2}>
                                            {item.body}
                                        </Text>
                                        <Text style={styles.time}>{item.time}</Text>
                                    </View>
                                </AnimatedTouchable>
                            </>
                        )
                    }}
                />
            )}
        </View>
    );
}

const getStyles = (activeColors: any, colorScheme: 'light' | 'dark') => StyleSheet.create({
    container: { flex: 1, backgroundColor: activeColors.background },

    // Header
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingBottom: 16,
        backgroundColor: activeColors.surface, borderBottomWidth: 1, borderBottomColor: activeColors.border,
    },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: activeColors.background, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: activeColors.border },
    headerTitle: { fontSize: 18, fontFamily: 'Inter_800ExtraBold', color: activeColors.text },
    clearBtn: { paddingHorizontal: 8, paddingVertical: 4 },
    clearText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: activeColors.tint },

    // List
    list: { paddingHorizontal: 16, paddingTop: 12 },
    separator: { height: 8 },
    sectionHeader: { fontSize: 12, fontFamily: 'Inter_700Bold', color: activeColors.textMuted, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 16, marginBottom: 8, paddingLeft: 4 },

    // Card
    card: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 14,
        backgroundColor: activeColors.surface, borderRadius: Radius.lg, padding: 16, paddingLeft: 20,
        borderWidth: 1, borderColor: activeColors.border,
        shadowColor: activeColors.shadow, ...Shadows.sm, overflow: 'hidden',
    },
    cardUnread: { borderColor: activeColors.tintLight, backgroundColor: colorScheme === 'dark' ? activeColors.background : activeColors.accentSoft },
    accentBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderTopLeftRadius: Radius.lg, borderBottomLeftRadius: Radius.lg },
    unreadDot: { position: 'absolute', top: 16, right: 16, width: 8, height: 8, borderRadius: 4, backgroundColor: activeColors.tint },

    iconCircle: { width: 48, height: 48, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    content: { flex: 1 },
    title: { fontSize: 15, fontFamily: 'Inter_700Bold', color: activeColors.text, marginBottom: 3 },
    titleUnread: { fontFamily: 'Inter_800ExtraBold' },
    body: { fontSize: 13, fontFamily: 'Inter_500Medium', color: activeColors.textMuted, lineHeight: 19, marginBottom: 6 },
    time: { fontSize: 11, fontFamily: 'Inter_500Medium', color: activeColors.textMuted },

    // Empty state
    empty: { alignItems: 'center', paddingTop: 80 },
    emptyIconCircle: { width: 80, height: 80, borderRadius: 24, backgroundColor: activeColors.border, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    emptyTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: activeColors.text, marginBottom: 6 },
    emptySubtitle: { fontSize: 14, fontFamily: 'Inter_500Medium', color: activeColors.textMuted },
});
