import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getToken, onMessage } from 'firebase/messaging';
import { auth, db, getMessagingInstance, rtdb } from './firebase';
import { ref, onValue, onDisconnect, set, serverTimestamp as rtdbServerTimestamp } from 'firebase/database';
import PageTransition from './components/PageTransition';
import { SkeletonAppLoad, SkeletonDashboard } from './components/Skeleton';
import InstallPrompt from './components/InstallPrompt';
import OfflineBanner from './components/OfflineBanner';
import { HelmetProvider } from 'react-helmet-async';
import { ToastProvider } from './components/Toast';

// Lazy-loaded route components — loaded on demand, not on initial page load
const Login = React.lazy(() => import('./Login'));
const Otp = React.lazy(() => import('./Otp'));
const PatientSetup = React.lazy(() => import('./PatientSetup'));
const PharmacySetup = React.lazy(() => import('./PharmacySetup'));
const LandingUser = React.lazy(() => import('./LandingUser'));
const LandingPartner = React.lazy(() => import('./LandingPartner'));
const DashboardUser = React.lazy(() => import('./DashboardUser'));
const ChatScreen = React.lazy(() => import('./ChatScreen'));
const DashboardPharmacy = React.lazy(() => import('./DashboardPharmacy'));
const DashboardAdmin = React.lazy(() => import('./DashboardAdmin'));
const DebugDashboard = React.lazy(() => import('./DebugDashboard'));
const MatchingDebugViewer = React.lazy(() => import('./MatchingDebugViewer'));
const PharmacySimulator = React.lazy(() => import('./PharmacySimulator'));
const FCMDebugTool = React.lazy(() => import('./FCMDebugTool'));
const LoadTestSimulator = React.lazy(() => import('./LoadTestSimulator'));
const LegalDisclaimer = React.lazy(() => import('./LegalDisclaimer'));
const Disclaimer = React.lazy(() => import('./Disclaimer'));
const PrivacyPolicy = React.lazy(() => import('./PrivacyPolicy'));
const TermsOfService = React.lazy(() => import('./TermsOfService'));
const GrievanceOfficer = React.lazy(() => import('./GrievanceOfficer'));
const HowItWorks = React.lazy(() => import('./HowItWorks'));
const AboutUs = React.lazy(() => import('./AboutUs'));
const SeoTemplate = React.lazy(() => import('./SeoTemplate'));
const CityLanding = React.lazy(() => import('./CityLanding'));
const ShareLocation = React.lazy(() => import('./ShareLocation'));

