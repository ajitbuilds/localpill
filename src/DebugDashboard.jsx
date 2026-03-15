import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit, doc, setDoc, GeoPoint, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { useToast } from './components/Toast';

export default function DebugDashboard() {
    const toast = useToast();
    const [stats, setStats] = useState({
        activeRequests: 0,
        matchedRequests: 0,
        closedRequests: 0,
        onlinePharmacies: 0
    });

    const [recentRequests, setRecentRequests] = useState([]);
    const [errors, setErrors] = useState([]);
    const [creatingTest, setCreatingTest] = useState(false);

    useEffect(() => {
        // Observers for stats
        const reqRef = collection(db, 'medicineRequests');
        const activeQ = query(reqRef, where('status', '==', 'pending'));
        const matchedQ = query(reqRef, where('status', '==', 'matched'));
        const closedQ = query(reqRef, where('status', '==', 'closed'));
        const pharmQ = query(collection(db, 'pharmacies'), where('isOnline', '==', true));

        const unsubActive = onSnapshot(activeQ, snap => setStats(s => ({ ...s, activeRequests: snap.docs.length })));
        const unsubMatched = onSnapshot(matchedQ, snap => setStats(s => ({ ...s, matchedRequests: snap.docs.length })));
        const unsubClosed = onSnapshot(closedQ, snap => setStats(s => ({ ...s, closedRequests: snap.docs.length })));
        const unsubPharm = onSnapshot(pharmQ, snap => setStats(s => ({ ...s, onlinePharmacies: snap.docs.length })));

        // Live logs proxy (using recent requests to track execution stats)
        const recentReqQ = query(reqRef, orderBy('createdAt', 'desc'), limit(10));
        const unsubRecent = onSnapshot(recentReqQ, snap => {
            const reqs = [];
            snap.forEach(d => reqs.push({ id: d.id, ...d.data() }));
            setRecentRequests(reqs);
        });

        // Live errors from the functionErrors collection
        const errQ = query(collection(db, 'functionErrors'), orderBy('timestamp', 'desc'), limit(10));
        const unsubErrors = onSnapshot(errQ, snap => {
            const errs = [];
            snap.forEach(d => errs.push({ id: d.id, ...d.data() }));
            setErrors(errs);
        });

        return () => {
            unsubActive(); unsubMatched(); unsubClosed(); unsubPharm();
            unsubRecent(); unsubErrors();
        };
    }, []);

    const handleCreateTestRequest = async () => {
        setCreatingTest(true);
        try {
            const tempId = 'debug_' + Date.now();
            const now = Date.now();
            await setDoc(doc(db, 'medicineRequests', tempId), {
                userId: 'debug_user_123',
                typedMedicines: ['Test Paracetamol 500mg (Debug)'],
                location: new GeoPoint(28.6139, 77.2090), // Default geo anchor
                searchRadiusKm: 20,
                status: 'pending',
                createdAt: Timestamp.fromMillis(now),
                expiresAt: Timestamp.fromMillis(now + 10 * 60 * 1000)
            });
            toast.success(`Created request with ID: ${tempId}`);
        } catch (error) {
            console.error('Error creating request:', error);
            toast.error('Failed to create test request. Check console for details.');
        } finally {
            setCreatingTest(false);
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            <h2 style={{ fontSize: '2rem', color: '#1F2937', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>🛠</span> LocalPill System Health
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
                <StatCard title="Active Requests" value={stats.activeRequests} color="#3498DB" />
                <StatCard title="Matched Requests" value={stats.matchedRequests} color="#2ECC71" />
                <StatCard title="Closed Requests" value={stats.closedRequests} color="#95A5A6" />
                <StatCard title="Online Pharmacies" value={stats.onlinePharmacies} color="#F39C12" />
            </div>

            <div style={{ marginBottom: '2.5rem', background: '#F9FAFB', padding: '1.5rem', borderRadius: '12px', border: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#374151' }}>Test Environment Controls</h3>
                    <p style={{ margin: 0, color: '#6B7280', fontSize: '0.9rem' }}>Inject dummy requests securely to trigger your Cloud Functions architecture.</p>
                </div>
                <button className="btn-dynamic"
                    onClick={handleCreateTestRequest}
                    disabled={creatingTest}
                    style={{
                        padding: '0.75rem 1.5rem',
                        background: '#8B5CF6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '1rem',
                        boxShadow: '0 4px 6px rgba(139, 92, 246, 0.2)',
                        transition: '0.2s'
                    }}>
                    {creatingTest ? 'Injecting...' : '⚡ Generate Test Request'}
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1.5rem' }}>
                {/* Latency and Execution Triggers Panel */}
                <div style={{ background: '#FFFFFF', padding: '1.5rem', borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                    <h3 style={{ borderBottom: '2px solid #F3F4F6', paddingBottom: '0.75rem', marginTop: 0, color: '#1F2937' }}>
                        ⚙️ Recent Executions Loop
                    </h3>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {recentRequests.map(r => (
                            <li key={r.id} style={{ padding: '1rem 0', borderBottom: '1px solid #F3F4F6', fontSize: '0.95rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <strong style={{ fontFamily: 'monospace', color: '#4B5563' }}>{r.id.substring(0, 12)}...</strong>
                                    <span style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>
                                        {r.createdAt ? r.createdAt.toDate().toLocaleTimeString() : 'N/A'}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <span style={{ background: '#F3F4F6', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
                                        Engine: <strong style={{ color: r.processingStatus === 'completed' ? '#059669' : '#D97706' }}>{r.processingStatus || 'awaiting_trigger'}</strong>
                                    </span>
                                    <span style={{ background: '#F3F4F6', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
                                        Notified: <strong>{r.notifiedPharmaciesCount || 0}</strong>
                                    </span>
                                    <span style={{ background: '#F3F4F6', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
                                        Matching: <strong>{r.status}</strong>
                                    </span>
                                </div>
                            </li>
                        ))}
                        {recentRequests.length === 0 && <p style={{ color: '#9CA3AF', fontStyle: 'italic', textAlign: 'center', marginTop: '1rem' }}>No recent requests triggered.</p>}
                    </ul>
                </div>

                {/* Hard Errors Panel */}
                <div style={{ background: '#FEF2F2', padding: '1.5rem', borderRadius: '12px', border: '1px solid #FCA5A5', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                    <h3 style={{ borderBottom: '2px solid #FECACA', paddingBottom: '0.75rem', marginTop: 0, color: '#DC2626' }}>
                        🚨 Cloud Function Error Trap
                    </h3>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {errors.length === 0 ? (
                            <div style={{ textAlign: 'center', color: '#059669', marginTop: '2rem', fontSize: '1.1rem' }}>
                                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
                                Zero native exceptions logged
                            </div>
                        ) : errors.map(e => (
                            <li key={e.id} style={{ padding: '1rem 0', borderBottom: '1px solid #FECACA', fontSize: '0.95rem' }}>
                                <div style={{ marginBottom: '0.25rem', color: '#B91C1C', fontWeight: 'bold' }}>
                                    Context: {e.context}
                                </div>
                                <div style={{ color: '#7F1D1D', background: '#FEE2E2', padding: '0.5rem', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.85rem', wordBreak: 'break-all' }}>
                                    {e.errorMessage}
                                </div>
                                <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#B91C1C', opacity: 0.8 }}>
                                    {e.timestamp ? e.timestamp.toDate().toLocaleString() : 'Just now'} • ReqID: {e.requestId}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, color }) {
    return (
        <div style={{ background: 'white', borderLeft: `5px solid ${color}`, padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <h4 style={{ margin: 0, color: '#6B7280', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</h4>
            <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#111827', lineHeight: 1 }}>{value}</div>
        </div>
    );
}
