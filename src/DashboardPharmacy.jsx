import React, { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc, collectionGroup, query, where, getDocs, collection, onSnapshot, getCountFromServer, setDoc } from 'firebase/firestore';
import { getToken } from 'firebase/messaging';
import { auth, db, getMessagingInstance, rtdb } from './firebase';
import { ref as rtdbRef } from 'firebase/database';
import { SkeletonDashboard } from './components/Skeleton';
import RequestList from './RequestList';
import RequestHistory from './RequestHistory';
import ChatScreen from './ChatScreen';
import PharmacyProfile from './PharmacyProfile';
import PullToRefresh from './components/PullToRefresh';
import NotificationCenter from './components/NotificationCenter';
import useWindowWidth from './hooks/useWindowWidth';
import BottomNav from './components/BottomNav';
import EmptyState from './components/EmptyState';
import NotificationsPage from './components/NotificationsPage';
import { useHaptic } from './hooks/useHaptic';
import { useToast } from './components/ToastContext';

// Count-up hook for stats
const useCountUp = (end, duration = 1500) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let start = 0;
        let animationFrame;
        const step = (timestamp) => {
            if (!start) start = timestamp;
            const progress = Math.min((timestamp - start) / duration, 1);
            const easeProgress = progress * (2 - progress);
            setCount(Math.floor(easeProgress * end));
            if (progress < 1) animationFrame = window.requestAnimationFrame(step);
            else setCount(end);
        };
        animationFrame = window.requestAnimationFrame(step);
        return () => window.cancelAnimationFrame(animationFrame);
    }, [end, duration]);

    return count;
};