const ProtectedDashboard = ({ user, userRole, profileReady, isAdminDomain, isPartnerDomain }) => {
    if (!user) return <Navigate to="/" replace />;

    if (!profileReady || userRole === undefined) {
        return (
            <div className="app-container">
                <aside className="app-sidebar">
                    <div className="sidebar-logo">
                        <img src="/localpill-logo-full.png" alt="LocalPill Logo" style={{ height: '40px', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }} />
                    </div>
                </aside>
                <main className="app-main">
                    <SkeletonDashboard />
                </main>
            </div>
        );
    }

    if (!userRole) return <Navigate to="/setup" replace />;

    if (isAdminDomain && userRole !== 'admin') {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f172a', color: 'white', fontFamily: 'Inter, sans-serif' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛑</div>
                <h2 style={{ fontSize: '2rem', marginBottom: '1rem', fontWeight: 700 }}>Access Denied</h2>
                <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>This portal is restricted to authorized administrators.</p>
                <button className="btn-dynamic"
                    onClick={() => window.location.href = 'https://localpill.com'}
                    style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                >Return to LocalPill.com</button>
                <button className="btn-dynamic"
                    onClick={() => auth.signOut()}
                    style={{ background: 'transparent', color: '#ef4444', border: 'none', padding: '0.75rem 1.5rem', marginTop: '1rem', cursor: 'pointer', textDecoration: 'underline' }}
                >Sign Out</button>
            </div>
        );
    }

    if (isPartnerDomain && userRole !== 'pharmacy') {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f172a', color: 'white', fontFamily: 'Inter, sans-serif' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏬</div>
                <h2 style={{ fontSize: '2rem', marginBottom: '1rem', fontWeight: 700 }}>Partner Portal</h2>
                <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>This portal is for registered pharmacy partners. Your account is currently a regular user.</p>
                <button className="btn-dynamic"
                    onClick={() => window.location.href = 'https://localpill.com'}
                    style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                >Return to LocalPill.com</button>
                <button className="btn-dynamic"
                    onClick={() => auth.signOut()}
                    style={{ background: 'transparent', color: '#ef4444', border: 'none', padding: '0.75rem 1.5rem', marginTop: '1rem', cursor: 'pointer', textDecoration: 'underline' }}
                >Sign Out</button>
            </div>
        );
    }

    if (userRole === 'admin') {
        return (
            <div className="app-container">
                <aside className="app-sidebar">
                    <div className="sidebar-logo">
                        <img src="/localpill-logo-full.png" alt="LocalPill Logo" style={{ height: '40px', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
                    </div>
                    <div className="sidebar-tagline">Admin Panel</div>
                </aside>
                <main className="app-main">
                    <DashboardAdmin user={user} />
                </main>
            </div>
        );
    }

    if (userRole === 'pharmacy') {
        return (
            <div className="app-container">
                <aside className="app-sidebar">
                    <div className="sidebar-logo">
                        <img src="/localpill-logo-full.png" alt="LocalPill Logo" style={{ height: '40px', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
                    </div>
                    <div className="sidebar-tagline">Pharmacy Portal</div>
                    <div className="sidebar-divider"></div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', textAlign: 'center', lineHeight: 1.6 }}>
                        Respond to nearby<br />medicine requests
                    </div>
                </aside>
                <main className="app-main">
                    <DashboardPharmacy user={user} />
                </main>
            </div>
        );
    }

    return (
        <div className="app-container">
            <aside className="app-sidebar">
                <div className="sidebar-logo">
                    <img src="/localpill-logo-full.png" alt="LocalPill Logo" style={{ height: '40px', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
                </div>
                <div className="sidebar-tagline">Find medicines nearby</div>
                <div className="sidebar-divider"></div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', textAlign: 'center', lineHeight: 1.6 }}>
                    Search medicines &<br />connect with pharmacies
                </div>
            </aside>
            <main className="app-main">
                <PageTransition direction="forward">
                    <DashboardUser user={user} />
                </PageTransition>
            </main>
        </div>
    );
};

function App() {
    const navigate = useNavigate();

    const hostname = window.location.hostname;
    const isAdminDomain = hostname === 'admin.localpill.com' || hostname.startsWith('admin.');
    const isPartnerDomain = hostname === 'partner.localpill.com' || hostname.startsWith('partner.');

    const [user, setUser] = useState(null);
    const [userRole, setUserRole] = useState(undefined); // undefined=loading role, ''=no role, 'user'|'pharmacy'=has role
    const [loading, setLoading] = useState(true);
    const [profileReady, setProfileReady] = useState(false);
    const [verificationId, setVerificationId] = useState(null);
    const [phoneNumber, setPhoneNumber] = useState('');

    const fetchUserRole = async (currentUser) => {
        try {
            const userRef = doc(db, 'users', currentUser.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const data = userSnap.data();
                setUserRole(data.role || '');
            } else {
                // User document doesn't exist (new signup via OTP).
                // Create it here to prevent race conditions with Otp.jsx
                await setDoc(userRef, {
                    name: currentUser.displayName || "",
                    phone: currentUser.phoneNumber || null,
                    role: "",
                    createdAt: serverTimestamp()
                });
                setUserRole('');
            }
            setProfileReady(true);
        } catch (err) {
            console.error(err);
            setUserRole('');
            setProfileReady(true);
        }
    };

    const setupNotifications = async (currentUser) => {
        try {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') return;

            // Lazily get messaging instance (avoids 401 on page load)
            const messagingInstance = await getMessagingInstance();
            if (!messagingInstance) return;

            // Force fresh auth token to prevent 401 race conditions
            await currentUser.getIdToken(true);

            // Get FCM token with retry logic (up to 3 attempts)
            let token = null;
            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    let swRegistration = null;
                    if ('serviceWorker' in navigator) {
                        try {
                            swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
                            await new Promise(resolve => setTimeout(resolve, 500));
                        } catch (swErr) { /* ignore */ }
                    }

                    token = await getToken(messagingInstance, {
                        vapidKey: 'BHnLEK_oes9RUvb78ulals2raz_m6xjoEflx2p3ZvnNsOPlcQ4DaF4R0NnaJXkipP5vRltPple3FS4cTn8m5-GY',
                        serviceWorkerRegistration: swRegistration || undefined
                    });

                    if (token) break; // Got token, stop retrying
                } catch (tokenErr) {
                    // Silently handle - often caused by API key restrictions or notification permission not granted
                    if (attempt < 3) await new Promise(r => setTimeout(r, 1000 * attempt));
                }
            }

            if (!token) {
                // FCM token unavailable - push notifications won't work but app continues fine
                return;
            }

            // Token obtained

            // 1. Always save to users collection
            const userRef = doc(db, 'users', currentUser.uid);
            await setDoc(userRef, { fcmToken: token }, { merge: true });

            // 2. Check role and ALWAYS save to pharmacies if pharmacy role
            try {
                const userSnap = await getDoc(userRef);
                if (userSnap.exists() && userSnap.data().role === 'pharmacy') {
                    const pharmacyRef = doc(db, 'pharmacies', currentUser.uid);
                    await setDoc(pharmacyRef, { fcmToken: token }, { merge: true });
                    // Token saved
                }
            } catch (roleErr) {
                console.error('[FCM] Error syncing pharmacy token:', roleErr);
            }

            // Handle foreground notifications
            onMessage(messagingInstance, (payload) => {
                // Foreground notification received
                if (payload.notification && 'serviceWorker' in navigator) {
                    navigator.serviceWorker.ready.then((registration) => {
                        registration.showNotification(payload.notification.title, {
                            body: payload.notification.body,
                            icon: '/localpill-icon.png',
                            badge: '/localpill-icon.png',
                        });
                    });
                }
            });

        } catch (error) {
            console.error('[FCM] Setup error:', error);
        }
    };


    useEffect(() => {
        let rtdbUnsub = null;
        // Safety timeout: if Firebase hangs for any reason, force-stop the spinner after 8s
        const safetyTimeout = setTimeout(() => {
            setLoading(false);
        }, 8000);

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            // Clean up previous RTDB listener before setting up a new one
            if (rtdbUnsub) { rtdbUnsub(); rtdbUnsub = null; }

            setUser(currentUser);
            if (currentUser) {
                // Must ensure profile is completely generated and ready first
                await fetchUserRole(currentUser);

                // Then fetch the FCM notification token in the background quietly
                setupNotifications(currentUser);

                // --- RTDB ONLINE PRESENCE TRACKING ---
                const statusRef = ref(rtdb, '/status/' + currentUser.uid);
                const connectedRef = ref(rtdb, '.info/connected');

                rtdbUnsub = onValue(connectedRef, (snap) => {
                    if (snap.val() === true) {
                        // When I disconnect, update the last time I was seen online
                        onDisconnect(statusRef).set({
                            state: 'offline',
                            last_changed: rtdbServerTimestamp()
                        }).then(() => {
                            // When I connect or reconnect, mark as online
                            set(statusRef, {
                                state: 'online',
                                last_changed: rtdbServerTimestamp()
                            });
                        });
                    }
                });
                // -------------------------------------

            } else {
                setUserRole(undefined);
                setProfileReady(false); // BUG-NEW-07 fix: reset so re-login doesn't see stale profile state
            }
            clearTimeout(safetyTimeout);
            setLoading(false);
        });
        return () => { unsubscribe(); clearTimeout(safetyTimeout); if (rtdbUnsub) rtdbUnsub(); };
    }, []);

    if (loading) {
        return <SkeletonAppLoad />;
    }

    let brandingTitle = "LocalPill";
    let brandingTagline = "Find medicines nearby with certainty";
    if (isAdminDomain) {
        brandingTitle = "LocalPill Admin";
        brandingTagline = "Secure Administration Portal";
    } else if (isPartnerDomain) {
        brandingTitle = "LocalPill Partner";
        brandingTagline = "Pharmacy Management Portal";
    }

    return (
        <ToastProvider>
            <React.Suspense fallback={<SkeletonAppLoad />}>
                <OfflineBanner />
                <Routes>
                    {/* Debug Tools */}
                    <Route path="/debug" element={<DebugDashboard />} />
                    <Route path="/matching-debug" element={<MatchingDebugViewer />} />
                    <Route path="/simulator" element={<PharmacySimulator />} />
                    <Route path="/fcm-debug" element={<FCMDebugTool />} />
                    <Route path="/load-test" element={<LoadTestSimulator />} />

                    {/* Landing Pages */}
                    <Route path="/:city/medicines" element={<CityLanding />} />
                    <Route path="/" element={
                        user && profileReady && userRole ? <Navigate to="/dashboard" replace /> :
                            (isAdminDomain ? <Navigate to="/login" replace /> :
                                (isPartnerDomain ? <LandingPartner onStartClick={() => navigate('/login')} /> : <LandingUser onStartClick={() => navigate('/login')} />))
                    } />

                    {/* Authentication Flow */}
                    <Route path="/login" element={
                        user && profileReady && userRole ? <Navigate to="/dashboard" replace /> :
                            user && profileReady && !userRole ? <Navigate to="/setup" replace /> :
                                (
                                    <div className="auth-layout">
                                        <div className="auth-branding" style={{
                                            background: 'linear-gradient(160deg, #0f1923 0%, #0d2418 50%, #0a1a10 100%)',
                                            position: 'relative',
                                            overflow: 'hidden'
                                        }}>
                                            {/* Animated background orbs */}
                                            <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(46,204,113,0.15) 0%, transparent 70%)', borderRadius: '50%', animation: 'floatOrb 8s ease-in-out infinite' }} />
                                            <div style={{ position: 'absolute', bottom: '-100px', left: '-60px', width: '350px', height: '350px', background: 'radial-gradient(circle, rgba(52,152,219,0.1) 0%, transparent 70%)', borderRadius: '50%', animation: 'floatOrb 10s ease-in-out infinite reverse' }} />
                                            <div style={{ position: 'absolute', top: '50%', left: '-40px', width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(46,204,113,0.08) 0%, transparent 70%)', borderRadius: '50%', animation: 'floatOrb 12s ease-in-out infinite' }} />

                                            <style>{`
                                            @keyframes floatOrb {
                                                0%, 100% { transform: translateY(0px) scale(1); }
                                                50% { transform: translateY(-20px) scale(1.05); }
                                            }
                                            @keyframes badgePop {
                                                0% { opacity: 0; transform: translateX(-12px); }
                                                100% { opacity: 1; transform: translateX(0); }
                                            }
                                        `}</style>

                                            {/* Content */}
                                            <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', padding: '2rem' }}>

                                                {/* Logo */}
                                                <div style={{ marginBottom: '0.5rem' }}>
                                                    <img src="/localpill-logo-full.png" alt="LocalPill Logo" style={{ height: '3.5rem', objectFit: 'contain', filter: 'drop-shadow(0 4px 20px rgba(46,204,113,0.4))' }} />
                                                </div>

                                                {/* Headline */}
                                                <div>
                                                    <h1 style={{ fontSize: '2.6rem', fontWeight: 800, color: 'white', marginBottom: '0.5rem', letterSpacing: '-0.03em', lineHeight: 1.1 }}>{brandingTitle}</h1>
                                                    <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.6)', fontWeight: 400 }}>{brandingTagline}</p>
                                                </div>

                                                {/* Trust Badges */}
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', maxWidth: '280px' }}>
                                                    {[
                                                        { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>, text: '500+ Verified Pharmacies' },
                                                        { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>, text: 'Real-time Stock Availability' },
                                                        { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>, text: 'Forever Free for Patients' },
                                                    ].map((badge, i) => (
                                                        <div key={i} style={{
                                                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                                                            background: 'rgba(255,255,255,0.06)',
                                                            border: '1px solid rgba(255,255,255,0.1)',
                                                            borderRadius: '12px', padding: '0.7rem 1rem',
                                                            animation: `badgePop 0.4s ease ${i * 0.1 + 0.2}s both`
                                                        }}>
                                                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '28px', color: '#2ECC71' }}>{badge.icon}</span>
                                                            <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem', fontWeight: 500 }}>{badge.text}</span>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Testimonial */}
                                                <div style={{
                                                    background: 'rgba(255,255,255,0.05)',
                                                    border: '1px solid rgba(255,255,255,0.08)',
                                                    borderRadius: '16px', padding: '1.25rem 1.5rem',
                                                    maxWidth: '300px', textAlign: 'left'
                                                }}>
                                                    <div style={{ display: 'flex', gap: '2px', color: '#F59E0B', marginBottom: '0.75rem' }}>
                                                        {[1, 2, 3, 4, 5].map(star => <svg key={star} width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>)}
                                                    </div>
                                                    <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.85rem', lineHeight: 1.6, fontStyle: 'italic', margin: 0 }}>
                                                        "Raat 11 baje maa ki BP ki dawai mil gayi. 2 minute mein nearby shop ne confirm kiya. Lifesaver app!"
                                                    </p>
                                                    <div style={{ marginTop: '0.75rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem', fontWeight: 600 }}>— Karan S., Mumbai</div>
                                                </div>

                                                {/* Made for India footer */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.35)', fontSize: '0.78rem' }}>
                                                    <svg width="18" height="18" viewBox="0 0 64 64" fill="none"><rect width="64" height="64" rx="32" fill="#fff" /><path d="M0 32C0 14.327 14.327 0 32 0s32 14.327 32 32" fill="#F15A22" /><path d="M0 32c0 17.673 14.327 32 32 32s32-14.327 32-32" fill="#128807" /><rect y="21" width="64" height="22" fill="#fff" /><circle cx="32" cy="32" r="9" fill="#000080" /><circle cx="32" cy="32" r="7" fill="#fff" /><path d="M32 24.5a7.5 7.5 0 0 1 0 15 7.5 7.5 0 0 1 0-15zm0 1.5a6 6 0 1 0 0 12 6 6 0 0 0 0-12z" fill="#000080" /><path d="m32 32 6.5-3.5L32 32l6.5 3.5L32 32l-3.5 6.5L32 32l-6.5 3.5L32 32l-6.5-3.5L32 32l3.5-6.5L32 32z" stroke="#000080" strokeWidth="1.5" /></svg>
                                                    <span>Proudly Made for India</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="auth-form-container">
                                            <div className="auth-card">
                                                {!verificationId ? (
                                                    <Login
                                                        onOtpSent={(result, phone) => {
                                                            setVerificationId(result);
                                                            setPhoneNumber(phone);
                                                        }}
                                                    />
                                                ) : (
                                                    <Otp
                                                        confirmationResult={verificationId}
                                                        phoneNumber={phoneNumber}
                                                        onBack={() => setVerificationId(null)}
                                                    />
                                                )}
                                                <div id="recaptcha-container"></div>
                                            </div>
                                            {/* Back to home link */}
                                            <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
                                                <button className="btn-dynamic"
                                                    onClick={() => navigate('/')}
                                                    style={{
                                                        background: 'none', border: 'none', cursor: 'pointer',
                                                        color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem',
                                                        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                                                        transition: 'color 0.2s', padding: '0.5rem'
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.75)'}
                                                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.45)'}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                                                    Back to Home
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )
                    } />

                    {/* Role Selection Setup */}
                    <Route path="/setup" element={
                        !user ? <Navigate to="/login" replace /> :
                            userRole ? <Navigate to="/dashboard" replace /> :
                                (
                                    <div className="app-container">
                                        <aside className="app-sidebar">
                                            <div className="sidebar-logo">
                                                <img src="/localpill-logo-full.png" alt="LocalPill Logo" style={{ height: '40px', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
                                            </div>
                                            <div className="sidebar-tagline">Find medicines nearby</div>
                                        </aside>
                                        <main className="app-main">
                                            <div className="auth-card glass">
                                                {isPartnerDomain ? (
                                                    <PharmacySetup user={user} onComplete={() => fetchUserRole(user)} />
                                                ) : (
                                                    <PatientSetup user={user} onComplete={() => fetchUserRole(user)} />
                                                )}
                                            </div>
                                        </main>
                                    </div>
                                )
                    } />

                    {/* Standalone Chat Route — fullscreen, no sidebar */}
                    <Route path="/chat" element={
                        loading ? (
                            // Auth still initializing — show spinner to avoid premature /login redirect
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', background: '#F8FAFC' }}>
                                <div style={{ width: '44px', height: '44px', border: '3px solid rgba(34,197,94,0.2)', borderTopColor: '#22C55E', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                            </div>
                        ) : user ? (
                            (() => {
                                const params = new URLSearchParams(window.location.search);
                                const chatRequestId = params.get('id');
                                const chatPharmacyId = params.get('pharmacy');
                                if (chatRequestId && chatPharmacyId) {
                                    return (
                                        <React.Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh' }}><div style={{ width: '40px', height: '40px', border: '3px solid rgba(34,197,94,0.2)', borderTopColor: '#22C55E', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /></div>}>
                                            <ChatScreen
                                                requestId={chatRequestId}
                                                pharmacyId={chatPharmacyId}
                                                onBack={() => window.history.back()}
                                            />
                                        </React.Suspense>
                                    );
                                }
                                return <Navigate to="/dashboard" replace />;
                            })()
                        ) : <Navigate to="/login" replace />
                    } />


                    {/* Main Application Dashboard */}
                    <Route path="/dashboard" element={
                        <ProtectedDashboard
                            user={user}
                            userRole={userRole}
                            profileReady={profileReady}
                            isAdminDomain={isAdminDomain}
                            isPartnerDomain={isPartnerDomain}
                        />
                    } />

                    {/* User Dashboard Sub-routes */}
                    <Route path="/find_medicine" element={
                        <ProtectedDashboard user={user} userRole={userRole} profileReady={profileReady} isAdminDomain={isAdminDomain} isPartnerDomain={isPartnerDomain} />
                    } />
                    <Route path="/results" element={
                        <ProtectedDashboard user={user} userRole={userRole} profileReady={profileReady} isAdminDomain={isAdminDomain} isPartnerDomain={isPartnerDomain} />
                    } />
                    <Route path="/history" element={
                        <ProtectedDashboard user={user} userRole={userRole} profileReady={profileReady} isAdminDomain={isAdminDomain} isPartnerDomain={isPartnerDomain} />
                    } />
                    <Route path="/profile" element={
                        <ProtectedDashboard user={user} userRole={userRole} profileReady={profileReady} isAdminDomain={isAdminDomain} isPartnerDomain={isPartnerDomain} />
                    } />
                    <Route path="/notifications" element={
                        <ProtectedDashboard user={user} userRole={userRole} profileReady={profileReady} isAdminDomain={isAdminDomain} isPartnerDomain={isPartnerDomain} />
                    } />

                    {/* Dedicated Legal Pages */}
                    <Route path="/legal" element={<LegalDisclaimer />} />
                    <Route path="/disclaimer" element={<Disclaimer />} />
                    <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                    <Route path="/terms" element={<TermsOfService />} />
                    <Route path="/grievance" element={<GrievanceOfficer />} />
                    <Route path="/how-it-works" element={<HowItWorks />} />
                    <Route path="/about-us" element={<AboutUs />} />
                    <Route path="/share-location" element={<ShareLocation />} />
                    <Route path="/s/:id" element={<ShareLocation />} />

                    {/* Dynamic SEO Routes */}
                    <Route path="/medicine/:slug" element={<SeoTemplate type="medicine" />} />
                    <Route path="/pharmacy/:city/:area" element={<SeoTemplate type="pharmacy" />} />

                    {/* Fallback Catch-all Route */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
                <InstallPrompt />
            </React.Suspense>
        </ToastProvider>
    );
}

export default App;
