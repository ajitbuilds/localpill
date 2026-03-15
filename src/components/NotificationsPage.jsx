import React, { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, orderBy, limit, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';

export default function NotificationsPage({ user, onBack, onNavigate }) {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const isMounted = useRef(true);

    useEffect(() => {
        return () => { isMounted.current = false; };
    }, []);

    useEffect(() => {
        if (!user?.uid) return;
        const notifRef = collection(db, 'notifications', user.uid, 'userNotifications');
        const q = query(notifRef, orderBy('createdAt', 'desc'), limit(50));
        const unsub = onSnapshot(q, (snapshot) => {
            if (!isMounted.current) return;
            setNotifications(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });
        return () => unsub();
    }, [user?.uid]);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const handleNotificationClick = async (notif) => {
        if (!notif.isRead) {
            try {
                const notifDoc = doc(db, 'notifications', user.uid, 'userNotifications', notif.id);
                await updateDoc(notifDoc, { isRead: true });
            } catch (err) {
                console.error('Failed to mark as read', err);
            }
        }

        if (notif.type === 'PHARMACY_RESPONSE') {
            if (onNavigate) onNavigate('/history');
        } else if (notif.type === 'CHAT_MESSAGE') {
            const parts = notif.relatedId ? notif.relatedId.split('_') : [];
            const requestId = parts[0] || notif.relatedId;
            const pharmacyId = parts[1] || '';
            const url = pharmacyId ? `/chat?id=${requestId}&pharmacy=${pharmacyId}` : `/chat?id=${requestId}`;
            if (onNavigate) onNavigate(url);
        }
    };

    const markAllRead = async () => {
        const unread = notifications.filter(n => !n.isRead);
        if (unread.length === 0) return;
        try {
            const batch = writeBatch(db);
            unread.forEach(n => {
                const ref = doc(db, 'notifications', user.uid, 'userNotifications', n.id);
                batch.update(ref, { isRead: true });
            });
            await batch.commit();
        } catch (err) {
            console.error('Failed to mark all as read', err);
        }
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return 'Just now';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const diffMs = Date.now() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHrs = Math.floor(diffMins / 60);
        if (diffHrs < 24) return `${diffHrs}h ago`;
        const diffDays = Math.floor(diffHrs / 24);
        return diffDays === 1 ? 'Yesterday' : `${diffDays}d ago`;
    };

    const getIcon = (type) => {
        if (type === 'CHAT_MESSAGE') return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>;
        if (type === 'PHARMACY_RESPONSE') return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;
        if (type === 'REQUEST_EXPIRED') return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;
        if (type === 'SYSTEM') return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>;
        return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>;
    };

    const getAccentColor = (type) => {
        if (type === 'CHAT_MESSAGE') return '#3B82F6';
        if (type === 'PHARMACY_RESPONSE') return '#10B981';
        if (type === 'REQUEST_EXPIRED') return '#F59E0B';
        return '#8B5CF6';
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: '#F9FAFB',
            fontFamily: 'Inter, sans-serif',
            paddingBottom: '80px',
        }}>
            {/* Header */}
            <div style={{
                position: 'sticky', top: 0, zIndex: 50,
                background: 'white',
                borderBottom: '1px solid #E5E7EB',
                padding: '0.875rem 1.25rem',
                display: 'flex', alignItems: 'center', gap: '0.875rem',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}>
                <button className="btn-dynamic"
                    onClick={onBack}
                    style={{
                        background: '#F3F4F6', border: '1px solid #E5E7EB',
                        borderRadius: '10px', width: '36px', height: '36px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: '#374151', flexShrink: 0,
                        transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#E5E7EB'}
                    onMouseLeave={e => e.currentTarget.style.background = '#F3F4F6'}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12" />
                        <polyline points="12 19 5 12 12 5" />
                    </svg>
                </button>

                <div style={{ flex: 1 }}>
                    <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.02em' }}>
                        Notifications
                    </h1>
                    {unreadCount > 0 && (
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#6B7280' }}>
                            {unreadCount} unread
                        </p>
                    )}
                </div>

                {unreadCount > 0 && (
                    <button className="btn-dynamic"
                        onClick={markAllRead}
                        style={{
                            background: 'transparent', border: 'none',
                            color: '#2ECC71', fontWeight: 700, fontSize: '0.8rem',
                            cursor: 'pointer', padding: '6px 10px', borderRadius: '8px',
                            transition: 'background 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#DCFCE7'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                        Mark all read
                    </button>
                )}
            </div>

            {/* Content */}
            <div style={{ maxWidth: '600px', margin: '0 auto', padding: '1rem' }}>
                {loading ? (
                    /* Skeleton */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} style={{
                                background: 'white', borderRadius: '14px',
                                border: '1px solid #E5E7EB', padding: '1rem',
                                display: 'flex', gap: '0.875rem',
                            }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#F3F4F6' }} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ height: '12px', background: '#F3F4F6', borderRadius: '6px', marginBottom: '8px', width: '60%' }} />
                                    <div style={{ height: '10px', background: '#F3F4F6', borderRadius: '6px', width: '90%' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : notifications.length === 0 ? (
                    /* Empty state */
                    <div style={{
                        textAlign: 'center', padding: '4rem 2rem',
                        background: 'white', borderRadius: '18px',
                        border: '1px dashed #E5E7EB', marginTop: '1rem',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', opacity: 0.4 }}>
                            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
                        </div>
                        <h3 style={{ margin: '0 0 0.5rem', color: '#111827', fontSize: '1.1rem', fontWeight: 700 }}>
                            All caught up!
                        </h3>
                        <p style={{ margin: 0, color: '#9CA3AF', fontSize: '0.875rem', lineHeight: 1.5 }}>
                            Aapko koi nayi notification nahi hai abhi.
                        </p>
                    </div>
                ) : (
                    /* Notification list */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {notifications.map((notif, idx) => {
                            const accent = getAccentColor(notif.type);
                            const isUnread = !notif.isRead;
                            return (
                                <div
                                    key={notif.id}
                                    onClick={() => handleNotificationClick(notif)}
                                    style={{
                                        background: isUnread ? '#F0FDF4' : 'white',
                                        border: `1px solid ${isUnread ? '#BBF7D0' : '#E5E7EB'}`,
                                        borderRadius: '14px',
                                        padding: '1rem',
                                        display: 'flex', alignItems: 'flex-start', gap: '0.875rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        animation: `fadeInUp 0.3s ease ${idx * 0.04}s both`,
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                >
                                    {/* Icon */}
                                    <div style={{
                                        width: '42px', height: '42px', borderRadius: '12px', flexShrink: 0,
                                        background: `${accent}18`,
                                        border: `1px solid ${accent}30`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '1.2rem',
                                    }}>
                                        {getIcon(notif.type)}
                                    </div>

                                    {/* Content */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '4px' }}>
                                            <h4 style={{
                                                margin: 0, fontSize: '0.875rem',
                                                fontWeight: isUnread ? 700 : 600,
                                                color: '#111827',
                                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                            }}>
                                                {notif.title || 'Notification'}
                                            </h4>
                                            <span style={{ fontSize: '0.7rem', color: '#9CA3AF', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                                {formatTime(notif.createdAt)}
                                            </span>
                                        </div>
                                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#4B5563', lineHeight: 1.5 }}>
                                            {notif.body}
                                        </p>
                                    </div>

                                    {/* Unread dot */}
                                    {isUnread && (
                                        <div style={{
                                            width: '8px', height: '8px', borderRadius: '50%',
                                            background: '#22C55E', flexShrink: 0, marginTop: '6px',
                                        }} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <style>{`
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
