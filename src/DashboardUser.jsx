import React, { useState, useEffect, useRef } from 'react';
import { signOut } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc, limit, orderBy, onSnapshot, updateDoc } from 'firebase/firestore';
import { ref, onValue } from 'firebase/database';
import { auth, db, rtdb } from './firebase';
import FindMedicine from './FindMedicine';

import ResultsScreen from './ResultsScreen';
import PullToRefresh from './components/PullToRefresh';
import NotificationCenter from './components/NotificationCenter';
import PharmacyMap from './components/PharmacyMap';
import PatientHistory from './PatientHistory';
import UserProfile from './UserProfile';
import BottomNav from './components/BottomNav';
import RequestTracker from './components/RequestTracker';
import EmptyState from './components/EmptyState';
import NotificationsPage from './components/NotificationsPage';
import { SkeletonUserDashboard } from './components/Skeleton';


// ── Status helpers ──────────────────────────────────────────────────────────
const getStatusConfig = (req) => {
    const isExpired = req.expiresAt?.toMillis() ? req.expiresAt.toMillis() < Date.now() : false;
    const isCancelled = req.status === 'cancelled';
    const isClosed = req.status === 'closed';
    const responseCount = req.responsesCount || 0;

    if (isCancelled) return { label: 'Cancelled', dot: '#EF4444', bg: '#FEF2F2', color: '#DC2626' };
    if (isClosed) return { label: 'Closed', dot: '#6B7280', bg: '#F3F4F6', color: '#4B5563' };
    if (req.status === 'matched' || responseCount > 0)
        return { label: responseCount > 0 ? `${responseCount} Match${responseCount !== 1 ? 'es' : ''}` : 'Matched', dot: '#22C55E', bg: '#F0FDF4', color: '#15803D' };
    if (isExpired || req.status === 'expired' || req.status === 'timeout') return { label: 'Expired', dot: '#6B7280', bg: '#F3F4F6', color: '#4B5563' };
    if (req.status === 'pending') return { label: 'Searching…', dot: '#F59E0B', bg: '#FFFBEB', color: '#B45309' };

    return { label: 'Active', dot: '#3B82F6', bg: '#EFF6FF', color: '#1D4ED8' };
};

