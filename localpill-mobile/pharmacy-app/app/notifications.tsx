import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView, Platform } from 'react-native';
import { Animated } from 'react-native';
import { AnimatedTouchable } from '@/components/ui/AnimatedTouchable';
import { useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle2, MessageSquare, AlertCircle, Info, CheckCheck } from 'lucide-react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { Colors, DesignTokens } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationsScreen() {
    const router = useRouter();
    const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
    const colors = Colors[colorScheme];

    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!auth().currentUser) return;

        // Notifications are stored exactly like web: 'notifications/{uid}/userNotifications'
        const notifRef = firestore().collection('notifications').doc(auth().currentUser!.uid).collection('userNotifications');

        // Sort descending by creation date
        const unsub = notifRef.orderBy('createdAt', 'desc').limit(50).onSnapshot((snapshot) => {
            if (!snapshot) return;
            const notifs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...(doc.data() as any)
            }));
            setNotifications(notifs);
            setLoading(false);
        });

        return () => unsub();
    }, []);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const handleNotificationClick = async (notif: any) => {
        if (!notif.isRead) {
            try {
                await firestore()
                    .collection('notifications')
                    .doc(auth().currentUser!.uid)
                    .collection('userNotifications')
                    .doc(notif.id)
                    .update({ isRead: true });
            } catch (err) {
                console.error('Failed to mark as read', err);
            }
        }

        if (notif.type === 'CHAT_MESSAGE') {
            // relatedId is chatId = requestId_pharmacyId
            const parts = notif.relatedId ? notif.relatedId.split('_') : [];
            const requestId = parts[0] || notif.relatedId;
            // parts[1] is pharmacyId (self), not patientId — look up patient from request doc
            const customerId = notif.senderId || '';

            router.push({
                pathname: '/chat',
                params: {
                    id: requestId,
                    customerId: customerId,
                    patientName: notif.senderName || 'Patient'
                }
            });
        } else if (notif.type === 'PHARMACY_RESPONSE' || notif.type === 'REQUEST_EXPIRED') {
            router.push('/(tabs)/explore');
        }
    };

    const markAllRead = async () => {
        const unread = notifications.filter(n => !n.isRead);
        if (unread.length === 0) return;

        try {
            const batch = firestore().batch();
            unread.forEach(n => {
                const ref = firestore()
                    .collection('notifications')
                    .doc(auth().currentUser!.uid)
                    .collection('userNotifications')
                    .doc(n.id);
                batch.update(ref, { isRead: true });
            });
            await batch.commit();
        } catch (err) {
            console.error('Failed to mark all as read', err);
        }
    };

    const getIcon = (type: string, color: string) => {
        switch (type) {
            case 'CHAT_MESSAGE':
                return <MessageSquare size={20} color={color} />;
            case 'PHARMACY_RESPONSE':
                return <CheckCircle2 size={20} color={color} />;
            case 'REQUEST_EXPIRED':
                return <AlertCircle size={20} color={color} />;
            default:
                return <Info size={20} color={color} />;
        }
    };

    const getAccentColor = (type: string) => {
        switch (type) {
            case 'CHAT_MESSAGE': return '#3B82F6'; // Blue
            case 'PHARMACY_RESPONSE': return '#3B82F6'; // Blue
            case 'REQUEST_EXPIRED': return '#F59E0B'; // Amber
            default: return '#8B5CF6'; // Purple
        }
    };

    const formatTime = (timestamp: any) => {
        if (!timestamp) return 'Just now';
        return formatDistanceToNow(timestamp.toDate(), { addSuffix: true });
    };

    const renderItem = ({ item }: { item: any }) => {
        const isUnread = !item.isRead;
        const accentColor = getAccentColor(item.type);

        return (
            <AnimatedTouchable
                style={[
                    styles.card,
                    { backgroundColor: isUnread ? (colorScheme === 'dark' ? 'rgba(59, 130, 246, 0.1)' : '#EFF6FF') : colors.surface },
                    { borderColor: isUnread ? (colorScheme === 'dark' ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE') : colors.border }
                ]}
                activeOpacity={0.7}
                onPress={() => handleNotificationClick(item)}
            >
                <View style={[styles.iconContainer, { backgroundColor: `${accentColor}20` }]}>
                    {getIcon(item.type, accentColor)}
                </View>
                <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                        <Text style={[styles.cardTitle, { color: isUnread ? colors.text : colors.textSecondary }]}>
                            {item.title || 'Notification'}
                        </Text>
                        <Text style={[styles.timeText, { color: colors.textMuted }]}>{formatTime(item.createdAt)}</Text>
                    </View>
                    <Text style={[styles.cardBody, { color: colors.textSecondary }]} numberOfLines={2}>
                        {item.body}
                    </Text>
                </View>
                {isUnread && <View style={styles.unreadDot} />}
            </AnimatedTouchable>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
                <AnimatedTouchable onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color={colors.text} />
                </AnimatedTouchable>
                <View style={styles.headerTextContainer}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
                    {unreadCount > 0 && <Text style={[styles.unreadCountText, { color: colors.textMuted }]}>{unreadCount} unread</Text>}
                </View>
                {unreadCount > 0 && (
                    <AnimatedTouchable onPress={markAllRead} style={styles.markAllReadBtn}>
                        <CheckCheck size={18} color={colorScheme === 'dark' ? '#60A5FA' : '#2563EB'} />
                        <Text style={[styles.markAllReadText, { color: colorScheme === 'dark' ? '#60A5FA' : '#2563EB' }]}>Mark All</Text>
                    </AnimatedTouchable>
                )}
            </View>

            {loading ? (
                <View style={styles.centerBox}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={() => (
                        <View style={styles.emptyContainer}>
                            <Info size={48} color={colors.textMuted} style={styles.emptyIcon} />
                            <Text style={[styles.emptyTitle, { color: colors.text }]}>All Caught Up!</Text>
                            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                                You have no new notifications right now.
                            </Text>
                        </View>
                    )}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: Platform.OS === 'ios' ? 12 : 16,
        borderBottomWidth: 1,
        zIndex: 10,
    },
    backButton: { padding: 8, marginLeft: -8, marginRight: 8 },
    headerTextContainer: { flex: 1 },
    headerTitle: { fontFamily: DesignTokens.font.bold, fontSize: 18 },
    unreadCountText: { fontFamily: DesignTokens.font.medium, fontSize: 13, marginTop: 2 },
    markAllReadBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderRadius: 8,
    },
    markAllReadText: { fontFamily: DesignTokens.font.bold, fontSize: 13 },
    centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContainer: { padding: 16, gap: 12 },
    card: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'flex-start',
        ...DesignTokens.shadow.subtle,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    cardContent: { flex: 1 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
    cardTitle: { fontFamily: DesignTokens.font.bold, fontSize: 15, flex: 1, marginRight: 8 },
    timeText: { fontFamily: DesignTokens.font.regular, fontSize: 12, marginTop: 2 },
    cardBody: { fontFamily: DesignTokens.font.regular, fontSize: 14, lineHeight: 20 },
    unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#3B82F6', marginLeft: 12, marginTop: 4 },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 20 },
    emptyIcon: { marginBottom: 16, opacity: 0.5 },
    emptyTitle: { fontFamily: DesignTokens.font.bold, fontSize: 18, marginBottom: 8 },
    emptySubtext: { fontFamily: DesignTokens.font.regular, fontSize: 15, textAlign: 'center' },
});
