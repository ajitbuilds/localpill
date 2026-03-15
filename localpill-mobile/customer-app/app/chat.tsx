import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Image, Modal, Animated, Linking, Alert, useColorScheme, Keyboard } from 'react-native';
import Reanimated, { FadeInLeft, FadeInRight } from 'react-native-reanimated';
import { showToast } from '../components/Toast';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { AppIcon } from '../components/icons/AppIcon';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import database from '@react-native-firebase/database';
import storage from '@react-native-firebase/storage';
import firestore from '@react-native-firebase/firestore';
import * as StoreReview from 'expo-store-review';
import ImageViewing from "react-native-image-viewing";
import Skeleton from '../components/Skeleton';

import { Colors, Shadows, Radius, Gradients } from '../constants/theme';
import { AnimatedTouchable } from '../components/ui/AnimatedTouchable';
import { LinearGradient } from 'expo-linear-gradient';
import { isValidString } from '../utils/validation';
import { withRetry } from '../utils/retry';
import { compressImage } from '../utils/imageUtils';
import { timeAgo } from '../utils/time';
import { Message } from '../types/chat';
import { useScreenTracking } from '../hooks/useScreenTracking';

const ImageWithFallback = React.memo(({ uri, style, borderRadius }: any) => {
    const [error, setError] = useState(false);
    const colorScheme = useColorScheme();
    const activeColors = Colors[colorScheme ?? 'light'];
    
    if (error || !uri) {
        return (
            <View style={[style, { borderRadius, backgroundColor: activeColors.border, alignItems: 'center', justifyContent: 'center' }]}>
                <AppIcon name="image-outline" size={32} color={activeColors.textMuted} />
            </View>
        );
    }
    return <Image source={{ uri }} style={style} borderRadius={borderRadius} onError={() => setError(true)} />;
});

