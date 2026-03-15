import React from 'react';

/**
 * EmptyState — Friendly empty state illustrations for all screens.
 * Issue #26: Add empty state illustrations across all screens
 */
export default function EmptyState({
    icon = '💊',
    title = 'Nothing here yet',
    subtitle = '',
    ctaLabel = '',
    onCta = null,
    compact = false,
}) {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: compact ? '2rem 1rem' : '3rem 1.5rem',
            textAlign: 'center',
            gap: '0.75rem',
        }}>
            {/* Illustration */}
            <div className="empty-state-svg" style={{
                width: compact ? '60px' : '80px',
                height: compact ? '60px' : '80px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
                border: '2px solid #bbf7d0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: compact ? '1.75rem' : '2.25rem',
                boxShadow: '0 4px 16px rgba(34,197,94,0.12)',
                animation: 'emptyStatePop 0.4s cubic-bezier(0.16,1,0.3,1) forwards',
            }}>
                {icon}
            </div>

            {/* Text */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <p style={{
                    fontSize: compact ? '0.9rem' : '1.05rem',
                    fontWeight: 700,
                    color: '#1F2937',
                    margin: 0,
                }}>
                    {title}
                </p>
                {subtitle && (
                    <p style={{
                        fontSize: '0.8rem',
                        color: '#6B7280',
                        margin: 0,
                        lineHeight: 1.5,
                        maxWidth: '240px',
                    }}>
                        {subtitle}
                    </p>
                )}
            </div>

            {/* CTA Button */}
            {ctaLabel && onCta && (
                <button className="btn-dynamic"
                    onClick={onCta}
                    style={{
                        marginTop: '0.5rem',
                        padding: '0.6rem 1.4rem',
                        background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '20px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(34,197,94,0.3)',
                        transition: 'transform 0.15s, box-shadow 0.15s',
                        fontFamily: 'inherit',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(34,197,94,0.4)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 12px rgba(34,197,94,0.3)'; }}
                    onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)'; }}
                    onMouseUp={e => { e.currentTarget.style.transform = ''; }}
                >
                    {ctaLabel}
                </button>
            )}

            <style>{`
                @keyframes emptyStatePop {
                    from { opacity: 0; transform: scale(0.8); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
}
