import React, { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs, orderBy, limit, startAfter } from 'firebase/firestore';
import { db } from './firebase';
import { SkeletonHistoryCard } from './components/Skeleton';

const STATUS_TABS = ['All', 'Pending', 'Matched', 'Closed', 'Cancelled'];

const getStatusConfig = (req) => {
    const isExpired = req.expiresAt?.toMillis() ? req.expiresAt.toMillis() < Date.now() : false;
    const isCancelled = req.status === 'cancelled';
    const isClosed = req.status === 'closed';
    const responseCount = req.responsesCount || 0;

    if (isCancelled) return { label: 'Cancelled', dot: '#EF4444', bg: '#FEF2F2', color: '#DC2626' };
    if (isClosed) return { label: 'Closed', dot: '#6B7280', bg: '#F3F4F6', color: '#4B5563' };
    if (req.status === 'matched' || responseCount > 0)
        return { label: responseCount > 0 ? `${responseCount} Match${responseCount !== 1 ? 'es' : ''}` : 'Matched', dot: '#22C55E', bg: '#F0FDF4', color: '#15803D' };
    if (isExpired || req.status === 'expired' || req.status === 'timeout') return { label: 'Expired', dot: '#6B7280', bg: '#F3F4F6', color: '#4B5563' };
    if (req.status === 'pending') return { label: 'Searching…', dot: '#F59E0B', bg: '#FFFBEB', color: '#B45309' };

    return { label: 'Active', dot: '#3B82F6', bg: '#EFF6FF', color: '#1D4ED8' };
};

const PAGE_SIZE = 20;