export default function DashboardUser({ user }) {
    const [currentPath, setCurrentPath] = useState(window.location.pathname);
    const currentPathRef = useRef(window.location.pathname);

    // Keep ref in sync so closures always read the latest path
    useEffect(() => {
        currentPathRef.current = currentPath;
    }, [currentPath]);

    // BUG-05 / User Request fix: Use real URL paths for navigation like DashboardPharmacy
    // so we don't rely on internal view state and hashes anymore.
    // The App.js route is just /dashboard, but we'll use pushState to simulate
    // sub-routes like /find_medicine, /results, /history, /profile, /notifications.

    useEffect(() => {
        const handlePopState = (e) => {
            setCurrentPath(window.location.pathname);
            // BUG-R-01 fix: clear viewingRequestId when navigating away from results
            if (window.location.pathname !== '/results') {
                setViewingRequestId(null);
            }
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    const navigate = (path) => {
        // Bug fix: /chat is a standalone React Router route — use real navigation, not pushState
        if (path.startsWith('/chat')) {
            window.location.href = path;
            return;
        }
        window.history.pushState({}, '', path);
        setCurrentPath(path);
    };

    // BUG-R-04 fix: persist activeRequestId in sessionStorage so banner survives page refresh
    const [activeRequestId, setActiveRequestIdState] = useState(
        () => sessionStorage.getItem('lp_activeReqId') || null
    );
    const setActiveRequestId = (id) => {
        if (id) sessionStorage.setItem('lp_activeReqId', id);
        else sessionStorage.removeItem('lp_activeReqId');
        setActiveRequestIdState(id);
    };
    const [activeRequestData, setActiveRequestData] = useState(null);  // live data for the banner

    const [viewingRequestId, setViewingRequestId] = useState(null);    // request being viewed in ResultsScreen
    const [userName, setUserName] = useState('');
    const [userPicUrl, setUserPicUrl] = useState('');
    const [isSuspended, setIsSuspended] = useState(false);
    const [recentRequests, setRecentRequests] = useState([]);
    const [unreadCounts, setUnreadCounts] = useState({});

    const [activePharmaciesCount, setActivePharmaciesCount] = useState(0);
    const [hoveredCard, setHoveredCard] = useState(null);
    const [mapView, setMapView] = useState(false);
    const [onlinePharmaciesList, setOnlinePharmaciesList] = useState([]);
    const [userLoc, setUserLoc] = useState(null);
    const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
    const [loading, setLoading] = useState(true);

    // Feature: Add to Home Screen (PWA) banner
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showInstallBanner, setShowInstallBanner] = useState(false);

    useEffect(() => {
        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            if (!localStorage.getItem('lp_pwa_dismissed')) {
                setShowInstallBanner(true);
            }
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setShowInstallBanner(false);
        }
        setDeferredPrompt(null);
    };

    const handleDismissInstall = () => {
        setShowInstallBanner(false);
        localStorage.setItem('lp_pwa_dismissed', 'true');
    };

    useEffect(() => {
        // Only show prompt if notifications are supported and currently in 'default' state
        if ('Notification' in window && Notification.permission === 'default') {
            const hasDismissed = localStorage.getItem('lp_notif_dismissed');
            if (!hasDismissed) {
                setShowNotificationPrompt(true);
            }
        }
    }, []);

    const handleEnableNotifications = async () => {
        try {
            const result = await Notification.requestPermission();
            if (result === 'granted') {
                setShowNotificationPrompt(false);
                // The actual FCM token generation happens centrally in App.jsx when permission changes
            } else {
                setShowNotificationPrompt(false);
                localStorage.setItem('lp_notif_dismissed', 'true');
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
        }
    };

    const handleDismissNotifications = () => {
        setShowNotificationPrompt(false);
        localStorage.setItem('lp_notif_dismissed', 'true');
    };

    // Live tracker for the most recently submitted request (replaces waiting screen)
    useEffect(() => {
        if (!activeRequestId) { setActiveRequestData(null); return; }
        const unsub = onSnapshot(doc(db, 'medicineRequests', activeRequestId), (snap) => {
            if (snap.exists()) {
                const d = snap.data();
                setActiveRequestData({ id: snap.id, ...d });
                // Auto-clear banner when request is terminal
                if (d.status === 'cancelled' || d.status === 'closed') {
                    setActiveRequestId(null);
                    fetchUserData(true, currentPathRef.current); // use ref to avoid stale closure
                }
            }
        });
        return () => unsub();
    }, [activeRequestId]);

    // BUG-10 fix: track last fetch timestamp to throttle Firestore reads
    const lastFetchRef = useRef(0);

    // Live online pharmacy count and data for Map
    useEffect(() => {
        const q = query(collection(db, 'pharmacies'), where('isOnline', '==', true));
        const unsub = onSnapshot(q, (snap) => {
            const list = [];
            snap.forEach(doc => {
                const data = doc.data();
                if (data.location) {
                    list.push({ id: doc.id, ...data });
                }
            });
            setOnlinePharmaciesList(list);
            setActivePharmaciesCount(list.length);
        });

        // Try to get user location for Map centering
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setUserLoc({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
                (err) => { /* Geolocation error — handled silently */ }
            );
        }

        return () => unsub();
    }, []);

    // Watch for unread messages
    useEffect(() => {
        if (!user || recentRequests.length === 0) return;
        let isMounted = true;
        // BUG-NEW-09 / BUG-02 fix: use a ref so the cleanup function always has access
        // to listeners registered asynchronously AFTER cleanup might have run.
        const unsubscribesRef = { current: [] };

        recentRequests.forEach(req => {
            if (req.status === 'matched' || req.responsesCount > 0) {
                const respRef = collection(db, 'medicineRequests', req.id, 'pharmacyResponses');
                getDocs(respRef).then(snap => {
                    if (!isMounted) return; // Cleanup check before attaching listener
                    snap.docs.forEach(pharmacyDoc => {
                        const chatId = `${req.id}_${pharmacyDoc.id}`;

                        // Issue #17 fix: proactively register as chatMember
                        // so the RTDB security rule allows the read below.
                        const memberRef = ref(rtdb, `chatMembers/${chatId}/${user.uid}`);
                        import('firebase/database').then(({ get: dbGet, set: dbSet }) => {
                            dbGet(memberRef).then(memberSnap => {
                                const attachListener = () => {
                                    if (!isMounted) return;
                                    // Bug#6 fix: read only /messages node to avoid pulling typing/reactions payloads
                                    const messagesRef = ref(rtdb, `chats/${chatId}/messages`);
                                    const lastReadRef = ref(rtdb, `chats/${chatId}/lastRead/${user.uid}`);
                                    let lastReadTime = 0;
                                    dbGet(lastReadRef).then(snap => { if (snap.exists()) lastReadTime = snap.val(); }).catch(() => { });

                                    const unsub = onValue(messagesRef, (messagesSnap) => {
                                        let hasUnread = false;
                                        messagesSnap.forEach((msgSnap) => {
                                            const msg = msgSnap.val();
                                            if (msg && msg.senderId !== user.uid && msg.timestamp > lastReadTime) hasUnread = true;
                                        });
                                        if (isMounted) {
                                            setUnreadCounts(prev => ({ ...prev, [req.id]: hasUnread }));
                                        }
                                    });
                                    unsubscribesRef.current.push(unsub);
                                };

                                if (!memberSnap.exists()) {
                                    dbSet(memberRef, true).then(attachListener).catch(attachListener);
                                } else {
                                    attachListener();
                                }
                            }).catch(() => { });
                        });
                    });
                });
            }
        });

        return () => {
            isMounted = false;
            unsubscribesRef.current.forEach(unsub => unsub());
            unsubscribesRef.current = [];
        };
    }, [recentRequests, user]);

    // BUG-NEW-06 fix: accept currentView as param so the limit() call uses the
    // correct view value, not a stale closure capture.
    const fetchUserData = async (force = false, currentView = 'dashboard') => {
        // BUG-10 fix: throttle — skip if fetched within the last 60 seconds (unless forced)
        const now = Date.now();
        if (!force && now - lastFetchRef.current < 60000) return;
        lastFetchRef.current = now;
        try {
            const userSnap = await getDoc(doc(db, 'users', user.uid));
            if (userSnap.exists()) {
                const ud = userSnap.data();
                setUserName(ud.name || '');
                setUserPicUrl(ud.profilePicUrl || '');
                setIsSuspended(ud.isSuspended || false);
            }

            const q = query(
                collection(db, 'medicineRequests'),
                where('userId', '==', user.uid),
                orderBy('createdAt', 'desc'),
                limit(currentView === 'dashboard' ? 5 : 50)
            );
            const reqSnap = await getDocs(q);
            const reqs = [];
            reqSnap.forEach(r => reqs.push({ id: r.id, ...r.data() }));
            setRecentRequests(reqs);
        } catch (err) {
            console.error("Error fetching user data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (currentPath === '/dashboard' || currentPath === '/history' || currentPath === '/') fetchUserData(false, currentPath);
    }, [user.uid, currentPath]);

    // ── Sub-views ─────────────────────────────────────────────────────────────
    let mainContent;

    if (currentPath === '/notifications') {
        mainContent = (
            <NotificationsPage
                user={user}
                onBack={() => navigate('/dashboard')}
                onNavigate={navigate}
            />
        );
    } else if (currentPath === '/profile') {
        mainContent = (
            <UserProfile
                user={user}
                onBack={() => navigate('/dashboard')}
                onSaved={(newName, newPic) => {
                    setUserName(newName);
                    if (newPic) setUserPicUrl(newPic);
                    navigate('/dashboard');
                }}
            />
        );
    } else if (currentPath === '/find_medicine') {
        mainContent = (
            <FindMedicine
                user={user}
                onBack={() => navigate('/dashboard')}
                onSuccess={(id) => {
                    // Stay on dashboard — show live banner instead of separate waiting screen
                    setActiveRequestId(id);
                    navigate('/dashboard');
                    fetchUserData(true, '/dashboard');
                }}
            />
        );
    } else if (currentPath === '/results') {
        // ── ResultsScreen: viewing ANY request (card click or banner "View Responses") ──
        // Bug#5 fix: if view=results but id is null, fallback to dashboard silently
        if (!viewingRequestId) {
            // Defensive: reset to dashboard if no request selected
            setTimeout(() => navigate('/dashboard'), 0);
            mainContent = null;
        } else {
            mainContent = (
                <ResultsScreen
                    requestId={viewingRequestId}
                    onBack={() => {
                        setViewingRequestId(null);
                        navigate('/dashboard');
                        fetchUserData(true, '/dashboard');
                    }}
                    onNavigate={navigate}
                />
            );
        }
    } else if (currentPath === '/history') {
        // ── History view ──
        mainContent = (
            <div className="animate-in bottom-nav-padding" style={{ width: '100%', maxWidth: '720px', padding: '0.5rem 0' }}>
                {/* Header — no back arrow, History is a primary tab like Pharmacy Dashboard */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#111827', margin: 0 }}>My Request History</h1>
                    <p style={{ color: '#6B7280', fontSize: '0.82rem', margin: '4px 0 0' }}>All your past medicine searches</p>
                </div>

                <PatientHistory user={user} onViewRequest={(id) => { setViewingRequestId(id); navigate('/results'); }} onNavigate={navigate} />
            </div>
        );
    } else {
        const hour = new Date().getHours();
        const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
        const displayName = userName ? userName.split(' ')[0] : 'User';

        if (loading) {
            mainContent = <SkeletonUserDashboard />;
        } else {
            // ── Main Dashboard ────────────────────────────────────────────────────────
            mainContent = (
                <PullToRefresh onRefresh={fetchUserData}>
                    <div className="animate-in bottom-nav-padding" style={{ width: '100%', maxWidth: '720px', padding: '0.5rem 0' }}>

                        {/* ── Header ── */}
                        <style>
                            {`
                                @keyframes slideUpFade {
                                    from { opacity: 0; transform: translateY(12px); }
                                    to { opacity: 1; transform: translateY(0); }
                                }
                                .greeting-anim {
                                    animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                                }
                            `}
                        </style>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                            <div className="greeting-anim">
                                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#22C55E', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>
                                    {greeting}
                                </div>
                                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.03em', lineHeight: 1.2 }}>
                                    {displayName}
                                </h1>
                                <p style={{ color: '#64748B', fontSize: '0.95rem', margin: '0.25rem 0 0' }}>
                                    Find medicines near you instantly
                                </p>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <NotificationCenter user={user} onNavigate={navigate} onOpenPage={() => navigate('/notifications')} />
                            </div>
                        </div>

                        {/* ── Search Hero Card ── */}
                        <div style={{
                            background: 'var(--color-bg-card-gradient)',
                            borderRadius: '24px',
                            padding: '2rem',
                            marginBottom: '1.5rem',
                            position: 'relative',
                            overflow: 'hidden',
                        }}>
                            {/* Decorative circles */}
                            <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '160px', height: '160px', background: 'rgba(34,197,94,0.08)', borderRadius: '50%' }} />
                            <div style={{ position: 'absolute', bottom: '-60px', left: '40%', width: '200px', height: '200px', background: 'rgba(34,197,94,0.05)', borderRadius: '50%' }} />

                            <div style={{ position: 'relative', zIndex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                                    <div style={{
                                        background: 'rgba(34, 197, 94, 0.15)',
                                        border: '1px solid rgba(34, 197, 94, 0.3)',
                                        borderRadius: '14px',
                                        width: '52px', height: '52px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: '#22C55E'
                                    }}>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 10.56L13.44 14M6.92 11.23l6.85-6.85a3.86 3.86 0 0 1 5.46 5.46l-6.85 6.85a3.86 3.86 0 0 1-5.46-5.46z"></path></svg>
                                    </div>
                                    <div>
                                        <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem', lineHeight: 1.2 }}>Find Medicine Nearby</div>
                                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginTop: '2px' }}>Real-time pharmacy availability</div>
                                    </div>
                                </div>

                                {isSuspended ? (
                                    <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '1rem', color: '#fca5a5', fontSize: '0.9rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fca5a5', flexShrink: 0 }}>
                                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>
                                        </div>
                                        <div>
                                            <strong>Account Suspended.</strong> You are temporarily blocked from making new requests. Please contact support.
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                        <button className="btn-dynamic"
                                            onClick={() => navigate('/find_medicine')}
                                            style={{
                                                background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '14px',
                                                padding: '0.875rem 1.5rem',
                                                fontSize: '0.95rem',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', gap: '8px',
                                                boxShadow: '0 4px 20px rgba(34, 197, 94, 0.4)',
                                                transition: 'all 0.2s',
                                                flex: 1
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(34, 197, 94, 0.5)'; }}
                                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(34, 197, 94, 0.4)'; }}
                                        >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                            </svg>
                                            Search Medicines
                                        </button>

                                        <button className="btn-dynamic"
                                            onClick={() => { navigate('/find_medicine?mode=prescription'); }}
                                            style={{
                                                background: 'rgba(255,255,255,0.15)',
                                                color: '#ffffff',
                                                border: '1px solid rgba(255,255,255,0.3)',
                                                borderRadius: '14px',
                                                padding: '0.875rem 1.25rem',
                                                fontSize: '0.9rem',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', gap: '8px',
                                                transition: 'all 0.2s',
                                                whiteSpace: 'nowrap'
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)'; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg> Upload Prescription
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── Notification Nudge ── */}
                        {showNotificationPrompt && (
                            <div style={{
                                background: 'linear-gradient(to right, #EEF2FF, #E0E7FF)',
                                borderRadius: '16px',
                                padding: '1.25rem',
                                marginBottom: '1.5rem',
                                border: '1px solid #C7D2FE',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '1rem',
                                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.05)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '40px', height: '40px', background: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 4px rgba(0,0,0,0.05)', color: '#4F46E5' }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 700, color: '#3730A3', fontSize: '0.95rem' }}>Never miss a match</div>
                                        <div style={{ fontSize: '0.8rem', color: '#4F46E5', marginTop: '2px' }}>Enable notifications to know when a pharmacy replies.</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                    <button className="btn-dynamic"
                                        onClick={handleDismissNotifications}
                                        style={{ background: 'transparent', color: '#6366F1', border: '1px solid #A5B4FC', padding: '0.5rem 0.75rem', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                                    >Later</button>
                                    <button className="btn-dynamic"
                                        onClick={handleEnableNotifications}
                                        style={{ background: '#4F46E5', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(79, 70, 229, 0.4)' }}
                                    >Enable</button>
                                </div>
                            </div>
                        )}

                        {/* ── PWA Install Banner ── */}
                        {showInstallBanner && (
                            <div style={{
                                background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                                borderRadius: '16px', padding: '1.25rem',
                                marginBottom: '1.5rem',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
                                animation: 'fadeInDown 0.4s cubic-bezier(0.16, 1, 0.3, 1) both'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                                    <div style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></svg>
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Install LocalPill App</div>
                                        <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Fast access & offline support</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, marginLeft: '12px' }}>
                                    <button className="btn-dynamic" onClick={handleDismissInstall} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', padding: '6px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}>Not Now</button>
                                    <button className="btn-dynamic" onClick={handleInstallClick} style={{ background: '#fff', color: '#1D4ED8', border: 'none', padding: '8px 16px', borderRadius: '20px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>Install</button>
                                </div>
                            </div>
                        )}

                        {/* ── View Toggle ── */}
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                            <div style={{ background: 'var(--color-bg-surface)', padding: '4px', borderRadius: '12px', display: 'flex', gap: '4px' }}>
                                <button className="btn-dynamic"
                                    onClick={() => setMapView(false)}
                                    style={{
                                        background: !mapView ? 'var(--color-bg-main)' : 'transparent',
                                        color: !mapView ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                                        boxShadow: !mapView ? 'var(--shadow-sm)' : 'none',
                                        fontWeight: !mapView ? 700 : 500,
                                        border: 'none', padding: '6px 16px', borderRadius: '8px',
                                        fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.2s'
                                    }}
                                >
                                    My Requests
                                </button>
                                <button className="btn-dynamic"
                                    onClick={() => setMapView(true)}
                                    style={{
                                        background: mapView ? 'var(--color-bg-main)' : 'transparent',
                                        color: mapView ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                                        boxShadow: mapView ? 'var(--shadow-sm)' : 'none',
                                        fontWeight: mapView ? 700 : 500,
                                        border: 'none', padding: '6px 16px', borderRadius: '8px',
                                        fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.2s'
                                    }}
                                >
                                    Map View
                                </button>
                            </div>
                        </div>

                        {/* ── Live Pharmacies Badge ── */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.625rem',
                            background: activePharmaciesCount > 0 ? 'var(--color-success-subtle)' : 'var(--color-bg-surface)',
                            border: `1px solid ${activePharmaciesCount > 0 ? 'var(--color-success-border)' : 'var(--color-border)'}`,
                            borderRadius: '12px',
                            padding: '0.75rem 1rem',
                            marginBottom: '1.5rem',
                        }}>
                            <span style={{
                                width: '10px', height: '10px',
                                borderRadius: '50%',
                                background: activePharmaciesCount > 0 ? 'var(--color-success)' : 'var(--color-text-secondary)',
                                boxShadow: activePharmaciesCount > 0 ? '0 0 0 3px rgba(34, 197, 94, 0.2)' : 'none',
                                flexShrink: 0,
                                display: 'inline-block'
                            }} />
                            <span style={{ fontSize: '0.875rem', color: activePharmaciesCount > 0 ? 'var(--color-success-dark)' : 'var(--color-text-secondary)', fontWeight: 600 }}>
                                {activePharmaciesCount > 0
                                    ? `${activePharmaciesCount} pharmacist${activePharmaciesCount !== 1 ? 's' : ''} online & ready`
                                    : 'No pharmacies online right now'}
                            </span>
                            <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22C55E', display: 'inline-block', animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite' }} />
                                Live
                            </span>
                        </div>

                        {mapView ? (
                            <div className="animate-in" style={{ marginBottom: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem' }}>
                                    <div>
                                        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>Online Pharmacies</h2>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: '2px 0 0 0' }}>Find active pharmacies near you plotted in real-time.</p>
                                    </div>
                                </div>
                                <PharmacyMap
                                    pharmacies={onlinePharmaciesList}
                                    userLocation={userLoc}
                                    onSelectPharmacy={(pharmacy) => {
                                        // Direct routing logic to find medicine modal prepopulated or similar
                                        navigate('/find_medicine');
                                    }}
                                />
                            </div>
                        ) : (
                            <>
                                {/* ── Live Active Request Tracker (Issue #25) ── */}
                                {activeRequestId && activeRequestData && (activeRequestData.status === 'pending' || activeRequestData.status === 'matched') && (() => {
                                    const timeLeft = activeRequestData.expiresAt ? Math.max(0, Math.floor((activeRequestData.expiresAt.toMillis() - Date.now()) / 1000)) : 0;
                                    const urgencyColor = timeLeft > 200 ? 'rgba(34,197,94,0.4)' : timeLeft > 100 ? 'rgba(245,158,11,0.4)' : 'rgba(239,68,68,0.5)';
                                    const urgencyBorder = timeLeft > 200 ? '#22C55E' : timeLeft > 100 ? '#F59E0B' : '#EF4444';

                                    return (
                                        <div style={{
                                            marginBottom: '1.5rem',
                                            transition: 'all 0.5s ease',
                                            boxShadow: `0 8px 24px ${urgencyColor}`,
                                            border: `1px solid ${urgencyBorder}`,
                                            borderRadius: '16px',
                                            padding: '4px'
                                        }}>
                                            <RequestTracker
                                                notifiedCount={activeRequestData.notifiedPharmaciesCount || 0}
                                                respondedCount={activeRequestData.responsesCount || 0}
                                                matchFound={(activeRequestData.responsesCount || 0) > 0}
                                                timeLeftSeconds={timeLeft}
                                            />
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                {(activeRequestData.responsesCount || 0) > 0 && (
                                                    <button className="btn-dynamic"
                                                        onClick={() => { setViewingRequestId(activeRequestId); navigate('/results'); }}
                                                        style={{ background: 'var(--color-success)', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.5rem 1.1rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
                                                    >View Responses →</button>
                                                )}
                                                <button className="btn-dynamic"
                                                    onClick={async () => {
                                                        try { await updateDoc(doc(db, 'medicineRequests', activeRequestId), { status: 'cancelled' }); } catch (e) { console.error(e); }
                                                        setActiveRequestId(null); setActiveRequestData(null);
                                                    }}
                                                    style={{ background: 'var(--color-bg-surface-hover)', color: 'var(--color-text-secondary)', border: 'none', borderRadius: '10px', padding: '0.4rem 1rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                                                >Cancel Search</button>
                                            </div>
                                        </div>
                                    )
                                })()}

                                {/* ── Recent Requests ── */}
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, letterSpacing: '-0.01em' }}>
                                            Recent Requests
                                        </h2>
                                        {/* MISS-01 fix: View All button → history view */}
                                        <button className="btn-dynamic"
                                            onClick={() => { fetchUserData(true, '/history'); navigate('/history'); }}
                                            style={{ background: 'none', border: 'none', color: 'var(--color-primary-main)', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', padding: '4px 8px', borderRadius: '8px', transition: 'background 0.2s' }}
                                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-primary-subtle)'; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                                        >View All →</button>
                                    </div>

                                    {recentRequests.length === 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '16px' }}>
                                                <EmptyState
                                                    icon={<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>}
                                                    title="No requests yet"
                                                    subtitle="Search for a medicine to see nearby pharmacies"
                                                    ctaLabel="Find Medicine"
                                                    onCta={() => navigate('/find_medicine')}
                                                />
                                            </div>
                                            <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '1.25rem' }}>
                                                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.85rem 0', color: 'var(--color-text-primary)' }}>Popular Searches</h3>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                    {['Dolo 650', 'Pan D', 'Azithromycin 500mg', 'Crocin Advance', 'Cetirizine 10mg'].map(med => (
                                                        <button
                                                            key={med}
                                                            className="btn-dynamic"
                                                            onClick={() => navigate(`/find_medicine?meds=${encodeURIComponent(JSON.stringify([med]))}`)}
                                                            style={{
                                                                background: 'var(--color-bg-subtle)',
                                                                border: '1px solid var(--color-border)',
                                                                borderRadius: '20px', padding: '6px 14px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)', cursor: 'pointer'
                                                            }}>
                                                            {med}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                                            {recentRequests.map(req => {
                                                const status = getStatusConfig(req);
                                                const medicines = req.typedMedicines?.length > 0 ? req.typedMedicines : null;
                                                const medicineName = medicines ? medicines.join(', ') : 'Prescription Upload';
                                                const isHovered = hoveredCard === req.id;

                                                return (
                                                    <div
                                                        key={req.id}
                                                        onClick={() => { setViewingRequestId(req.id); navigate('/results'); }}
                                                        onMouseEnter={() => setHoveredCard(req.id)}
                                                        onMouseLeave={() => setHoveredCard(null)}
                                                        style={{
                                                            background: 'var(--color-bg-surface)',
                                                            border: `1px solid ${isHovered ? 'var(--color-primary-border)' : 'var(--color-border)'}`,
                                                            borderRadius: '14px',
                                                            padding: '1rem 1.25rem',
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            gap: '1rem',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s ease',
                                                            transform: isHovered ? 'translateY(-1px)' : 'none',
                                                            boxShadow: isHovered ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                                                        }}
                                                    >
                                                        {/* Left: icon + details */}
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', flex: 1, minWidth: 0 }}>
                                                            <div style={{
                                                                width: '40px', height: '40px', flexShrink: 0,
                                                                background: status.bg,
                                                                borderRadius: '10px',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                color: 'var(--color-text-primary)'
                                                            }}>
                                                                {req.typedMedicines?.length > 0 ? (
                                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 10.56L13.44 14M6.92 11.23l6.85-6.85a3.86 3.86 0 0 1 5.46 5.46l-6.85 6.85a3.86 3.86 0 0 1-5.46-5.46z"></path></svg>
                                                                ) : (
                                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
                                                                )}
                                                            </div>
                                                            <div style={{ minWidth: 0 }}>
                                                                {medicines ? (
                                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '4px' }}>
                                                                        {medicines.slice(0, 3).map((med, i) => (
                                                                            <span key={i} style={{
                                                                                background: 'var(--color-success-subtle)', color: 'var(--color-success-dark)',
                                                                                border: '1px solid var(--color-success-border)',
                                                                                borderRadius: '20px',
                                                                                padding: '2px 8px',
                                                                                fontSize: '0.72rem', fontWeight: 600,
                                                                            }}>{med}</span>
                                                                        ))}
                                                                        {medicines.length > 3 && (
                                                                            <span style={{ background: 'var(--color-bg-subtle)', color: 'var(--color-text-secondary)', borderRadius: '20px', padding: '2px 8px', fontSize: '0.72rem', fontWeight: 600 }}>+{medicines.length - 3}</span>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '0.9rem', marginBottom: '2px' }}>Prescription Upload</div>
                                                                )}
                                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                                                                    {req.createdAt?.toDate()?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) || ''}
                                                                    {req.createdAt ? ' · ' : ''}
                                                                    {req.createdAt?.toDate()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || ''}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                {unreadCounts[req.id] && (
                                                                    <span style={{
                                                                        background: 'var(--color-error)', color: 'white',
                                                                        fontSize: '0.7rem', fontWeight: 700,
                                                                        padding: '2px 8px', borderRadius: '20px',
                                                                        animation: 'fadeIn 0.3s ease'
                                                                    }}>New</span>
                                                                )}
                                                                <span style={{
                                                                    background: status.bg,
                                                                    color: status.color,
                                                                    fontSize: '0.75rem',
                                                                    fontWeight: 600,
                                                                    padding: '4px 10px',
                                                                    borderRadius: '20px',
                                                                    display: 'flex', alignItems: 'center', gap: '5px'
                                                                }}>
                                                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: status.dot, display: 'inline-block' }} />
                                                                    {status.label}
                                                                </span>
                                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <polyline points="9 18 15 12 9 6"></polyline>
                                                                </svg>
                                                            </div>
                                                            {/* Feature: Search Again / Re-order Button */}
                                                            {req.typedMedicines?.length > 0 && (
                                                                <button className="btn-dynamic"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        const encoded = encodeURIComponent(JSON.stringify(req.typedMedicines));
                                                                        navigate(`/find_medicine?meds=${encoded}`);
                                                                    }}
                                                                    style={{
                                                                        background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE',
                                                                        borderRadius: '8px', padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600,
                                                                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                                                                        transition: 'all 0.2s'
                                                                    }}
                                                                    onMouseEnter={e => { e.currentTarget.style.background = '#DBEAFE' }}
                                                                    onMouseLeave={e => { e.currentTarget.style.background = '#EFF6FF' }}
                                                                >
                                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                                                                    Search Again
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </PullToRefresh>
            );
        }
    }

    return (
        <>
            {mainContent}
            <BottomNav
                role="patient"
                activeTab={
                    currentPath === '/find_medicine' ? 'search'
                        : currentPath === '/history' ? 'history'
                            : currentPath === '/profile' ? 'profile'
                                : 'home'
                }
                onChange={(tab) => {
                    if (tab === 'search') navigate('/find_medicine');
                    else if (tab === 'history') { fetchUserData(true, '/history'); navigate('/history'); }
                    else if (tab === 'profile') navigate('/profile');
                    else navigate('/dashboard');
                }}
            />
        </>
    );
}
