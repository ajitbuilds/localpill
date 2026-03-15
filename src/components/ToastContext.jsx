import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

/**
 * ToastContext — Rich toast notifications.
 * Issue #39: Icon + progress bar + swipe-to-dismiss
 *
 * Types: 'success' | 'error' | 'info' | 'warning'
 */

const ToastContext = createContext(null);

const ICONS = {
    success: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
    error: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>,
    info: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>,
    warning: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
};

const COLORS = {
    success: { bg: '#ECFDF5', border: '#6EE7B7', text: '#065F46', bar: '#22C55E' },
    error: { bg: '#FEF2F2', border: '#FCA5A5', text: '#991B1B', bar: '#EF4444' },
    info: { bg: '#EFF6FF', border: '#BFDBFE', text: '#1E40AF', bar: '#3B82F6' },
    warning: { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', bar: '#F59E0B' },
};

const DURATION = 4000; // ms

function Toast({ toast, onDismiss }) {
    const col = COLORS[toast.type] || COLORS.success;
    const [swiping, setSwiping] = useState(false);
    const [swipeX, setSwipeX] = useState(0);
    const startXRef = useRef(null);

    // Swipe-to-dismiss handlers
    const handleTouchStart = (e) => { startXRef.current = e.touches[0].clientX; };
    const handleTouchMove = (e) => {
        if (startXRef.current === null) return;
        const dx = e.touches[0].clientX - startXRef.current;
        if (dx > 0) { setSwipeX(dx); setSwiping(true); }
    };
    const handleTouchEnd = () => {
        if (swipeX > 80) onDismiss(toast.id);
        else { setSwipeX(0); setSwiping(false); }
        startXRef.current = null;
    };

    return (
        <div
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
                background: col.bg,
                border: `1px solid ${col.border}`,
                borderRadius: '14px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                overflow: 'hidden',
                minWidth: '280px',
                maxWidth: '340px',
                animation: 'toastIn 0.35s cubic-bezier(0.16,1,0.3,1) forwards',
                transform: swiping ? `translateX(${swipeX}px)` : 'translateX(0)',
                opacity: swiping ? Math.max(0, 1 - swipeX / 200) : 1,
                transition: swiping ? 'none' : 'transform 0.3s ease, opacity 0.3s ease',
                cursor: 'pointer',
                userSelect: 'none',
            }}
            onClick={() => onDismiss(toast.id)}
        >
            {/* Content */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 14px 10px' }}>
                <div style={{ color: col.text, flexShrink: 0, marginTop: '1px', display: 'flex' }}>{(ICONS[toast.type] || ICONS.success)()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.87rem', fontWeight: 700, color: col.text, lineHeight: 1.35 }}>
                        {toast.message}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: col.text, opacity: 0.6, marginTop: '2px' }}>
                        Tap to dismiss
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            <div style={{ height: '3px', background: 'rgba(0,0,0,0.06)' }}>
                <div style={{
                    height: '100%',
                    background: col.bar,
                    animation: `toastProgress ${DURATION}ms linear forwards`,
                    transformOrigin: 'left',
                }} />
            </div>
        </div>
    );
}

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const dismiss = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const showToast = useCallback((message, type = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => dismiss(id), DURATION);
    }, [dismiss]);

    return (
        <ToastContext.Provider value={showToast}>
            {children}
            <div style={{
                position: 'fixed',
                top: '16px',
                right: '16px',
                zIndex: 99999,
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                pointerEvents: 'none',
            }}>
                {toasts.map(t => (
                    <div key={t.id} style={{ pointerEvents: 'all' }}>
                        <Toast toast={t} onDismiss={dismiss} />
                    </div>
                ))}
            </div>
            <style>{`
                @keyframes toastIn {
                    from { opacity: 0; transform: translateX(100%) scale(0.95); }
                    to   { opacity: 1; transform: translateX(0)   scale(1); }
                }
                @keyframes toastProgress {
                    from { transform: scaleX(1); }
                    to   { transform: scaleX(0); }
                }
            `}</style>
        </ToastContext.Provider>
    );
};

export const useToast = () => useContext(ToastContext);