export default function PatientHistory({ user, onViewRequest, onNavigate }) {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fetchingMore, setFetchingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [lastDoc, setLastDoc] = useState(null);
    const [activeTab, setActiveTab] = useState('All');
    const [search, setSearch] = useState('');

    const fetchBatch = useCallback(async (isMore = false) => {
        if (!user?.uid) return;
        if (isMore) setFetchingMore(true);
        else { setLoading(true); setRequests([]); setLastDoc(null); setHasMore(true); }

        try {
            let q = query(
                collection(db, 'medicineRequests'),
                where('userId', '==', user.uid),
                orderBy('createdAt', 'desc'),
                limit(PAGE_SIZE)
            );
            if (isMore && lastDoc) q = query(
                collection(db, 'medicineRequests'),
                where('userId', '==', user.uid),
                orderBy('createdAt', 'desc'),
                startAfter(lastDoc),
                limit(PAGE_SIZE)
            );

            const snap = await getDocs(q);
            const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            setRequests(prev => isMore ? [...prev, ...docs] : docs);
            setLastDoc(snap.docs[snap.docs.length - 1] || null);
            setHasMore(snap.docs.length === PAGE_SIZE);
        } catch (err) {
            console.error('PatientHistory fetch error:', err);
        } finally {
            setLoading(false);
            setFetchingMore(false);
        }
    }, [user?.uid, lastDoc]);

    useEffect(() => { fetchBatch(false); }, [user?.uid]);

    // Filter client-side for tab + search
    const filtered = requests.filter(req => {
        const tabMatch = activeTab === 'All' ||
            (activeTab === 'Pending' && (req.status === 'pending' || !req.status)) ||
            (activeTab === 'Matched' && req.status === 'matched') ||
            (activeTab === 'Closed' && req.status === 'closed') ||
            (activeTab === 'Cancelled' && (req.status === 'cancelled' || req.status === 'timeout' || req.status === 'expired'));
        const searchMatch = !search ||
            req.typedMedicines?.some(m => m.toLowerCase().includes(search.toLowerCase())) ||
            req.status?.includes(search.toLowerCase());
        return tabMatch && searchMatch;
    });

    if (loading) return (
        <div style={{ padding: '0.5rem 1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginTop: '1rem' }}>
                {[1, 2, 3, 4, 5].map(i => <SkeletonHistoryCard key={i} />)}
            </div>
        </div>
    );

    return (
        <div style={{ padding: '0.5rem 1rem' }}>
            <style>{`
                @keyframes blockFadeIn {
                    from { opacity: 0; transform: translateY(12px) scale(0.98); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .hist-card-anim {
                    animation: blockFadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
                }
            `}</style>
            {/* Search */}
            <div style={{ position: 'relative', marginBottom: '1rem' }}>
                <svg style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                <input
                    type="text"
                    placeholder="Search medicines…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    onFocus={e => { e.currentTarget.style.borderColor = '#22C55E'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.15)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }}
                    style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.5rem', border: '1px solid #E5E7EB', borderRadius: '12px', fontSize: '0.9rem', outline: 'none', background: '#fff', boxSizing: 'border-box', fontFamily: 'inherit', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                />
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '1.25rem', overflowX: 'auto', paddingBottom: '4px' }}>
                {STATUS_TABS.map(tab => (
                    <button className="btn-dynamic"
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            background: activeTab === tab ? '#22C55E' : '#F3F4F6',
                            color: activeTab === tab ? '#fff' : '#6B7280',
                            border: activeTab === tab ? 'none' : '1px solid transparent',
                            borderRadius: '20px',
                            padding: '5px 14px', fontSize: '0.8rem',
                            fontWeight: 600, cursor: 'pointer',
                            whiteSpace: 'nowrap', transition: 'all 0.2s',
                            flexShrink: 0,
                            boxShadow: activeTab === tab ? '0 2px 8px rgba(34,197,94,0.3)' : 'none'
                        }}
                    >{tab}</button>
                ))}
            </div>

            {/* List */}
            {filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', background: '#F9FAFB', borderRadius: '16px', border: '1px solid #E5E7EB' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem', opacity: 0.5 }}>
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                    </div>
                    <div style={{ fontWeight: 600, color: '#374151' }}>No requests found</div>
                    <div style={{ fontSize: '0.85rem', color: '#9CA3AF', marginTop: '4px' }}>Try a different filter or search term</div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    {filtered.map(req => {
                        const cfg = getStatusConfig(req);
                        const title = req.typedMedicines?.length > 0
                            ? req.typedMedicines.join(', ')
                            : 'Prescription Upload';
                        const date = req.createdAt?.toDate?.();
                        return (
                            <div
                                key={req.id}
                                className="hist-card-anim"
                                onClick={() => onViewRequest(req.id)}
                                style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '14px', padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: 'var(--shadow-sm)', animationDelay: `${Math.min(filtered.indexOf(req) * 0.07, 0.7)}s` }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary-border)'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', flex: 1, minWidth: 0 }}>
                                    <div style={{ width: '40px', height: '40px', flexShrink: 0, background: cfg.bg, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {req.prescriptionUrl
                                            ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={cfg.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /></svg>
                                            : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={cfg.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 10.56L13.44 14M6.92 11.23l6.85-6.85a3.86 3.86 0 0 1 5.46 5.46l-6.85 6.85a3.86 3.86 0 0 1-5.46-5.46z" /></svg>}
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.9rem', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {title}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                                            {date ? `${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '—'}
                                            {req.responsesCount > 0 && <span style={{ marginLeft: '6px', color: '#16A34A', fontWeight: 600 }}>· {req.responsesCount} response{req.responsesCount !== 1 ? 's' : ''}</span>}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ background: cfg.bg, color: cfg.color, fontSize: '0.75rem', fontWeight: 600, padding: '4px 10px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: cfg.dot, display: 'inline-block' }} />
                                            {cfg.label}
                                        </span>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                                    </div>
                                    {/* Feature: Search Again / Re-order Button */}
                                    {req.typedMedicines?.length > 0 && (
                                        <button className="btn-dynamic"
                                            onClick={(e) => {
                                                e.stopPropagation(); // prevent opening details
                                                if (onNavigate) {
                                                    const encoded = encodeURIComponent(JSON.stringify(req.typedMedicines));
                                                    onNavigate(`/find_medicine?meds=${encoded}`);
                                                }
                                            }}
                                            style={{
                                                background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE',
                                                borderRadius: '8px', padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600,
                                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.background = '#DBEAFE' }}
                                            onMouseLeave={e => { e.currentTarget.style.background = '#EFF6FF' }}
                                        >
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                                            Search Again
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Load More */}
            {hasMore && filtered.length > 0 && (
                <button className="btn-dynamic"
                    onClick={() => fetchBatch(true)}
                    disabled={fetchingMore}
                    style={{ width: '100%', marginTop: '1rem', padding: '0.75rem', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '12px', color: '#374151', fontSize: '0.875rem', fontWeight: 600, cursor: fetchingMore ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
                    onMouseEnter={e => { if (!fetchingMore) { e.currentTarget.style.background = '#F0FDF4'; e.currentTarget.style.color = '#15803D'; e.currentTarget.style.borderColor = '#BBF7D0'; } }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#F9FAFB'; e.currentTarget.style.color = '#374151'; e.currentTarget.style.borderColor = '#E5E7EB'; }}
                >
                    {fetchingMore ? 'Loading…' : 'Load More'}
                </button>
            )}
        </div>
    );
}
