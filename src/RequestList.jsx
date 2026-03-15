import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, Timestamp, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, onValue, get, set } from 'firebase/database';
import { db, rtdb } from './firebase';
import { Card, Button, Badge } from './components/UI';
import { SkeletonRequestCard } from './components/Skeleton';
import ChatScreen from './ChatScreen';
import PrescriptionViewer from './PrescriptionViewer';

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}

export default function RequestList({ pharmacyUser, pharmacyRequests, onNavigate }) {
    const [filteredRequests, setFilteredRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState('newest'); // 'newest' or 'expiring'
    const [newArrivals, setNewArrivals] = useState([]); // Issue #29: Animation state
    const isMounted = React.useRef(true);
    const previousRequestIds = React.useRef(new Set());
    const initialLoadDone = React.useRef(false);
    const audioContextRef = React.useRef(null);

    const playAlertSound = () => {
        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            }
            const ctx = audioContextRef.current;
            if (ctx.state === 'suspended') {
                ctx.resume();
            }

            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();

            osc.type = 'sine';
            osc.connect(gainNode);
            gainNode.connect(ctx.destination);

            // Pleasant "ding" sound
            osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
            osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);

            gainNode.gain.setValueAtTime(0, ctx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);

            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 1);
        } catch (e) {
            console.error("Audio play failed: ", e);
        }
    };

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
            if (audioContextRef.current) {
                audioContextRef.current.close().catch(console.error);
            }
        };
    }, []);

    // Monitor for new requests and play sound
    useEffect(() => {
        if (!loading) {
            const currentIds = new Set(filteredRequests.map(r => r.id));

            if (initialLoadDone.current) {
                const newIds = [...currentIds].filter(id => !previousRequestIds.current.has(id));
                if (newIds.length > 0) {
                    playAlertSound();
                    setNewArrivals(newIds);
                    setTimeout(() => { if (isMounted.current) setNewArrivals([]); }, 3000); // clear after 3s
                }
            } else {
                initialLoadDone.current = true;
            }

            previousRequestIds.current = currentIds;
        }
    }, [filteredRequests, loading]);

    useEffect(() => {
        const processRequests = async () => {
            try {
                if (!pharmacyRequests || pharmacyRequests.length === 0) {
                    setFilteredRequests([]);
                    setLoading(false);
                    return;
                }

                // Fetch pharmacy location
                const pharmacyRef = doc(db, 'pharmacies', pharmacyUser.uid);
                const pharmacySnap = await getDoc(pharmacyRef);

                if (!isMounted.current) return;

                if (!pharmacySnap.exists()) {
                    if (isMounted.current) setLoading(false);
                    return;
                }

                const pharmacyLoc = pharmacySnap.data().location;
                const now = Timestamp.now();
                const activeRequests = [];

                for (const req of pharmacyRequests) {
                    if (req.status !== 'pending') continue;

                    // FIX 1 Reversal: Do not skip requests this pharmacy already responded to.
                    // This allows the "Open Chat" button to remain on the dashboard while the request is still pending.
                    // if (req.respondedPharmacies?.includes(pharmacyUser.uid)) continue;

                    if (req.location && pharmacyLoc) {
                        if (req.expiresAt && req.expiresAt.toMillis() < now.toMillis()) continue;

                        const distanceKm = calculateDistance(
                            pharmacyLoc.latitude,
                            pharmacyLoc.longitude,
                            req.location.latitude,
                            req.location.longitude
                        );

                        if (distanceKm <= req.searchRadiusKm) {
                            activeRequests.push({
                                ...req,
                                distanceKm
                            });
                        }
                    }
                }

                activeRequests.sort((a, b) => {
                    if (sortBy === 'expiring') {
                        const timeA = a.expiresAt?.toMillis() || Number.MAX_SAFE_INTEGER;
                        const timeB = b.expiresAt?.toMillis() || Number.MAX_SAFE_INTEGER;
                        return timeA - timeB; // ascending
                    } else {
                        const timeA = a.createdAt?.toMillis() || 0;
                        const timeB = b.createdAt?.toMillis() || 0;
                        return timeB - timeA;
                    }
                });

                if (isMounted.current) {
                    setFilteredRequests(activeRequests);
                    setLoading(false);
                }
            } catch (err) {
                console.error("Error processing requests: ", err);
                if (isMounted.current) setLoading(false);
            }
        };

        if (pharmacyUser?.uid) {
            processRequests();
        }
    }, [pharmacyUser?.uid, pharmacyRequests, sortBy]);

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' }}>
                {[1, 2, 3].map(i => <SkeletonRequestCard key={i} />)}
            </div>
        );
    }



    if (filteredRequests.length === 0) {
        return (
            <div style={{
                textAlign: 'center',
                padding: '4rem 2rem',
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid #E5E7EB'
            }}>
                <div style={{ marginBottom: '1rem', opacity: 0.5 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
                </div>
                <h3 style={{ color: '#1F2937', marginBottom: '0.5rem' }}>No Active Local Requests</h3>
                <p style={{ color: '#6B7280', fontSize: '0.95rem' }}>Waiting for nearby patients (within their search radius) to request medicines.</p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem', width: '100%' }}>
            {filteredRequests.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#374151' }}>
                        {filteredRequests.length} Active Request{filteredRequests.length !== 1 ? 's' : ''}
                    </div>
                    <div style={{ display: 'flex', gap: '4px', background: '#F3F4F6', padding: '4px', borderRadius: '8px' }}>
                        <button className="btn-dynamic"
                            onClick={() => setSortBy('newest')}
                            style={{ background: sortBy === 'newest' ? '#fff' : 'transparent', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: sortBy === 'newest' ? 600 : 500, color: sortBy === 'newest' ? '#111827' : '#6B7280', cursor: 'pointer', boxShadow: sortBy === 'newest' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
                        >Newest</button>
                        <button className="btn-dynamic"
                            onClick={() => setSortBy('expiring')}
                            style={{ background: sortBy === 'expiring' ? '#fff' : 'transparent', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: sortBy === 'expiring' ? 600 : 500, color: sortBy === 'expiring' ? '#111827' : '#6B7280', cursor: 'pointer', boxShadow: sortBy === 'expiring' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
                        >Expiring Soon</button>
                    </div>
                </div>
            )}
            <style>{`
                @keyframes pulseRed { 0% { opacity: 0.8; box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); } 100% { opacity: 1; box-shadow: 0 0 12px 4px rgba(239, 68, 68, 0.2); } }
                @keyframes requestSlideIn { from { opacity: 0; transform: translateX(-30px) scale(0.98); background: #DCFCE7; } to { opacity: 1; transform: translateX(0) scale(1); background: transparent; } }
            `}</style>
            {filteredRequests.map((req) => (
                <div key={req.id} style={{ animation: newArrivals.includes(req.id) ? 'requestSlideIn 0.8s cubic-bezier(0.16,1,0.3,1)' : 'none', borderRadius: '16px' }}>
                    <RequestCard request={req} pharmacyId={pharmacyUser.uid} onOpenChat={() => onNavigate(`/chat?id=${req.id}&pharmacy=${pharmacyUser.uid}`)} />
                </div>
            ))}
        </div>
    );
}

function RequestCard({ request, pharmacyId, onOpenChat }) {
    const [timeLeft, setTimeLeft] = useState('');
    const [isExpiringSoon, setIsExpiringSoon] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');
    const [showPrescription, setShowPrescription] = useState(false);
    const [hasUnread, setHasUnread] = useState(false); // MISS-09 fix
    const [confirmModal, setConfirmModal] = useState(null); // 'available', 'partial', 'not_available'

    // BUG FIX: RequestCard is a module-level function; it needs its OWN isMounted ref,
    // not the one from RequestList's scope (which caused ReferenceError: isMounted is not defined)
    const isMounted = React.useRef(true);

    useEffect(() => {
        return () => {
            isMounted.current = false;
        };
    }, []);

    // FIX 2: On mount, check Firestore to restore submitted state after page refresh
    useEffect(() => {
        const checkAlreadyResponded = async () => {
            try {
                const responseRef = doc(db, 'medicineRequests', request.id, 'pharmacyResponses', pharmacyId);
                const snap = await getDoc(responseRef);
                if (snap.exists() && isMounted.current) {
                    setSubmitted(true);
                }
            } catch (e) {
                // Non-critical — silently ignore
            }
        };
        checkAlreadyResponded();
    }, [request.id, pharmacyId]);

    // MISS-09 fix: track unread messages in this chat room
    useEffect(() => {
        const chatId = `${request.id}_${pharmacyId}`;

        // Issue #17 fix: proactively register as chatMember so the RTDB rule allows the read
        const memberRef = ref(rtdb, `chatMembers/${chatId}/${pharmacyId}`);

        const attachListener = () => {
            if (!isMounted.current) return;
            const messagesRef = ref(rtdb, `chats/${chatId}/messages`);
            const lastReadRef = ref(rtdb, `chats/${chatId}/lastRead/${pharmacyId}`);
            let myLastRead = 0;
            get(lastReadRef).then(snap => {
                if (snap.exists()) myLastRead = snap.val();
            });
            const unsub = onValue(messagesRef, snap => {
                if (!snap.exists() || !isMounted.current) return;
                let latestMsgTime = 0;
                snap.forEach(child => {
                    const val = child.val();
                    if (val && val.timestamp) {
                        const t = typeof val.timestamp === 'number' ? val.timestamp : 0;
                        if (t > latestMsgTime) latestMsgTime = t;
                    }
                });
                setHasUnread(latestMsgTime > myLastRead);
            });
            // We can't return the unsub cleanly from an async nested scope to useEffect's return,
            // so we listen to isMounted.current to avoid memory leaks.
            // Better to attach to a window scope or ref if possible, but for now we'll survive
            // since this component doesn't unmount frequently.

            // To be 100% safe against leaks:
            isMounted.current && (window[`cleanup_${chatId}_${pharmacyId}`] = unsub);
        };

        get(memberRef).then(memberSnap => {
            if (!memberSnap.exists()) {
                set(memberRef, true).then(attachListener).catch(attachListener);
            } else {
                attachListener();
            }
        }).catch(attachListener);

        return () => {
            const unsub = window[`cleanup_${chatId}_${pharmacyId}`];
            if (unsub) { unsub(); delete window[`cleanup_${chatId}_${pharmacyId}`]; }
        };
    }, [request.id, pharmacyId]);


    useEffect(() => {
        const updateTimeLeft = () => {
            const now = Date.now();
            const expiresAt = request.expiresAt.toMillis();
            const diff = expiresAt - now;

            if (diff <= 0) {
                if (isMounted.current) {
                    setTimeLeft('Expired');
                    setIsExpiringSoon(false);
                    // UX Fix: Auto-close confirm modal on expiry
                    setConfirmModal(null);
                }
                return;
            }

            const minutes = Math.floor(diff / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            if (isMounted.current) {
                setTimeLeft(`${minutes}m ${seconds.toString().padStart(2, '0')}s remaining`);
                setIsExpiringSoon(diff <= 180000);
            }
        };

        updateTimeLeft();
        const interval = setInterval(updateTimeLeft, 1000);
        return () => clearInterval(interval);
    }, [request.expiresAt]);

    const handleResponse = async (responseType) => {
        setIsSubmitting(true);
        setError('');

        try {
            // Validate Request exists
            const reqRef = doc(db, 'medicineRequests', request.id);
            const reqSnap = await getDoc(reqRef);

            if (!isMounted.current) return;

            if (!reqSnap.exists()) {
                if (isMounted.current) setError('Request no longer exists.');
                return;
            }

            const data = reqSnap.data();
            const now = Date.now();

            if (data.status !== 'pending') {
                if (isMounted.current) setError('Request is no longer pending.');
                return;
            }

            if (data.expiresAt.toMillis() < now || timeLeft === 'Expired') {
                if (isMounted.current) setError('Request has expired.');
                return;
            }

            // Check if we already responded (prevents duplicate write / permission error on refresh)
            const responseRef = doc(db, 'medicineRequests', request.id, 'pharmacyResponses', pharmacyId);
            const existingSnap = await getDoc(responseRef);

            if (!isMounted.current) return;

            if (existingSnap.exists()) {
                // Already responded — just update local UI state
                if (isMounted.current) setSubmitted(true);
                return;
            }

            // Write response
            const timeToRespondMs = Date.now() - data.createdAt.toMillis();
            await setDoc(responseRef, {
                pharmacyId: pharmacyId,
                responseType: responseType,
                respondedAt: serverTimestamp(),
                timeToRespondMs: timeToRespondMs
            });

            if (isMounted.current) {
                setSubmitted(true);
                setConfirmModal(null);
            }
        } catch (err) {
            console.error(err);
            if (isMounted.current) setError('Failed to submit response. Please try again.');
        } finally {
            if (isMounted.current) setIsSubmitting(false);
        }
    };

    const createdAtDate = request.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const formattedDistance = request.distanceKm ? request.distanceKm.toFixed(1) : '?';

    return (
        <div
            style={{ position: 'relative', overflow: 'hidden', padding: '1.25rem', textAlign: 'left', background: 'var(--color-bg-surface)', border: `1px solid ${hasUnread ? '#FCA5A5' : 'var(--color-border)'}`, borderRadius: '14px', boxShadow: hasUnread ? '0 0 0 3px rgba(239,68,68,0.1)' : 'var(--shadow-sm)', transition: 'all 0.2s ease' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = hasUnread ? '0 0 0 3px rgba(239,68,68,0.1)' : 'var(--shadow-md)'; e.currentTarget.style.borderColor = hasUnread ? '#FCA5A5' : 'var(--color-primary-border)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = hasUnread ? '0 0 0 3px rgba(239,68,68,0.1)' : 'var(--shadow-sm)'; e.currentTarget.style.borderColor = hasUnread ? '#FCA5A5' : 'var(--color-border)'; }}
        >

            {/* UX Fix: Confirmation Overlay */}
            {confirmModal && !submitted && (
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 10,
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    padding: '2rem', textAlign: 'center',
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div style={{
                        background: confirmModal === 'available' ? '#DCFCE7' : confirmModal === 'partial' ? '#FEF3C7' : '#F3F4F6',
                        color: confirmModal === 'available' ? '#166534' : confirmModal === 'partial' ? '#92400E' : '#374151',
                        padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700,
                        marginBottom: '1rem', border: '1px solid rgba(0,0,0,0.05)'
                    }}>
                        Confirm: {confirmModal === 'available' ? 'Available' : confirmModal === 'partial' ? 'Partial' : 'Not Available'}
                    </div>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#111827', fontSize: '1.1rem' }}>Are you sure?</h3>
                    <p style={{ color: '#6B7280', fontSize: '0.85rem', margin: '0 0 1.5rem 0' }}>You cannot change this response later.</p>

                    <div style={{ display: 'flex', gap: '0.75rem', width: '100%', maxWidth: '240px' }}>
                        <Button
                            onClick={() => setConfirmModal(null)}
                            disabled={isSubmitting}
                            style={{ flex: 1, background: '#FFF', color: '#374151', border: '1px solid #D1D5DB', padding: '0.75rem', borderRadius: '10px' }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => handleResponse(confirmModal)}
                            disabled={isSubmitting}
                            style={{ flex: 1, background: '#22C55E', color: '#FFF', padding: '0.75rem', borderRadius: '10px' }}
                        >
                            {isSubmitting ? '...' : 'Confirm'}
                        </Button>
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.85rem', color: '#6B7280' }}>
                    Received: {createdAtDate} • <strong style={{ color: '#22C55E' }}>{formattedDistance} km away</strong>
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {/* MISS-09 fix: unread message badge */}
                    {hasUnread && (
                        <span style={{ background: '#EF4444', color: '#fff', fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', animation: 'pulse 1.5s ease infinite', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                            New Message
                        </span>
                    )}
                    <span style={{
                        background: isExpiringSoon ? '#FEF2F2' : '#FEE2E2',
                        color: isExpiringSoon ? '#DC2626' : '#EF4444',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        border: isExpiringSoon ? '2px solid #FCA5A5' : '1px solid #FECACA',
                        animation: isExpiringSoon ? 'pulseRed 1s infinite alternate' : 'none',
                        transition: 'all 0.3s'
                    }}>
                        {timeLeft}
                    </span>
                </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
                <h4 style={{ marginBottom: '0.75rem', color: '#1F2937', fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Requested Medicines:</h4>
                <ul style={{ listStyleType: 'none', padding: 0 }}>
                    {request.typedMedicines.map((med, idx) => (
                        <li key={idx} style={{
                            background: '#F3F4F6',
                            color: '#1F2937',
                            padding: '0.75rem 1rem',
                            borderRadius: '8px',
                            marginBottom: '0.5rem',
                            fontWeight: 600,
                            fontSize: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.625rem',
                            border: '1px solid #E5E7EB',
                            borderLeft: '4px solid #22C55E'
                        }}>
                            <svg width="8" height="8" viewBox="0 0 8 8" fill="#22C55E"><circle cx="4" cy="4" r="4" /></svg>
                            {med}
                        </li>
                    ))}
                </ul>
            </div>

            {request.prescriptionUrl && (
                <div style={{ marginBottom: '1.5rem', background: '#FFFFFF', padding: '0.75rem', borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <button className="btn-dynamic"
                        type="button"
                        onClick={(e) => { e.preventDefault(); setShowPrescription(true); }}
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#374151', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                        View Attached Prescription
                    </button>
                </div>
            )}

            {showPrescription && request.prescriptionUrl && (
                <PrescriptionViewer
                    requestId={request.id}
                    filePath={request.prescriptionUrl}
                    onClose={() => setShowPrescription(false)}
                />
            )}

            {error && <div className="error-alert" style={{ marginTop: '1rem', marginBottom: 0 }}>{error}</div>}

            {submitted ? (
                <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{
                        padding: '1rem',
                        background: '#D1FAE5',
                        border: '1px solid #A7F3D0',
                        borderRadius: '8px',
                        color: '#059669',
                        textAlign: 'center',
                        fontWeight: 600,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        Response submitted
                    </div>
                    <Button
                        onClick={() => onOpenChat(request)}
                        style={{ width: '100%', background: 'linear-gradient(135deg, #22C55E, #16A34A)', boxShadow: '0 4px 15px rgba(34,197,94,0.3)', color: 'white', padding: '0.75rem', borderRadius: '12px', transition: 'transform 0.2s', border: 'none' }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        Open Chat
                    </Button>
                </div>
            ) : (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                    <Button
                        onClick={() => setConfirmModal('available')}
                        disabled={isSubmitting || timeLeft === 'Expired'}
                        style={{
                            flex: 1,
                            background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                            boxShadow: '0 4px 15px rgba(34,197,94,0.3)',
                            padding: '1rem',
                            fontSize: '0.9rem',
                            marginBottom: 0,
                            borderRadius: '12px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                            border: 'none', color: '#fff'
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        Available
                    </Button>
                    <Button
                        onClick={() => setConfirmModal('partial')}
                        disabled={isSubmitting || timeLeft === 'Expired'}
                        style={{
                            flex: 1,
                            backgroundColor: '#F59E0B',
                            padding: '1rem',
                            fontSize: '0.9rem',
                            marginBottom: 0,
                            borderRadius: '12px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        Partial
                    </Button>
                    <Button
                        onClick={() => setConfirmModal('not_available')}
                        disabled={isSubmitting || timeLeft === 'Expired'}
                        style={{
                            flex: 1,
                            backgroundColor: '#9CA3AF',
                            padding: '1rem',
                            fontSize: '0.9rem',
                            marginBottom: 0,
                            borderRadius: '12px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        Not Avail.
                    </Button>
                </div>
            )}
        </div>
    );
}
