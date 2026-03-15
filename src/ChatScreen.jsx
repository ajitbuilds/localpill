import React, { useState, useEffect, useRef, useCallback } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue, push, set, serverTimestamp as rtdbServerTimestamp } from 'firebase/database';
import { auth, db, rtdb } from './firebase';
import Lightbox from './components/Lightbox';
import BottomSheet from './components/BottomSheet';
import { useHaptic } from './hooks/useHaptic';

import { ChatMessage } from './components/chat/ChatMessage';
import { ChatHeader } from './components/chat/ChatHeader';
import { ChatInputBar } from './components/chat/ChatInputBar';
import { useToast } from './components/Toast';

const EMOJIS = ['👍', '❤️', '😂', '😮', '🙏', '💯'];

const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDateLabel = (timestamp) => {
    if (!timestamp) return '';
    const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = (now - d) / (1000 * 60 * 60 * 24);
    if (diff < 1) return 'Today';
    if (diff < 2) return 'Yesterday';
    return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
};
export default function ChatScreen({ requestId, pharmacyId, pharmacyName, onBack }) {
    const triggerHaptic = useHaptic();
    const toast = useToast();

    // UI state([]);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pharmacyData, setPharmacyData] = useState(null);
    const [patientData, setPatientData] = useState(null);
    const [resolvedChatTitle, setResolvedChatTitle] = useState('');
    const [partnerStatus, setPartnerStatus] = useState({ online: false, lastSeen: null });
    const [chatPartnerId, setChatPartnerId] = useState(null);
    const [isPartnerTyping, setIsPartnerTyping] = useState(false);
    const [partnerLastRead, setPartnerLastRead] = useState(null);
    const [reactions, setReactions] = useState({});
    const [reactionPickerFor, setReactionPickerFor] = useState(null);
    const [replyingTo, setReplyingTo] = useState(null);
    const [lightboxSrc, setLightboxSrc] = useState(null); // Issue #32: Lightbox state
    const [showAttachMenu, setShowAttachMenu] = useState(false); // Issue #33: Attachment tray state
    const haptic = useHaptic();
    const [inputHeight, setInputHeight] = useState(0);
    const [authReady, setAuthReady] = useState(!!auth.currentUser);
    const [isMember, setIsMember] = useState(false); // Fix #6: wait for membership
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [isUploading, setIsUploading] = useState(false); // MISS-02 fix

    const typingTimeoutRef = useRef(null);
    const longPressTimerRef = useRef(null);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const inputBarRef = useRef(null);
    const currentUser = auth.currentUser;
    const chatId = `${requestId}_${pharmacyId}`;
    const isPharmacy = currentUser?.uid === pharmacyId;

    // ── Wait for Firebase auth before connecting to RTDB ──
    useEffect(() => {
        if (auth.currentUser) { setAuthReady(true); return; } // already resolved
        const unsub = onAuthStateChanged(auth, (user) => {
            if (user) setAuthReady(true);
            else setError('Please log in to access chat.');
        });
        return () => unsub();
    }, []);

    // ── Lock scroll on body when chat is open ──
    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        document.body.classList.add('chat-open');
        return () => {
            document.body.style.overflow = prev;
            document.body.classList.remove('chat-open');
        };
    }, []);

    // ── Keyboard-aware layout using visualViewport ──
    useEffect(() => {
        const vv = window.visualViewport;
        if (!vv) return;

        const handleResize = () => {
            const keyboardOffset = window.innerHeight - vv.height - vv.offsetTop;
            setInputHeight(Math.max(0, keyboardOffset));
            // Scroll to bottom when keyboard opens
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        };

        vv.addEventListener('resize', handleResize);
        vv.addEventListener('scroll', handleResize);
        return () => {
            vv.removeEventListener('resize', handleResize);
            vv.removeEventListener('scroll', handleResize);
        };
    }, []);

    useEffect(() => {
        // BUG-R-03 fix: wait for auth before running — prevents double read
        // (once with no user on mount, once after auth resolves)
        if (!authReady) return;
        if (!requestId || !pharmacyId) return;
        let isMounted = true;

        // BUG-NEW-02 fix: use onSnapshot for patientData so "Found" button
        // hides correctly if request is matched/closed while chat is open.
        const fetchPharmacy = async () => {
            const docSnap = await getDoc(doc(db, 'pharmacies', pharmacyId));
            if (!isMounted) return;
            if (docSnap.exists()) setPharmacyData(docSnap.data());
        };
        fetchPharmacy();

        const unsubReq = onSnapshot(doc(db, 'medicineRequests', requestId), async (reqSnap) => {
            if (!isMounted || !reqSnap.exists()) return;
            const reqData = reqSnap.data();
            setPatientData(reqData);

            if (currentUser && currentUser.uid === pharmacyId) {
                let pName = reqData.patientName;
                if (!pName && reqData.userId) {
                    try {
                        const userDoc = await getDoc(doc(db, 'users', reqData.userId));
                        if (isMounted && userDoc.exists()) {
                            const uData = userDoc.data();
                            pName = uData.name || uData.displayName;
                        }
                    } catch (err) {
                        console.error("Error matching user id:", err);
                    }
                }
                if (isMounted) {
                    setResolvedChatTitle(pName || reqData.patientPhone || 'Patient');
                    setChatPartnerId(reqData.userId);
                }
            } else {
                if (isMounted) {
                    setResolvedChatTitle((await getDoc(doc(db, 'pharmacies', pharmacyId))).data()?.name || pharmacyName || 'Pharmacy');
                    setChatPartnerId(pharmacyId);
                }
            }
        });

        return () => {
            isMounted = false;
            unsubReq();
        };
    }, [pharmacyId, requestId, currentUser, pharmacyName, authReady]);

    useEffect(() => {
        if (!chatPartnerId) return;
        // Read from pharmacyPresence if partner is pharmacy, else fallback to status
        const statusPath = !isPharmacy ? `pharmacyPresence/${chatPartnerId}` : `status/${chatPartnerId}`;
        const statusRef = ref(rtdb, statusPath);
        const unsubscribe = onValue(statusRef, (snapshot) => {
            const data = snapshot.val();
            if (!isPharmacy) {
                // Customer side checking pharmacy presence
                setPartnerStatus(data
                    ? { online: data.state === 'online', lastSeen: data.last_changed }
                    : { online: false, lastSeen: null });
            } else {
                // Pharmacy side checking user status
                setPartnerStatus(data
                    ? { online: data.state === 'online', lastSeen: data.last_changed }
                    : { online: false, lastSeen: null });
            }
        });
        return () => unsubscribe();
    }, [chatPartnerId, authReady]);

    // Issue #4 fix: self-register both participants in chatMembers on mount
    // This enables the RTDB security rules: chatMembers/{chatId}/{uid} === true
    // Write-once semantics (!data.exists()) prevent overwrites
    useEffect(() => {
        if (!authReady || !currentUser || !chatId) return;
        const myMemberRef = ref(rtdb, `chatMembers/${chatId}/${currentUser.uid}`);
        // Only set if not already set (rules enforce write-once, but we check client-side too)
        import('firebase/database').then(({ get }) => {
            get(myMemberRef).then(snap => {
                if (!snap.exists()) {
                    set(myMemberRef, true)
                        .then(() => setIsMember(true))
                        .catch(() => setIsMember(true));
                } else {
                    setIsMember(true);
                }
            }).catch(() => setIsMember(true));
        });
    }, [authReady, currentUser, chatId]);

    useEffect(() => {
        if (!authReady || !isMember) return; // wait for auth and membership before connecting to RTDB
        if (!requestId || !pharmacyId) {
            setLoading(false);
            setError('Invalid chat session');
            return;
        }

        // Fix #49: Listen only to /messages subnode, not the entire chat node.
        // This prevents re-renders every time typing indicators or reactions update.
        const chatRoomRef = ref(rtdb, `chats/${chatId}/messages`);
        const unsubscribe = onValue(chatRoomRef, (snapshot) => {
            const msgs = [];
            const RESERVED_KEYS = new Set(['typing', 'lastRead', 'reactions']);
            snapshot.forEach((child) => {
                if (!RESERVED_KEYS.has(child.key)) {
                    const val = child.val();
                    if (val && typeof val === 'object' && val.senderId) {
                        msgs.push({ id: child.key, ...val });
                    }
                }
            });
            setMessages(msgs);
            setLoading(false);
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
        }, (err) => {
            console.error('ChatScreen onValue Error:', err);
            setError(err.message || 'Failed to load chat.');
            setLoading(false);
        });

        return () => {
            unsubscribe();
            clearTimeout(typingTimeoutRef.current);
            const uid = auth.currentUser?.uid;
            if (uid) set(ref(rtdb, `chats/${chatId}/typing/${uid}`), false);
        };
    }, [chatId, requestId, pharmacyId, authReady, isMember]); // Fix #53: authReady and isMember added

    useEffect(() => {
        if (!isMember || !messages.length) return;
        const uid = auth.currentUser?.uid;
        if (!uid) return;
        set(ref(rtdb, `chats/${chatId}/lastRead/${uid}`), rtdbServerTimestamp());
    }, [messages.length, chatId]);

    useEffect(() => {
        if (!isMember || !chatPartnerId) return;
        const typingRef = ref(rtdb, `chats/${chatId}/typing/${chatPartnerId}`);
        const unsub = onValue(typingRef, (snap) => setIsPartnerTyping(!!snap.val()));
        return () => unsub();
    }, [chatId, chatPartnerId]);

    useEffect(() => {
        if (!isMember || !chatPartnerId) return;
        const readRef = ref(rtdb, `chats/${chatId}/lastRead/${chatPartnerId}`);
        const unsub = onValue(readRef, snap => setPartnerLastRead(snap.val()));
        return () => unsub();
    }, [chatId, chatPartnerId]);

    useEffect(() => {
        if (!isMember || !requestId || !pharmacyId) return;
        const rxRef = ref(rtdb, `chats/${chatId}/reactions`);
        const unsub = onValue(rxRef, snap => {
            setReactions(snap.exists() ? snap.val() : {});
        });
        return () => unsub();
    }, [chatId, requestId, pharmacyId, isMember]);

    const handleReaction = useCallback(async (msgId, emoji, currentReaction) => {
        haptic.light(); // Issue #24: Haptic on reaction
        if (!currentUser) return;
        const rxRef = ref(rtdb, `chats/${chatId}/reactions/${msgId}`);
        if (currentReaction?.emoji === emoji && currentReaction?.senderId === currentUser.uid) {
            await set(rxRef, null);
        } else {
            await set(rxRef, { emoji, senderId: currentUser.uid });
        }
        setReactionPickerFor(null);
    }, [currentUser, chatId]);

    const handleLongPressStart = useCallback((msgId) => {
        longPressTimerRef.current = setTimeout(() => setReactionPickerFor(msgId), 500);
    }, []);

    const handleLongPressEnd = useCallback(() => {
        clearTimeout(longPressTimerRef.current);
    }, []);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() && !isUploading) return;
        haptic.medium(); // Issue #24: Haptic on send

        const messageText = newMessage.trim();
        setNewMessage('');
        clearTimeout(typingTimeoutRef.current);
        set(ref(rtdb, `chats/${chatId}/typing/${currentUser.uid}`), false);

        try {
            const newMsgRef = push(ref(rtdb, `chats/${chatId}/messages`));
            const payload = {
                senderId: currentUser.uid,
                text: messageText,
                type: 'text',
                timestamp: rtdbServerTimestamp(),
                ...(replyingTo ? {
                    replyToMessageId: replyingTo.id,
                    replyToText: replyingTo.text || (replyingTo.type === 'image' ? '📷 Photo' : '📎 Attachment'),
                    replyToSenderId: replyingTo.senderId
                } : {})
            };
            await set(newMsgRef, payload);
            setReplyingTo(null);
        } catch (error) {
            console.error("Error sending message:", error);
        }
        inputRef.current?.focus();
    };

    // MISS-02 fix: Pharmacy requests prescription
    const handleRequestPrescription = async () => {
        if (!currentUser) return;
        try {
            const newMsgRef = push(ref(rtdb, `chats/${chatId}/messages`));
            await set(newMsgRef, {
                senderId: currentUser.uid,
                type: 'prescription_request',
                timestamp: rtdbServerTimestamp()
            });
            inputRef.current?.focus();
        } catch (error) {
            console.error(error);
        }
    };

    // MISS-02 fix: Patient uploads and shares prescription
    const handleSharePrescription = async (file, requestMsgId) => {
        if (!file || !currentUser) return;
        setIsUploading(true);
        try {
            // Upload to storage
            const { getStorage, ref: storageRef, uploadBytesResumable, getDownloadURL } = await import('firebase/storage');
            const storage = getStorage();
            const reqId = chatId.split('_')[0];
            const fileRef = storageRef(storage, `prescriptions/${reqId}/chat_${chatId}_${Date.now()}_${file.name}`);

            const snapshot = await uploadBytesResumable(fileRef, file);
            const url = await getDownloadURL(snapshot.ref);

            // Send share message
            const newMsgRef = push(ref(rtdb, `chats/${chatId}/messages`));
            await set(newMsgRef, {
                senderId: currentUser.uid,
                type: 'prescription_share',
                prescriptionUrl: url,
                text: 'Shared a prescription',
                replyTo: requestMsgId,
                timestamp: rtdbServerTimestamp()
            });
        } catch (error) {
            console.error("Prescription share error:", error);
            toast.error("Failed to share prescription.");
        } finally {
            setIsUploading(false);
        }
    };

    // Call Feature Logic
    const handleRequestCall = async () => {
        if (!currentUser) return;
        try {
            const newMsgRef = push(ref(rtdb, `chats/${chatId}/messages`));
            await set(newMsgRef, {
                senderId: currentUser.uid,
                type: 'call_request',
                status: 'pending',
                timestamp: rtdbServerTimestamp()
            });
            inputRef.current?.focus();
        } catch (error) {
            console.error(error);
        }
    };

    const handleAcceptCall = async (msgId) => {
        if (!currentUser) return;
        try {
            // Update request status
            await set(ref(rtdb, `chats/${chatId}/${msgId}/status`), 'accepted');

            // Send phone shared
            const phoneToShare = patientData?.patientPhone || patientData?.phone || currentUser.phoneNumber || 'Number not found';
            const newMsgRef = push(ref(rtdb, `chats/${chatId}/messages`));
            await set(newMsgRef, {
                senderId: currentUser.uid,
                type: 'phone_shared',
                phoneNumber: phoneToShare,
                replyTo: msgId,
                timestamp: rtdbServerTimestamp()
            });
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeclineCall = async (msgId) => {
        if (!currentUser) return;
        try {
            // Update request status
            await set(ref(rtdb, `chats/${chatId}/${msgId}/status`), 'declined');

            const newMsgRef = push(ref(rtdb, `chats/${chatId}/messages`));
            await set(newMsgRef, {
                senderId: currentUser.uid,
                type: 'call_declined',
                replyTo: msgId,
                timestamp: rtdbServerTimestamp()
            });
        } catch (error) {
            console.error(error);
        }
    };

    const sharedPhoneNumber = messages.slice().reverse().find(m => m.type === 'phone_shared')?.phoneNumber;

    // MISS-08 fix: General image sharing
    const handleSendImage = async (file) => {
        if (!file || !currentUser) return;
        setIsUploading(true);
        try {
            const { getStorage, ref: storageRef, uploadBytesResumable, getDownloadURL } = await import('firebase/storage');
            const storage = getStorage();
            const fileRef = storageRef(storage, `chat_images/chat_${chatId}_${Date.now()}_${file.name}`);

            const snapshot = await uploadBytesResumable(fileRef, file);
            const url = await getDownloadURL(snapshot.ref);

            const newMsgRef = push(ref(rtdb, `chats/${chatId}/messages`));
            await set(newMsgRef, {
                senderId: currentUser.uid,
                type: 'image',
                imageUrl: url,
                timestamp: rtdbServerTimestamp()
            });
            // scroll down immediately to show that image was inserted
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        } catch (error) {
            console.error("Image upload error:", error);
            toast.error("Failed to send image.");
        } finally {
            setIsUploading(false);
        }
    };


    const handleInputChange = (e) => {

        setNewMessage(e.target.value);
        if (!currentUser) return;
        const typingRef = ref(rtdb, `chats/${chatId}/typing/${currentUser.uid}`);
        set(typingRef, true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => set(typingRef, false), 2000);
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    };

    // MISS-03 fix: show styled modal instead of window.confirm
    const handleCompleteRequest = () => {
        if (!isPharmacy && requestId) setShowCompleteModal(true);
    };

    const confirmCompleteRequest = async () => {
        setShowCompleteModal(false);
        try {
            const { updateDoc } = await import('firebase/firestore');
            await updateDoc(doc(db, 'medicineRequests', requestId), {
                status: 'closed',
                matchedPharmacyId: pharmacyId
            });
            if (onBack) onBack();
        } catch (err) {
            console.error('Error closing request:', err);
        }
    };

    if (loading) {
        return (
            <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', height: '100dvh', gap: '1rem',
                background: '#F8FAFC'
            }}>
                <div style={{
                    width: '40px', height: '40px',
                    border: '3px solid rgba(34,197,94,0.2)',
                    borderTopColor: '#22C55E',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                }} />
                <p style={{ color: '#6B7280', fontSize: '0.9rem', margin: 0 }}>Loading chat...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ textAlign: 'center', padding: '3rem 2rem', height: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '2px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444' }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                    </div>
                </div>
                <p style={{ color: '#EF4444', fontWeight: 600, marginBottom: '1.5rem' }}>{error}</p>
                <button className="btn-dynamic" onClick={onBack} style={{
                    background: '#EF4444', color: 'white', border: 'none',
                    padding: '0.75rem 2rem', borderRadius: '14px',
                    cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem'
                }}>Go Back</button>
            </div>
        );
    }

    {/* MISS-03 fix: Styled Complete Confirmation Modal */ }
    const CompleteModal = showCompleteModal ? (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
            <div style={{ background: '#fff', borderRadius: '20px', padding: '2rem', maxWidth: '340px', width: '100%', boxShadow: '0 24px 60px rgba(0,0,0,0.2)', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#DCFCE7', border: '2px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16A34A' }}>
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    </div>
                </div>
                <h3 style={{ margin: '0 0 0.5rem', fontWeight: 800, color: '#111827', fontSize: '1.1rem' }}>Mark as Complete?</h3>
                <p style={{ color: '#6B7280', fontSize: '0.875rem', margin: '0 0 1.5rem', lineHeight: 1.5 }}>This will close the request for all pharmacies. You'll need to submit a new request if needed again.</p>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn-dynamic" onClick={() => setShowCompleteModal(false)} style={{ flex: 1, padding: '0.75rem', background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: '12px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}>Cancel</button>
                    <button className="btn-dynamic" onClick={confirmCompleteRequest} style={{ flex: 1, padding: '0.75rem', background: '#22C55E', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>Confirm</button>
                </div>
            </div>
        </div>
    ) : null;

    return (
        <>
            {CompleteModal}
            <style>{`
                .chat-root {
                    position: fixed;
                    inset: 0;
                    display: flex;
                    flex-direction: column;
                    background: #F0F2F5;
                    z-index: 100;
                    overscroll-behavior: none;
                }
                .chat-header {
                    flex-shrink: 0;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0 12px;
                    padding-top: calc(12px + env(safe-area-inset-top, 0px));
                    padding-bottom: 12px;
                    background: linear-gradient(135deg, #111827 0%, #1E293B 100%);
                    box-shadow: 0 2px 12px rgba(0,0,0,0.18);
                    z-index: 10;
                    min-height: 64px;
                }
                .chat-messages-area {
                    flex: 1;
                    overflow-y: auto;
                    overflow-x: hidden;
                    padding: 12px 12px 8px;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    -webkit-overflow-scrolling: touch;
                    overscroll-behavior: contain;
                    background: #F0F2F5;
                    position: relative;
                }
                .chat-messages-area::-webkit-scrollbar { display: none; }
                .chat-input-bar {
                    flex-shrink: 0;
                    padding: 8px 12px;
                    padding-bottom: calc(10px + env(safe-area-inset-bottom, 0px));
                    background: #F0F2F5;
                    border-top: 1px solid rgba(0,0,0,0.06);
                    z-index: 10;
                }
                .chat-bg-logo {
                    position: absolute;
                    width: min(280px, 70vw);
                    height: auto;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    filter: opacity(0.045) grayscale(100%);
                    pointer-events: none;
                    user-select: none;
                }
                .chat-input-field {
                    flex: 1;
                    padding: 10px 16px;
                    border: 1.5px solid #E5E7EB;
                    border-radius: 24px;
                    font-size: 0.9375rem;
                    outline: none;
                    background: #FFFFFF;
                    color: #111827;
                    font-family: inherit;
                    transition: border-color 0.2s, box-shadow 0.2s;
                    min-height: 44px;
                    -webkit-appearance: none;
                }
                .chat-input-field:focus {
                    border-color: #22C55E;
                    box-shadow: 0 0 0 3px rgba(34,197,94,0.12);
                }
                .chat-send-btn {
                    width: 44px;
                    height: 44px;
                    border-radius: 50%;
                    border: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    flex-shrink: 0;
                    transition: all 0.2s ease;
                    -webkit-tap-highlight-color: transparent;
                }
                .typing-dot {
                    width: 7px; height: 7px;
                    background: #9CA3AF;
                    border-radius: 50%;
                    animation: typingBounce 1.4s ease infinite;
                    flex-shrink: 0;
                }
                @keyframes typingBounce {
                    0%, 60%, 100% { transform: translateY(0); }
                    30% { transform: translateY(-6px); }
                }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>

            <div
                className="chat-root"
                style={{ bottom: inputHeight > 0 ? `${inputHeight}px` : 0 }}
                onClick={() => reactionPickerFor && setReactionPickerFor(null)}
            >
                {/* ── Header ── */}
                {/* ── Header ── */}
                <ChatHeader
                    onBack={onBack}
                    isPharmacy={isPharmacy}
                    resolvedChatTitle={resolvedChatTitle}
                    partnerStatus={partnerStatus}
                    isPartnerTyping={isPartnerTyping}
                    handleRequestPrescription={handleRequestPrescription}
                    sharedPhoneNumber={sharedPhoneNumber}
                    handleRequestCall={handleRequestCall}
                    handleCompleteRequest={handleCompleteRequest}
                    patientData={patientData}
                    pharmacyData={pharmacyData}
                />

                {/* ── Messages Area ── */}
                <div className="chat-messages-area">
                    <img className="chat-bg-logo" src="localpill_nobg.png" alt="" aria-hidden="true" />

                    {messages.length === 0 ? (
                        <div style={{
                            margin: 'auto',
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', gap: '0.75rem',
                            textAlign: 'center', padding: '2rem'
                        }}>
                            <div style={{
                                width: '60px', height: '60px',
                                background: 'linear-gradient(135deg, #FEF3C7, #FDE68A)',
                                borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(245,158,11,0.2)',
                                color: '#D97706'
                            }}>
                                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                            </div>
                            <div>
                                <div style={{ fontWeight: 700, color: '#374151', marginBottom: '4px', fontSize: '0.95rem' }}>
                                    Conversation shuru karo
                                </div>
                                <div style={{ fontSize: '0.82rem', color: '#9CA3AF', lineHeight: 1.5 }}>
                                    Price aur availability pharmacy se confirm karo
                                </div>
                            </div>
                        </div>
                    ) : (
                        messages.map((msg, index) => {
                            if (!msg || !msg.senderId) return null;
                            const isMine = currentUser && msg.senderId === currentUser.uid;
                            const prevMsg = messages[index - 1];

                            // Date separator: new day
                            const showDateSep = !prevMsg || (
                                msg.timestamp && prevMsg.timestamp &&
                                formatDateLabel(msg.timestamp) !== formatDateLabel(prevMsg.timestamp)
                            );

                            // Time separator: > 5 min gap (only shown inside date groups)
                            const showTimeSep = !showDateSep && !prevMsg || (
                                msg.timestamp && prevMsg?.timestamp &&
                                Math.abs(new Date(msg.timestamp) - new Date(prevMsg.timestamp)) > 5 * 60 * 1000
                            );

                            const isSeen = isMine && partnerLastRead && msg.timestamp && partnerLastRead >= msg.timestamp;
                            const isDelivered = isSeen || (isMine && (partnerStatus.online || (partnerStatus.lastSeen && msg.timestamp && partnerStatus.lastSeen > msg.timestamp)));
                            const reaction = reactions[msg.id];
                            const isPickerOpen = reactionPickerFor === msg.id;

                            return (
                                <div key={msg.id} style={{
                                    display: 'flex', flexDirection: 'column',
                                    animation: 'fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
                                    animationDelay: `${Math.min(index * 0.05, 0.5)}s`
                                }}>
                                    <ChatMessage
                                        msg={msg}
                                        isMine={isMine}
                                        isSeen={isSeen}
                                        showDateSep={showDateSep}
                                        showTimeSep={showTimeSep}
                                        isDelivered={isDelivered}
                                        reaction={reaction}
                                        isPickerOpen={isPickerOpen}
                                        handleReaction={handleReaction}
                                        handleLongPressStart={handleLongPressStart}
                                        handleLongPressEnd={handleLongPressEnd}
                                        setReactionPickerFor={setReactionPickerFor}
                                        handleSharePrescription={handleSharePrescription}
                                        handleAcceptCall={handleAcceptCall}
                                        handleDeclineCall={handleDeclineCall}
                                    />
                                </div>
                            );
                        })
                    )}


                    {/* Typing indicator */}
                    {isPartnerTyping && (
                        <div style={{
                            alignSelf: 'flex-start',
                            display: 'flex', gap: '5px', alignItems: 'center',
                            background: '#FFFFFF',
                            padding: '12px 14px',
                            borderRadius: '18px 18px 18px 4px',
                            border: '1px solid #F0F0F0',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                        }}>
                            {[0, 0.18, 0.36].map((delay, i) => (
                                <div key={i} className="typing-dot" style={{ animationDelay: `${delay}s` }} />
                            ))}
                        </div>
                    )}

                    <div ref={messagesEndRef} style={{ height: '4px' }} />
                </div>

                {/* ── Input Bar ── */}
                {/* ── Input Bar ── */}
                <ChatInputBar
                    newMessage={newMessage}
                    handleInputChange={handleInputChange}
                    handleSendMessage={handleSendMessage}
                    isUploading={isUploading}
                    setShowAttachMenu={setShowAttachMenu}
                    inputRef={inputRef}
                    haptic={haptic}
                    currentUser={currentUser}
                    chatId={chatId}
                    rtdb={rtdb}
                    replyingTo={replyingTo}
                    setReplyingTo={setReplyingTo}
                />
            </div >

            {/* Lightbox for images */}
            {
                lightboxSrc && (
                    <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
                )
            }

            {/* BottomSheet for Chat Reactions */}
            <BottomSheet
                isOpen={!!reactionPickerFor}
                onClose={() => setReactionPickerFor(null)}
                title="Add Reaction"
                snapHeight="auto"
            >
                <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
                        {EMOJIS.map(e => {
                            const msgId = reactionPickerFor;
                            const currentReaction = msgId ? reactions[msgId] : null;
                            const isSelected = currentReaction?.emoji === e;
                            return (
                                <button className="btn-dynamic"
                                    key={e}
                                    onClick={() => {
                                        if (msgId) handleReaction(msgId, e, currentReaction);
                                        setReactionPickerFor(null);
                                    }}
                                    style={{
                                        background: isSelected ? '#F0FDF4' : '#F9FAFB',
                                        border: isSelected ? '2px solid #22C55E' : '2px solid transparent',
                                        borderRadius: '16px',
                                        padding: '12px 16px',
                                        fontSize: '2rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                                        boxShadow: isSelected ? '0 4px 12px rgba(34,197,94,0.15)' : 'none'
                                    }}
                                >
                                    {e}
                                </button>
                            );
                        })}
                    </div>

                    <button className="btn-dynamic"
                        onClick={() => {
                            const msg = messages.find(m => m.id === reactionPickerFor);
                            if (msg) {
                                setReplyingTo(msg);
                                setTimeout(() => inputRef.current?.focus(), 100);
                            }
                            setReactionPickerFor(null);
                        }}
                        style={{
                            background: '#F3F4F6', color: '#111827', border: 'none',
                            padding: '14px', borderRadius: '16px', fontWeight: '600', fontSize: '1rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer'
                        }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" /></svg>
                        Reply to Message
                    </button>
                </div>
            </BottomSheet>

            {/* BottomSheet for Attachment Menu (Issue #33) */}
            <BottomSheet
                isOpen={showAttachMenu}
                onClose={() => setShowAttachMenu(false)}
                title="Attach Files"
                snapHeight="auto"
            >
                <div style={{ padding: '0 16px 24px', display: 'flex', justifyContent: 'space-around' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#FEE2E2', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4B5563' }}>Camera</span>
                        <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e) => {
                            if (e.target.files[0]) { handleSendImage(e.target.files[0]); setShowAttachMenu(false); }
                        }} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#E0E7FF', color: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4B5563' }}>Gallery</span>
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                            if (e.target.files[0]) { handleSendImage(e.target.files[0]); setShowAttachMenu(false); }
                        }} />
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', opacity: 0.5 }}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#F3F4F6', color: '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4B5563' }}>Document</span>
                    </div>
                </div>
            </BottomSheet>
        </>
    );
}
