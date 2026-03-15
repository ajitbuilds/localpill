import React, { useState, useEffect, useRef } from 'react';

/**
 * PullToRefresh — Enhanced with spring-back animation and cleaner spinner.
 * Issue #23: Improved pull-to-refresh with spring-back effect
 */
export default function PullToRefresh({ onRefresh, children }) {
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isReleasing, setIsReleasing] = useState(false); // spring-back state
    const startY = useRef(0);
    const currentY = useRef(0);
    const containerRef = useRef(null);

    const isRefreshingRef = useRef(false);
    const pullDistanceRef = useRef(0);
    const isMounted = useRef(true);

    useEffect(() => { return () => { isMounted.current = false; }; }, []);

    const PULL_THRESHOLD = 72; // px to trigger refresh
    const MAX_PULL = 130;

    useEffect(() => { isRefreshingRef.current = isRefreshing; }, [isRefreshing]);
    useEffect(() => { pullDistanceRef.current = pullDistance; }, [pullDistance]);

    useEffect(() => {
        const handleTouchStart = (e) => {
            if (window.scrollY === 0) {
                startY.current = e.touches[0].clientY;
            } else {
                startY.current = 0;
            }
        };

        const handleTouchMove = (e) => {
            if (startY.current === 0 || isRefreshingRef.current) return;
            currentY.current = e.touches[0].clientY;
            const distance = currentY.current - startY.current;
            if (distance > 0) {
                if (e.cancelable) e.preventDefault();
                // Rubber-band friction: more resistance as you pull further
                const friction = 1 - Math.min(distance / MAX_PULL, 1) * 0.45;
                setPullDistance(Math.min(distance * 0.45 * friction + distance * 0.01, MAX_PULL));
            } else {
                setPullDistance(0);
            }
        };

        const handleTouchEnd = async () => {
            if (startY.current === 0 || isRefreshingRef.current) return;

            if (pullDistanceRef.current >= PULL_THRESHOLD) {
                setIsRefreshing(true);
                setIsReleasing(false);
                setPullDistance(PULL_THRESHOLD);
                try {
                    await onRefresh();
                } finally {
                    if (isMounted.current) {
                        setIsRefreshing(false);
                        setIsReleasing(true);
                        setPullDistance(0);
                        setTimeout(() => { if (isMounted.current) setIsReleasing(false); }, 400);
                    }
                }
            } else {
                // Spring-back — animate back to 0
                setIsReleasing(true);
                setPullDistance(0);
                setTimeout(() => { if (isMounted.current) setIsReleasing(false); }, 350);
            }
            startY.current = 0;
            currentY.current = 0;
        };

        const container = containerRef.current;
        if (container) {
            container.addEventListener('touchstart', handleTouchStart, { passive: true });
            container.addEventListener('touchmove', handleTouchMove, { passive: false });
            container.addEventListener('touchend', handleTouchEnd);
        }
        return () => {
            if (container) {
                container.removeEventListener('touchstart', handleTouchStart);
                container.removeEventListener('touchmove', handleTouchMove);
                container.removeEventListener('touchend', handleTouchEnd);
            }
        };
    }, [onRefresh]);

    const showIndicator = pullDistance > 8 || isRefreshing;
    const progress = Math.min(pullDistance / PULL_THRESHOLD, 1);
    const isTriggered = pullDistance >= PULL_THRESHOLD;

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%', minHeight: '100%' }}>
            {/* Refresh indicator */}
            <div style={{
                position: 'absolute',
                top: '-60px',
                left: 0,
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '60px',
                transform: `translateY(${Math.min(pullDistance, MAX_PULL) + (isRefreshing ? PULL_THRESHOLD : 0)}px)`,
                transition: isReleasing || isRefreshing ? 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)' : 'none',
                zIndex: 10,
                pointerEvents: 'none',
            }}>
                <div style={{
                    background: '#fff',
                    borderRadius: '50%',
                    width: '42px',
                    height: '42px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                    opacity: showIndicator ? 1 : 0,
                    transform: `scale(${0.6 + progress * 0.4}) rotate(${pullDistance * 2.8}deg)`,
                    transition: isRefreshing ? 'none' : 'opacity 0.2s',
                    border: `2px solid ${isTriggered ? '#22C55E' : '#E5E7EB'}`,
                    position: 'relative',
                    overflow: 'hidden',
                }}>
                    {isRefreshing ? (
                        <div style={{
                            width: '18px', height: '18px',
                            border: '2.5px solid #E5E7EB',
                            borderTop: '2.5px solid #22C55E',
                            borderRadius: '50%',
                            animation: 'ptrSpin 0.7s linear infinite',
                        }} />
                    ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                            stroke={isTriggered ? '#22C55E' : '#9CA3AF'}
                            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="23 4 23 10 17 10" />
                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                        </svg>
                    )}
                </div>
            </div>

            {/* Content pushed down while pulling */}
            <div style={{
                transform: `translateY(${isRefreshing ? PULL_THRESHOLD : pullDistance}px)`,
                transition: isReleasing || isRefreshing ? 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)' : 'none',
                minHeight: '100%',
            }}>
                {children}
            </div>

            <style>{`
                @keyframes ptrSpin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
