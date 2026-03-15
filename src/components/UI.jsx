import React, { useEffect, useRef } from 'react';

/* ──────────────────────────── Button ──────────────────────────────── */
export const Button = ({ children, variant = 'primary', className = '', style = {}, ...props }) => {
    const variants = {
        primary: { background: 'var(--color-primary)', color: '#fff', border: 'none' },
        secondary: { background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' },
        danger: { background: 'var(--color-danger)', color: '#fff', border: 'none' },
        ghost: { background: 'transparent', color: 'var(--color-primary)', border: '1.5px solid var(--color-primary)' },
    };
    const v = variants[variant] || variants.primary;
    return (
        <button
            className={className}
            style={{
                ...v,
                padding: '10px 20px',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-base)',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-family)',
                transition: 'opacity 0.15s, transform 0.15s',
                outline: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                ...style,
            }}
            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)'; }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            {...props}
        >
            {children}
        </button>
    );
};

/* ──────────────────────────── Card ────────────────────────────────── */
export const Card = ({ children, className = '', style = {}, ...props }) => (
    <div
        className={className}
        style={{
            backgroundColor: 'var(--color-bg)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-lg)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-sm)',
            ...style,
        }}
        {...props}
    >
        {children}
    </div>
);

/* ──────────────────────────── InputField ──────────────────────────── */
export const InputField = ({ label, className = '', style = {}, ...props }) => (
    <div style={{ textAlign: 'left', width: '100%', ...style }}>
        {label && (
            <label style={{ display: 'block', marginBottom: '6px', fontSize: 'var(--font-sm)', fontWeight: 600, color: 'var(--color-text)' }}>
                {label}
            </label>
        )}
        <input
            className={`modern-input ${className}`}
            style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--color-border)',
                fontSize: 'var(--font-base)',
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                outline: 'none',
                transition: 'border-color 0.2s',
                fontFamily: 'var(--font-family)',
                boxSizing: 'border-box',
            }}
            {...props}
        />
    </div>
);

/* ──────────────────────────── Badge ───────────────────────────────── */
export const Badge = ({ children, type = 'default', style = {}, ...props }) => {
    const variants = {
        available: { bg: '#d1fae5', color: '#059669', border: 'rgba(16,185,129,0.2)' },
        partial: { bg: '#fef3c7', color: '#d97706', border: 'rgba(245,158,11,0.2)' },
        verified: { bg: '#dbeafe', color: '#2563eb', border: 'rgba(59,130,246,0.3)' },
        success: { bg: '#d1fae5', color: '#059669', border: 'rgba(16,185,129,0.2)' },
        danger: { bg: '#fee2e2', color: '#dc2626', border: 'rgba(239,68,68,0.2)' },
        warning: { bg: '#fef3c7', color: '#d97706', border: 'rgba(245,158,11,0.2)' },
        default: { bg: '#f1f5f9', color: '#475569', border: 'rgba(148,163,184,0.2)' },
    };
    const v = variants[type] || variants.default;
    return (
        <span
            style={{
                backgroundColor: v.bg,
                color: v.color,
                border: `1px solid ${v.border}`,
                padding: '3px 10px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.75rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                ...style,
            }}
            {...props}
        >
            {children}
        </span>
    );
};

/* ──────────────────────────── Spinner ─────────────────────────────── */
export const Spinner = ({ size = 20, color = 'var(--color-primary)', style = {} }) => (
    <>
        <div
            style={{
                width: size,
                height: size,
                border: `${Math.max(2, size / 8)}px solid ${color}30`,
                borderTop: `${Math.max(2, size / 8)}px solid ${color}`,
                borderRadius: '50%',
                animation: 'uiSpinnerSpin 0.7s linear infinite',
                flexShrink: 0,
                ...style,
            }}
        />
        <style>{`@keyframes uiSpinnerSpin { to { transform: rotate(360deg); } }`}</style>
    </>
);

/* ──────────────────────────── Toggle ──────────────────────────────── */
export const Toggle = ({ checked, onChange, disabled = false, size = 'md', style = {} }) => {
    const sizes = {
        sm: { track: { width: 36, height: 20 }, thumb: 14, offset: 16 },
        md: { track: { width: 48, height: 26 }, thumb: 20, offset: 22 },
        lg: { track: { width: 58, height: 30 }, thumb: 24, offset: 28 },
    };
    const s = sizes[size] || sizes.md;
    return (
        <button className="btn-dynamic"
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => !disabled && onChange?.(!checked)}
            style={{
                width: s.track.width,
                height: s.track.height,
                borderRadius: s.track.height,
                background: checked ? 'var(--color-primary)' : 'var(--color-border)',
                border: 'none',
                padding: 0,
                cursor: disabled ? 'not-allowed' : 'pointer',
                position: 'relative',
                transition: 'background 0.25s',
                flexShrink: 0,
                opacity: disabled ? 0.5 : 1,
                ...style,
            }}
        >
            <span style={{
                position: 'absolute',
                top: (s.track.height - s.thumb) / 2,
                left: checked ? s.offset : (s.track.height - s.thumb) / 2,
                width: s.thumb,
                height: s.thumb,
                borderRadius: '50%',
                background: '#fff',
                boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                transition: 'left 0.22s cubic-bezier(0.34,1.56,0.64,1)',
            }} />
        </button>
    );
};

