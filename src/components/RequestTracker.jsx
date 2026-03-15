import React, { useState, useEffect, useRef } from 'react';

/**
 * RequestTracker — Animated progress tracker card for active medicine requests.
 * Issue #25: Animated request progress tracker card for patient dashboard
 *
 * Props:
 *  - notifiedCount: number of pharmacies notified
 *  - respondedCount: number of pharmacies that responded
 *  - matchFound: boolean — whether any Available response came in
 *  - timeLeftSeconds: seconds until expiry
 */
export default function RequestTracker({ notifiedCount = 0, respondedCount = 0, matchFound = false, timeLeftSeconds = 0 }) {
    const [displayedCount, setDisplayedCount] = useState(0);
    const prevRespondedRef = useRef(respondedCount);

    // Animate number counter when responses increase
    useEffect(() => {
        const from = prevRespondedRef.current;
        const to = respondedCount;
        if (to <= from) { setDisplayedCount(to); prevRespondedRef.current = to; return; }
        let current = from;
        const step = () => {
            current = Math.min(current + 1, to);
            setDisplayedCount(current);
            if (current < to) setTimeout(step, 120);
            else prevRespondedRef.current = to;
        };
        setTimeout(step, 80);
    }, [respondedCount]);

    // Format time
    const mins = Math.floor(timeLeftSeconds / 60);
    const secs = timeLeftSeconds % 60;
    const timeStr = `${mins}:${String(secs).padStart(2, '0')}`;

    const pct = notifiedCount > 0 ? Math.round((respondedCount / notifiedCount) * 100) : 0;

    // Steps
    const steps = [
        { label: 'Sent', done: true },
        { label: `Notified (${notifiedCount})`, done: notifiedCount > 0 },
        { label: `Responses (${displayedCount})`, done: respondedCount > 0 },
        { label: 'Match', done: matchFound },
    ];

    const currentStep = steps.findLastIndex(s => s.done);

    return (
        <div
            className="page-transition"
            style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1a3a2a 100%)',
                borderRadius: '20px',
                padding: '1.25rem 1.5rem',
                marginBottom: '1rem',
                border: '1px solid rgba(34,197,94,0.2)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            {/* Background shimmer */}
            <div style={{
                position: 'absolute', inset: 0,
                background: 'radial-gradient(ellipse at 80% 50%, rgba(34,197,94,0.06) 0%, transparent 70%)',
                pointerEvents: 'none',
            }} />

            {/* Title row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Pulsing live dot */}
                    {!matchFound && (
                        <span style={{
                            display: 'inline-block',
                            width: '8px', height: '8px',
                            borderRadius: '50%',
                            background: '#22C55E',
                            animation: 'trackerPulse 1.5s ease-in-out infinite',
                            flexShrink: 0,
                        }} />
                    )}
                    {matchFound && <span style={{ display: 'flex' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg></span>}
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>
                        {matchFound ? 'Medicine Found!' : 'Finding your medicine...'}
                    </span>
                </div>
                {timeLeftSeconds > 0 && (
                    <span style={{
                        fontSize: '0.72rem', fontWeight: 600,
                        color: timeLeftSeconds < 120 ? '#FCA5A5' : '#94A3B8',
                        background: 'rgba(255,255,255,0.06)',
                        padding: '3px 8px', borderRadius: '20px',
                        display: 'flex', alignItems: 'center', gap: '4px'
                    }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg> {timeStr}
                    </span>
                )}
            </div>

            {/* Step indicators */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', gap: 0 }}>
                {steps.map((step, i) => (
                    <React.Fragment key={i}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: i < steps.length - 1 ? 'none' : 1, minWidth: '46px' }}>
                            <div style={{
                                width: '20px', height: '20px',
                                borderRadius: '50%',
                                background: step.done ? '#22C55E' : 'rgba(255,255,255,0.1)',
                                border: `2px solid ${step.done ? '#22C55E' : 'rgba(255,255,255,0.2)'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.6rem',
                                color: step.done ? '#fff' : 'rgba(255,255,255,0.3)',
                                fontWeight: 700,
                                transition: 'background 0.4s, border-color 0.4s',
                                flexShrink: 0,
                            }}>
                                {step.done ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg> : (i + 1)}
                            </div>
                            <span style={{
                                fontSize: '0.58rem',
                                color: step.done ? '#86efac' : 'rgba(255,255,255,0.35)',
                                fontWeight: i === currentStep ? 700 : 400,
                                whiteSpace: 'nowrap',
                                textAlign: 'center',
                            }}>
                                {step.label}
                            </span>
                        </div>
                        {i < steps.length - 1 && (
                            <div style={{
                                flex: 1,
                                height: '2px',
                                background: steps[i + 1].done ? '#22C55E' : 'rgba(255,255,255,0.1)',
                                marginBottom: '16px',
                                transition: 'background 0.5s',
                            }} />
                        )}
                    </React.Fragment>
                ))}
            </div>

            {/* Progress bar */}
            {notifiedCount > 0 && (
                <div>
                    <div style={{
                        display: 'flex', justifyContent: 'space-between',
                        fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)',
                        marginBottom: '5px',
                    }}>
                        <span>{pct}% pharmacies responded</span>
                        <span>{displayedCount} / {notifiedCount}</span>
                    </div>
                    <div style={{
                        height: '5px', borderRadius: '3px',
                        background: 'rgba(255,255,255,0.08)',
                        overflow: 'hidden',
                    }}>
                        <div style={{
                            height: '100%',
                            width: `${pct}%`,
                            background: 'linear-gradient(90deg, #22C55E, #4ADE80)',
                            borderRadius: '3px',
                            transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)',
                        }} />
                    </div>
                </div>
            )}

            <style>{`
                @keyframes trackerPulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.4; transform: scale(0.8); }
                }
            `}</style>
        </div>
    );
}