export default function ChatScreen() {
    const { id, pharmacy, pharmacyId: paramPharmacyId, pharmacyName: paramPharmacyName } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const activeColors = Colors[colorScheme ?? 'light'];
    useScreenTracking('ChatScreen');
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [pharmacyName, setPharmacyName] = useState('Pharmacy');
    const [pharmacyPhone, setPharmacyPhone] = useState('');
    const [pharmacyLocation, setPharmacyLocation] = useState<{ latitude: number, longitude: number, lat?: number, lng?: number } | null>(null);
    const [isOnline, setIsOnline] = useState(false);
    const [lastSeen, setLastSeen] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [viewingImage, setViewingImage] = useState<string | null>(null);
    const [isTyping, setIsTyping] = useState(false);
    const [activeReactionMessageId, setActiveReactionMessageId] = useState<string | null>(null);
    const [replyingTo, setReplyingTo] = useState<any>(null);
    const [requestDetails, setRequestDetails] = useState<any>(null);
    const [pharmacyVerified, setPharmacyVerified] = useState(false);
    const [pharmacyPhoto, setPharmacyPhoto] = useState<string | null>(null);
    const [unauthorized, setUnauthorized] = useState(false);
    const [loadingEarlier, setLoadingEarlier] = useState(false);
    const [hasEarlierMessages, setHasEarlierMessages] = useState(true);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const oldestKeyRef = useRef<string | null>(null);
    const flatListRef = useRef<FlatList>(null);
    const PAGE_SIZE = 30;
    const typingTimeout = useRef<any>(null);

    const EMOJI_OPTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

    const typingDot1 = useRef(new Animated.Value(0)).current;
    const typingDot2 = useRef(new Animated.Value(0)).current;
    const typingDot3 = useRef(new Animated.Value(0)).current;

    const { uid, isLoggedIn, isLoading: authLoading } = useAuth();
    const requestId = typeof id === 'string' ? id : (id?.[0] ?? '');
    const actualPharmacyId = typeof paramPharmacyId === 'string' ? paramPharmacyId : (typeof pharmacy === 'string' ? pharmacy : 'pharmacy');
    // Important: Do not lowercase the ID to keep chat IDs consistent with Firestore and web app
    const pharmacyId = actualPharmacyId;
    const chatId = `${requestId}_${pharmacyId}`;

    const currentUser = { uid: uid || '' };

    // Auth guard — redirect if not logged in
    useEffect(() => {
        if (!authLoading && !isLoggedIn) {
            router.replace('/login');
        }
    }, [authLoading, isLoggedIn]);

    // Keyboard height tracking (Android fix)
    useEffect(() => {
        if (Platform.OS !== 'android') return;
        const showSub = Keyboard.addListener('keyboardDidShow', (e) => setKeyboardHeight(e.endCoordinates.height));
        const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
        return () => { showSub.remove(); hideSub.remove(); };
    }, []);

    // Load messages from RTDB
    useEffect(() => {
        if (typeof paramPharmacyName === 'string' && paramPharmacyName) {
            setPharmacyName(paramPharmacyName);
        } else if (typeof pharmacy === 'string' && pharmacy && !paramPharmacyId) {
            setPharmacyName(pharmacy);
        }

        if (pharmacyId && pharmacyId !== 'pharmacy') {
            firestore().collection('pharmacies').doc(pharmacyId).get().then(doc => {
                const data = doc.data();
                if (data) {
                    if (data?.pharmacyName || data?.name) setPharmacyName(data.pharmacyName || data.name);
                    if (data?.phone) setPharmacyPhone(data.phone);
                    if (data?.location) setPharmacyLocation(data.location);
                    setPharmacyVerified(!!data?.isVerified);
                    setPharmacyPhoto(data?.profilePhoto || data?.ownerPhotoURL || null);
                }
            }).catch(e => { if (__DEV__) console.log('Error fetching pharmacy', e); });
        }

        if (requestId) {
            firestore().collection('medicineRequests').doc(requestId).get().then(doc => {
                if (doc.exists()) {
                    const data = doc.data();
                    // IDOR check: verify current user owns this request
                    if (uid && data?.userId && data.userId !== uid) {
                        setUnauthorized(true);
                        return;
                    }
                    setRequestDetails(data);
                }
            }).catch(e => { if (__DEV__) console.log('Error fetching request details', e); });
        }

        // Subscribe to typing indicator
        const typeRef = database().ref(`chats/${chatId}/typing/${pharmacyId}`);
        const onValueChange = typeRef.on('value', (snap: any) => {
            setIsTyping(!!snap.val());
        });
        const unsubTyping = () => typeRef.off('value', onValueChange);

        // Self-register in chatMembers so RTDB rules allow access
        if (uid) {
            database().ref(`chatMembers/${chatId}/${uid}`).set(true).catch(() => { });
        }

        // Set customer online status
        const myStatusRef = uid ? database().ref(`status/${uid}`) : null;
        if (myStatusRef) {
            myStatusRef.set({
                isOnline: true,
                lastSeen: database.ServerValue.TIMESTAMP
            }).catch(() => { });
            myStatusRef.onDisconnect().set({
                isOnline: false,
                lastSeen: database.ServerValue.TIMESTAMP
            });
        }

        // Subscribe to pharmacy online status
        const statusRef = database().ref(`pharmacyPresence/${pharmacyId}`);
        const onStatusChange = statusRef.on('value', (snap: any) => {
            const val = snap.val();
            // Expected val: { isOnline: boolean, lastSeen: number }
            if (val) {
                setIsOnline(!!val.isOnline);
                setLastSeen(val.lastSeen || null);
            } else {
                setIsOnline(false);
            }
        });
        const unsubStatus = () => statusRef.off('value', onStatusChange);

        // Subscribe to messages (paginated — latest PAGE_SIZE messages)
        const msgsRef = database().ref(`chats/${chatId}/messages`);
        const onMsgsChange = msgsRef.orderByKey().limitToLast(PAGE_SIZE).on('value', (snap: any) => {
            const msgs: any[] = [];
            snap.forEach((child: any) => {
                const val = child.val();
                if (val && typeof val === 'object' && val.senderId) {
                    msgs.push({ id: child.key, ...val });
                }
                return undefined;
            });
            // Track oldest key for pagination
            if (msgs.length > 0) {
                oldestKeyRef.current = msgs[0].id;
            }
            setHasEarlierMessages(msgs.length >= PAGE_SIZE);
            setMessages(msgs.reverse()); // newest first for inverted FlatList
            setLoading(false);
        }, (err: any) => {
            if (__DEV__) console.error('Chat onValue error:', err);
            setLoading(false);
        });

        return () => {
            msgsRef.off('value', onMsgsChange);
            unsubTyping();
            unsubStatus();
            if (myStatusRef) {
                myStatusRef.onDisconnect().cancel();
                myStatusRef.set({
                    isOnline: false,
                    lastSeen: database.ServerValue.TIMESTAMP
                }).catch(() => { });
            }
        };
    }, [id, pharmacy, uid, pharmacyId]);

    // Typing animation
    useEffect(() => {
        if (!isTyping) return;
        const createAnim = (dot: Animated.Value, delay: number) =>
            Animated.loop(Animated.sequence([
                Animated.delay(delay),
                Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
                Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
            ]));
        Animated.parallel([createAnim(typingDot1, 0), createAnim(typingDot2, 150), createAnim(typingDot3, 300)]).start();
    }, [isTyping, typingDot1, typingDot2, typingDot3]);

    // Load earlier messages on scroll
    const loadEarlierMessages = async () => {
        if (loadingEarlier || !hasEarlierMessages || !oldestKeyRef.current || !chatId) return;
        setLoadingEarlier(true);
        try {
            const msgsRef = database().ref(`chats/${chatId}/messages`);
            const snap = await msgsRef.orderByKey().endAt(oldestKeyRef.current).limitToLast(PAGE_SIZE + 1).once('value');
            const older: any[] = [];
            snap.forEach((child: any) => {
                const val = child.val();
                // Skip the boundary key we already have
                if (child.key === oldestKeyRef.current) return undefined;
                if (val && typeof val === 'object' && val.senderId) {
                    older.push({ id: child.key, ...val });
                }
                return undefined;
            });
            if (older.length === 0) {
                setHasEarlierMessages(false);
            } else {
                oldestKeyRef.current = older[0].id;
                setHasEarlierMessages(older.length >= PAGE_SIZE);
                // Append older messages at the end (inverted list: end = top = older)
                setMessages(prev => [...prev, ...older.reverse()]);
            }
        } catch (err) {
            if (__DEV__) console.error('Error loading earlier messages:', err);
        } finally {
            setLoadingEarlier(false);
        }
    };

    const handleSendMessage = async () => {
        if (!isValidString(newMessage)) return;
        const messageText = newMessage.trim();
        setNewMessage('');
        setReplyingTo(null);

        // Real RTDB send
        try {
            const msgsRef = database().ref(`chats/${chatId}/messages`);
            await withRetry(async () => {
                await msgsRef.push({
                    senderId: uid,
                    text: messageText,
                    type: 'text',
                    timestamp: database.ServerValue.TIMESTAMP,
                    ...(replyingTo ? { replyTo: replyingTo.id, replyText: replyingTo.text } : {}),
                });
            });
        } catch (e: any) {
            showToast('Failed to send message', 'error');
        }

        // Clear typing indicator
        try {
            await database().ref(`chats/${chatId}/typing/${uid}`).set(false);
        } catch (e: any) {
            if (__DEV__) console.log('Error clearing typing indicator', e);
        }
    };

    const handleImageUpload = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
        if (!result.canceled && result.assets[0].uri) {
            const file = result.assets[0];
            if (file.fileSize && file.fileSize > 5 * 1024 * 1024) {
                Alert.alert("File Too Large", "Please select an image smaller than 5MB.");
                return;
            }
            const localUri = file.uri;

            try {
                showToast("Uploading image...", "info" as any);
                const filename = localUri.split('/').pop() || `chat_${Date.now()}.jpg`;
                const sRef = storage().ref(`prescriptions/${requestId}/chat_${chatId}_${Date.now()}_${filename}`);

                const compressed = await compressImage(localUri);
                // Firebase Storage on Android requires file:// prefix
                const uploadUri = Platform.OS === 'android' && !compressed.startsWith('file://') ? `file://${compressed}` : compressed;
                await withRetry(async () => await sRef.putFile(uploadUri));
                const url = await withRetry(async () => await sRef.getDownloadURL());

                const msgsRef = database().ref(`chats/${chatId}/messages`);
                await withRetry(async () => await msgsRef.push({
                    senderId: uid,
                    type: 'image',
                    imageUri: url,
                    timestamp: database.ServerValue.TIMESTAMP
                }));
                showToast("Image sent", "success");
            } catch (err) {
                if (__DEV__) console.error("Image upload error", err);
                showToast("Failed to upload image", "error");
            }
        }
    };

    const handleDocumentUpload = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf'], copyToCacheDirectory: true });
            if (result.canceled) return;

            const file = result.assets[0];
            if (file.size && file.size > 5 * 1024 * 1024) {
                Alert.alert("File Too Large", "Please select a document smaller than 5MB.");
                return;
            }

            showToast("Uploading document...", "info" as any);
            const sRef = storage().ref(`prescriptions/${requestId}/chat_${chatId}_${Date.now()}_${file.name.replace(/\s+/g, '_')}`);

            const uploadUri = Platform.OS === 'android' && !file.uri.startsWith('file://') ? `file://${file.uri}` : file.uri;
            await withRetry(async () => await sRef.putFile(uploadUri));
            const url = await withRetry(async () => await sRef.getDownloadURL());

            const msgsRef = database().ref(`chats/${chatId}/messages`);
            await withRetry(async () => await msgsRef.push({
                senderId: uid,
                type: 'document',
                documentUrl: url,
                documentName: file.name,
                timestamp: database.ServerValue.TIMESTAMP
            }));
            showToast("Document sent", "success");
        } catch (err) {
            if (__DEV__) console.error('Error picking/uploading document:', err);
            showToast("Document upload failed", "error");
        }
    };

    const handleAttachment = () => {
        Alert.alert('Attach File', 'Choose a file type to share with the pharmacy', [
            { text: 'Photo Library', onPress: handleImageUpload },
            { text: 'PDF Document', onPress: handleDocumentUpload },
            { text: 'Cancel', style: 'cancel' }
        ]);
    };

    // ── Action Handlers ──────────────────────────────────────────────────────
    const handleCall = () => {
        if (!pharmacyPhone) {
            showToast('Phone number not available', 'error');
            return;
        }
        Linking.openURL(`tel:${pharmacyPhone}`).catch(() =>
            Alert.alert('Cannot Call', 'Phone dialer not available on this device.')
        );
    };

    const handleNavigate = () => {
        const lat = pharmacyLocation?.latitude || pharmacyLocation?.lat;
        const lng = pharmacyLocation?.longitude || pharmacyLocation?.lng;
        if (lat && lng) {
            const label = encodeURIComponent(pharmacyName);
            // Open exact location with pin marker + directions
            const url = Platform.OS === 'ios'
                ? `maps://app?daddr=${lat},${lng}&dirflg=d`
                : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=&travelmode=driving`;
            Linking.openURL(url).catch(() => {
                // Fallback: open Google Maps web with exact coordinates
                Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_id=${label}`);
            });
        } else {
            const query = encodeURIComponent(pharmacyName + ' pharmacy');
            const mapsUrl = Platform.OS === 'ios' ? `maps:?q=${query}` : `geo:0,0?q=${query}`;
            Linking.openURL(mapsUrl).catch(() => Linking.openURL(`https://maps.google.com/?q=${query}`));
        }
    };

    const handleTextChange = (text: string) => {
        setNewMessage(text);
        if (uid && chatId) {
            if (!typingTimeout.current) {
                database().ref(`chats/${chatId}/typing/${uid}`).set(true).catch(() => { });
            }
            if (typingTimeout.current) clearTimeout(typingTimeout.current);
            typingTimeout.current = setTimeout(() => {
                database().ref(`chats/${chatId}/typing/${uid}`).set(false).catch(() => { });
                typingTimeout.current = null;
            }, 3000);
        }
    };

    const renderLastSeen = () => {
        if (isOnline) return 'Online';
        if (lastSeen) {
            const d = new Date(lastSeen);
            const now = new Date();
            if (d.toDateString() === now.toDateString()) {
                return `Last seen today at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            }
            return `Last seen ${d.toLocaleDateString()}`;
        }
        return 'Offline';
    };

    const handleMarkFound = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
            '🎉 Medicines Found!',
            'Mark this request as completed?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Mark Completed', style: 'default', onPress: async () => {
                        try {
                            await withRetry(async () => await firestore().collection('medicineRequests').doc(requestId).update({
                                status: 'completed',
                                matchedPharmacyId: pharmacyId,
                                matchedPharmacyName: pharmacyName,
                                completedAt: firestore.FieldValue.serverTimestamp(),
                            }));
                            showToast('Request marked as completed', 'success');
                            
                            try {
                                if (await StoreReview.hasAction()) {
                                    await StoreReview.requestReview();
                                }
                            } catch (reviewErr) {
                                if (__DEV__) console.log("StoreReview error", reviewErr);
                            }

                            setTimeout(() => router.back(), 800);
                        } catch (e) {
                            if (__DEV__) console.error('Mark found failed:', e);
                            showToast('Failed to mark as completed', 'error');
                        }
                    }
                },
            ]
        );
    };

    const formatTime = (ts: number) => {
        const d = new Date(ts);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // timeAgo imported from ../utils/time

    const handleDirections = () => handleNavigate();

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'sent': return '✓';
            case 'delivered': return '✓✓';
            case 'read': return '✓✓';
            default: return '';
        }
    };

    const handleReaction = async (emoji: string) => {
        if (!activeReactionMessageId) return;
        setMessages(prev => prev.map(m => m.id === activeReactionMessageId ? { ...m, reaction: emoji } : m));
        const msgId = activeReactionMessageId;
        setActiveReactionMessageId(null);
        try {
            await withRetry(async () => await database().ref(`chats/${chatId}/messages/${msgId}/reaction`).set(emoji));
        } catch (e) {
            if (__DEV__) console.error('Reaction persist failed:', e);
        }
    };

    const getInitials = (name: string) =>
        name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    const renderMessage = ({ item, index }: { item: any; index: number }) => {
        const isMe = item.senderId === currentUser.uid;
        // 5-minute grouping for timestamps
        const curBucket = Math.floor(item.timestamp / 300000);
        const nextBucket = messages[index + 1] ? Math.floor(messages[index + 1].timestamp / 300000) : -1;
        const showTimeSeparator = index === messages.length - 1 || curBucket !== nextBucket;

        const replyOrigMsg = item.replyTo ? messages.find(m => m.id === item.replyTo) : null;

        return (
            <Reanimated.View entering={isMe ? FadeInRight.duration(300).springify().damping(14) : FadeInLeft.duration(300).springify().damping(14)}>
                {showTimeSeparator && <Text style={[styles.timeSeparator, { color: activeColors.textMuted }]}>{formatTime(item.timestamp)}</Text>}
                {item.type === 'prescription_request' ? (
                    <View style={[styles.systemMsg, { backgroundColor: activeColors.accentSoft, borderColor: activeColors.tintLight }]}>
                        <Text style={[styles.systemMsgText, { color: activeColors.tint }]}>📋 Pharmacy requested your prescription</Text>
                        <AnimatedTouchable style={[styles.systemBtn, { backgroundColor: activeColors.tint }]} onPress={handleAttachment}>
                            <Text style={[styles.systemBtnText, { color: activeColors.white }]}>📷 Upload Now</Text>
                        </AnimatedTouchable>
                    </View>
                ) : item.type === 'image' ? (
                    <AnimatedTouchable
                        style={[styles.messageRow, isMe && styles.messageRowMe]}
                        onPress={() => setViewingImage(item.imageUri)}
                        onLongPress={() => { Haptics.selectionAsync(); Keyboard.dismiss(); setActiveReactionMessageId(item.id); }}
                        delayLongPress={250}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.imageBubble, isMe && styles.imageBubbleMe]}>
                            <ImageWithFallback uri={item.imageUri} style={styles.chatImage} borderRadius={10} />
                            {isMe && <Text style={[styles.readReceipt, item.status === 'read' && { color: activeColors.tintLight }]}>{getStatusIcon(item.status)}</Text>}
                            {!!item.reaction && (
                                <View style={[styles.reactionBadge, isMe ? styles.reactionBadgeMe : styles.reactionBadgeTheir, { backgroundColor: activeColors.warningSoft, borderColor: activeColors.background }]}>
                                    <Text style={[styles.reactionText, { color: activeColors.text }]}>{item.reaction}</Text>
                                </View>
                            )}
                        </View>
                    </AnimatedTouchable>
                ) : (
                    <View style={[styles.messageRow, isMe ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }]}>
                        <AnimatedTouchable
                            style={[styles.messageBubble, isMe ? styles.myBubble : styles.theirBubble, isMe ? { backgroundColor: activeColors.tint } : { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}
                            onLongPress={() => { Haptics.selectionAsync(); Keyboard.dismiss(); setActiveReactionMessageId(item.id); }}
                            delayLongPress={250}
                            activeOpacity={0.8}
                        >
                            {replyOrigMsg && (
                                <View style={[styles.replyBubbleQuote, isMe ? styles.replyBubbleQuoteMe : styles.replyBubbleQuoteTheir, { backgroundColor: isMe ? activeColors.tintDark : activeColors.background }]}>
                                    <View style={[styles.replyQuoteLine, { backgroundColor: activeColors.tintLight }]} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.replyQuoteName, !isMe && { color: activeColors.tint }]}>{replyOrigMsg.senderId === currentUser.uid ? 'You' : pharmacyName}</Text>
                                        <Text style={[styles.replyQuoteText, !isMe && { color: activeColors.textMuted }]} numberOfLines={1}>{replyOrigMsg.text || 'Photo'}</Text>
                                    </View>
                                </View>
                            )}
                            <Text style={[styles.messageText, isMe ? { color: activeColors.white } : { color: activeColors.text }]}>{item.text}</Text>
                            {isMe && <Text style={[styles.readReceipt, { color: activeColors.white + '80' }, item.status === 'read' && { color: activeColors.tintLight }]}>{getStatusIcon(item.status)}</Text>}
                            {!!item.reaction && (
                                <View style={[styles.reactionBadge, isMe ? styles.reactionBadgeMe : styles.reactionBadgeTheir, { backgroundColor: activeColors.warningSoft, borderColor: activeColors.background }]}>
                                    <Text style={[styles.reactionText, { color: activeColors.text }]}>{item.reaction}</Text>
                                </View>
                            )}
                        </AnimatedTouchable>
                    </View>
                )}
            </Reanimated.View>
        );
    };

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: activeColors.background, justifyContent: 'flex-start' }]}>
                <Stack.Screen options={{ headerShown: false }} />
                {/* Chat Header Skeleton */}
                <View style={[styles.chatHeader, { paddingTop: Math.max(insets.top, 20), backgroundColor: activeColors.surface, borderBottomColor: activeColors.border, width: '100%' }]}>
                    <View style={styles.backBtn}>
                        <AppIcon name="arrow-back" size={20} color={activeColors.textMuted} />
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <Skeleton width={40} height={40} borderRadius={20} style={{ marginRight: 10 }} />
                        <View style={{ flex: 1 }}>
                            <Skeleton width={120} height={16} style={{ marginBottom: 4 }} />
                            <Skeleton width={80} height={12} />
                        </View>
                    </View>
                </View>

                {/* Chat Messages Skeleton */}
                <View style={{ flex: 1, padding: 16, width: '100%', justifyContent: 'flex-end', gap: 16 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-start' }}>
                        <Skeleton width="60%" height={60} borderRadius={18} style={{ borderBottomLeftRadius: 4 }} />
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                        <Skeleton width="45%" height={45} borderRadius={18} style={{ borderBottomRightRadius: 4 }} />
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-start' }}>
                        <Skeleton width="70%" height={80} borderRadius={18} style={{ borderBottomLeftRadius: 4 }} />
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                        <Skeleton width="55%" height={50} borderRadius={18} style={{ borderBottomRightRadius: 4 }} />
                    </View>
                </View>
                
                {/* Input Bar Skeleton */}
                <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12), backgroundColor: activeColors.surface, borderTopColor: activeColors.border, width: '100%', alignItems: 'center' }]}>
                     <Skeleton width={40} height={40} borderRadius={20} />
                     <View style={{ flex: 1, paddingHorizontal: 8 }}>
                         <Skeleton width="100%" height={42} borderRadius={21} />
                     </View>
                     <Skeleton width={42} height={42} borderRadius={12} />
                </View>
            </View>
        );
    }

    if (unauthorized) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: activeColors.background }}>
                <Stack.Screen options={{ headerShown: false }} />
                <AppIcon name="lock-closed" size={48} color={activeColors.textMuted} style={{ marginBottom: 12 }} />
                <Text style={{ color: activeColors.text, fontSize: 18, fontWeight: '700', marginBottom: 8 }}>Access Denied</Text>
                <Text style={{ color: activeColors.textMuted, textAlign: 'center', paddingHorizontal: 40 }}>You don't have permission to access this chat.</Text>
                <AnimatedTouchable style={{ marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: activeColors.accent, borderRadius: 12 }} onPress={() => router.back()}>
                    <Text style={{ color: '#fff', fontWeight: '600' }}>Go Back</Text>
                </AnimatedTouchable>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: activeColors.background }}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* ── Chat Header ─────────────────────────────────── */}
            <View style={styles.headerWrap}>
                <LinearGradient colors={colorScheme === 'dark' ? Gradients.heroDark : Gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.headerGradientLine} />
                <View style={[styles.chatHeader, { paddingTop: Math.max(insets.top, 20), backgroundColor: activeColors.surface }]}>
                    <AnimatedTouchable onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
                        <AppIcon name="arrow-back" size={20} color={activeColors.text} />
                    </AnimatedTouchable>
                    <AnimatedTouchable
                        style={styles.headerInfoArea}
                        activeOpacity={0.7}
                        onPress={() => router.push(`/pharmacy/${pharmacyId}` as any)}
                    >
                        <View style={[styles.headerAvatar, { backgroundColor: activeColors.tintSurface, borderColor: activeColors.tintLight }]}>
                            <Text style={[styles.avatarInitials, { color: activeColors.tint }]}>{getInitials(pharmacyName)}</Text>
                        </View>
                        <View style={styles.headerTextArea}>
                            <View style={styles.headerNameRow}>
                                <Text style={[styles.headerName, { color: activeColors.text }]} numberOfLines={1} ellipsizeMode="tail">{pharmacyName}</Text>
                                {pharmacyVerified && <AppIcon name="shield-checkmark" size={14} color={activeColors.tint} />}
                            </View>
                            <Text style={[styles.headerStatus, { color: isOnline ? activeColors.success : activeColors.textMuted }]}>{isTyping ? 'typing...' : renderLastSeen()}</Text>
                        </View>
                    </AnimatedTouchable>
                    <View style={styles.headerActions}>
                        <AnimatedTouchable style={[styles.headerIconBtn, { backgroundColor: activeColors.successSoft }]} onPress={handleCall} activeOpacity={0.7}>
                            <AppIcon name="call" size={17} color={activeColors.success} />
                        </AnimatedTouchable>
                        <AnimatedTouchable style={[styles.headerIconBtn, { backgroundColor: activeColors.accentSoft }]} onPress={handleNavigate} activeOpacity={0.7}>
                            <AppIcon name="navigate" size={17} color={activeColors.tint} />
                        </AnimatedTouchable>
                    </View>
                </View>
            </View>

            {/* Remote Search Banner inside Chat */}
            {requestDetails?.searchMode === 'remote' && (
                <View style={[styles.remoteBanner, { backgroundColor: activeColors.dangerSoft, borderBottomColor: activeColors.border }]}>
                    <AppIcon name="location" size={18} color={activeColors.danger} style={styles.remoteBannerIcon} />
                    <View style={styles.remoteBannerText}>
                        <Text style={[styles.remoteBannerTitle, { color: activeColors.danger }]}>
                            Request for {requestDetails?.remotePatientName || 'Someone Else'}
                        </Text>
                        <Text style={[styles.remoteBannerSub, { color: activeColors.danger }]} numberOfLines={1}>
                            Deliver to: {requestDetails?.remoteAddress || 'Selected Location'}
                        </Text>
                    </View>
                </View>
            )}



            {/* ── Image Viewer Modal ───────────────────────────── */}
            <ImageViewing
                images={viewingImage ? [{ uri: viewingImage }] : []}
                imageIndex={0}
                visible={!!viewingImage}
                onRequestClose={() => setViewingImage(null)}
            />

            {/* ── Reaction Picker Modal ────────────────────────── */}
            <Modal visible={!!activeReactionMessageId} transparent animationType="fade">
                <AnimatedTouchable style={styles.modalOverlayDark} activeOpacity={1} onPress={() => setActiveReactionMessageId(null)}>
                    <View style={{ alignItems: 'center', gap: 16 }}>
                        <View style={[styles.reactionPickerContainer, { backgroundColor: activeColors.surface }]}>
                            {EMOJI_OPTIONS.map(emoji => (
                                <AnimatedTouchable key={emoji} style={[styles.reactionOption, { backgroundColor: activeColors.background }]} onPress={() => handleReaction(emoji)}>
                                    <Text style={styles.reactionOptionEmoji}>{emoji}</Text>
                                </AnimatedTouchable>
                            ))}
                        </View>
                        <AnimatedTouchable
                            style={[styles.replyModalBtn, { backgroundColor: activeColors.surface }]}
                            onPress={() => {
                                const msg = messages.find(m => m.id === activeReactionMessageId);
                                if (msg) setReplyingTo(msg);
                                setActiveReactionMessageId(null);
                            }}
                        >
                            <AppIcon name="arrow-undo" size={18} color={activeColors.text} />
                            <Text style={[styles.replyModalBtnText, { color: activeColors.text }]}>Reply</Text>
                        </AnimatedTouchable>
                    </View>
                </AnimatedTouchable>
            </Modal>

            {/* ── Messages + Input ─────────────────────────────── */}
            <KeyboardAvoidingView
                style={{ flex: 1, paddingBottom: Platform.OS === 'android' ? keyboardHeight : 0 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={0}
            >
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.messagesList}
                    inverted
                    onEndReached={loadEarlierMessages}
                    onEndReachedThreshold={0.3}
                    ListEmptyComponent={() => (
                        <View style={styles.emptyChat}>
                            <AppIcon name="chatbubbles-outline" size={48} color={activeColors.textMuted} style={{ opacity: 0.5 }} />
                            <Text style={[styles.emptyChatTitle, { color: activeColors.text }]}>Start the Conversation</Text>
                            <Text style={[styles.emptyChatSub, { color: activeColors.textMuted }]}>Send a message to {pharmacyName}</Text>
                        </View>
                    )}
                    ListHeaderComponent={() => isTyping ? (
                        <View style={styles.typingContainer}>
                            <View style={[styles.typingBubble, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
                                <Animated.View style={[styles.typingDot, { opacity: typingDot1, backgroundColor: activeColors.textMuted }]} />
                                <Animated.View style={[styles.typingDot, { opacity: typingDot2, backgroundColor: activeColors.textMuted }]} />
                                <Animated.View style={[styles.typingDot, { opacity: typingDot3, backgroundColor: activeColors.textMuted }]} />
                            </View>
                        </View>
                    ) : null}
                />

                {replyingTo && (
                    <View style={[styles.replyPreviewBar, { backgroundColor: activeColors.surface, borderTopColor: activeColors.border }]}>
                        <View style={[styles.replyPreviewLine, { backgroundColor: activeColors.tint }]} />
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.replyPreviewName, { color: activeColors.tint }]}>
                                Replying to {replyingTo.senderId === currentUser.uid ? 'yourself' : pharmacyName}
                            </Text>
                            <Text style={[styles.replyPreviewText, { color: activeColors.textMuted }]} numberOfLines={1}>
                                {replyingTo.text || 'Photo'}
                            </Text>
                        </View>
                        <AnimatedTouchable style={styles.replyPreviewClose} onPress={() => setReplyingTo(null)}>
                            <AppIcon name="close-circle" size={20} color={activeColors.textMuted} />
                        </AnimatedTouchable>
                    </View>
                )}

                {/* Quick Reply Chips */}
                {messages.filter(m => m.senderId === currentUser.uid).length < 3 && (
                    <View style={[styles.quickReplyRow, { borderTopColor: activeColors.border, backgroundColor: activeColors.surface }]}>
                        {['Is this available?', "What's the price?", 'Can you hold it?'].map((chip) => (
                            <AnimatedTouchable key={chip} style={[styles.quickReplyChip, { borderColor: activeColors.tintLight, backgroundColor: activeColors.tintSurface }]} onPress={async () => {
                                setNewMessage(chip);
                                // Auto-send the quick reply
                                try {
                                    const msgsRef = database().ref(`chats/${chatId}/messages`);
                                    await withRetry(async () => {
                                        await msgsRef.push({
                                            senderId: uid,
                                            text: chip,
                                            type: 'text',
                                            timestamp: database.ServerValue.TIMESTAMP,
                                        });
                                    });
                                    setNewMessage('');
                                } catch (e: any) {
                                    showToast('Failed to send message', 'error');
                                }
                            }} activeOpacity={0.7}>
                                <Text style={[styles.quickReplyText, { color: activeColors.tint }]}>{chip}</Text>
                            </AnimatedTouchable>
                        ))}
                    </View>
                )}

                <View style={{ overflow: 'hidden' }}>
                    <LinearGradient colors={colorScheme === 'dark' ? Gradients.heroDark : Gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2.5, zIndex: 1 }} />
                    <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12), backgroundColor: activeColors.surface, borderTopColor: activeColors.border }]}>
                    <AnimatedTouchable style={[styles.attachBtn, { backgroundColor: activeColors.tintSurface }]} onPress={handleAttachment} activeOpacity={0.7}>
                        <AppIcon name="add-circle" size={26} color={activeColors.tint} />
                    </AnimatedTouchable>
                    <TextInput
                        style={[styles.input, { borderColor: activeColors.border, color: activeColors.text, backgroundColor: activeColors.background }]}
                        value={newMessage}
                        onChangeText={handleTextChange}
                        placeholder="Type a message..."
                        placeholderTextColor={activeColors.textMuted}
                        multiline
                        returnKeyType="default"
                    />
                    <AnimatedTouchable
                        style={[styles.sendBtn, !newMessage.trim() && { backgroundColor: activeColors.border, elevation: 0 }, newMessage.trim() && { backgroundColor: activeColors.tint }]}
                        onPress={handleSendMessage}
                        disabled={!newMessage.trim()}
                        activeOpacity={0.8}
                    >
                        <AppIcon name="send" size={18} color={activeColors.white} />
                    </AnimatedTouchable>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // Header
    headerWrap: { overflow: 'hidden' },
    headerGradientLine: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3 },
    chatHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 14, ...Shadows.sm, zIndex: 10 },
    backBtn: { marginRight: 10, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    headerInfoArea: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    headerAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 10, borderWidth: 1.5 },
    avatarInitials: { fontFamily: 'Inter_800ExtraBold', fontSize: 14 },
    headerTextArea: { flex: 1, marginRight: 8 },
    headerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    headerName: { fontSize: 16, fontFamily: 'Inter_700Bold' },
    headerStatus: { fontSize: 12, fontFamily: 'Inter_600SemiBold', marginTop: 1 },
    headerActions: { flexDirection: 'row', gap: 8 },
    headerIconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    headerCallBtn: { width: 38, height: 38, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },

    // Remote Search Banner
    remoteBanner: { paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1 },
    remoteBannerIcon: { marginRight: 8 },
    remoteBannerText: { flex: 1 },
    remoteBannerTitle: { fontSize: 13, fontFamily: 'Inter_600SemiBold', marginBottom: 2 },
    remoteBannerSub: { fontSize: 12, fontFamily: 'Inter_500Medium', opacity: 0.8 },

    // Action Bar
    actionBar: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: Radius.md, borderWidth: 1.5 },
    actionBtnText: { fontSize: 13, fontFamily: 'Inter_700Bold' },
    actionBtnCall: { },
    actionBtnNav: { },
    actionBtnFound: { },

    // Messages
    messagesList: { padding: 16, paddingBottom: 8 },
    timeSeparator: { textAlign: 'center', fontSize: 11, marginVertical: 8, fontFamily: 'Inter_600SemiBold' },
    messageRow: { flexDirection: 'row', marginBottom: 6 },
    messageRowMe: { justifyContent: 'flex-end' },
    messageBubble: { maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
    myBubble: { borderBottomRightRadius: 4 },
    theirBubble: { borderBottomLeftRadius: 4, borderWidth: 1 },
    myBubbleWithReply: { borderTopRightRadius: 4, marginTop: -4 },
    theirBubbleWithReply: { borderTopLeftRadius: 4, marginTop: -4 },

    replyBubbleQuote: { borderRadius: 10, padding: 8, paddingLeft: 10, marginBottom: 8, flexDirection: 'row', overflow: 'hidden' },
    replyBubbleQuoteMe: { alignSelf: 'flex-end', minWidth: '50%' },
    replyBubbleQuoteTheir: { alignSelf: 'flex-start', minWidth: '50%' },
    replyQuoteLine: { width: 4, position: 'absolute', left: 0, top: 0, bottom: 0 },
    replyQuoteName: { fontSize: 12, fontFamily: 'Inter_700Bold', marginBottom: 2 },
    replyQuoteText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
    messageText: { fontSize: 15, lineHeight: 21, fontFamily: 'Inter_500Medium' },
    readReceipt: { fontSize: 10, textAlign: 'right', marginTop: 2 },
    readReceiptRead: { },
    imageBubble: { maxWidth: '70%', borderRadius: 14, overflow: 'hidden' },
    imageBubbleMe: { alignSelf: 'flex-end' },
    chatImage: { width: 200, height: 150, resizeMode: 'cover' },

    // PDF Bubble
    pdfBubble: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, maxWidth: '75%', gap: 10, borderWidth: 1 },
    pdfBubbleMe: { },
    pdfFileName: { fontSize: 13, fontFamily: 'Inter_700Bold', marginBottom: 2 },
    pdfFileNameMe: { },
    pdfFileSize: { fontSize: 11, fontFamily: 'Inter_500Medium' },
    pdfFileSizeMe: { },

    // Reaction Badge
    reactionBadge: { position: 'absolute', bottom: -8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 4, paddingVertical: 1 },
    reactionBadgeMe: { left: -4 },
    reactionBadgeTheir: { right: -4 },
    reactionText: { fontSize: 13 },

    systemMsg: { alignSelf: 'center', borderWidth: 1, borderRadius: 14, padding: 14, marginVertical: 8, alignItems: 'center', maxWidth: '85%' },
    systemMsgText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', marginBottom: 8 },
    systemBtn: { paddingVertical: 8, paddingHorizontal: 18, borderRadius: 10 },
    systemBtnText: { fontFamily: 'Inter_700Bold', fontSize: 13 },

    // Typing indicator
    typingContainer: { paddingHorizontal: 20, paddingVertical: 8, alignSelf: 'flex-start' },
    typingBubble: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, borderBottomLeftRadius: 4, borderWidth: 1, flexDirection: 'row', gap: 4, alignSelf: 'flex-start' },
    typingDot: { width: 8, height: 8, borderRadius: 4 },

    // Input Bar
    inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingTop: 10, borderTopWidth: 1, gap: 8 },
    attachBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    input: { flex: 1, minHeight: 42, maxHeight: 120, borderWidth: 1.5, borderRadius: 22, paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11, fontSize: 15, fontFamily: 'Inter_500Medium' },
    sendBtn: { width: 42, height: 42, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', ...Shadows.sm },
    sendBtnDisabled: { elevation: 0 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
    modalOverlayDark: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'center', alignItems: 'center' },
    closeModalBtn: { position: 'absolute', right: 20, zIndex: 10, padding: 10, flexDirection: 'row', alignItems: 'center' },

    // Reaction Picker
    reactionPickerContainer: { flexDirection: 'row', padding: 10, borderRadius: Radius.lg, gap: 8, ...Shadows.md },
    reactionOption: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
    reactionOptionEmoji: { fontSize: 24 },
    replyModalBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: Radius.lg, flexDirection: 'row', alignItems: 'center', gap: 8, ...Shadows.md },
    replyModalBtnText: { fontSize: 15, fontFamily: 'Inter_700Bold' },

    // Reply Preview
    replyPreviewBar: { paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1 },
    replyPreviewLine: { width: 4, borderRadius: 2, marginRight: 10, alignSelf: 'stretch' },
    replyPreviewName: { fontSize: 13, fontFamily: 'Inter_700Bold', marginBottom: 2 },
    replyPreviewText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
    replyPreviewClose: { padding: 4 },

    // Quick Reply Chips
    quickReplyRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, flexWrap: 'wrap' },
    quickReplyChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
    quickReplyText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },

    // Empty State
    emptyChat: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60, transform: [{ rotate: '180deg' }] },
    emptyChatTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', marginTop: 16 },
    emptyChatSub: { fontSize: 14, fontFamily: 'Inter_500Medium', marginTop: 4 },
});