export default function DashboardPharmacy({ user }) {
    const [currentPath, setCurrentPath] = useState(window.location.pathname);
    const isMobile = useWindowWidth() < 480;
    const haptic = useHaptic();
    const toast = useToast();

    useEffect(() => {
        const handlePopState = () => setCurrentPath(window.location.pathname);
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    const navigate = (path) => {
        if (path.startsWith('/chat')) {
            window.location.href = path; // trigger full page load for standalone chat route
            return;
        }
        window.history.pushState({}, '', path);
        setCurrentPath(path);
    };
    const isMounted = React.useRef(true);

    useEffect(() => {
        return () => {
            isMounted.current = false;
        };
    }, []);

    const [pharmacyData, setPharmacyData] = useState(null);
    const [isFastResponder, setIsFastResponder] = useState(false);
    const [totalResponded, setTotalResponded] = useState(0);
    const [pendingCount, setPendingCount] = useState(0);
    const [receivedCount, setReceivedCount] = useState(0);


    const fetchPharmacyData = async () => {
        try {
            const ref = doc(db, 'pharmacies', user.uid);
            const snap = await getDoc(ref);
            if (isMounted.current && snap.exists()) {
                setPharmacyData(snap.data());
            }

            // Check Fast Responder
            const q = query(
                collectionGroup(db, 'pharmacyResponses'),
                where('pharmacyId', '==', user.uid)
            );
            const responsesSnap = await getDocs(q);
            if (isMounted.current && !responsesSnap.empty) {
                let totalDiff = 0;
                let validResponses = 0;
                responsesSnap.forEach(r => {
                    const data = r.data();
                    // BUG 7 FIX: Cloud Functions stores responseTimeSec, not timeToRespondMs
                    if (data.responseTimeSec !== undefined) {
                        totalDiff += data.responseTimeSec * 1000; // convert to ms for avg
                        validResponses++;
                    }
                });
                if (validResponses > 0) {
                    const avgMs = totalDiff / validResponses;
                    if (avgMs <= 120000) { // 2 minutes average
                        setIsFastResponder(true);
                    }
                }
            }

            // Fetch Total Received
            try {
                const receivedQ = query(collection(db, 'medicineRequests'), where('targetPharmacyIds', 'array-contains', user.uid));
                const receivedSnap = await getCountFromServer(receivedQ);
                if (isMounted.current) setReceivedCount(receivedSnap.data().count);
            } catch (e) { console.error('Error fetching received count', e); }

            // Fetch Total Responded
            try {
                const respondedQ = query(collectionGroup(db, 'pharmacyResponses'), where('pharmacyId', '==', user.uid));
                const respondedSnap = await getCountFromServer(respondedQ);
                if (isMounted.current) setTotalResponded(respondedSnap.data().count);
            } catch (e) {
                console.error('Error fetching collectionGroup responded count, falling back...', e);
                try {
                    const fallbackQ = query(collection(db, 'medicineRequests'), where('respondedPharmacies', 'array-contains', user.uid));
                    const fallbackSnap = await getCountFromServer(fallbackQ);
                    if (isMounted.current) setTotalResponded(fallbackSnap.data().count);
                } catch (e2) {
                    console.error('Error fetching fallback responded count', e2);
                }
            }

        } catch (err) {
            console.error("Error fetching pharmacy data:", err);
        }
    };

    useEffect(() => {
        fetchPharmacyData();
    }, [user.uid]);

    const [pharmacyRequests, setPharmacyRequests] = useState([]);

    // Apply count up to stats
    const displayReceived = useCountUp(receivedCount, 1500);
    const displayResponded = useCountUp(totalResponded, 1500);
    const displayPending = useCountUp(pendingCount, 1500);

    const [autoOfflined, setAutoOfflined] = useState(false);
    const lastInteractionRef = React.useRef(Date.now());

    // Idle Auto-Offline Logic
    useEffect(() => {
        if (!pharmacyData?.isOnline) return;

        const updateInteraction = () => { lastInteractionRef.current = Date.now(); };

        window.addEventListener('mousemove', updateInteraction);
        window.addEventListener('keydown', updateInteraction);
        window.addEventListener('touchstart', updateInteraction);
        // Mobile: reset timer when tab becomes visible again
        document.addEventListener('visibilitychange', updateInteraction);

        const interval = setInterval(async () => {
            // 60 minutes of inactivity (was 30)
            if (Date.now() - lastInteractionRef.current > 60 * 60 * 1000) {
                try {
                    await updateDoc(doc(db, 'pharmacies', user.uid), { isOnline: false });
                    if (isMounted.current) {
                        setPharmacyData(prev => prev ? { ...prev, isOnline: false } : prev);
                        setAutoOfflined(true);
                    }

                    const presenceRef = rtdbRef(rtdb, `pharmacyPresence/${user.uid}`);
                    const { set, onDisconnect } = await import('firebase/database');
                    await onDisconnect(presenceRef).cancel();
                    await set(presenceRef, false);
                } catch (e) {
                    console.error("Auto offline failed", e);
                }
            }
        }, 60000); // Check every minute

        return () => {
            window.removeEventListener('mousemove', updateInteraction);
            window.removeEventListener('keydown', updateInteraction);
            window.removeEventListener('touchstart', updateInteraction);
            document.removeEventListener('visibilitychange', updateInteraction);
            clearInterval(interval);
        };
    }, [pharmacyData?.isOnline, user.uid]);

    useEffect(() => {
        if (!user?.uid) return;

        const requestsRef = query(
            collection(db, "medicineRequests"),
            where("targetPharmacyIds", "array-contains", user.uid),
            where("status", "==", "pending")
        );

        const unsub = onSnapshot(requestsRef, (snapshot) => {
            const all = [];
            let pending = 0;

            snapshot.forEach((doc) => {
                const data = doc.data();

                const request = {
                    id: doc.id,
                    ...data
                };

                all.push(request);

                // BUG-R-06 fix: use optional chaining — old docs may not have respondedPharmacies field
                if (!data.respondedPharmacies?.includes(user.uid)) {
                    pending++;
                }
            });

            setPharmacyRequests(all);
            setPendingCount(pending);
        });

        return () => unsub();
    }, [user?.uid]);

    const handleToggleOnline = async () => {
        if (!pharmacyData || !pharmacyData.isVerified) return;
        haptic.toggle();
        const newState = !pharmacyData.isOnline;
        setPharmacyData({ ...pharmacyData, isOnline: newState });

        try {
            // If going online, ensure FCM token is saved so we can receive requests
            if (newState) {
                // Step 1: Request notification permission explicitly
                let notifPermission = Notification.permission;
                if (notifPermission === 'default') {
                    notifPermission = await Notification.requestPermission();
                }

                if (notifPermission !== 'granted') {
                    // Warn the pharmacy — they will go online but won't receive FCM notifications
                    console.warn('[FCM] Notification permission denied. Pharmacy will be online but may not receive push notifications.');
                    toast('⚠️ Enable notifications to receive medicine requests!', 'warning');
                } else {
                    // Step 2: Get FCM token with retry
                    let token = null;
                    for (let attempt = 1; attempt <= 3; attempt++) {
                        try {
                            const messagingInstance = await getMessagingInstance();
                            if (!messagingInstance) break;

                            let swReg = null;
                            if ('serviceWorker' in navigator) {
                                swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js').catch(() => null);
                                if (swReg) await new Promise(r => setTimeout(r, 300)); // wait for SW activation
                            }

                            token = await getToken(messagingInstance, {
                                vapidKey: 'BHnLEK_oes9RUvb78ulals2raz_m6xjoEflx2p3ZvnNsOPlcQ4DaF4R0NnaJXkipP5vRltPple3FS4cTn8m5-GY',
                                serviceWorkerRegistration: swReg || undefined,
                            });
                            if (token) break;
                        } catch (tokenErr) {
                            console.error(`[FCM] Token fetch attempt ${attempt} failed: `, tokenErr.message);
                            if (attempt < 3) await new Promise(r => setTimeout(r, 1000 * attempt));
                        }
                    }

                    if (token) {
                        // Save token to both pharmacies and users collections
                        await Promise.all([
                            setDoc(doc(db, 'pharmacies', user.uid), { fcmToken: token }, { merge: true }),
                            setDoc(doc(db, 'users', user.uid), { fcmToken: token }, { merge: true }),
                        ]);
                        console.log('[FCM] Token saved successfully for pharmacy:', user.uid);
                    } else {
                        console.error('[FCM] Failed to get token after 3 attempts — pharmacy will not receive FCM push notifications.');
                    }
                }

                // Set up RTDB presence hook so they go offline if browser closes
                const { ref: rtdbRef, onDisconnect, set } = await import('firebase/database'); // Renamed ref to rtdbRef
                const presenceRef = rtdbRef(rtdb, `pharmacyPresence/${user.uid}`);
                await onDisconnect(presenceRef).set(false);
                await set(presenceRef, true);
            } else {
                // If manually going offline, clear the RTDB presence
                const { ref: rtdbRef, set, onDisconnect } = await import('firebase/database'); // Renamed ref to rtdbRef
                const presenceRef = rtdbRef(rtdb, `pharmacyPresence/${user.uid}`);
                await onDisconnect(presenceRef).cancel();
                await set(presenceRef, false);
            }

            await updateDoc(doc(db, 'pharmacies', user.uid), { isOnline: newState });
        } catch (err) {
            console.error("Error toggling status:", err);
            if (isMounted.current) setPharmacyData(prev => prev ? { ...prev, isOnline: !newState } : prev);
        }
    };

    if (!pharmacyData) {
        return (
            <div className="app-main" style={{ display: 'flex', justifyContent: 'center' }}>
                <SkeletonDashboard />
            </div>
        );
    }

    if (pharmacyData.isSuspended) {
        return (
            <div className="home-dashboard page-transition" style={{ maxWidth: '640px', margin: '2rem auto', textAlign: 'center', padding: '2rem', background: '#1e293b', borderRadius: '16px', border: '1px solid #ef4444' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                    <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(239,68,68,0.15)', border: '2px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171' }}>
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>
                    </div>
                </div>
                <h2 style={{ color: '#f87171', margin: '0 0 1rem 0' }}>Account Suspended</h2>
                <p style={{ color: '#cbd5e1', fontSize: '0.95rem' }}>Your pharmacy account has been suspended by the administrator. You cannot accept or fulfill any new medicine requests.</p>
                <button className="btn-dynamic" onClick={() => signOut(auth)} style={{ marginTop: '1.5rem', background: '#3b82f6', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Log Out</button>
            </div>
        );
    }

    if (currentPath === '/notifications') {
        return (
            <NotificationsPage
                user={user}
                onBack={() => navigate('/')}
                onNavigate={navigate}
            />
        );
    }

    if (currentPath === '/profile') {
        return (
            <div className="home-dashboard animate-in" style={{ maxWidth: '600px', width: '100%', padding: '1rem', background: 'transparent' }}>
                <PharmacyProfile user={user} onNavigate={navigate} />
            </div>
        );
    }

    if (currentPath === '/history') {
        return (
            <div className="home-dashboard animate-in" style={{ maxWidth: '600px', width: '100%', padding: '1rem', background: 'transparent' }}>
                <RequestHistory
                    pharmacyUser={user}
                    onNavigate={navigate}
                />
            </div>
        );
    }


    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    return (
        <>
            <PullToRefresh onRefresh={fetchPharmacyData}>
                <div className="home-dashboard page-transition bottom-nav-padding" style={{ maxWidth: '640px', width: '100%', padding: '1rem', background: 'transparent' }}>

                    {autoOfflined && (
                        <div style={{
                            background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '12px', padding: '1rem',
                            marginBottom: '1rem', color: '#991B1B', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            animation: 'fadeInDown 0.3s ease-out'
                        }}>
                            <style>{`@keyframes fadeInDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } } `}</style>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#991B1B', flexShrink: 0, width: '24px', height: '24px' }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
                                </div>
                                <div>
                                    <strong style={{ display: 'block', fontSize: '0.9rem' }}>You were set to Offline</strong>
                                    <span style={{ color: '#B91C1C' }}>Due to 30 minutes of inactivity.</span>
                                </div>
                            </div>
                            <button className="btn-dynamic" onClick={() => setAutoOfflined(false)} style={{ background: 'transparent', border: 'none', color: '#DC2626', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
                        </div>
                    )}

                    <style>{`
@keyframes badgeBounce {
    0 %, 100 % { transform: translateY(0); }
    50 % { transform: translateY(-3px); }
}
                        .badge - bounce - anim {
    animation: badgeBounce 0.5s cubic - bezier(0.16, 1, 0.3, 1) 2;
}
`}</style>

                    {/* ── Hero Header Card ── */}
                    <div style={{
                        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a2f 60%, #0a2013 100%)',
                        borderRadius: '24px',
                        padding: '1.75rem',
                        marginBottom: '1.5rem',
                        position: 'relative',
                        overflow: 'hidden',
                    }}>
                        {/* Decorative circles */}
                        <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '160px', height: '160px', background: 'rgba(34,197,94,0.07)', borderRadius: '50%' }} />
                        <div style={{ position: 'absolute', bottom: '-30px', left: '-30px', width: '120px', height: '120px', background: 'rgba(59,130,246,0.06)', borderRadius: '50%' }} />

                        <div style={{ position: 'relative', zIndex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: isMobile ? 'wrap' : 'nowrap', gap: isMobile ? '0.75rem' : 0 }}>
                                {/* Left: Avatar + Name */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div
                                        onClick={() => navigate('/profile')}
                                        title="Manage Profile"
                                        style={{
                                            width: '56px', height: '56px',
                                            borderRadius: '16px',
                                            background: pharmacyData.profilePicUrl ? '#fff' : 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '1.1rem', fontWeight: 800, color: '#fff',
                                            cursor: 'pointer', overflow: 'hidden',
                                            border: '2px solid rgba(255,255,255,0.15)',
                                            flexShrink: 0,
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                            transition: 'transform 0.2s'
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                                    >
                                        {pharmacyData.profilePicUrl ? (
                                            <img src={pharmacyData.profilePicUrl} alt="Pharmacy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                                                {pharmacyData.name ? pharmacyData.name.trim()[0].toUpperCase() : 'R'}
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>
                                            {greeting}
                                        </div>
                                        <h1 style={{ fontSize: isMobile ? '1.3rem' : '1.75rem', fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.03em', lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                            {pharmacyData.name || 'Pharmacy Portal'}
                                            {pharmacyData.isVerified && (
                                                <span title="Verified" style={{ color: '#4ADE80', display: 'inline-flex', alignItems: 'center' }}>
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                                </span>
                                            )}
                                        </h1>
                                        {/* Badges */}
                                        <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                                            {pharmacyData.isVerified ? (
                                                <span style={{
                                                    background: 'rgba(59,130,246,0.2)', color: '#93C5FD',
                                                    border: '1px solid rgba(59,130,246,0.3)',
                                                    padding: '2px 8px', borderRadius: '20px',
                                                    fontSize: '0.68rem', fontWeight: 700
                                                }}>Verified</span>
                                            ) : (
                                                <span style={{
                                                    background: 'rgba(239,68,68,0.2)', color: '#FCA5A5',
                                                    border: '1px solid rgba(239,68,68,0.3)',
                                                    padding: '2px 8px', borderRadius: '20px',
                                                    fontSize: '0.68rem', fontWeight: 700
                                                }}>Unverified</span>
                                            )}
                                            {isFastResponder && (
                                                <span style={{
                                                    background: 'rgba(245,158,11,0.2)', color: '#FCD34D',
                                                    border: '1px solid rgba(245,158,11,0.3)',
                                                    padding: '2px 8px', borderRadius: '20px',
                                                    fontSize: '0.68rem', fontWeight: 700
                                                }}>Fast Responder</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Actions */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <NotificationCenter user={user} onNavigate={navigate} theme="dark" onOpenPage={() => navigate('/notifications')} />


                                </div>
                            </div>
                        </div>
                    </div>

                    {!pharmacyData.isVerified ? (
                        <div style={{
                            background: '#FEF2F2',
                            border: '1px solid #FCA5A5',
                            borderRadius: '16px',
                            padding: '2rem 1.5rem',
                            textAlign: 'center',
                            boxShadow: '0 4px 12px rgba(239,68,68,0.1)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                                <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#FEE2E2', border: '2px solid #FECACA', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DC2626' }}>
                                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                </div>
                            </div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#991B1B', margin: '0 0 0.5rem 0' }}>Verification Pending</h3>
                            <p style={{ color: '#B91C1C', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>
                                Your pharmacy account is currently under review by our administrators to verify your licenses and details. You will be able to receive medicine requests and go online once approved.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* ── Hero Online/Offline Status Banner (Issue #28) ── */}
                            <div
                                onClick={handleToggleOnline}
                                className="page-transition"
                                style={{
                                    background: pharmacyData.isOnline
                                        ? 'linear-gradient(135deg, #052e16 0%, #14532d 60%, #166534 100%)'
                                        : 'linear-gradient(135deg, #111827, #1f2937)',
                                    borderRadius: '20px',
                                    padding: '1.4rem 1.5rem',
                                    marginBottom: '1.5rem',
                                    border: pharmacyData.isOnline ? '1px solid rgba(34,197,94,0.35)' : '1px solid #374151',
                                    boxShadow: pharmacyData.isOnline ? '0 8px 32px rgba(34,197,94,0.18)' : '0 4px 16px rgba(0,0,0,0.1)',
                                    cursor: 'pointer',
                                    transition: 'all 0.4s cubic-bezier(0.16,1,0.3,1)',
                                    userSelect: 'none',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        {/* Pulsing status dot */}
                                        {pharmacyData.isOnline ? (
                                            <div style={{ position: 'relative', width: '32px', height: '32px', flexShrink: 0 }}>
                                                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(34,197,94,0.25)', animation: 'heroRing 1.8s ease-in-out infinite' }} />
                                                <div style={{ position: 'absolute', inset: '6px', borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 12px rgba(34,197,94,0.8)' }} />
                                            </div>
                                        ) : (
                                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#6B7280' }}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
                                            </div>
                                        )}
                                        <div>
                                            <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.05rem', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
                                                {pharmacyData.isOnline ? "You're Live" : "You're Offline"}
                                            </div>
                                            <div style={{ color: pharmacyData.isOnline ? 'rgba(134,239,172,0.9)' : '#6B7280', fontSize: '0.75rem', marginTop: '2px' }}>
                                                {pharmacyData.isOnline ? 'Receiving requests in your area' : 'Tap to go online and start receiving'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Pill Toggle */}
                                    <div style={{
                                        background: pharmacyData.isOnline ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)',
                                        border: pharmacyData.isOnline ? '1px solid rgba(34,197,94,0.4)' : '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '30px',
                                        padding: '6px 14px 6px 10px',
                                        display: 'flex', alignItems: 'center', gap: '8px',
                                        fontSize: '0.78rem', fontWeight: 700,
                                        color: pharmacyData.isOnline ? '#86efac' : '#9CA3AF',
                                        transition: 'all 0.3s',
                                        flexShrink: 0,
                                    }}>
                                        <div style={{
                                            width: '36px', height: '20px',
                                            background: pharmacyData.isOnline ? '#22C55E' : '#374151',
                                            borderRadius: '20px',
                                            position: 'relative',
                                            transition: 'background 0.3s',
                                            flexShrink: 0,
                                        }}>
                                            <div style={{
                                                width: '16px', height: '16px',
                                                background: '#fff',
                                                borderRadius: '50%',
                                                position: 'absolute', top: '2px',
                                                left: pharmacyData.isOnline ? '18px' : '2px',
                                                transition: 'left 0.3s',
                                                boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                                            }} />
                                        </div>
                                        {pharmacyData.isOnline ? 'ON' : 'OFF'}
                                    </div>
                                </div>
                            </div>
                            <style>{`@keyframes heroRing { 0 %, 100 % { transform: scale(1); opacity: 0.6; } 50 % { transform: scale(1.6); opacity: 0; } } `}</style>

                            {/* ── Stats Grid ── */}
                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(3, 1fr)', gap: isMobile ? '0.5rem' : '0.875rem', marginBottom: '1.5rem' }}>
                                {[
                                    { label: 'Received', value: displayReceived, color: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE' },
                                    { label: 'Responded', value: displayResponded, color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
                                    { label: 'Pending', value: displayPending, color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', isPending: true },
                                ].map(stat => (
                                    <div key={stat.label} className={stat.isPending && stat.value > 0 ? "badge-bounce-anim" : ""} style={{
                                        background: stat.bg,
                                        border: `1px solid ${stat.border} `,
                                        padding: '1rem 0.75rem',
                                        borderRadius: '16px',
                                        textAlign: 'center',
                                        boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
                                    }}>
                                        <div style={{ fontSize: isMobile ? '1.4rem' : '1.75rem', fontWeight: 800, color: stat.color, lineHeight: 1, marginBottom: '4px' }}>{stat.value}</div>
                                        <div style={{ fontSize: isMobile ? '0.6rem' : '0.7rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>{stat.label}</div>
                                    </div>
                                ))}
                            </div>

                            {/* ── Active Feed ── */}
                            {pharmacyData.isOnline ? (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '-0.01em' }}>
                                            <span style={{
                                                display: 'inline-block', width: '9px', height: '9px',
                                                background: '#22C55E', borderRadius: '50%',
                                                boxShadow: '0 0 8px rgba(34,197,94,0.7)'
                                            }} />
                                            Live Requests
                                        </h3>
                                        <button className="btn-dynamic"
                                            onClick={() => navigate('/history')}
                                            style={{
                                                background: '#F0FDF4', color: '#15803D',
                                                border: '1px solid #BBF7D0',
                                                padding: '0.4rem 0.875rem', borderRadius: '20px',
                                                fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', gap: '5px',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.background = '#DCFCE7'; e.currentTarget.style.borderColor = '#86EFAC'; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = '#F0FDF4'; e.currentTarget.style.borderColor = '#BBF7D0'; }}
                                        >
                                            History
                                        </button>
                                    </div>
                                    <div className="active-requests-section">
                                        <RequestList pharmacyUser={user} pharmacyRequests={pharmacyRequests} onNavigate={navigate} />
                                    </div>
                                </>
                            ) : (
                                <div style={{
                                    textAlign: 'center', padding: isMobile ? '2rem 1rem' : '3.5rem 2rem',
                                    background: '#F9FAFB', borderRadius: '20px',
                                    border: '1px solid #E5E7EB'
                                }}>
                                    <div style={{ marginBottom: '0.75rem', opacity: 0.5 }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" /></svg>
                                    </div>
                                    <h3 style={{ color: '#374151', fontWeight: 700, marginBottom: '0.4rem' }}>You are Offline</h3>
                                    <p style={{ color: '#9CA3AF', fontSize: '0.875rem', margin: 0 }}>Toggle Online above to start receiving medicine requests.</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </PullToRefresh>
            <BottomNav
                role="pharmacy"
                activeTab={
                    currentPath === '/history' ? 'history'
                        : currentPath === '/profile' ? 'profile'
                            : currentPath.startsWith('/requests') ? 'requests'
                                : 'dashboard'
                }
                newRequestCount={pendingCount}
                onChange={(tab) => {
                    if (tab === 'dashboard') navigate('/');
                    else if (tab === 'history') navigate('/history');
                    else if (tab === 'profile') navigate('/profile');
                    else if (tab === 'requests') navigate('/requests');
                }}
            />
        </>
    );
}

