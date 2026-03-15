import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, doc, getDoc, collectionGroup, getDocs, query, where, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

import PrescriptionViewer from './PrescriptionViewer';
import { SkeletonResultsCard } from './components/Skeleton';


export default function ResultsScreen({ requestId, onBack, onNavigate }) {
    const [responses, setResponses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('list');
    const [showNotAvailable, setShowNotAvailable] = useState(false);
    const [requestLocation, setRequestLocation] = useState(null);
    const [showPrescription, setShowPrescription] = useState(false);
    const [requestProgress, setRequestProgress] = useState({
        notifiedPharmaciesCount: 0,
        responsesCount: 0,
        status: 'pending'
    });

    useEffect(() => {
        let isMounted = true;

        if (!requestId) return;

        const reqRef = doc(db, 'medicineRequests', requestId);

        // BUG-R-02 fix: track if the effect has already been cleaned up
        // so we can immediately unsub the responses listener if it attaches after cleanup
        let cleanedUp = false;
        const unsubResponsesRef = { current: null };

        // Listener for Realtime Request Progress tracking
        const unsubProgress = onSnapshot(reqRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();

                // Track backend's stats natively
                setRequestProgress({
                    notifiedPharmaciesCount: data.notifiedPharmaciesCount || 0,
                    responsesCount: data.responsesCount || 0,
                    status: data.status || 'pending',
                    processingStatus: data.processingStatus || 'pending',
                    prescriptionUrl: data.prescriptionUrl || null,
                    matchedPharmacyId: data.matchedPharmacyId || null,
                    matchedPharmacyName: data.matchedPharmacyName || null,
                    matchedPharmacyAddress: data.matchedPharmacyAddress || null,
                    matchedDistanceKm: data.matchedDistanceKm || null,
                    expiresAt: data.expiresAt || null
                });

                if (data.location) {
                    setRequestLocation({ lat: data.location.latitude, lng: data.location.longitude });
                }

                // MISS-13 fix: client-side fallback if Cloud Function missed the expiry
                // If still 'pending' but expiresAt has passed → write 'timeout' ourselves
                if (data.status === 'pending') {
                    const expMs = data.expiresAt ? (data.expiresAt.toMillis ? data.expiresAt.toMillis() : data.expiresAt) : null;
                    const isExpired = expMs && expMs < Date.now();

                    // UX Fix: If the matching algorithm finished but found 0 pharmacies, fail fast
                    const isZeroMatch = data.processingStatus === 'completed' && (data.notifiedPharmaciesCount || 0) === 0;

                    if (isExpired || isZeroMatch) {
                        updateDoc(doc(db, 'medicineRequests', requestId), { status: 'timeout' }).catch(() => { });
                    }
                }

                // Stop BOTH listeners once terminal backend condition achieved:
                if (data.status === 'matched' || data.status === 'closed' || data.status === 'cancelled' || data.status === 'timeout') {

                    if (isMounted) setLoading(false);
                    unsubProgress();
                    unsubResponsesRef.current?.(); // stop responses listener if already attached
                    cleanedUp = true; // signal for the race case where it isn't attached yet
                }
            }
        });

        const responsesRef = collection(db, 'medicineRequests', requestId, 'pharmacyResponses');
        let latestFetchId = 0;

        const unsubscribe = onSnapshot(responsesRef, (snapshot) => {
            const currentFetchId = ++latestFetchId;
            const validDocs = [];

            // Grab the raw response data synchronously — include all types
            snapshot.docs.forEach(docSnapshot => {
                const data = docSnapshot.data();
                if (data.responseType === 'available' || data.responseType === 'partial' || data.responseType === 'not_available') {
                    validDocs.push({ id: docSnapshot.id, ...data });
                }
            });

            // If empty, just set and return
            if (validDocs.length === 0) {
                if (currentFetchId === latestFetchId && isMounted) {
                    setResponses([]);
                    setLoading(false);
                }
                return;
            }

            // Fetch missing pharmacy details in parallel
            const fetchDetails = async () => {
                try {
                    const promises = validDocs.map(async (docData) => {
                        const pharmacyRef = doc(db, 'pharmacies', docData.pharmacyId);
                        const pharmacySnap = await getDoc(pharmacyRef);

                        let pharmacyData = {};
                        let isFastResponder = false;

                        if (pharmacySnap.exists()) {
                            pharmacyData = pharmacySnap.data();

                            try {
                                const responsesQuery = query(collectionGroup(db, 'pharmacyResponses'), where('pharmacyId', '==', docData.pharmacyId));
                                const responsesSnap = await getDocs(responsesQuery);
                                if (!responsesSnap.empty) {
                                    let totalDiff = 0, validResponses = 0;
                                    responsesSnap.forEach(r => {
                                        const rData = r.data();
                                        // MISS-06 fix: Cloud Function stores responseTimeSec (seconds)
                                        // Fall back to timeToRespondMs for old docs
                                        const ms = rData.responseTimeSec !== undefined
                                            ? rData.responseTimeSec * 1000
                                            : (rData.timeToRespondMs || 0);
                                        if (ms > 0) {
                                            totalDiff += ms;
                                            validResponses++;
                                        }
                                    });
                                    if (validResponses > 0 && (totalDiff / validResponses) <= 120000) {
                                        isFastResponder = true;
                                    }
                                }
                            } catch (fastResponderErr) {
                                console.warn('Fast responder check skipped:', fastResponderErr.code);
                            }
                        }

                        return {
                            ...docData,
                            pharmacyName: pharmacyData.name || 'Unknown Pharmacy',
                            pharmacyPhone: pharmacyData.phone || null,
                            verified: pharmacyData.isVerified || pharmacyData.verified || false,
                            isFastResponder: isFastResponder,
                            location: pharmacyData.location ? { lat: pharmacyData.location.latitude, lng: pharmacyData.location.longitude } : null,
                            businessHours: pharmacyData.businessHours || null,
                            hasDelivery: pharmacyData.hasDelivery || false,
                            freeDeliveryRadiusKm: pharmacyData.freeDeliveryRadiusKm || 0,
                            minOrderForFreeDelivery: pharmacyData.minOrderForFreeDelivery || 0,
                            discountPercentage: pharmacyData.discountPercentage || 0,
                        };
                    });

                    const tempResponses = await Promise.all(promises);

                    if (currentFetchId !== latestFetchId) return;

                    tempResponses.sort((a, b) => {
                        const typeWeight = { 'available': 1, 'partial': 2, 'not_available': 3 };
                        if (typeWeight[a.responseType] !== typeWeight[b.responseType]) {
                            return (typeWeight[a.responseType] || 99) - (typeWeight[b.responseType] || 99);
                        }
                        const timeA = a.respondedAt ? a.respondedAt.toMillis() : 0;
                        const timeB = b.respondedAt ? b.respondedAt.toMillis() : 0;
                        return timeA - timeB;
                    });

                    if (isMounted) {
                        setResponses(tempResponses);
                        setLoading(false);
                    }
                } catch (err) {
                    console.error("Error fetching pharmacy details:", err);
                    if (currentFetchId === latestFetchId && isMounted) setLoading(false);
                }
            };

            fetchDetails();
        }, (error) => {
            console.error("Error fetching responses: ", error);
            if (isMounted) setLoading(false);
        });

        // BUG-R-02 fix: if progress fired 'matched' before this line ran (race),
        // immediately unsub the just-attached listener
        if (cleanedUp) {
            unsubscribe();
        } else {
            unsubResponsesRef.current = unsubscribe;
        }

        return () => {
            isMounted = false;
            cleanedUp = true;
            unsubResponsesRef.current?.();
            unsubProgress();
        };
    }, [requestId]);


    const handleCancelRequest = async () => {
        try {
            await updateDoc(doc(db, 'medicineRequests', requestId), {
                status: 'cancelled',
            });
        } catch (error) {
            console.error('Error cancelling request:', error);
        } finally {
            onBack();
        }
    };

    // Loading state — using Skeleton UI for skeleton/loading consistency
    if (loading) {
        return (
            <div className="animate-in" style={{ maxWidth: '720px', margin: '0 auto', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem', marginBottom: '1.5rem' }}>
                    <button className="btn-dynamic"
                        onClick={onBack}
                        style={{
                            background: '#F3F4F6', border: '1px solid #E5E7EB',
                            borderRadius: '10px', width: '40px', height: '40px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', flexShrink: 0, color: '#374151',
                            transition: 'all 0.2s'
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12"></line>
                            <polyline points="12 19 5 12 12 5"></polyline>
                        </svg>
                    </button>
                    <div style={{ flex: 1 }}>
                        <div style={{ width: '150px', height: '24px', background: '#E5E7EB', borderRadius: '4px', marginBottom: '8px' }} />
                        <div style={{ width: '200px', height: '16px', background: '#F3F4F6', borderRadius: '4px' }} />
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {[1, 2, 3].map(i => <SkeletonResultsCard key={i} />)}
                </div>
            </div>
        );
    }


    return (
        <div className="animate-in" style={{ maxWidth: '720px', margin: '0 auto', width: '100%' }}>

            {/* ── Header ── */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem', marginBottom: '1.5rem' }}>
                <button className="btn-dynamic"
                    onClick={onBack}
                    style={{
                        background: '#F3F4F6', border: '1px solid #E5E7EB',
                        borderRadius: '10px', width: '40px', height: '40px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', flexShrink: 0, color: '#374151',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#E5E7EB'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#F3F4F6'; }}
                    title="Back to Dashboard"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                </button>
                <div style={{ flex: 1 }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827', margin: '0 0 0.2rem', letterSpacing: '-0.02em' }}>
                        Nearby Pharmacies
                    </h2>
                    <p style={{ color: '#6B7280', fontSize: '0.875rem', margin: 0 }}>
                        Pharmacies that confirmed availability for your medicine
                    </p>
                </div>
            </div>

            {/* ── Prescription button ── */}
            {requestProgress.prescriptionUrl && (
                <button className="btn-dynamic"
                    onClick={() => setShowPrescription(true)}
                    style={{
                        marginBottom: '1rem',
                        display: 'flex', alignItems: 'center', gap: '6px',
                        background: '#F9FAFB', color: '#15803D',
                        border: '1px solid #BBF7D0', padding: '0.5rem 1rem',
                        borderRadius: '10px', cursor: 'pointer',
                        fontSize: '0.85rem', fontWeight: 600,
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#F0FDF4'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#F9FAFB'; }}
                >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg> View Uploaded Prescription
                </button>
            )}

            {/* ── Stats bar ── */}
            <div style={{ display: 'flex', gap: '0.625rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{
                    background: '#EFF6FF', color: '#1D4ED8',
                    border: '1px solid #BFDBFE',
                    borderRadius: '10px', padding: '0.5rem 0.875rem',
                    fontSize: '0.8rem', fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: '5px'
                }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><line x1="12" y1="20" x2="12.01" y2="20" /></svg>
                    Notified: <strong>{requestProgress.notifiedPharmaciesCount}</strong>
                </div>
                <div style={{
                    background: requestProgress.responsesCount > 0 ? '#F0FDF4' : '#FFFBEB',
                    color: requestProgress.responsesCount > 0 ? '#15803D' : '#92400E',
                    border: `1px solid ${requestProgress.responsesCount > 0 ? '#BBF7D0' : '#FDE68A'}`,
                    borderRadius: '10px', padding: '0.5rem 0.875rem',
                    fontSize: '0.8rem', fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: '5px'
                }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                    Responses: <strong>{requestProgress.responsesCount}</strong>
                </div>
                <div style={{
                    background: requestProgress.status === 'matched' ? '#DCFCE7' : requestProgress.status === 'closed' ? '#FEE2E2' : '#F3F4F6',
                    color: requestProgress.status === 'matched' ? '#15803D' : requestProgress.status === 'closed' ? '#DC2626' : '#374151',
                    border: `1px solid ${requestProgress.status === 'matched' ? '#BBF7D0' : requestProgress.status === 'closed' ? '#FECACA' : '#E5E7EB'}`,
                    borderRadius: '10px', padding: '0.5rem 0.875rem',
                    fontSize: '0.8rem', fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: '6px'
                }}>
                    <span style={{
                        width: '7px', height: '7px', borderRadius: '50%', display: 'inline-block',
                        background: requestProgress.status === 'matched' ? '#22C55E' : requestProgress.status === 'closed' ? '#EF4444' : requestProgress.status === 'pending' ? '#F59E0B' : '#9CA3AF'
                    }} />
                    {{
                        'pending': 'Searching…',
                        'matched': 'Matched ✓',
                        'timeout': 'Expired',
                        'cancelled': 'Cancelled',
                        'closed': 'Closed',
                    }[requestProgress.status] || requestProgress.status}
                </div>

                {/* Live Progress Bar Fill */}
                {requestProgress.status === 'pending' && requestProgress.notifiedPharmaciesCount > 0 && (
                    <div style={{ flexBasis: '100%', marginTop: '0.5rem' }}>
                        <div style={{ width: '100%', height: '6px', background: '#E5E7EB', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{
                                width: `${Math.min(100, (requestProgress.responsesCount / requestProgress.notifiedPharmaciesCount) * 100)}%`,
                                height: '100%',
                                background: 'linear-gradient(90deg, #3B82F6, #22C55E)',
                                transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
                                borderRadius: '3px'
                            }} />
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#6B7280', marginTop: '4px', textAlign: 'right' }}>
                            {requestProgress.responsesCount} / {requestProgress.notifiedPharmaciesCount} Responded
                        </div>
                    </div>
                )}

                {/* BUG-NEW-04 fix: List/Map toggle — previously map was dead code with no toggle */}
                {responses.length > 0 && (
                    <div style={{ marginLeft: 'auto', background: '#F3F4F6', padding: '3px', borderRadius: '10px', display: 'flex', gap: '3px' }}>
                        <button className="btn-dynamic"
                            onClick={() => setViewMode('list')}
                            style={{
                                background: viewMode === 'list' ? '#fff' : 'transparent',
                                color: viewMode === 'list' ? '#111827' : '#6B7280',
                                border: 'none', padding: '5px 12px', borderRadius: '7px',
                                fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                                boxShadow: viewMode === 'list' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                                transition: 'all 0.2s'
                            }}
                        ><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg> List</button>
                        <button className="btn-dynamic"
                            onClick={() => setViewMode('map')}
                            style={{
                                background: viewMode === 'map' ? '#fff' : 'transparent',
                                color: viewMode === 'map' ? '#111827' : '#6B7280',
                                border: 'none', padding: '5px 12px', borderRadius: '7px',
                                fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                                boxShadow: viewMode === 'map' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                                transition: 'all 0.2s'
                            }}
                        ><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" /><line x1="9" y1="3" x2="9" y2="18" /><line x1="15" y1="6" x2="15" y2="21" /></svg> Map</button>
                    </div>
                )}
            </div>

            {/* ── Content ── */}
            {
                requestProgress.status === 'matched' || requestProgress.matchedPharmacyId ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{
                            background: 'linear-gradient(135deg, #052e16 0%, #14532d 100%)',
                            borderRadius: '20px',
                            padding: '1.75rem',
                            position: 'relative',
                            overflow: 'hidden',
                            boxShadow: '0 8px 30px rgba(34, 197, 94, 0.25)'
                        }}>
                            <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '130px', height: '130px', background: 'rgba(34,197,94,0.1)', borderRadius: '50%' }} />
                            <div style={{ position: 'relative', zIndex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(74,222,128,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ADE80', flexShrink: 0 }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                                    </div>
                                    <span style={{ color: '#4ADE80', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Match Found!</span>
                                </div>
                                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginBottom: '0.375rem', letterSpacing: '-0.02em' }}>
                                    {requestProgress.matchedPharmacyName || 'Verified Pharmacy'}
                                </div>
                                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', marginBottom: '0.875rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                                    {requestProgress.matchedPharmacyAddress || 'Location Confirmed'}
                                </div>
                                {requestProgress.matchedDistanceKm != null && (
                                    <span style={{
                                        background: 'rgba(74,222,128,0.15)', color: '#4ADE80',
                                        border: '1px solid rgba(74,222,128,0.3)',
                                        borderRadius: '20px', padding: '4px 12px',
                                        fontSize: '0.8rem', fontWeight: 600,
                                        display: 'inline-flex', alignItems: 'center', gap: '5px', marginBottom: '1.25rem'
                                    }}>
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                                        {requestProgress.matchedDistanceKm.toFixed(1)} km away
                                    </span>
                                )}
                                <button className="btn-dynamic"
                                    style={{
                                        width: '100%', padding: '0.875rem',
                                        background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                                        color: 'white', border: 'none', borderRadius: '14px',
                                        fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
                                        boxShadow: '0 4px 15px rgba(34,197,94,0.4)',
                                        transition: 'all 0.2s',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                    }}
                                    onClick={() => onNavigate(`/chat?id=${requestId}&pharmacy=${requestProgress.matchedPharmacyId}`)}
                                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                    </svg>
                                    Open Chat with Pharmacy
                                </button>
                            </div>
                        </div>
                    </div>
                ) : responses.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '4rem 2rem',
                        background: '#F9FAFB',
                        borderRadius: '20px',
                        border: '1px solid #E5E7EB'
                    }}>
                        <div style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: 'center' }}>
                            {requestProgress.status === 'cancelled' ? (
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>
                            ) : (requestProgress.status === 'timeout' || requestProgress.status === 'expired') ? (
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                            ) : (
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" /></svg>
                            )}
                        </div>
                        <h3 style={{ color: '#111827', marginBottom: '0.375rem', fontWeight: 700 }}>
                            {requestProgress.status === 'cancelled'
                                ? 'Request Cancelled'
                                : (requestProgress.status === 'timeout' || requestProgress.status === 'expired')
                                    ? 'No replies in time'
                                    : (() => {
                                        // BUG-R-08 fix: check client-side expiry even if status is still 'pending'
                                        const exp = requestProgress.expiresAt?.toDate?.();
                                        return exp && exp < new Date() ? 'No replies in time' : 'No responses yet';
                                    })()}
                        </h3>
                        <p style={{ color: '#9CA3AF', fontSize: '0.875rem', margin: 0, marginBottom: (requestProgress.status === 'timeout' || requestProgress.status === 'expired') ? '1.5rem' : 0 }}>
                            {requestProgress.status === 'cancelled'
                                ? 'This request was ended before any pharmacies replied.'
                                : (() => {
                                    const exp = requestProgress.expiresAt?.toDate?.();
                                    const isExpired = requestProgress.status === 'timeout' || requestProgress.status === 'expired' || (exp && exp < new Date());
                                    return isExpired
                                        ? 'Pharmacies in your area are currently busy or unavailable. Please try again later or expand your search area.'
                                        : 'We are scanning your area. Check back in a few minutes.';
                                })()}
                        </p>

                        {requestProgress.status === 'timeout' && (
                            <button className="btn-dynamic"
                                onClick={() => onBack()}
                                style={{
                                    background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                                    color: 'white', border: 'none', padding: '0.75rem 1.5rem',
                                    borderRadius: '10px', fontWeight: '700', cursor: 'pointer',
                                    fontSize: '0.9rem', boxShadow: '0 4px 14px rgba(34,197,94,0.3)',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                            >
                                Try New Search
                            </button>
                        )}
                    </div>
                ) : viewMode === 'map' ? (
                    <ResultsMap responses={responses} requestLocation={requestLocation} onMessageClick={(id, name) => onNavigate(`/chat?id=${requestId}&pharmacy=${id}`)} />
                ) : (() => {
                    const availableResps = responses.filter(r => r.responseType === 'available');
                    const partialResps = responses.filter(r => r.responseType === 'partial');
                    const notAvailResps = responses.filter(r => r.responseType === 'not_available');

                    return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                            {/* ── Available ── */}
                            {availableResps.map((resp, idx) => (
                                <ResponseCard
                                    key={resp.id}
                                    response={resp}
                                    index={idx}
                                    onMessageClick={() => onNavigate(`/chat?id=${requestId}&pharmacy=${resp.pharmacyId}`)}
                                />
                            ))}

                            {/* ── Partial ── */}
                            {partialResps.map((resp, idx) => (
                                <ResponseCard
                                    key={resp.id}
                                    response={resp}
                                    index={availableResps.length + idx}
                                    onMessageClick={() => onNavigate(`/chat?id=${requestId}&pharmacy=${resp.pharmacyId}`)}
                                />
                            ))}

                            {/* ── Not Available — Collapsible Section ── */}
                            {notAvailResps.length > 0 && (
                                <div style={{ marginTop: '0.25rem' }}>
                                    {/* Section header — toggle */}
                                    <button className="btn-dynamic"
                                        onClick={() => setShowNotAvailable(prev => !prev)}
                                        style={{
                                            width: '100%', display: 'flex', alignItems: 'center',
                                            justifyContent: 'space-between',
                                            background: '#F9FAFB', border: '1px solid #E5E7EB',
                                            borderRadius: showNotAvailable ? '12px 12px 0 0' : '12px',
                                            padding: '0.65rem 1rem', cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ display: 'flex' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></span>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#6B7280' }}>
                                                Not Available ({notAvailResps.length})
                                            </span>
                                            <span style={{ fontSize: '0.75rem', color: '#9CA3AF', fontWeight: 400 }}>
                                                — you can still chat for alternatives
                                            </span>
                                        </div>
                                        <span style={{
                                            color: '#9CA3AF',
                                            transform: showNotAvailable ? 'rotate(180deg)' : 'none',
                                            transition: 'transform 0.2s', display: 'flex'
                                        }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg></span>
                                    </button>

                                    {/* Collapsed cards */}
                                    {showNotAvailable && (
                                        <div style={{
                                            border: '1px solid #E5E7EB', borderTop: 'none',
                                            borderRadius: '0 0 12px 12px',
                                            overflow: 'hidden'
                                        }}>
                                            {notAvailResps.map((resp, idx) => {
                                                const respondedDate = resp.respondedAt
                                                    ? resp.respondedAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                    : '';
                                                return (
                                                    <div key={resp.id} style={{
                                                        padding: '0.9rem 1rem',
                                                        background: '#fff',
                                                        borderTop: idx > 0 ? '1px solid #F3F4F6' : 'none',
                                                        display: 'flex', alignItems: 'center',
                                                        justifyContent: 'space-between', gap: '0.75rem',
                                                        opacity: 0.75
                                                    }}>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{
                                                                fontWeight: 600, color: '#6B7280',
                                                                fontSize: '0.9rem',
                                                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                                            }}>
                                                                {resp.pharmacyName}
                                                            </div>
                                                            {resp.pharmacyPhone && (
                                                                <div style={{ fontSize: '0.78rem', color: '#9CA3AF', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.99 9.99a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.9 1.1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 8.79a16 16 0 0 0 6.13 6.13l1.01-1.01a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.03z" /></svg> {resp.pharmacyPhone}
                                                                </div>
                                                            )}
                                                            {respondedDate && (
                                                                <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: '2px' }}>
                                                                    replied {respondedDate}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <button className="btn-dynamic"
                                                            onClick={() => onNavigate(`/chat?id=${requestId}&pharmacy=${resp.pharmacyId}`)}
                                                            style={{
                                                                flexShrink: 0,
                                                                padding: '0.45rem 0.875rem',
                                                                background: '#F3F4F6', color: '#374151',
                                                                border: '1px solid #E5E7EB', borderRadius: '8px',
                                                                fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                                                                whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px'
                                                            }}
                                                        >
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg> Chat
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })()
            }

            {
                showPrescription && requestProgress.prescriptionUrl && (
                    <PrescriptionViewer
                        requestId={requestId}
                        filePath={requestProgress.prescriptionUrl}
                        onClose={() => setShowPrescription(false)}
                    />
                )
            }
        </div>
    );
}

function ResultsMap({ responses, requestLocation, onMessageClick }) {
    const mapRef = useRef(null);
    const googleMap = useRef(null);

    const onMessageClickRef = useRef();
    useEffect(() => {
        onMessageClickRef.current = onMessageClick;
    }, [onMessageClick]);

    useEffect(() => {
        if (!mapRef.current || !window.google) return;

        const defaultCenter = requestLocation || { lat: 28.6139, lng: 77.2090 };

        googleMap.current = new window.google.maps.Map(mapRef.current, {
            center: defaultCenter,
            zoom: 13,
            styles: [
                {
                    featureType: "poi",
                    elementType: "labels",
                    stylers: [{ visibility: "off" }]
                }
            ],
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false
        });

        if (requestLocation) {
            new window.google.maps.Marker({
                position: requestLocation,
                map: googleMap.current,
                icon: {
                    path: window.google.maps.SymbolPath.CIRCLE,
                    scale: 8,
                    fillColor: '#3498DB',
                    fillOpacity: 1,
                    strokeColor: '#FFFFFF',
                    strokeWeight: 2,
                },
                title: "Your Location"
            });
        }

        responses.forEach(resp => {
            if (resp.location) {
                const markerColor = resp.responseType === 'available' ? '#2ECC71' : '#F59E0B';
                const marker = new window.google.maps.Marker({
                    position: resp.location,
                    map: googleMap.current,
                    icon: {
                        path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                        scale: 6,
                        fillColor: markerColor,
                        fillOpacity: 1,
                        strokeColor: '#FFFFFF',
                        strokeWeight: 2,
                    },
                    title: resp.pharmacyName || 'Pharmacy'
                });

                let distanceStr = '';
                if (requestLocation && window.google.maps.geometry) {
                    const distMeters = window.google.maps.geometry.spherical.computeDistanceBetween(
                        new window.google.maps.LatLng(requestLocation.lat, requestLocation.lng),
                        new window.google.maps.LatLng(resp.location.lat, resp.location.lng)
                    );
                    const distKm = (distMeters / 1000).toFixed(1);
                    distanceStr = `<div style="font-size: 0.85rem; color: #4B5563; margin-bottom: 0.25rem;">📍 ${distKm} km away</div>`;
                }

                const infoWindow = new window.google.maps.InfoWindow({
                    content: `
                        <div style="padding: 0.5rem; text-align: left; color: #1F2937; min-width: 150px;">
                            <strong style="display: block; font-size: 14px; margin-bottom: 4px; color: #111827;">${resp.pharmacyName}</strong>
                            ${distanceStr}
                            <div style="font-size: 12px; color: ${markerColor}; font-weight: bold; margin-bottom: 8px;">
                                ${resp.responseType === 'available' ? 'Available' : 'Partial'}
                            </div>
                            <button className="btn-dynamic" onclick="window.dispatchEvent(new CustomEvent('messagePharmacy', {detail: {id: '${resp.pharmacyId}', name: '${resp.pharmacyName.replace(/'/g, "\\'")}'}}))" 
                                style="background: linear-gradient(135deg, #22C55E, #16A34A); color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; width: 100%; font-weight: 600;">
                                Message
                            </button>
                        </div>
                    `
                });

                marker.addListener("click", () => {
                    infoWindow.open(googleMap.current, marker);
                });
            }
        });

        const handleMessage = (e) => onMessageClickRef.current?.(e.detail.id, e.detail.name);
        window.addEventListener('messagePharmacy', handleMessage);

        return () => window.removeEventListener('messagePharmacy', handleMessage);

    }, [responses, requestLocation]);

    // BUG FIX: Blank map when GPS denied — show a friendly fallback instead of empty grey box
    const hasAnyLocation = requestLocation || responses.some(r => r.location);
    if (!hasAnyLocation) {
        return (
            <div style={{
                height: '280px', width: '100%', borderRadius: '16px',
                border: '1px solid #E5E7EB', background: '#F9FAFB',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', gap: '0.75rem', color: '#9CA3AF'
            }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                </svg>
                <div style={{ textAlign: 'center', padding: '0 1.5rem' }}>
                    <p style={{ fontWeight: 600, color: '#6B7280', margin: '0 0 4px' }}>Location not available</p>
                    <p style={{ fontSize: '0.8rem', margin: 0 }}>Allow location access to see pharmacies on map</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ height: '400px', width: '100%', borderRadius: '16px', overflow: 'hidden', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
        </div>
    );
}

function ResponseCard({ response, onMessageClick, index = 0 }) {
    const isAvailable = response.responseType === 'available';
    const badgeText = isAvailable ? 'Available' : 'Partial';
    const respondedDate = response.respondedAt ? response.respondedAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    // Use responseTimeSec (new) or fall back to timeToRespondMs (old docs)
    const responseTimeMs = response.responseTimeSec != null
        ? response.responseTimeSec * 1000
        : (response.timeToRespondMs || null);
    let responseTimeStr = '';
    if (responseTimeMs) {
        responseTimeStr = responseTimeMs < 60 ? `${responseTimeMs}s` : `${Math.floor(responseTimeMs / 60)}m ${responseTimeMs % 60}s`;
    }

    const [hovered, setHovered] = React.useState(false);

    return (
        <div className="card-stagger-in" style={{ animationDelay: `${index * 80}ms` }}>
            <style>{`
            @keyframes cardStaggerDrop {
                from { opacity: 0; transform: translateY(15px) scale(0.98); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
            .card-stagger-in {
                animation: cardStaggerDrop 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
            }
            @keyframes badgeGlowPulse {
                0%, 100% { box-shadow: 0 0 0px rgba(34,197,94,0); }
                50% { box-shadow: 0 0 12px rgba(34,197,94,0.6); }
            }
            .available-badge-glow {
                animation: badgeGlowPulse 2s infinite;
            }
        `}</style>
            <div
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                style={{
                    position: 'relative',
                    overflow: 'hidden',
                    background: '#fff',
                    borderRadius: '16px',
                    border: `1px solid ${isAvailable ? (hovered ? '#86EFAC' : '#D1FAE5') : (hovered ? '#FDE68A' : '#F3F4F6')}`,
                    boxShadow: hovered
                        ? (isAvailable ? '0 8px 24px rgba(34,197,94,0.14)' : '0 8px 24px rgba(245,158,11,0.12)')
                        : '0 1px 4px rgba(0,0,0,0.05)',
                    padding: '1.25rem 1.25rem 1.25rem 1.5rem',
                    transition: 'all 0.2s ease',
                    transform: hovered ? 'translateY(-2px)' : 'none',
                }}
            >
                {/* Colored left stripe */}
                <div style={{
                    position: 'absolute', top: 0, left: 0,
                    width: '5px', height: '100%',
                    background: isAvailable
                        ? 'linear-gradient(180deg, #22C55E, #16A34A)'
                        : 'linear-gradient(180deg, #F59E0B, #D97706)'
                }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', gap: '0.75rem' }}>
                    {/* Left: name + badges */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#111827', letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {response.pharmacyName}
                            </h3>
                            {response.verified && (
                                <span title="Verified Pharmacy" style={{ color: '#3B82F6', display: 'flex' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg></span>
                            )}
                        </div>

                        {response.pharmacyPhone && (
                            <div style={{ fontSize: '0.85rem', color: '#6B7280', marginBottom: '0.5rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.99 9.99a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.9 1.1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 8.79a16 16 0 0 0 6.13 6.13l1.01-1.01a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.03z" /></svg> {response.pharmacyPhone}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {response.verified && (
                                <span style={{
                                    background: '#EFF6FF', color: '#1D4ED8',
                                    border: '1px solid #BFDBFE',
                                    padding: '2px 8px', borderRadius: '20px',
                                    fontSize: '0.7rem', fontWeight: 700,
                                    letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: '2px'
                                }}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg> Verified</span>
                            )}
                            {response.isFastResponder && (
                                <span style={{
                                    background: '#FFFBEB', color: '#92400E',
                                    border: '1px solid #FDE68A',
                                    padding: '2px 8px', borderRadius: '20px',
                                    fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px'
                                }}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg> Fast Responder</span>
                            )}
                        </div>

                        {/* Pharmacy Business Details */}
                        {(response.discountPercentage > 0 || response.hasDelivery || response.businessHours) && (
                            <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                {response.discountPercentage > 0 && (
                                    <div style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="5" x2="5" y2="19"></line><circle cx="6.5" cy="6.5" r="2.5"></circle><circle cx="17.5" cy="17.5" r="2.5"></circle></svg>
                                        {response.discountPercentage}% Discount Available
                                    </div>
                                )}
                                {response.hasDelivery && (
                                    <div style={{ fontSize: '0.8rem', color: '#4B5563', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
                                        Free Delivery {response.freeDeliveryRadiusKm > 0 ? `up to ${response.freeDeliveryRadiusKm}km` : ''}
                                        {response.minOrderForFreeDelivery > 0 ? ` (Min order ₹${response.minOrderForFreeDelivery})` : ''}
                                    </div>
                                )}
                                {response.businessHours && (
                                    <div style={{ fontSize: '0.8rem', color: '#6B7280', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                        {response.businessHours}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right: availability badge + time */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <span
                            className={isAvailable ? "available-badge-glow" : ""}
                            style={{
                                background: isAvailable ? '#DCFCE7' : '#FEF3C7',
                                color: isAvailable ? '#065F46' : '#92400E',
                                border: `1px solid ${isAvailable ? '#BBF7D0' : '#FDE68A'}`,
                                borderRadius: '20px', padding: '4px 12px',
                                fontSize: '0.75rem', fontWeight: 700,
                                display: 'flex', alignItems: 'center', gap: '5px'
                            }}
                        >
                            <span style={{
                                width: '6px', height: '6px', borderRadius: '50%',
                                background: isAvailable ? '#22C55E' : '#F59E0B',
                                display: 'inline-block'
                            }} />
                            {badgeText}
                        </span>
                        <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: '6px' }}>
                            replied {respondedDate}
                        </div>
                        {responseTimeStr && (
                            <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'flex-end' }}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg> {responseTimeStr}
                            </div>
                        )}
                    </div>
                </div>

                {/* Message button */}
                <button className="btn-dynamic"
                    onClick={onMessageClick}
                    style={{
                        width: '100%', padding: '0.75rem',
                        background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                        color: 'white', border: 'none', borderRadius: '12px',
                        fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
                        transition: 'all 0.2s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(34, 197, 94, 0.4)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(34, 197, 94, 0.3)'; }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    Message Pharmacy
                </button>
            </div>
        </div>
    );
}


