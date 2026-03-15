import React, { useEffect, useRef } from 'react';

/**
 * BottomSheet — Mobile bottom sheet for chat reactions and menus.
 * Issue #22: Chat reaction bottom sheet instead of hard-to-discover long-press.
 *
 * Props:
 *  - isOpen: boolean
 *  - onClose: () => void
 *  - title: string (optional)
 *  - children: React nodes (sheet content)
 *  - snapHeight: '40vh' | '60vh' | '80vh' | 'auto' (default 'auto')
 */
export default function BottomSheet({ isOpen, onClose, title, children, snapHeight = 'auto' }) {
    const sheetRef = useRef(null);
    const startYRef = useRef(null);
    const currentYRef = useRef(0);

    // Prevent background scroll when open
    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    // Close on Escape
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape' && isOpen) onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    // Drag-to-dismiss
    useEffect(() => {
        const sheet = sheetRef.current;
        if (!sheet || !isOpen) return;

        const handleStart = (e) => { startYRef.current = e.touches[0].clientY; };
        const handleMove = (e) => {
            if (startYRef.current === null) return;
            const dy = e.touches[0].clientY - startYRef.current;
            if (dy > 0) {
                currentYRef.current = dy;
                sheet.style.transform = `translateY(${dy}px)`;
                sheet.style.transition = 'none';
            }
        };
        const handleEnd = () => {
            if (currentYRef.current > 100) {
                onClose();
            } else {
                sheet.style.transform = 'translateY(0)';
                sheet.style.transition = 'transform 0.3s cubic-bezier(0.16,1,0.3,1)';
            }
            startYRef.current = null;
            currentYRef.current = 0;
        };

        sheet.addEventListener('touchstart', handleStart, { passive: true });
        sheet.addEventListener('touchmove', handleMove, { passive: true });
        sheet.addEventListener('touchend', handleEnd);
        return () => {
            sheet.removeEventListener('touchstart', handleStart);
            sheet.removeEventListener('touchmove', handleMove);
            sheet.removeEventListener('touchend', handleEnd);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, zIndex: 50000,
                background: 'rgba(0,0,0,0.4)',
                animation: 'sheetOverlayIn 0.2s ease',
                display: 'flex', alignItems: 'flex-end',
            }}
        >
            <div
                ref={sheetRef}
                onClick={e => e.stopPropagation()}
                style={{
                    width: '100%',
                    background: '#fff',
                    borderRadius: '24px 24px 0 0',
                    maxHeight: snapHeight === 'auto' ? '85vh' : snapHeight,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    animation: 'sheetSlideUp 0.35s cubic-bezier(0.16,1,0.3,1)',
                    boxShadow: '0 -8px 40px rgba(0,0,0,0.15)',
                }}
            >
                {/* Drag handle */}
                <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 6px' }}>
                    <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: '#E5E7EB' }} />
                </div>

                {/* Title */}
                {title && (
                    <div style={{
                        padding: '4px 20px 12px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        borderBottom: '1px solid #F3F4F6',
                    }}>
                        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827' }}>{title}</span>
                        <button className="btn-dynamic"
                            onClick={onClose}
                            style={{ background: '#F3F4F6', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', fontSize: '0.8rem', color: '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >✕</button>
                    </div>
                )}

                {/* Content */}
                <div style={{ flexGrow: 1, overflowY: 'auto', padding: '8px 0 env(safe-area-inset-bottom, 16px)' }}>
                    {children}
                </div>
            </div>

            <style>{`
                @keyframes sheetOverlayIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes sheetSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
            `}</style>
        </div>
    );
}