/* ──────────────────────────── Avatar ──────────────────────────────── */
export const Avatar = ({ src, name = '', size = 'md', style = {}, ...props }) => {
    const sizes = { sm: 32, md: 40, lg: 56, xl: 72 };
    const px = sizes[size] || sizes.md;
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

    // Deterministic color from name
    const hue = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
    const bg = `hsl(${hue}, 60%, 55%)`;

    return (
        <div
            style={{
                width: px,
                height: px,
                borderRadius: '50%',
                overflow: 'hidden',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: src ? 'transparent' : bg,
                color: '#fff',
                fontSize: px * 0.35,
                fontWeight: 700,
                userSelect: 'none',
                ...style,
            }}
            {...props}
        >
            {src ? (
                <img
                    src={src}
                    alt={name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={e => { e.target.style.display = 'none'; }}
                />
            ) : initials}
        </div>
    );
};

/* ──────────────────────────── EmptyState ──────────────────────────── */
export const EmptyState = ({
    icon,
    title = 'Nothing here yet',
    description,
    action,
    onAction,
    style = {},
}) => (
    <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 'var(--space-xl)',
        gap: 'var(--space-md)',
        ...style,
    }}>
        {icon && (
            <div style={{ fontSize: '3rem', lineHeight: 1 }}>
                {icon}
            </div>
        )}
        <div style={{ fontSize: 'var(--font-lg)', fontWeight: 700, color: 'var(--color-text)' }}>
            {title}
        </div>
        {description && (
            <div style={{ fontSize: 'var(--font-sm)', color: 'var(--color-text-secondary)', maxWidth: 280 }}>
                {description}
            </div>
        )}
        {action && (
            <Button onClick={onAction} style={{ marginTop: 'var(--space-sm)' }}>
                {action}
            </Button>
        )}
    </div>
);

/* ──────────────────────────── Modal ───────────────────────────────── */
export const Modal = ({ open, onClose, title, children, maxWidth = 480, style = {} }) => {
    const overlayRef = useRef(null);

    useEffect(() => {
        if (!open) return;
        const handleKey = (e) => { if (e.key === 'Escape') onClose?.(); };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                ref={overlayRef}
                onClick={(e) => { if (e.target === overlayRef.current) onClose?.(); }}
                style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(15,23,42,0.55)',
                    backdropFilter: 'blur(4px)',
                    WebkitBackdropFilter: 'blur(4px)',
                    zIndex: 9000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 'var(--space-md)',
                    animation: 'modalFadeIn 0.2s ease forwards',
                }}
            >
                {/* Card */}
                <div
                    style={{
                        background: 'var(--color-bg)',
                        borderRadius: 'var(--radius-xl)',
                        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
                        width: '100%',
                        maxWidth,
                        overflow: 'hidden',
                        animation: 'modalSlideUp 0.25s cubic-bezier(0.16,1,0.3,1) forwards',
                        ...style,
                    }}
                >
                    {/* Header */}
                    {(title || onClose) && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '20px 24px 0',
                        }}>
                            {title && (
                                <h2 style={{ margin: 0, fontSize: 'var(--font-xl)', fontWeight: 700, color: 'var(--color-text)' }}>
                                    {title}
                                </h2>
                            )}
                            {onClose && (
                                <button className="btn-dynamic"
                                    onClick={onClose}
                                    style={{
                                        background: 'var(--color-surface)',
                                        border: 'none',
                                        width: 32,
                                        height: 32,
                                        borderRadius: '50%',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1rem',
                                        color: 'var(--color-text-secondary)',
                                        flexShrink: 0,
                                        marginLeft: 'auto',
                                    }}
                                    aria-label="Close"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    )}
                    {/* Body */}
                    <div style={{ padding: '20px 24px 24px' }}>
                        {children}
                    </div>
                </div>
            </div>
            <style>{`
                @keyframes modalFadeIn {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }
                @keyframes modalSlideUp {
                    from { opacity: 0; transform: translateY(24px) scale(0.98); }
                    to   { opacity: 1; transform: translateY(0)     scale(1); }
                }
            `}</style>
        </>
    );
};
