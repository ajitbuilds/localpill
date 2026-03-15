import React, { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Toast — Lightweight, beautiful slide-in toast notifications.
 * Usage:
 *   import { useToast, ToastContainer } from './components/Toast';
 *   const toast = useToast();
 *   toast.success('Message sent!');
 *   toast.error('Something went wrong');
 *   toast.info('New match found');
 */

// ── Context ──────────────────────────────────────────────────────────────────
const ToastContext = React.createContext(null);

let _id = 0;

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const add = useCallback((message, type = 'info', duration = 3500) => {
        const id = ++_id;
        setToasts(prev => [...prev, { id, message, type, duration }]);
        return id;
    }, []);

    const remove = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const api = {
        success: (msg, dur) => add(msg, 'success', dur),
        error: (msg, dur) => add(msg, 'error', dur),
        info: (msg, dur) => add(msg, 'info', dur),
        warning: (msg, dur) => add(msg, 'warning', dur),
        remove,
    };

    return (
        <ToastContext.Provider value={api}>
            {children}
            <ToastContainer toasts={toasts} onRemove={remove} />
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = React.useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
    return ctx;
}

// ── Single Toast Item ─────────────────────────────────────────────────────────
function ToastItem({ toast, onRemove }) {
    const [visible, setVisible] = useState(false);
    const timerRef = useRef(null);

    useEffect(() => {
        // Slide in
        requestAnimationFrame(() => setVisible(true));
        // Auto dismiss
        timerRef.current = setTimeout(() => {
            setVisible(false);
            setTimeout(() => onRemove(toast.id), 320);
        }, toast.duration);
        return () => clearTimeout(timerRef.current);
    }, []);

    const config = {
        success: { bg: '#22C55E', icon: '✓', label: 'Success' },
        error: { bg: '#EF4444', icon: '✕', label: 'Error' },
        info: { bg: '#3B82F6', icon: 'ℹ', label: 'Info' },
        warning: { bg: '#F59E0B', icon: '⚠', label: 'Warning' },
    }[toast.type] || { bg: '#6B7280', icon: 'ℹ', label: 'Notice' };

    return (
        <div
            onClick={() => { setVisible(false); setTimeout(() => onRemove(toast.id), 320); }}
            style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                background: '#1F2937',
                color: '#F9FAFB',
                padding: '12px 16px',
                borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                borderLeft: `4px solid ${config.bg}`,
                cursor: 'pointer',
                minWidth: '240px',
                maxWidth: '340px',
                fontSize: '0.875rem',
                fontWeight: 500,
                fontFamily: 'Inter, sans-serif',
                lineHeight: 1.4,
                transform: visible ? 'translateX(0) scale(1)' : 'translateX(120%) scale(0.9)',
                opacity: visible ? 1 : 0,
                transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease',
                userSelect: 'none',
                WebkitTapHighlightColor: 'transparent',
            }}
        >
            {/* Icon badge */}
            <span style={{
                width: '24px', height: '24px', borderRadius: '50%',
                background: config.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: 700, flexShrink: 0,
                color: '#fff',
            }}>
                {config.icon}
            </span>
            <span style={{ flex: 1 }}>{toast.message}</span>
        </div>
    );
}

// ── Container (fixed position) ────────────────────────────────────────────────
function ToastContainer({ toasts, onRemove }) {
    if (!toasts.length) return null;
    return (
        <div style={{
            position: 'fixed',
            bottom: '80px',   /* above bottom nav */
            right: '16px',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            pointerEvents: 'none',
        }}>
            {toasts.map(t => (
                <div key={t.id} style={{ pointerEvents: 'auto' }}>
                    <ToastItem toast={t} onRemove={onRemove} />
                </div>
            ))}
        </div>
    );
}
