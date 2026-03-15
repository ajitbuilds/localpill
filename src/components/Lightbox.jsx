import React, { useEffect, useRef } from 'react';

/**
 * Lightbox — Full-screen image viewer with pinch-to-zoom.
 * Issue #32: Image lightbox with pinch-to-zoom for prescription images in chat.
 */
export default function Lightbox({ src, alt = 'Image', onClose }) {
    const imgRef = useRef(null);
    const containerRef = useRef(null);
    const scaleRef = useRef(1);
    const initialDistRef = useRef(null);
    const initialScaleRef = useRef(1);
    const panRef = useRef({ x: 0, y: 0 });
    const lastPanRef = useRef({ x: 0, y: 0 });
    const touchCountRef = useRef(0);

    // Close on Escape key
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        // Prevent body scroll while open
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [onClose]);

    // Pinch-to-zoom and pan
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const getDist = (touches) => {
            const dx = touches[0].clientX - touches[1].clientX;
            const dy = touches[0].clientY - touches[1].clientY;
            return Math.sqrt(dx * dx + dy * dy);
        };

        const applyTransform = () => {
            if (!imgRef.current) return;
            const s = scaleRef.current;
            const px = panRef.current.x;
            const py = panRef.current.y;
            imgRef.current.style.transform = `translate(${px}px, ${py}px) scale(${s})`;
        };

        const handleTouchStart = (e) => {
            touchCountRef.current = e.touches.length;
            if (e.touches.length === 2) {
                initialDistRef.current = getDist(e.touches);
                initialScaleRef.current = scaleRef.current;
            } else if (e.touches.length === 1) {
                lastPanRef.current = { ...panRef.current };
                lastPanRef.current._startX = e.touches[0].clientX;
                lastPanRef.current._startY = e.touches[0].clientY;
            }
        };

        const handleTouchMove = (e) => {
            e.preventDefault();
            if (e.touches.length === 2 && initialDistRef.current) {
                const dist = getDist(e.touches);
                const scale = Math.min(Math.max(initialScaleRef.current * (dist / initialDistRef.current), 1), 5);
                scaleRef.current = scale;
                applyTransform();
            } else if (e.touches.length === 1 && scaleRef.current > 1) {
                const dx = e.touches[0].clientX - lastPanRef.current._startX;
                const dy = e.touches[0].clientY - lastPanRef.current._startY;
                panRef.current = { x: lastPanRef.current.x + dx, y: lastPanRef.current.y + dy };
                applyTransform();
            }
        };

        const handleTouchEnd = (e) => {
            if (e.touches.length < 2) initialDistRef.current = null;
            // If scale is near 1 and panned, reset pan
            if (scaleRef.current <= 1.05) {
                scaleRef.current = 1;
                panRef.current = { x: 0, y: 0 };
                applyTransform();
            }
        };

        el.addEventListener('touchstart', handleTouchStart, { passive: false });
        el.addEventListener('touchmove', handleTouchMove, { passive: false });
        el.addEventListener('touchend', handleTouchEnd);
        return () => {
            el.removeEventListener('touchstart', handleTouchStart);
            el.removeEventListener('touchmove', handleTouchMove);
            el.removeEventListener('touchend', handleTouchEnd);
        };
    }, []);

    // Double-tap to zoom
    const lastTapRef = useRef(0);
    const handleDoubleTap = () => {
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
            if (scaleRef.current > 1) {
                scaleRef.current = 1;
                panRef.current = { x: 0, y: 0 };
            } else {
                scaleRef.current = 2.5;
            }
            if (imgRef.current) {
                imgRef.current.style.transition = 'transform 0.3s ease';
                imgRef.current.style.transform = `translate(${panRef.current.x}px, ${panRef.current.y}px) scale(${scaleRef.current})`;
                setTimeout(() => { if (imgRef.current) imgRef.current.style.transition = 'none'; }, 300);
            }
        }
        lastTapRef.current = now;
    };

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, zIndex: 100000,
                background: 'rgba(0,0,0,0.92)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: 'lightboxFade 0.2s ease',
            }}
        >
            {/* Close button */}
            <button className="btn-dynamic"
                onClick={onClose}
                style={{
                    position: 'fixed', top: '16px', right: '16px',
                    background: 'rgba(255,255,255,0.12)', border: 'none',
                    borderRadius: '50%', width: '40px', height: '40px',
                    color: '#fff', fontSize: '1.2rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 100001, backdropFilter: 'blur(4px)',
                }}
            >✕</button>

            {/* Hint */}
            <div style={{
                position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
                color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', pointerEvents: 'none',
            }}>Pinch to zoom · Double-tap to zoom · Tap to close</div>

            {/* Image container */}
            <div
                ref={containerRef}
                onClick={e => e.stopPropagation()}
                onTouchEnd={handleDoubleTap}
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '100%', height: '100%', overflow: 'hidden',
                }}
            >
                <img
                    ref={imgRef}
                    src={src}
                    alt={alt}
                    style={{
                        maxWidth: '95vw', maxHeight: '90vh',
                        objectFit: 'contain',
                        borderRadius: '8px',
                        boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
                        touchAction: 'none',
                        userSelect: 'none',
                        animation: 'lightboxScale 0.25s cubic-bezier(0.16,1,0.3,1)',
                    }}
                    draggable={false}
                />
            </div>

            <style>{`
                @keyframes lightboxFade  { from { opacity: 0; } to { opacity: 1; } }
                @keyframes lightboxScale { from { transform: scale(0.88); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            `}</style>
        </div>
    );
}
