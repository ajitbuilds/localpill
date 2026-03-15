import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, Alert, Image, KeyboardAvoidingView, Platform, Modal, Animated, TouchableOpacity, Linking, Keyboard, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import database from '@react-native-firebase/database';
import auth from '@react-native-firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import firestore from '@react-native-firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import storage from '@react-native-firebase/storage';
import { AnimatedTouchable } from '../components/ui/AnimatedTouchable';
import * as Haptics from 'expo-haptics';
import { useColorScheme } from '../hooks/useColorScheme';
import { Colors } from '../constants/Colors';
import { isValidString } from '../utils/validation';
import { withRetry } from '../utils/retry';
import { compressImage } from '../utils/imageUtils';
import { Message } from '../types/chat';
import { useScreenTracking } from '../hooks/useScreenTracking';
import ImageViewing from "react-native-image-viewing";

const ImageWithFallback = React.memo(({ uri, style, borderRadius }: any) => {
    const [error, setError] = useState(false);
    if (error || !uri) {
        return (
            <View style={[style, { borderRadius, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' }]}>
                <Ionicons name="image-outline" size={32} color="#94A3B8" />
            </View>
        );
    }
    return <Image source={{ uri }} style={style} borderRadius={borderRadius} onError={() => setError(true)} />;
});

export default function ChatScreen() {
    const params = useLocalSearchParams();
    const id = params.id || params.requestId;
    const customerId = params.customerId || params.patientId;
    const initialPatientName = params.patientName;
    const router = useRouter();
    useScreenTracking('ChatScreen');

    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [patientName, setPatientName] = useState(typeof initialPatientName === 'string' ? initialPatientName : 'Patient');
    const [patientPhone, setPatientPhone] = useState('');
    const [loading, setLoading] = useState(true);
    const [requestData, setRequestData] = useState<any>(null);
    const [showPrescription, setShowPrescription] = useState(false);
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [isCompleting, setIsCompleting] = useState(false);
    const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);

    // Feature states
    const [isTyping, setIsTyping] = useState(false);
    const [isCustomerOnline, setIsCustomerOnline] = useState(false);
    const [customerLastSeen, setCustomerLastSeen] = useState<number | null>(null);
    const [viewingImage, setViewingImage] = useState<string | null>(null);
    const [activeReactionMessageId, setActiveReactionMessageId] = useState<string | null>(null);
    const [replyingTo, setReplyingTo] = useState<any>(null);

    const EMOJI_OPTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const [uid, setUid] = useState(auth().currentUser?.uid);
    const flatListRef = useRef<FlatList<any>>(null);
    const typingTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const [loadingEarlier, setLoadingEarlier] = useState(false);
    const [hasEarlierMessages, setHasEarlierMessages] = useState(true);
    const oldestKeyRef = useRef<string | null>(null);
    const PAGE_SIZE = 30;

    useEffect(() => {
        const unsubscribe = auth().onAuthStateChanged(user => {
            if (user) setUid(user.uid);
        });
        return unsubscribe;
    }, []);

    const typingDot1 = useRef(new Animated.Value(0)).current;
    const typingDot2 = useRef(new Animated.Value(0)).current;
    const typingDot3 = useRef(new Animated.Value(0)).current;

    // Chat ID derivation
    const requestId = typeof id === 'string' ? id : (id?.[0] ?? '');
    const chatId = `${requestId}_${uid}`;

    useEffect(() => {
        if (!uid || !chatId || !requestId) return;

        // Fetch patient details
        const fetchDetails = async () => {
            try {
                const reqDoc = await firestore().collection('medicineRequests').doc(requestId).get();
                if (reqDoc.exists()) {
                    const data = reqDoc.data();
                    setRequestData(data);

                    // Priority: Remote Name (if remote mode) -> User Name -> Initial Param -> "Patient"
                    let resolvedName = initialPatientName;
                    if (data?.searchMode === 'remote' && data?.remotePatientName) {
                        resolvedName = data.remotePatientName;
                    } else if (data?.patientName) {
                        resolvedName = data.patientName;
                    }

                    if (resolvedName) setPatientName(String(resolvedName));
                    if (data?.patientPhone) setPatientPhone(data.patientPhone);
                }
            } catch (error) {
                console.error('Error fetching request data:', error);
            }
        };
        fetchDetails();

        // 1. Presence setup
        const myPresenceRef = database().ref(`chatMembers/${chatId}/${uid}`);
        myPresenceRef.set(true);
        myPresenceRef.onDisconnect().set(database.ServerValue.TIMESTAMP);

        const customerIdSafe = typeof customerId === 'string' ? customerId : (customerId?.[0] ?? '');

        let customerPresenceRef: any;
        let handleCustomerPresence: any;
        let typingRef: any;
        let handleTyping: any;

        if (customerIdSafe) {
            // Read customer status from global 'status' node where they write it
            customerPresenceRef = database().ref(`status/${customerIdSafe}`);
            handleCustomerPresence = customerPresenceRef.on('value', (snap: any) => {
                const val = snap.val();
                if (val) {
                    setIsCustomerOnline(!!val.isOnline);
                    setCustomerLastSeen(val.lastSeen || null);
                } else {
                    setIsCustomerOnline(false);
                }
            });

            // 2. Typing indicator setup
            typingRef = database().ref(`chats/${chatId}/typing/${customerIdSafe}`);
            handleTyping = typingRef.on('value', (snap: any) => {
                setIsTyping(!!snap.val());
            });
        }

        return () => {
            myPresenceRef.set(database.ServerValue.TIMESTAMP);
            if (customerPresenceRef && handleCustomerPresence) {
                customerPresenceRef.off('value', handleCustomerPresence);
            }
            if (typingRef && handleTyping) {
                typingRef.off('value', handleTyping);
            }
        };
    }, [uid, chatId, requestId, customerId]);

    useEffect(() => {
        if (!chatId) {
            setLoading(false);
            return;
        }
        // 3. Messages setup (paginated — latest PAGE_SIZE messages)
        const msgsRef = database().ref(`chats/${chatId}/messages`);
        const handleMessages = msgsRef.orderByKey().limitToLast(PAGE_SIZE).on('value', snap => {
            const msgs: any[] = [];
            snap.forEach(child => {
                const val = child.val();
                if (val && typeof val === 'object' && val.senderId) {
                    msgs.push({ id: child.key, ...val });

                    // Mark as read if from customer
                    if (val.senderId !== uid && val.senderType !== 'pharmacy' && val.status !== 'read') {
                        database().ref(`chats/${chatId}/messages/${child.key}`).update({ status: 'read' });
                    }
                }
                return undefined;
            });
            // Track oldest key for pagination
            if (msgs.length > 0) {
                oldestKeyRef.current = msgs[0].id;
            }
            setHasEarlierMessages(msgs.length >= PAGE_SIZE);
            setMessages(msgs.reverse()); // Reverse for inverted FlatList
            setLoading(false);
        });

        return () => {
            msgsRef.off('value', handleMessages);
            if (typingTimeout.current) clearTimeout(typingTimeout.current);
        };
    }, [chatId, uid]);

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
                setMessages(prev => [...prev, ...older.reverse()]);
            }
        } catch (err) {
            console.error('Error loading earlier messages:', err);
        } finally {
            setLoadingEarlier(false);
        }
    };

    // Format typing animation
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

    const handleTextChange = (text: string) => {
        setInputText(text);
        if (uid && chatId) {
            if (!typingTimeout.current) {
                database().ref(`chats/${chatId}/typing/${uid}`).set(true).catch(() => { });
            }
            if (typingTimeout.current) {
                clearTimeout(typingTimeout.current);
            }
            typingTimeout.current = setTimeout(() => {
                database().ref(`chats/${chatId}/typing/${uid}`).set(false).catch(() => { });
                typingTimeout.current = undefined;
            }, 3000);
        }
    };

    const sendMessage = async (text?: string, type: 'text' | 'image' | 'document' | 'prescription_request' = 'text', fileData?: any) => {
        if (type === 'text' && !isValidString(text)) return;

        const messageText = text?.trim();
        setInputText('');

        try {
            const msgsRef = database().ref(`chats/${chatId}/messages`);
            const payload: any = {
                senderId: uid,
                senderType: 'pharmacy',
                type: type,
                timestamp: database.ServerValue.TIMESTAMP,
                status: 'sent',
                ...(replyingTo ? { replyTo: replyingTo.id, replyText: replyingTo.text } : {}),
            };

            if (type === 'text') payload.text = messageText;
            if (type === 'image') payload.imageUri = fileData?.url;
            if (type === 'document') {
                payload.documentUrl = fileData?.url;
                payload.documentName = fileData?.name;
            }
            if (type === 'prescription_request') payload.text = '📋 Pharmacy requested your prescription';

            await withRetry(async () => {
                await msgsRef.push(payload);
            });
            setReplyingTo(null);

        } catch (error) {
            console.error('Send error:', error);
            Alert.alert('Error', 'Failed to send message.');
        }

        database().ref(`chats/${chatId}/typing/${uid}`).set(false).catch(() => { });
    };

    const handleAttachment = () => {
        Keyboard.dismiss();
        Alert.alert('Attach', 'Choose file type', [
            { text: 'Photo', onPress: pickImage },
            { text: 'Document', onPress: pickDocument },
            { text: 'Request Prescription', onPress: () => sendMessage(undefined, 'prescription_request') },
            { text: 'Cancel', style: 'cancel' }
        ]);
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
        if (!result.canceled && result.assets[0].uri) {
            const file = result.assets[0];
            if (file.fileSize && file.fileSize > 5 * 1024 * 1024) {
                Alert.alert("File Too Large", "Please select an image smaller than 5MB.");
                return;
            }
            uploadFile(file.uri, 'image', 'chat_image.jpg');
        }
    };

    const pickDocument = async () => {
        const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf'], copyToCacheDirectory: true });
        if (!result.canceled && result.assets[0].uri) {
            const file = result.assets[0];
            if (file.size && file.size > 5 * 1024 * 1024) {
                Alert.alert("File Too Large", "Please select a document smaller than 5MB.");
                return;
            }
            uploadFile(file.uri, 'document', file.name.replace(/\s+/g, '_'));
        }
    };

    const uploadFile = async (uri: string, type: 'image' | 'document', filename: string) => {
        setLoading(true);
        try {
            // Build Storage path
            const uploadUri = type === 'image' ? await compressImage(uri) : uri;
            const fileRef = storage().ref(`chats/${chatId}/${Date.now()}_${filename}`);
            await withRetry(async () => await fileRef.putFile(uploadUri));
            const downloadUrl = await withRetry(async () => await fileRef.getDownloadURL());
            await sendMessage(undefined, type, { url: downloadUrl, name: filename });
        } catch (error) {
            console.error('Upload error:', error);
            Alert.alert('Error', `Failed to attach ${type}.`);
        } finally {
            setLoading(false);
        }
    };

    const handleCall = () => {
        if (patientPhone) {
            Linking.openURL(`tel:${patientPhone}`).catch(() => Alert.alert('Error', 'Cannot make a call.'));
        } else {
            Alert.alert('Info', 'Phone number not available.');
        }
    };

    const handleReaction = async (emoji: string) => {
        if (!activeReactionMessageId) return;
        await withRetry(async () => await database().ref(`chats/${chatId}/messages/${activeReactionMessageId}`).update({ reaction: emoji }));
        setActiveReactionMessageId(null);
    };

    // Web App Port: Complete Request Workflow
    const handleCompleteRequest = () => {
        setShowCompleteModal(true);
    };

    const confirmCompleteRequest = async () => {
        if (!requestId || isCompleting) return;
        setIsCompleting(true);
        try {
            await withRetry(async () => await firestore().collection('medicineRequests').doc(requestId).update({
                status: 'closed',
                matchedPharmacyId: uid,
                closedAt: firestore.FieldValue.serverTimestamp(),
            }));

            // Send system message to chat
            const msgsRef = database().ref(`chats/${chatId}/messages`);
            await withRetry(async () => await msgsRef.push({
                senderId: uid,
                senderType: 'pharmacy',
                type: 'text',
                text: '✅ Order completed by pharmacy.',
                timestamp: database.ServerValue.TIMESTAMP,
                system: true
            }));

            setShowCompleteModal(false);
            Alert.alert('Success', 'Request marked as completed/closed.');
        } catch (error) {
            console.error('Error completing request:', error);
            Alert.alert('Error', 'Failed to complete request.');
        } finally {
            setIsCompleting(false);
        }
    };

    const renderLastSeen = () => {
        if (isCustomerOnline) return 'Online';
        if (customerLastSeen) {
            const d = new Date(customerLastSeen);
            const now = new Date();
            if (d.toDateString() === now.toDateString()) {
                return `Last seen today at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            }
            return `Last seen ${d.toLocaleDateString()}`;
        }
        return 'Offline';
    };

    const formatTime = (ts: number | undefined) => {
        if (!ts) return '';
        const d = new Date(ts);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'sent': return '✓';
            case 'delivered': return '✓✓';
            case 'read': return '✓✓';
            default: return '✓';
        }
    };

    const renderMessage = ({ item, index }: { item: any; index: number }) => {
        const isMine = item.senderId === uid || item.senderType === 'pharmacy';

        const showTimeSeparator = index === messages.length - 1 ||
            (messages[index + 1] && new Date(item.timestamp).getMinutes() !== new Date(messages[index + 1].timestamp).getMinutes());

        const replyOrigMsg = item.replyTo ? messages.find(m => m.id === item.replyTo) : null;

        return (
            <View>
                {showTimeSeparator && <Text style={styles.timeSeparator}>{formatTime(item.timestamp)}</Text>}

                {item.type === 'prescription_request' ? (
                    <View style={styles.systemMsg}>
                        <Text style={styles.systemMsgText}>📋 You requested a prescription</Text>
                    </View>
                ) : item.type === 'call_request' ? (
                    <View style={styles.systemMsg}>
                        <Text style={styles.systemMsgText}>📞 Call requested</Text>
                    </View>
                ) : item.type === 'image' ? (
                    <AnimatedTouchable
                        style={[styles.messageRow, isMine && styles.messageRowMe]}
                        onPress={() => setViewingImage(item.imageUri || item.image)}
                        onLongPress={() => { Haptics.selectionAsync(); setActiveReactionMessageId(item.id); }}
                    >
                        <View style={[styles.imageBubble, isMine && styles.myBubble]}>
                            <ImageWithFallback uri={item.imageUri || item.image} style={styles.chatImage} borderRadius={10} />
                            {isMine && <Text style={[styles.readReceipt, item.status === 'read' && styles.readReceiptRead]}>{getStatusIcon(item.status)}</Text>}
                            {!!item.reaction && (
                                <View style={[styles.reactionBadge, isMine ? styles.reactionBadgeMe : styles.reactionBadgeTheir]}>
                                    <Text style={styles.reactionText}>{item.reaction}</Text>
                                </View>
                            )}
                        </View>
                    </AnimatedTouchable>
                ) : item.type === 'document' ? (
                    <AnimatedTouchable
                        style={[styles.messageRow, isMine && styles.messageRowMe]}
                        onPress={() => { if (item.documentUrl) Linking.openURL(item.documentUrl).catch(() => Alert.alert('Error', 'Cannot open document.')); }}
                        onLongPress={() => { Haptics.selectionAsync(); setActiveReactionMessageId(item.id); }}
                    >
                        <View style={[styles.pdfBubble, isMine ? { backgroundColor: colors.primary, borderColor: colors.primary } : { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <Ionicons name="document-text" size={32} color={isMine ? colors.background : colors.danger} />
                            <View style={{ flex: 1, marginLeft: 8 }}>
                                <Text style={[styles.pdfFileName, { color: isMine ? colors.background : colors.text }]} numberOfLines={1}>{item.documentName || 'Document.pdf'}</Text>
                                <Text style={[styles.pdfFileSize, { color: isMine ? 'rgba(255,255,255,0.7)' : colors.textSecondary }]}>PDF Document</Text>
                            </View>
                            {isMine && <Text style={[styles.readReceipt, item.status === 'read' && { color: '#A5B4FC' }]}>{getStatusIcon(item.status)}</Text>}
                            {!!item.reaction && (
                                <View style={[styles.reactionBadge, isMine ? styles.reactionBadgeMe : styles.reactionBadgeTheir, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                    <Text style={styles.reactionText}>{item.reaction}</Text>
                                </View>
                            )}
                        </View>
                    </AnimatedTouchable>
                ) : (
                    <View style={[styles.messageRow, isMine && styles.messageRowMe]}>
                        <View style={{ alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                            {!!replyOrigMsg && (
                                <View style={[styles.replyBubbleQuote, isMine ? styles.replyBubbleQuoteMe : styles.replyBubbleQuoteTheir]}>
                                    <View style={styles.replyQuoteLine} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.replyQuoteName}>{replyOrigMsg.senderId === uid ? 'You' : patientName}</Text>
                                        <Text style={styles.replyQuoteText} numberOfLines={1}>{replyOrigMsg.text || 'Attachment'}</Text>
                                    </View>
                                </View>
                            )}
                            <AnimatedTouchable
                                style={[
                                    styles.messageBubble,
                                    isMine ? { backgroundColor: colors.primary } : { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
                                    isMine ? styles.myBubble : styles.theirBubble,
                                    replyOrigMsg && (isMine ? styles.myBubbleWithReply : styles.theirBubbleWithReply)
                                ]}
                                onLongPress={() => { Haptics.selectionAsync(); setActiveReactionMessageId(item.id); }}
                            >
                                <Text style={[styles.messageText, { color: isMine ? '#FFFFFF' : colors.text }]}>{item.text}</Text>
                                {isMine && <Text style={[styles.readReceipt, item.status === 'read' && { color: '#A5B4FC' }]}>{getStatusIcon(item.status)}</Text>}
                                {!!item.reaction && (
                                    <View style={[styles.reactionBadge, isMine ? styles.reactionBadgeMe : styles.reactionBadgeTheir, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                        <Text style={styles.reactionText}>{item.reaction}</Text>
                                    </View>
                                )}
                            </AnimatedTouchable>
                        </View>
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <AnimatedTouchable onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </AnimatedTouchable>

                <TouchableOpacity
                    onPress={() => setIsProfileModalVisible(true)}
                    activeOpacity={0.7}
                    style={styles.headerAvatarContainer}
                >
                    {requestData?.prescription ? (
                        <Image
                            source={{ uri: requestData.prescription }}
                            style={styles.headerAvatar}
                        />
                    ) : (
                        <View style={[styles.headerAvatar, { backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' }]}>
                            <Text style={styles.headerAvatarText}>{patientName.charAt(0)}</Text>
                        </View>
                    )}
                </TouchableOpacity>

                <AnimatedTouchable
                    onPress={() => router.push({
                        pathname: '/customer-profile',
                        params: {
                            userId: customerId,
                            requestId: requestId,
                            patientName: patientName
                        }
                    })}
                    style={styles.headerInfo}
                >
                    <Text style={[styles.patientName, { color: colors.text }]} numberOfLines={1}>{patientName}</Text>
                    <Text style={[styles.statusText, { color: isTyping ? colors.primary : colors.success }]}>
                        {isTyping ? 'typing...' : renderLastSeen()}
                    </Text>
                </AnimatedTouchable>

                <View style={styles.headerActions}>
                    {!!patientPhone && (
                        <AnimatedTouchable onPress={handleCall} style={[styles.headerCallBtn, { backgroundColor: colors.primaryLight }]}>
                            <Ionicons name="call" size={20} color={colors.success} />
                        </AnimatedTouchable>
                    )}

                    <AnimatedTouchable onPress={handleCompleteRequest} style={[styles.completeBtn, { backgroundColor: colors.success + '20' }]}>
                        <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                    </AnimatedTouchable>

                    {!!requestData?.prescription && (
                        <AnimatedTouchable onPress={() => setShowPrescription(true)} style={[styles.prescriptionButton, { backgroundColor: colors.primaryLight }]}>
                            <Ionicons name="document-text" size={20} color={colors.success} />
                        </AnimatedTouchable>
                    )}
                </View>
            </View>

            {loading && messages.length === 0 ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
                    style={{ flex: 1 }}
                >
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        renderItem={renderMessage}
                        keyExtractor={item => item.id}
                        inverted
                        contentContainerStyle={styles.messageList}
                        keyboardShouldPersistTaps="handled"
                        onEndReached={loadEarlierMessages}
                        onEndReachedThreshold={0.3}
                        ListFooterComponent={
                            loadingEarlier ? (
                                <View style={{ padding: 12, alignItems: 'center' }}>
                                    <ActivityIndicator size="small" />
                                </View>
                            ) : null
                        }
                        ListHeaderComponent={
                            isTyping ? (
                                <View style={styles.typingContainer}>
                                    <View style={[styles.theirBubble, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                        <View style={{ flexDirection: 'row', gap: 4, padding: 8 }}>
                                            <Animated.View style={[styles.typingDot, { backgroundColor: colors.primary, opacity: typingDot1 }]} />
                                            <Animated.View style={[styles.typingDot, { backgroundColor: colors.primary, opacity: typingDot2 }]} />
                                            <Animated.View style={[styles.typingDot, { backgroundColor: colors.primary, opacity: typingDot3 }]} />
                                        </View>
                                    </View>
                                </View>
                            ) : null
                        }
                    />

                    {!!replyingTo && (
                        <View style={styles.replyPreviewBar}>
                            <View style={styles.replyPreviewLine} />
                            <View style={{ flex: 1, marginRight: 10 }}>
                                <Text style={styles.replyPreviewName}>Replying to {replyingTo.senderId === uid ? 'Yourself' : patientName}</Text>
                                <Text style={styles.replyPreviewText} numberOfLines={1}>{replyingTo.text || 'Attachment'}</Text>
                            </View>
                            <AnimatedTouchable style={styles.replyPreviewClose} onPress={() => setReplyingTo(null)}>
                                <Ionicons name="close-circle" size={20} color="#94A3B8" />
                            </AnimatedTouchable>
                        </View>
                    )}

                    <View style={styles.inputArea}>
                        <AnimatedTouchable onPress={handleAttachment} style={styles.attachButton}>
                            <Ionicons name="add-circle" size={26} color="#6B7280" />
                        </AnimatedTouchable>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                            placeholder="Type a message..."
                            placeholderTextColor={colors.textMuted}
                            value={inputText}
                            onChangeText={handleTextChange}
                            multiline
                        />
                        <AnimatedTouchable
                            onPress={() => sendMessage(inputText)}
                            style={[styles.sendButton, { backgroundColor: colors.primary }, !inputText.trim() && { backgroundColor: colors.border }]}
                            disabled={!inputText.trim()}
                        >
                            <Ionicons name="send" size={18} color="#FFFFFF" />
                        </AnimatedTouchable>
                    </View>
                </KeyboardAvoidingView>
            )}

            {/* View Image Modal */}
            <ImageViewing
                images={viewingImage ? [{ uri: viewingImage }] : []}
                imageIndex={0}
                visible={!!viewingImage}
                onRequestClose={() => setViewingImage(null)}
            />

            {/* Reaction Modal */}
            <Modal visible={!!activeReactionMessageId} transparent animationType="fade">
                <TouchableOpacity style={styles.modalOverlayDark} activeOpacity={1} onPress={() => setActiveReactionMessageId(null)}>
                    <View style={{ alignItems: 'center', gap: 16 }}>
                        <View style={[styles.reactionPickerContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            {EMOJI_OPTIONS.map(emoji => (
                                <AnimatedTouchable key={emoji} style={styles.reactionOption} onPress={() => handleReaction(emoji)}>
                                    <Text style={styles.reactionOptionEmoji}>{emoji}</Text>
                                </AnimatedTouchable>
                            ))}
                        </View>
                        <AnimatedTouchable
                            style={[styles.replyModalBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                            onPress={() => {
                                const msg = messages.find(m => m.id === activeReactionMessageId);
                                if (msg) setReplyingTo(msg);
                                setActiveReactionMessageId(null);
                            }}
                        >
                            <Ionicons name="arrow-undo" size={18} color={colors.text} />
                            <Text style={[styles.replyModalBtnText, { color: colors.text }]}>Reply</Text>
                        </AnimatedTouchable>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Original Prescription Modal */}
            <ImageViewing
                images={requestData?.prescription ? [{ uri: requestData?.prescription }] : []}
                imageIndex={0}
                visible={showPrescription}
                onRequestClose={() => setShowPrescription(false)}
            />

            {/* Port: Complete Confirmation Modal */}
            <Modal visible={showCompleteModal} transparent animationType="slide">
                <View style={styles.modalOverlayDark}>
                    <View style={[styles.completeModalContent, { backgroundColor: colors.surface }]}>
                        <View style={[styles.iconCircle, { backgroundColor: colors.success + '20' }]}>
                            <Ionicons name="checkmark-done" size={32} color={colors.success} />
                        </View>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Mark as Complete?</Text>
                        <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
                            This will close the request and notify the customer that the order is completed.
                        </Text>
                        <View style={styles.modalActionRow}>
                            <TouchableOpacity
                                style={[styles.modalBtn, { backgroundColor: colors.border }]}
                                onPress={() => setShowCompleteModal(false)}
                            >
                                <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalBtn, { backgroundColor: colors.success }]}
                                onPress={confirmCompleteRequest}
                                disabled={isCompleting}
                            >
                                {isCompleting ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <Text style={[styles.modalBtnText, { color: '#FFF' }]}>Confirm</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* WhatsApp-style Profile Preview Modal */}
            <Modal
                visible={isProfileModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setIsProfileModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlayDark}
                    activeOpacity={1}
                    onPress={() => setIsProfileModalVisible(false)}
                >
                    <Animated.View style={[styles.profilePreviewContainer, { backgroundColor: colors.surface }]}>
                        <TouchableOpacity
                            activeOpacity={0.9}
                            style={styles.profilePreviewImageContainer}
                            onPress={() => {
                                setIsProfileModalVisible(false);
                                if (requestData?.prescription) setShowPrescription(true);
                            }}
                        >
                            {requestData?.prescription ? (
                                <Image source={{ uri: requestData.prescription }} style={styles.profilePreviewImage} />
                            ) : (
                                <View style={[styles.profilePreviewImage, { backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' }]}>
                                    <Text style={styles.profilePreviewInitials}>{patientName.charAt(0)}</Text>
                                </View>
                            )}
                            <View style={styles.profilePreviewNameBar}>
                                <Text style={styles.profilePreviewName}>{patientName}</Text>
                            </View>
                        </TouchableOpacity>

                        <View style={styles.profilePreviewActions}>
                            <TouchableOpacity
                                style={styles.profilePreviewActionBtn}
                                onPress={() => setIsProfileModalVisible(false)}
                            >
                                <Ionicons name="chatbubble" size={24} color={colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.profilePreviewActionBtn}
                                onPress={() => {
                                    setIsProfileModalVisible(false);
                                    handleCall();
                                }}
                            >
                                <Ionicons name="call" size={24} color={colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.profilePreviewActionBtn}
                                onPress={() => {
                                    setIsProfileModalVisible(false);
                                    router.push({
                                        pathname: '/customer-profile',
                                        params: {
                                            userId: customerId,
                                            requestId: requestId,
                                            patientName: patientName
                                        }
                                    });
                                }}
                            >
                                <Ionicons name="information-circle-outline" size={28} color={colors.primary} />
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
    backButton: { padding: 4 },
    headerAvatarContainer: { marginLeft: 12 },
    headerAvatar: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden' },
    headerAvatarText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
    headerInfo: { flex: 1, marginLeft: 10 },
    patientName: { fontSize: 18, fontWeight: '700' },
    statusText: { fontSize: 12, fontWeight: '600', marginTop: 2 },
    headerActions: { flexDirection: 'row', alignItems: 'center' },
    headerCallBtn: { padding: 8, borderRadius: 12 },
    completeBtn: { padding: 8, borderRadius: 12, marginLeft: 4 },
    prescriptionButton: { padding: 8, borderRadius: 12, marginLeft: 4 },
    messageList: { padding: 16, paddingBottom: 20 },
    messageRow: { marginBottom: 16, flexDirection: 'row', width: '100%', alignItems: 'flex-end', justifyContent: 'flex-start' },
    messageRowMe: { justifyContent: 'flex-end' },
    messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 18, position: 'relative' },
    myBubble: { borderBottomRightRadius: 4 },
    theirBubble: { borderBottomLeftRadius: 4 },
    myBubbleWithReply: { borderTopRightRadius: 4 },
    theirBubbleWithReply: { borderTopLeftRadius: 4 },
    messageText: { fontSize: 15, lineHeight: 21, fontFamily: 'Inter_500Medium' },
    myText: { color: '#FFFFFF' },
    imageBubble: { maxWidth: '75%', position: 'relative' },
    chatImage: { width: 220, height: 220 },
    pdfBubble: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, maxWidth: '80%', borderWidth: 1 },
    pdfFileName: { fontSize: 14, fontWeight: '600' },
    pdfFileSize: { fontSize: 12, marginTop: 2 },
    timeSeparator: { textAlign: 'center', color: '#94A3B8', fontSize: 12, fontWeight: '500', marginVertical: 12 },
    systemMsg: { backgroundColor: 'rgba(0,0,0,0.05)', alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16, marginVertical: 8 },
    systemMsgText: { color: '#64748B', fontSize: 13, fontWeight: '600' },
    reactionBadge: { position: 'absolute', bottom: -12, borderRadius: 12, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
    reactionBadgeMe: { right: 8 },
    reactionBadgeTheir: { right: -8 },
    reactionText: { fontSize: 12 },
    readReceipt: { fontSize: 10, color: 'rgba(255,255,255,0.6)', alignSelf: 'flex-end', marginTop: 4 },
    readReceiptRead: { color: '#A5B4FC' },
    replyBubbleQuote: { borderRadius: 12, padding: 8, marginBottom: 4, flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
    replyBubbleQuoteMe: { backgroundColor: 'rgba(16, 185, 129, 0.1)' },
    replyBubbleQuoteTheir: { backgroundColor: '#F8FAFC' },
    replyQuoteLine: { width: 3, backgroundColor: '#10B981', borderRadius: 2, alignSelf: 'stretch', marginRight: 8 },
    replyQuoteName: { fontSize: 12, fontWeight: '600', color: '#10B981', marginBottom: 2 },
    replyQuoteText: { fontSize: 13, color: '#475569' },
    replyPreviewBar: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#F8FAFC', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
    replyPreviewLine: { width: 4, backgroundColor: '#10B981', alignSelf: 'stretch', borderRadius: 2, marginRight: 10 },
    replyPreviewName: { fontSize: 12, fontWeight: '700', color: '#10B981', marginBottom: 2 },
    replyPreviewText: { fontSize: 13, color: '#64748B' },
    replyPreviewClose: { padding: 4 },
    typingContainer: { alignSelf: 'flex-start', marginBottom: 12 },
    typingDot: { width: 6, height: 6, borderRadius: 3 },
    inputArea: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, borderTopWidth: 1 },
    attachButton: { padding: 8, marginBottom: 2 },
    input: { flex: 1, borderWidth: 1.5, borderRadius: 22, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, marginHorizontal: 8, minHeight: 42, maxHeight: 120, fontSize: 15 },
    sendButton: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
    disabledSend: { backgroundColor: '#CBD5E1' },
    modalOverlayDark: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
    closeModal: { position: 'absolute', top: 60, right: 20, zIndex: 1 },
    fullPrescription: { width: '95%', height: '80%' },
    reactionPickerContainer: { flexDirection: 'row', padding: 12, borderRadius: 30, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
    reactionOption: { transform: [{ scale: 1.2 }] },
    reactionOptionEmoji: { fontSize: 24 },
    replyModalBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20, gap: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
    replyModalBtnText: { fontSize: 16, fontWeight: '600' },
    completeModalContent: { width: '85%', padding: 24, borderRadius: 24, alignItems: 'center' },
    iconCircle: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
    modalSub: { fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
    modalActionRow: { flexDirection: 'row', gap: 12 },
    modalBtn: { flex: 1, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    modalBtnText: { fontSize: 16, fontWeight: '700' },
    profilePreviewContainer: { width: 280, borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 15 },
    profilePreviewImageContainer: { width: 280, height: 280 },
    profilePreviewImage: { width: '100%', height: '100%' },
    profilePreviewInitials: { fontSize: 80, color: '#FFF', fontWeight: 'bold' },
    profilePreviewNameBar: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.2)', padding: 10 },
    profilePreviewName: { color: '#FFF', fontSize: 18, fontWeight: '600' },
    profilePreviewActions: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 12 },
    profilePreviewActionBtn: { padding: 8 },
});
