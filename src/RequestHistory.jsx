import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { collectionGroup, query, where, getDocs, getDoc, doc, limit, orderBy, startAfter, collection } from 'firebase/firestore';
import { db, rtdb } from './firebase';
import ChatScreen from './ChatScreen';
// ── Helpers ──────────────────────────────────────────────────────────────────

function getTimelineLabel(date) {
    if (!date) return 'Older';
    const now = new Date();
    const d = date instanceof Date ? date : date.toDate();

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(todayStart.getDate() - 1);
    const weekStart = new Date(todayStart);
    weekStart.setDate(todayStart.getDate() - 6);

    if (d >= todayStart) return 'Today';
    if (d >= yesterdayStart) return 'Yesterday';
    if (d >= weekStart) return 'Last Week';
    return 'Older';
}

const TIMELINE_ORDER = ['Today', 'Yesterday', 'Last Week', 'Older'];

// ─────────────────────────────────────────────────────────────────────────────

export default function RequestHistory({ pharmacyUser, onNavigate }) {
    const [historyList, setHistoryList] = useState([]);
    const [activeTab, setActiveTab] = useState('All');
    const [responseFilter, setResponseFilter] = useState('All');
    const [search, setSearch] = useState('');
    const [userData, setUserData] = useState({});
    const [unreadCounts, setUnreadCounts] = useState({});
    const [lastVisible, setLastVisible] = useState(null);
    const [loading, setLoading] = useState(true);
    const [fetchingMore, setFetchingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const observer = useRef();
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    const fetchHistoryBatch = async (isLoadMore = false) => {
        if (!pharmacyUser?.uid) return;
        if (isLoadMore) {
            if (isMounted.current) setFetchingMore(true);
        } else {
            if (isMounted.current) setLoading(true);
        }

        try {
            // Query pharmacyResponses for this pharmacy, ordered by respondedAt
            // Fallback: if respondedAt is missing on old docs, we still fetch them
            let q = query(
                collectionGroup(db, 'pharmacyResponses'),
                where('pharmacyId', '==', pharmacyUser.uid),
                orderBy('respondedAt', 'desc'),
                limit(15)
            );

            if (isLoadMore && lastVisible) {
                q = query(
                    collectionGroup(db, 'pharmacyResponses'),
                    where('pharmacyId', '==', pharmacyUser.uid),
                    orderBy('respondedAt', 'desc'),
                    startAfter(lastVisible),
                    limit(15)
                );
            }

            let snap;
            try {
                snap = await getDocs(q);
            } catch (queryErr) {
                console.warn('[RequestHistory] orderBy(respondedAt) failed, falling back:', queryErr.message);
                try {
                    // Try without sorting (requires single-field group index)
                    const fallbackQ = query(
                        collectionGroup(db, 'pharmacyResponses'),
                        where('pharmacyId', '==', pharmacyUser.uid),
                        limit(30)
                    );
                    snap = await getDocs(fallbackQ);
                } catch (fallbackErr) {
                    console.error('[RequestHistory] Fallback query also failed. Going via array-contains on medicineRequests.', fallbackErr);
                    // Super safe fallback: query base collection directly (no collectionGroup index required)
                    const safeQ = query(
                        collection(db, 'medicineRequests'),
                        where('respondedPharmacies', 'array-contains', pharmacyUser.uid),
                        limit(50)
                    );
                    const safeSnap = await getDocs(safeQ);

                    if (!isMounted.current) return;

                    const safePromises = safeSnap.docs.map(async (reqDoc) => {
                        try {
                            const respSnap = await getDoc(doc(db, 'medicineRequests', reqDoc.id, 'pharmacyResponses', pharmacyUser.uid));
                            if (respSnap.exists()) {
                                return {
                                    id: reqDoc.id,
                                    ...reqDoc.data(),
                                    response: respSnap.data()
                                };
                            }
                        } catch (e) {
                            console.error('Error fetching nested response for fallback', e);
                        }
                        return null;
                    });

                    const newHistory = (await Promise.all(safePromises)).filter(Boolean);

                    // Sort descending manually since we had no orderBy
                    newHistory.sort((a, b) => (b.response?.respondedAt?.toMillis() || 0) - (a.response?.respondedAt?.toMillis() || 0));

                    setHasMore(false); // Can't easily paginate with manual fallback
                    setHistoryList(newHistory);

                    if (isMounted.current) {
                        setLoading(false);
                        setFetchingMore(false);
                    }
                    return; // exit the main flow since we manually populated the list
                }
            }

            if (!isMounted.current) return;

            if (snap.docs.length < 15) setHasMore(false);
            if (!snap.empty) setLastVisible(snap.docs[snap.docs.length - 1]);

            const historyPromises = snap.docs.map(async (d) => {
                const responseData = d.data();
                const reqRef = d.ref.parent.parent;
                try {
                    const reqSnap = await getDoc(reqRef);
                    if (reqSnap.exists()) {
                        return {
                            id: reqSnap.id,
                            ...reqSnap.data(),
                            response: responseData
                        };
                    }
                } catch (e) {
                    console.error("Error fetching request doc", e);
                }
                return null;
            });

            const resolvedHistory = await Promise.all(historyPromises);
            const newHistory = resolvedHistory.filter(Boolean);

            // Sort client-side by createdAt desc (handles missing respondedAt on old docs)
            newHistory.sort((a, b) => {
                const aMs = a.createdAt?.toMillis?.() ?? 0;
                const bMs = b.createdAt?.toMillis?.() ?? 0;
                return bMs - aMs;
            });

            if (isMounted.current) {
                setHistoryList(prev => isLoadMore ? [...prev, ...newHistory] : newHistory);
            }
        } catch (err) {
            console.error("Error fetching history batch:", err);
        } finally {
            if (isMounted.current) {
                setLoading(false);
                setFetchingMore(false);
            }
        }
    };

    useEffect(() => {
        fetchHistoryBatch();
    }, [pharmacyUser?.uid]);

    const lastElementRef = useCallback(node => {
        if (loading || fetchingMore) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                fetchHistoryBatch(true);
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, fetchingMore, hasMore, lastVisible]);

    // ── Original: Fetch missing user data (unchanged) ──
    useEffect(() => {
        const fetchMissingUserData = async () => {
            let updates = {};
            let hasChanges = false;
            const missingUserPromises = historyList
                .filter(req => req.userId && (!req.patientPhone || !req.patientName) && userData[req.userId] === undefined && updates[req.userId] === undefined)
                .map(async (req) => {
                    const userId = req.userId;
                    // Mark as pending in updates right away to prevent duplicate fetch attempts in parallel
                    updates[userId] = null;
                    try {
                        const userDoc = await getDoc(doc(db, 'users', userId));
                        if (userDoc.exists()) {
                            const data = userDoc.data();
                            return {
                                userId,
                                data: {
                                    phone: data.phone || data.phoneNumber || null,
                                    name: data.name || data.displayName || 'Unknown Patient'
                                }
                            };
                        } else {
                            return { userId, data: { phone: null, name: 'Unknown Patient' } };
                        }
                    } catch (e) {
                        console.error('Failed to fetch user data for', userId, e);
                        return { userId, data: { phone: null, name: 'Unknown Patient' } };
                    }
                });

            if (missingUserPromises.length > 0) {
                const results = await Promise.all(missingUserPromises);
                results.forEach(res => {
                    if (res) {
                        updates[res.userId] = res.data;
                        hasChanges = true;
                    }
                });
            }
            if (hasChanges) setUserData(prev => ({ ...prev, ...updates }));
        };
        fetchMissingUserData();
    }, [historyList, userData]);

    // Stable snapshot of 'now' — only recalculates when historyList changes
    // so useMemo below can actually cache the result between renders
    const now = useMemo(() => Date.now(), [historyList]);

    const filteredList = useMemo(() => {
        let list = historyList;

        if (activeTab === 'Active') {
            list = list.filter(req =>
                req.status !== 'closed' && req.status !== 'cancelled' &&
                (!req.expiresAt || req.expiresAt.toMillis() > now)
            );
        } else if (activeTab === 'Closed') {
            list = list.filter(req =>
                req.status === 'closed' || req.status === 'cancelled' ||
                (req.expiresAt && req.expiresAt.toMillis() <= now)
            );
        }

        if (responseFilter === 'Available') {
            list = list.filter(req => req.response?.responseType === 'available');
        } else if (responseFilter === 'Partial') {
            list = list.filter(req => req.response?.responseType === 'partial');
        } else if (responseFilter === 'Not Available') {
            list = list.filter(req => req.response?.responseType === 'not_available');
        }

        if (search.trim()) {
            const q = search.toLowerCase().trim();
            list = list.filter(req =>
                req.typedMedicines?.some(m => m.toLowerCase().includes(q)) ||
                (req.patientName || userData[req.userId]?.name || '').toLowerCase().includes(q)
            );
        }

        return list;
    }, [historyList, activeTab, responseFilter, search, now, userData]);

    // ── NEW: Group by timeline ──
    const grouped = useMemo(() => {
        const groups = {};
        for (const req of filteredList) {
            const label = getTimelineLabel(req.createdAt);
            if (!groups[label]) groups[label] = [];
            groups[label].push(req);
        }
        return groups;
    }, [filteredList]);

    const tabCounts = useMemo(() => {
        const active = historyList.filter(req =>
            req.status !== 'closed' && req.status !== 'cancelled' &&
            (!req.expiresAt || req.expiresAt.toMillis() > now)
        ).length;
        const closed = historyList.filter(req =>
            req.status === 'closed' || req.status === 'cancelled' ||
            (req.expiresAt && req.expiresAt.toMillis() <= now)
        ).length;
        const available = historyList.filter(req => req.response?.responseType === 'available').length;
        const partial = historyList.filter(req => req.response?.responseType === 'partial').length;
        const notAvailable = historyList.filter(req => req.response?.responseType === 'not_available').length;

        return {
            All: historyList.length,
            Active: active,
            Closed: closed,
            Available: available,
            Partial: partial,
            'Not Available': notAvailable
        };
    }, [historyList, now]);

    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div style={{ width: '100%', maxWidth: '720px', margin: '0 auto', paddingBottom: '2.5rem', textAlign: 'left' }}>

            {/* ── Header ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <button className="btn-dynamic"
                    onClick={() => onNavigate('/')}
                    style={{
                        background: '#F3F4F6', border: '1px solid #E5E7EB',
                        color: '#374151', borderRadius: '10px',
                        width: '38px', height: '38px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.1rem', flexShrink: 0
                    }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
                </button>
                <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
                        Request History
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#9CA3AF' }}>
                        {historyList.length} total responded request{historyList.length !== 1 ? 's' : ''}
                    </p>
                </div>
            </div>

            {/* ── Filter Tabs & Dropdown ── */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '2px', scrollbarWidth: 'none' }}>
                    {['All', 'Active', 'Closed'].map(tab => {
                        const active = activeTab === tab;
                        const colors = {
                            All: { activeBg: '#111827', activeText: '#fff', activeBorder: '#111827' },
                            Active: { activeBg: '#22C55E', activeText: '#fff', activeBorder: '#22C55E' },
                            Closed: { activeBg: '#9CA3AF', activeText: '#fff', activeBorder: '#9CA3AF' }
                        };
                        const c = colors[tab] || colors.All;
                        return (
                            <button className="btn-dynamic"
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                style={{
                                    background: active ? c.activeBg : '#F3F4F6',
                                    color: active ? c.activeText : '#6B7280',
                                    border: `1px solid ${active ? c.activeBorder : '#E5E7EB'}`,
                                    padding: '0.45rem 1rem', borderRadius: '20px',
                                    fontSize: '0.82rem', fontWeight: 700,
                                    cursor: 'pointer', whiteSpace: 'nowrap',
                                    transition: 'all 0.2s',
                                    display: 'flex', alignItems: 'center', gap: '5px'
                                }}
                            >
                                {tab}
                                <span style={{
                                    background: active ? 'rgba(255,255,255,0.25)' : '#E5E7EB',
                                    color: active ? '#fff' : '#6B7280',
                                    borderRadius: '20px', padding: '1px 7px',
                                    fontSize: '0.72rem', fontWeight: 700
                                }}>
                                    {tabCounts[tab] || 0}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <select
                    value={responseFilter}
                    onChange={(e) => setResponseFilter(e.target.value)}
                    style={{
                        padding: '0.45rem 2rem 0.45rem 0.8rem',
                        borderRadius: '20px',
                        border: '1px solid #E5E7EB',
                        background: '#fff',
                        color: '#374151',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        outline: 'none',
                        appearance: 'none',
                        backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 0.8rem top 50%',
                        backgroundSize: '0.65rem auto',
                    }}
                >
                    <option value="All">All Responses</option>
                    <option value="Available">Available</option>
                    <option value="Partial">Partial</option>
                    <option value="Not Available">Not Available</option>
                </select>
            </div>

            {/* ── Search Bar ── */}
            <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                <span style={{
                    position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                    fontSize: '0.95rem', color: '#9CA3AF', pointerEvents: 'none'
                }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                </span>
                <input
                    type="text"
                    placeholder="Search by medicine or patient name…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{
                        width: '100%', padding: '0.65rem 1rem 0.65rem 2.25rem',
                        border: '1px solid #E5E7EB', borderRadius: '12px',
                        fontSize: '0.875rem', outline: 'none', background: '#fff',
                        color: '#111827', boxSizing: 'border-box',
                        transition: 'border-color 0.2s, box-shadow 0.2s'
                    }}
                    onFocus={e => { e.target.style.borderColor = '#22C55E'; e.target.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.15)'; }}
                    onBlur={e => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none'; }}
                />
                {search && (
                    <button className="btn-dynamic"
                        onClick={() => setSearch('')}
                        style={{
                            position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: '#9CA3AF', fontSize: '1rem', padding: '2px'
                        }}
                    >×</button>
                )}
            </div>

            {/* ── History Cards with Timeline Grouping ── */}
            {filteredList.length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: '3.5rem 1rem',
                    background: '#F9FAFB', borderRadius: '16px',
                    border: '1px dashed #D1D5DB'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem', opacity: 0.5 }}>
                        {search ? (
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                        ) : (
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8" /><rect x="1" y="3" width="22" height="5" /><line x1="10" y1="12" x2="14" y2="12" /></svg>
                        )}
                    </div>
                    <p style={{ color: '#6B7280', fontWeight: 600, margin: 0 }}>
                        {search ? `No results for "${search}"` : 'No requests found in this category.'}
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <style>{`
                        @keyframes blockFadeIn {
                            from { opacity: 0; transform: translateY(15px) scale(0.98); }
                            to { opacity: 1; transform: translateY(0) scale(1); }
                        }
                        .history-card-anim {
                            animation: blockFadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
                        }
                    `}</style>
                    {TIMELINE_ORDER.filter(label => grouped[label]?.length > 0).map(label => (
                        <div key={label}>
                            {/* Timeline label */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                                marginBottom: '0.875rem'
                            }}>
                                <span style={{
                                    fontSize: '0.72rem', fontWeight: 800,
                                    color: '#6B7280', textTransform: 'uppercase',
                                    letterSpacing: '0.08em', whiteSpace: 'nowrap'
                                }}>{label}</span>
                                <div style={{ flex: 1, height: '1px', background: '#E5E7EB' }} />
                                <span style={{
                                    fontSize: '0.68rem', color: '#9CA3AF', fontWeight: 600
                                }}>{grouped[label].length}</span>
                            </div>

                            {/* Cards in this group */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {grouped[label].map(req => {
                                    const isAvail = req.response.responseType === 'available';
                                    const isPartial = req.response.responseType === 'partial';
                                    const isExpiredReq = req.status === 'closed' || req.status === 'cancelled' || (req.expiresAt && req.expiresAt.toMillis() <= now);

                                    let badgeColor = '#EF4444', badgeBg = '#FEF2F2', badgeBorder = '#FECACA';
                                    if (isAvail) { badgeColor = '#059669'; badgeBg = '#ECFDF5'; badgeBorder = '#A7F3D0'; }
                                    else if (isPartial) { badgeColor = '#D97706'; badgeBg = '#FFFBEB'; badgeBorder = '#FDE68A'; }

                                    let badgeLabel = req.response.responseType === 'available' ? 'Available' : req.response.responseType === 'partial' ? 'Partial' : 'Not Available';

                                    const timeStr = req.createdAt?.toDate ? req.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                                    const resolvedPhone = req.patientPhone || userData[req.userId]?.phone;
                                    const resolvedName = req.patientName || userData[req.userId]?.name || '…';
                                    const medicines = req.typedMedicines?.length > 0 ? req.typedMedicines : null;

                                    return (
                                        <div key={req.id} className="history-card-anim" style={{
                                            padding: '1.1rem 1.25rem',
                                            background: '#fff',
                                            borderRadius: '16px',
                                            border: `1px solid ${isExpiredReq ? '#F3F4F6' : '#E5E7EB'}`,
                                            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                                            opacity: isExpiredReq ? 0.8 : 1,
                                            transition: 'all 0.2s',
                                            animationDelay: `${Math.min(filteredList.indexOf(req) * 0.08, 1)}s`
                                        }}>
                                            {/* Top row: time + badge */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem' }}>
                                                <span style={{ fontSize: '0.75rem', color: '#9CA3AF', fontWeight: 500 }}>{timeStr}</span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    {isExpiredReq && (
                                                        <span style={{
                                                            fontSize: '0.68rem', fontWeight: 700,
                                                            background: '#F3F4F6', color: '#9CA3AF',
                                                            border: '1px solid #E5E7EB',
                                                            padding: '2px 7px', borderRadius: '20px'
                                                        }}>Closed</span>
                                                    )}
                                                    <span style={{
                                                        padding: '3px 9px', borderRadius: '20px',
                                                        fontSize: '0.72rem', fontWeight: 700,
                                                        background: badgeBg, color: badgeColor,
                                                        border: `1px solid ${badgeBorder}`
                                                    }}>{badgeLabel}</span>
                                                </div>
                                            </div>

                                            {/* Patient & Request details */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{
                                                        width: '32px', height: '32px', borderRadius: '50%',
                                                        background: '#E5E7EB', display: 'flex', alignItems: 'center',
                                                        justifyContent: 'center',
                                                        border: '1px solid #D1D5DB', color: '#6B7280'
                                                    }}>
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                                    </div>
                                                    <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.95rem' }}>
                                                        {resolvedName}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Medicines */}
                                            {medicines ? (
                                                <div style={{ marginBottom: '1rem' }}>
                                                    <div style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Requested Medicines:</div>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                                        {medicines.map((m, i) => (
                                                            <span key={i} style={{
                                                                background: '#F3F4F6', color: '#1F2937',
                                                                padding: '0.35rem 0.65rem', borderRadius: '8px',
                                                                fontSize: '0.85rem', fontWeight: 600,
                                                                border: '1px solid #E5E7EB'
                                                            }}>{m}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div style={{ color: '#9CA3AF', fontSize: '0.85rem', marginBottom: '1rem', fontStyle: 'italic', background: '#F9FAFB', padding: '0.5rem', borderRadius: '8px', textAlign: 'center' }}>
                                                    Prescription attached
                                                </div>
                                            )}

                                            {/* Actions */}
                                            <div style={{ display: 'flex', gap: '0.625rem' }}>
                                                <div style={{ flex: 1, position: 'relative' }}>
                                                    <button className="btn-dynamic"
                                                        onClick={() => onNavigate(`/chat?id=${req.id}&pharmacy=${pharmacyUser.uid}`)}
                                                        style={{
                                                            width: '100%', padding: '0.55rem',
                                                            background: '#3B82F6', color: 'white',
                                                            border: 'none', borderRadius: '10px',
                                                            fontWeight: 600, cursor: 'pointer',
                                                            fontSize: '0.85rem',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'
                                                        }}
                                                    >
                                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                                                        Chat
                                                    </button>
                                                    {unreadCounts[req.id] && (
                                                        <div style={{
                                                            position: 'absolute', top: '-2px', right: '-2px',
                                                            background: '#EF4444', border: '2px solid #fff',
                                                            width: '12px', height: '12px', borderRadius: '50%',
                                                            animation: 'pulse 2s infinite'
                                                        }} />
                                                    )}
                                                </div>

                                                {resolvedPhone ? (
                                                    <a
                                                        href={`tel:${resolvedPhone.replace(/[\s-]/g, '')}`}
                                                        target="_top"
                                                        rel="noopener noreferrer"
                                                        style={{
                                                            flex: 1, textAlign: 'center', padding: '0.55rem',
                                                            textDecoration: 'none',
                                                            background: 'linear-gradient(135deg, #22C55E, #16A34A)', color: 'white',
                                                            borderRadius: '10px', fontWeight: 600,
                                                            fontSize: '0.85rem',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                                                            boxShadow: '0 2px 8px rgba(34,197,94,0.2)'
                                                        }}
                                                    >
                                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.65 3.42 2 2 0 0 1 3.62 1.24h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.83a16 16 0 0 0 6 6l.86-.86a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.5 16.92z" /></svg>
                                                        Call
                                                    </a>
                                                ) : (
                                                    <button className="btn-dynamic"
                                                        disabled
                                                        style={{
                                                            flex: 1, padding: '0.55rem',
                                                            background: '#F3F4F6', color: '#9CA3AF',
                                                            border: '1px solid #E5E7EB', borderRadius: '10px',
                                                            cursor: 'not-allowed', fontWeight: 600,
                                                            fontSize: '0.85rem'
                                                        }}
                                                    >Call</button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
