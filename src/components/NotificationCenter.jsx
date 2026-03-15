import React, { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function NotificationCenter({ user, onNavigate, theme = 'light', onOpenPage }) {
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const isMounted = useRef(true);

    useEffect(() => {
        return () => { isMounted.current = false; };
    }, []);

    useEffect(() => {
        if (!user?.uid) return;

        const notifRef = collection(db, 'notifications', user.uid, 'userNotifications');
        const q = query(notifRef, orderBy('createdAt', 'desc'), limit(15));

        const unsub = onSnapshot(q, (snapshot) => {
            const fetched = [];
            snapshot.forEach(doc => {
                fetched.push({ id: doc.id, ...doc.data() });
            });
            setNotifications(fetched);
        });

        return () => unsub();
    }, [user?.uid]);

    // Handle click outside to close dropdown
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [dropdownRef]);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const handleNotificationClick = async (notif) => {
        // Mark as read
        if (!notif.isRead) {
            try {
                const notifDoc = doc(db, 'notifications', user.uid, 'userNotifications', notif.id);
                await updateDoc(notifDoc, { isRead: true });
            } catch (err) {
                console.error("Failed to mark notification as read", err);
            }
        }

        if (isMounted.current) {
            setIsOpen(false);
        }

        // Navigate based on type
        if (notif.type === 'PHARMACY_RESPONSE') {
            if (onNavigate) onNavigate('/history');
            else window.location.href = '/history';
        } else if (notif.type === 'CHAT_MESSAGE') {
            // relatedId is in "requestId_pharmacyId" format (set by Cloud Function)
            const parts = notif.relatedId ? notif.relatedId.split('_') : [];
            const requestId = parts[0] || notif.relatedId;
            const pharmacyId = parts[1] || '';
            const targetUrl = pharmacyId
                ? `/chat?id=${requestId}&pharmacy=${pharmacyId}`
                : `/chat?id=${requestId}`;
            if (onNavigate) onNavigate(targetUrl);
            else window.location.href = targetUrl;
        }
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return 'Just now';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;

        const diffHrs = Math.floor(diffMins / 60);
        if (diffHrs < 24) return `${diffHrs}h ago`;

        const diffDays = Math.floor(diffHrs / 24);
        if (diffDays === 1) return 'Yesterday';
        return `${diffDays}d ago`;
    };

    return (
        <div style={{ position: 'relative' }} ref={dropdownRef}>
            {/* Bell Icon Button */}
            <button className="btn-dynamic"
                onClick={() => onOpenPage ? onOpenPage() : setIsOpen(!isOpen)}
                style={{
                    background: theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#F3F4F6',
                    border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.2)' : '#E5E7EB'}`,
                    borderRadius: '50%', width: '42px', height: '42px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', position: 'relative',
                    transition: 'all 0.2s ease',
                    color: theme === 'dark' ? '#fff' : '#374151',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = theme === 'dark' ? 'rgba(255,255,255,0.2)' : '#E5E7EB'; }}
                onMouseLeave={e => { e.currentTarget.style.background = theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#F3F4F6'; }}
                title="Notifications"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>

                {/* Unread Badge */}
                {unreadCount > 0 && (
                    <div style={{
                        position: 'absolute', top: '-2px', right: '-2px',
                        background: '#EF4444', color: 'white',
                        fontSize: '0.65rem', fontWeight: 800,
                        width: '18px', height: '18px', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '2px solid white',
                        animation: 'pulseBadge 2s infinite'
                    }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </div>
                )}
            </button>

            {/* Dropdown Overlay */}
            {isOpen && (
                <div style={{
                    position: 'absolute', top: '50px', right: '0',
                    width: '320px', background: '#fff',
                    borderRadius: '16px', border: '1px solid #E5E7EB',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                    zIndex: 1000, overflow: 'hidden',
                    animation: 'fadeInDown 0.2s ease-out forwards',
                    transformOrigin: 'top right'
                }}>
                    <div style={{
                        padding: '1rem', borderBottom: '1px solid #E5E7EB',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        background: '#F9FAFB'
                    }}>
                        <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#111827' }}>Notifications</h3>
                        {unreadCount > 0 && (
                            <span style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 500 }}>
                                {unreadCount} unread
                            </span>
                        )}
                    </div>

                    <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                        {notifications.length === 0 ? (
                            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#9CA3AF' }}>
                                <div style={{ marginBottom: '0.5rem', opacity: 0.4, display: 'flex', justifyContent: 'center' }}>
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                                </div>
                                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 500 }}>All caught up! No new notifications.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                {notifications.map((notif) => (
                                    <div
                                        key={notif.id}
                                        onClick={() => handleNotificationClick(notif)}
                                        style={{
                                            padding: '1rem', borderBottom: '1px solid #F3F4F6',
                                            cursor: 'pointer', display: 'flex', gap: '12px',
                                            background: notif.isRead ? '#fff' : '#F0FDF4',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.background = notif.isRead ? '#F9FAFB' : '#DCFCE7'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = notif.isRead ? '#fff' : '#F0FDF4'; }}
                                    >
                                        <div style={{
                                            width: '8px', height: '8px', borderRadius: '50%',
                                            background: notif.isRead ? 'transparent' : '#22C55E',
                                            marginTop: '6px', flexShrink: 0
                                        }} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                                                <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: notif.isRead ? 600 : 700, color: '#111827' }}>
                                                    {notif.title}
                                                </h4>
                                                <span style={{ fontSize: '0.7rem', color: '#9CA3AF', whiteSpace: 'nowrap', marginLeft: '8px' }}>
                                                    {formatTime(notif.createdAt)}
                                                </span>
                                            </div>
                                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#4B5563', lineHeight: 1.4 }}>
                                                {notif.body}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* View all area - placeholder for future scale */}
                    {notifications.length > 0 && (
                        <div style={{ padding: '0.75rem', textAlign: 'center', borderTop: '1px solid #E5E7EB', background: '#F9FAFB' }}>
                            <span style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 500 }}>
                                Showing recent history
                            </span>
                        </div>
                    )}
                </div>
            )}

            <style>{`
                @keyframes pulseBadge {
                    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
                    70% { transform: scale(1.05); box-shadow: 0 0 0 4px rgba(239,68,68,0); }
                    100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239,68,68,0); }
                }
                @keyframes fadeInDown {
                    from { opacity: 0; transform: translateY(-10px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </div>
    );
}
