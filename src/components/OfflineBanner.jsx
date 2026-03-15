import React, { useState, useEffect, useRef } from 'react';

/**
 * OfflineBanner — Slim, non-intrusive top banner that appears when device
 * loses internet connection. Uses native browser `online`/`offline` events.
 * No backend logic — purely a frontend network status indicator.
 */
export default function OfflineBanner() {
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [showBackOnline, setShowBackOnline] = useState(false);
    const hideTimer = useRef(null);

    useEffect(() => {
        const handleOffline = () => {
            setIsOffline(true);
            setShowBackOnline(false);
            if (hideTimer.current) clearTimeout(hideTimer.current);
        };

        const handleOnline = () => {
            setIsOffline(false);
            setShowBackOnline(true);
            if (hideTimer.current) clearTimeout(hideTimer.current);
            hideTimer.current = setTimeout(() => setShowBackOnline(false), 3000);
        };

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
            if (hideTimer.current) clearTimeout(hideTimer.current);
        };
    }, []);

    if (!isOffline && !showBackOnline) return null;

    const bgColor = isOffline ? '#EF4444' : '#22C55E';
    const message = isOffline
        ? '📡 No internet connection'
        : '✅ Back online!';

    return (
        <>
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 99999,
                    background: bgColor,
                    color: '#fff',
                    textAlign: 'center',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    padding: '8px 16px',
                    letterSpacing: '0.01em',
                    fontFamily: 'Inter, sans-serif',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    animation: 'offlineBannerSlide 0.35s cubic-bezier(0.16,1,0.3,1) forwards',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                }}
            >
                {message}
            </div>
            <style>{`
                @keyframes offlineBannerSlide {
                    from { transform: translateY(-100%); opacity: 0; }
                    to   { transform: translateY(0);     opacity: 1; }
                }
            `}</style>
        </>
    );
}
