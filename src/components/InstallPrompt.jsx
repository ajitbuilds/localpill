import React, { useState, useEffect } from 'react';

const InstallPrompt = () => {
    // Shared state
    const [isStandalone, setIsStandalone] = useState(false);

    // iOS state
    const [isIOS, setIsIOS] = useState(false);
    const [showIosPrompt, setShowIosPrompt] = useState(false);

    // Android state
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showAndroidPrompt, setShowAndroidPrompt] = useState(false);

    useEffect(() => {
        // --- 1. General Checks ---
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
        const isAppStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;

        setIsIOS(isIosDevice);
        setIsStandalone(isAppStandalone);

        const isMounted = { current: true };
        let iosTimer;
        let androidTimer;

        // --- 2. iOS Logic ---
        if (isIosDevice && !isAppStandalone) {
            const hasDismissedIos = localStorage.getItem('ios_install_prompt_dismissed');
            if (!hasDismissedIos) {
                iosTimer = setTimeout(() => {
                    setShowIosPrompt(true);
                }, 3000);
            }
        }

        // --- 3. Android Logic ---
        const handleBeforeInstallPrompt = (e) => {
            // Prevent Chrome 67 and earlier from automatically showing the prompt
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e);

            // Only show if user hasn't dismissed it
            const hasDismissedAndroid = localStorage.getItem('android_install_prompt_dismissed');
            if (!hasDismissedAndroid && !isAppStandalone) {
                androidTimer = setTimeout(() => {
                    setShowAndroidPrompt(true);
                }, 3000);
            }
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // --- 4. Install Event Listener ---
        const handleAppInstalled = () => {
            // Hide prompts once installed
            setShowAndroidPrompt(false);
            setShowIosPrompt(false);
            // PWA installed
        };

        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            isMounted.current = false;
            if (iosTimer) clearTimeout(iosTimer);
            if (androidTimer) clearTimeout(androidTimer);
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const isMountedRef = React.useRef(true);
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // Handlers
    const handleDismissIos = () => {
        setShowIosPrompt(false);
        localStorage.setItem('ios_install_prompt_dismissed', 'true');
    };

    const handleDismissAndroid = () => {
        setShowAndroidPrompt(false);
        localStorage.setItem('android_install_prompt_dismissed', 'true');
    };

    const handleInstallAndroid = async () => {
        if (!deferredPrompt) return;

        // Show the install prompt
        deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        // Install prompt response handled

        if (isMountedRef.current) {
            // We've used the prompt, and can't use it again, throw it away
            setDeferredPrompt(null);
            setShowAndroidPrompt(false);
        }
    };

    // Render Logic
    if (showIosPrompt) {
        return (
            <div style={{
                position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
                width: '90%', maxWidth: '400px', background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
                borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
                padding: '16px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '12px',
                animation: 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
                <style>{`@keyframes slideUp { from { opacity: 0; transform: translate(-50%, 40px); } to { opacity: 1; transform: translate(-50%, 0); } }`}</style>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <img src="/logo192.png" alt="LocalPill" style={{ width: '48px', height: '48px', borderRadius: '10px' }} />
                        <div>
                            <h4 style={{ margin: 0, fontSize: '1rem', color: '#0f172a', fontWeight: '700' }}>Install LocalPill</h4>
                            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>Fast, offline access</p>
                        </div>
                    </div>
                    <button className="btn-dynamic" onClick={handleDismissIos} style={{ background: 'none', border: 'none', fontSize: '1.2rem', color: '#94a3b8', cursor: 'pointer', padding: '4px' }} aria-label="Close">✕</button>
                </div>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', fontSize: '0.85rem', color: '#334155', lineHeight: '1.4' }}>
                    Install this app on your iPhone: tap <span style={{ display: 'inline-block', verticalAlign: 'middle', margin: '0 4px', background: 'white', padding: '2px 4px', borderRadius: '4px', border: '1px solid #e2e8f0' }}><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg></span> and then <strong>Add to Home Screen</strong> <span style={{ display: 'inline-block', verticalAlign: 'middle', margin: '0 2px' }}><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg></span>.
                </div>
                <div style={{ textAlign: 'center', fontSize: '20px', color: '#3b82f6', marginTop: '-8px', marginBottom: '-10px', animation: 'bounce 2s infinite' }}>
                    <style>{`@keyframes bounce { 0%, 20%, 50%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(5px); } 60% { transform: translateY(3px); } }`}</style>
                    ↓
                </div>
            </div>
        );
    }

    if (showAndroidPrompt && deferredPrompt) {
        return (
            <div style={{
                position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
                width: '90%', maxWidth: '400px', background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
                borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
                padding: '16px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '12px',
                animation: 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
                <style>{`@keyframes slideUp { from { opacity: 0; transform: translate(-50%, 40px); } to { opacity: 1; transform: translate(-50%, 0); } }`}</style>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <img src="/logo192.png" alt="LocalPill" style={{ width: '48px', height: '48px', borderRadius: '10px' }} />
                        <div>
                            <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a', fontWeight: '700' }}>Install LocalPill</h4>
                            <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>Add to home screen for fast access</p>
                        </div>
                    </div>
                    <button className="btn-dynamic" onClick={handleDismissAndroid} style={{ background: 'none', border: 'none', fontSize: '1.2rem', color: '#94a3b8', cursor: 'pointer', padding: '4px' }} aria-label="Close">✕</button>
                </div>
                <button className="btn-dynamic"
                    onClick={handleInstallAndroid}
                    style={{
                        background: '#32c17c',
                        color: 'white',
                        border: 'none',
                        padding: '12px',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Install App
                </button>
            </div>
        );
    }

    return null;
};

export default InstallPrompt;
