import React from 'react';

// Base shimmer block
export function Skeleton({ width = '100%', height = '16px', borderRadius = '8px', style = {} }) {
    return (
        <>
            <style>{`
                @keyframes shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
            `}</style>
            <div
                className="skeleton-shimmer"
                style={{
                    width,
                    height,
                    borderRadius,
                    background: 'linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 1.5s infinite',
                    flexShrink: 0,
                    ...style
                }}
            />
        </>
    );
}

// ── App-level full-screen loading (initial auth check) ──────────────────────
export function SkeletonAppLoad() {
    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e3a2f 60%, #0a2013 100%)',
            flexDirection: 'column', gap: '1rem'
        }}>
            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
                <img src="/localpill-logo-full.png" alt="LocalPill Logo" style={{ height: '3rem', objectFit: 'contain', opacity: 0.9, filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.2))' }} />
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
                {[0, 1, 2].map(i => (
                    <div key={i} style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: '#22C55E',
                        animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`
                    }} />
                ))}
            </div>
            <style>{`
                @keyframes bounce {
                    0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
                    40% { transform: scale(1.0); opacity: 1; }
                }
            `}</style>
        </div>
    );
}

// ── Pharmacy Dashboard skeleton ──────────────────────────────────────────────
export function SkeletonDashboard() {
    return (
        <div style={{ maxWidth: '640px', width: '100%', padding: '1rem' }}>
            {/* Hero card */}
            <div style={{ background: '#F3F4F6', borderRadius: '24px', padding: '1.75rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Skeleton width="56px" height="56px" borderRadius="16px" />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <Skeleton width="40%" height="12px" />
                        <Skeleton width="65%" height="20px" />
                        <Skeleton width="50%" height="12px" />
                    </div>
                </div>
            </div>

            {/* Toggle card */}
            <div style={{ background: '#F9FAFB', borderRadius: '18px', padding: '1.25rem 1.5rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <Skeleton width="40%" height="16px" />
                    <Skeleton width="60%" height="12px" />
                </div>
                <Skeleton width="56px" height="30px" borderRadius="30px" />
            </div>

            {/* Stats grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.875rem', marginBottom: '1.5rem' }}>
                {[1, 2, 3].map(i => (
                    <div key={i} style={{ background: '#F3F4F6', borderRadius: '16px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                        <Skeleton width="32px" height="32px" borderRadius="8px" />
                        <Skeleton width="60%" height="12px" />
                    </div>
                ))}
            </div>

            {/* Request cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[1, 2, 3].map(i => <SkeletonRequestCard key={i} />)}
            </div>
        </div>
    );
}

// ── Single request card skeleton (used in RequestList) ───────────────────────
export function SkeletonRequestCard() {
    return (
        <div style={{ background: '#fff', borderRadius: '16px', padding: '1.25rem', border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Skeleton width="35%" height="12px" />
                <Skeleton width="20%" height="20px" borderRadius="12px" />
            </div>
            <Skeleton width="80%" height="14px" />
            <Skeleton width="55%" height="14px" />
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <Skeleton height="40px" borderRadius="12px" />
                <Skeleton height="40px" borderRadius="12px" />
                <Skeleton height="40px" borderRadius="12px" />
            </div>
        </div>
    );
}

// ── History card skeleton ────────────────────────────────────────────────────
export function SkeletonHistoryCard() {
    return (
        <div style={{ background: '#fff', borderRadius: '16px', padding: '1.1rem 1.25rem', border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Skeleton width="25%" height="12px" />
                <Skeleton width="18%" height="20px" borderRadius="12px" />
            </div>
            <Skeleton width="40%" height="14px" />
            <div style={{ display: 'flex', gap: '6px' }}>
                <Skeleton width="80px" height="24px" borderRadius="20px" />
                <Skeleton width="90px" height="24px" borderRadius="20px" />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
                <Skeleton height="34px" borderRadius="10px" />
                <Skeleton height="34px" borderRadius="10px" />
            </div>
        </div>
    );
}

// ── User Dashboard skeleton ──────────────────────────────────────────────────
export function SkeletonUserDashboard() {
    return (
        <div style={{ maxWidth: '640px', width: '100%', padding: '1rem' }}>
            {/* Hero */}
            <div style={{ background: '#F3F4F6', borderRadius: '24px', padding: '1.75rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <Skeleton width="56px" height="56px" borderRadius="16px" />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div className="skeleton-shimmer" style={{ width: '120px', height: '14px', borderRadius: '4px' }}></div>
                            <div className="skeleton-shimmer" style={{ width: '180px', height: '12px', borderRadius: '4px', marginTop: '6px' }}></div>
                        </div>
                    </div>
                    <Skeleton width="70px" height="34px" borderRadius="20px" />
                </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem', marginBottom: '1.5rem' }}>
                <Skeleton height="100px" borderRadius="20px" />
                <Skeleton height="100px" borderRadius="20px" />
            </div>

            {/* Recent requests */}
            <Skeleton width="40%" height="16px" style={{ marginBottom: '1rem' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[1, 2].map(i => (
                    <div key={i} style={{ background: '#F9FAFB', borderRadius: '16px', padding: '1.1rem', border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <Skeleton width="60%" height="14px" />
                        <Skeleton width="40%" height="12px" />
                        <Skeleton height="32px" borderRadius="10px" />
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Results screen skeleton (pharmacy response cards) ─────────────────────────
export function SkeletonResultsCard() {
    return (
        <div style={{ background: '#fff', borderRadius: '16px', padding: '1.1rem 1.25rem', border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Skeleton width="40px" height="40px" borderRadius="12px" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <Skeleton width="120px" height="13px" />
                        <Skeleton width="80px" height="11px" />
                    </div>
                </div>
                <Skeleton width="60px" height="22px" borderRadius="20px" />
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
                <Skeleton width="70px" height="22px" borderRadius="20px" />
                <Skeleton width="90px" height="22px" borderRadius="20px" />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
                <Skeleton height="36px" borderRadius="10px" />
                <Skeleton width="48px" height="36px" borderRadius="10px" />
            </div>
        </div>
    );
}

// ── Chat screen skeleton (alternating message bubbles) ────────────────────────
export function SkeletonChatBubble() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '0.5rem' }}>
            {[
                { mine: false, w: '65%' },
                { mine: true, w: '50%' },
                { mine: false, w: '75%' },
                { mine: true, w: '40%' },
                { mine: false, w: '60%' },
                { mine: true, w: '55%' },
            ].map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: item.mine ? 'flex-end' : 'flex-start' }}>
                    <Skeleton
                        width={item.w}
                        height="38px"
                        borderRadius={item.mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px'}
                    />
                </div>
            ))}
        </div>
    );
}
