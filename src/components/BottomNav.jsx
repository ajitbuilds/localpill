import React from 'react';
import ReactDOM from 'react-dom';
import { useHaptic } from '../hooks/useHaptic';

/**
 * BottomNav — Fixed mobile bottom navigation bar.
 * Issue #21: Add bottom navigation bar for mobile (patient + pharmacy)
 *
 * Only visible on mobile (< 768px). Hidden when chat is open.
 * role: 'patient' | 'pharmacy'
 * activeTab: current active tab key
 * onChange: (tab) => void
 * newRequestCount: number (badge on Requests tab for pharmacy)
 */
// SVG icon helpers — consistent size 22px
const HomeIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
);
const SearchIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
);
const HistoryIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
    </svg>
);
const ProfileIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
);
const RequestsIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
    </svg>
);
const StatsIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
);

const PATIENT_TABS = [
    { key: 'home', Icon: HomeIcon, label: 'Home' },
    { key: 'search', Icon: SearchIcon, label: 'Search' },
    { key: 'history', Icon: HistoryIcon, label: 'History' },
    { key: 'profile', Icon: ProfileIcon, label: 'Profile' },
];

const PHARMACY_TABS = [
    { key: 'dashboard', Icon: HomeIcon, label: 'Dashboard' },
    { key: 'requests', Icon: RequestsIcon, label: 'Requests' },
    { key: 'history', Icon: StatsIcon, label: 'History' },
    { key: 'profile', Icon: ProfileIcon, label: 'Profile' },
];

export default function BottomNav({ role = 'patient', activeTab, onChange, newRequestCount = 0 }) {
    const tabs = role === 'pharmacy' ? PHARMACY_TABS : PATIENT_TABS;
    const haptic = useHaptic();

    return ReactDOM.createPortal(
        <nav
            className="bottom-nav"
            style={{
                display: 'none', // shown via CSS media query
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 1000,
                background: '#fff',
                borderTop: '1px solid #E5E7EB',
                boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
                height: '62px',
                paddingBottom: 'env(safe-area-inset-bottom)',
            }}
        >
            <div style={{
                display: 'flex',
                height: '100%',
                alignItems: 'stretch',
            }}>
                {tabs.map(tab => {
                    const isActive = activeTab === tab.key;
                    const hasBadge = tab.key === 'requests' && newRequestCount > 0;
                    return (
                        <button className="btn-dynamic"
                            key={tab.key}
                            onClick={() => {
                                haptic.light();
                                onChange?.(tab.key);
                            }}
                            style={{
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '3px',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '8px 4px',
                                position: 'relative',
                                transition: 'background 0.2s',
                                borderRadius: 0,
                                fontFamily: 'inherit',
                            }}
                        >
                            {/* Active indicator line at top */}
                            {isActive && (
                                <div style={{
                                    position: 'absolute',
                                    top: 0, left: '25%', right: '25%',
                                    height: '2px',
                                    background: '#22C55E',
                                    borderRadius: '0 0 2px 2px',
                                    animation: 'bottomNavLine 0.2s ease forwards',
                                }} />
                            )}

                            {/* Icon with badge */}
                            <div style={{ position: 'relative', display: 'inline-flex' }}>
                                <div style={{
                                    color: isActive ? '#22C55E' : '#9CA3AF',
                                    transition: 'color 0.2s, transform 0.2s',
                                    transform: isActive ? 'scale(1.1)' : 'scale(1)',
                                    display: 'flex',
                                }}>
                                    <tab.Icon />
                                </div>
                                {hasBadge && (
                                    <span style={{
                                        position: 'absolute',
                                        top: '-4px', right: '-6px',
                                        background: '#EF4444',
                                        color: '#fff',
                                        fontSize: '0.55rem',
                                        fontWeight: 700,
                                        minWidth: '14px',
                                        height: '14px',
                                        borderRadius: '7px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '0 2px',
                                        border: '1.5px solid #fff',
                                    }}>
                                        {newRequestCount > 9 ? '9+' : newRequestCount}
                                    </span>
                                )}
                            </div>

                            {/* Label */}
                            <span style={{
                                fontSize: '0.65rem',
                                fontWeight: isActive ? 700 : 500,
                                color: isActive ? '#22C55E' : '#6B7280',
                                transition: 'color 0.2s',
                                letterSpacing: '-0.01em',
                            }}>
                                {tab.label}
                            </span>
                        </button>
                    );
                })}
            </div>

            <style>{`
                @media (max-width: 768px) {
                    .bottom-nav {
                        display: block !important;
                    }
                    body.chat-open .bottom-nav {
                        display: none !important;
                    }
                }
                @keyframes bottomNavLine {
                    from { transform: scaleX(0); }
                    to { transform: scaleX(1); }
                }
            `}</style>
        </nav>,
        document.body
    );
}
