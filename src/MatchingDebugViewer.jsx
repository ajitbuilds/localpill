import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

export default function MatchingDebugViewer() {
    const [logs, setLogs] = useState([]);
    const [selectedLogId, setSelectedLogId] = useState(null);
    const [selectedLogData, setSelectedLogData] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

    useEffect(() => {
        // Fetch the recent matching logs
        const q = query(collection(db, 'matchingLogs'), orderBy('timestamp', 'desc'), limit(10));
        const unsubscribe = onSnapshot(q, (snap) => {
            const tempLogs = [];
            snap.forEach(docSnap => tempLogs.push({ id: docSnap.id, ...docSnap.data() }));
            setLogs(tempLogs);

            // Auto-select latest if none selected
            if (!selectedLogId && tempLogs.length > 0) {
                setSelectedLogId(tempLogs[0].id);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!selectedLogId) {
            setSelectedLogData(null);
            return;
        }

        setLoadingDetails(true);
        const logRef = doc(db, 'matchingLogs', selectedLogId);
        const unsubscribe = onSnapshot(logRef, (snap) => {
            if (snap.exists()) {
                setSelectedLogData(snap.data());
            } else {
                setSelectedLogData(null);
            }
            setLoadingDetails(false);
        });
        return () => unsubscribe();
    }, [selectedLogId]);

    return (
        <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui, sans-serif', background: '#F9FAFB' }}>
            {/* Sidebar List */}
            <div style={{ width: '300px', background: '#FFFFFF', borderRight: '1px solid #E5E7EB', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '1.25rem', borderBottom: '1px solid #E5E7EB', background: '#F3F4F6', position: 'sticky', top: 0 }}>
                    <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#1F2937' }}>Matching Logs</h2>
                </div>
                {logs.length === 0 ? (
                    <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#6B7280', fontSize: '0.9rem' }}>No recent logs found. Create a request first.</div>
                ) : logs.map(log => (
                    <div
                        key={log.id}
                        onClick={() => setSelectedLogId(log.id)}
                        style={{
                            padding: '1rem',
                            borderBottom: '1px solid #F3F4F6',
                            cursor: 'pointer',
                            background: selectedLogId === log.id ? '#EFF6FF' : 'white',
                            borderLeft: selectedLogId === log.id ? '4px solid #3B82F6' : '4px solid transparent',
                            transition: '0.2s'
                        }}
                    >
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.2rem' }}>Req: {log.id.substring(0, 8)}...</div>
                        <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>{log.timestamp ? log.timestamp.toDate().toLocaleTimeString() : 'N/A'}</div>
                        <div style={{ marginTop: '0.5rem', display: 'flex', gap: '5px' }}>
                            <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: '#E0F2FE', color: '#0369A1', borderRadius: '4px' }}>Found: {(log.matchedPharmacies || log.top20)?.length || 0}</span>
                            <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: '#FEF3C7', color: '#B45309', borderRadius: '4px' }}>{Math.round(log.executionTimeMs || 0)}ms</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Viewer */}
            <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
                {!selectedLogId ? (
                    <div style={{ textAlign: 'center', marginTop: '4rem', color: '#9CA3AF' }}>Select a log from the sidebar to view matching details.</div>
                ) : loadingDetails ? (
                    <div style={{ textAlign: 'center', marginTop: '4rem', color: '#6B7280' }}>Loading details...</div>
                ) : !selectedLogData ? (
                    <div style={{ textAlign: 'center', marginTop: '4rem', color: '#EF4444' }}>Log data not found.</div>
                ) : (
                    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#111827' }}>Matching Scope Details</h2>
                            <span style={{ background: '#D1FAE5', color: '#065F46', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 600 }}>
                                Exec Time: {selectedLogData.executionTimeMs?.toFixed(2)} ms
                            </span>
                        </div>

                        <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', border: '1px solid #E5E7EB', marginBottom: '2rem', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                            <h3 style={{ marginTop: 0, borderBottom: '1px solid #F3F4F6', paddingBottom: '0.75rem', color: '#374151' }}>
                                Phase 1: All Parsed Pharmacies (Scanned: {selectedLogData.scanned?.length || 0})
                            </h3>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                    <thead>
                                        <tr style={{ textAlign: 'left', borderBottom: '2px solid #E5E7EB', color: '#6B7280' }}>
                                            <th style={{ padding: '0.75rem' }}>Pharmacy</th>
                                            <th style={{ padding: '0.75rem' }}>Distance</th>
                                            <th style={{ padding: '0.75rem' }}>Rel. Score</th>
                                            <th style={{ padding: '0.75rem' }}>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedLogData.scanned?.map(s => (
                                            <tr key={s.pharmacyId} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                                <td style={{ padding: '0.75rem', color: '#1F2937', fontWeight: 500 }}>{s.name} <span style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>{s.pharmacyId.substring(0, 6)}</span></td>
                                                <td style={{ padding: '0.75rem' }}>{s.distanceKm?.toFixed(2)} km</td>
                                                <td style={{ padding: '0.75rem' }}>{s.reliabilityScore}</td>
                                                <td style={{ padding: '0.75rem' }}>
                                                    {s.status === 'valid' ? (
                                                        <span style={{ background: '#D1FAE5', color: '#065F46', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>Valid Target</span>
                                                    ) : (
                                                        <span style={{ background: '#FEE2E2', color: '#991B1B', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>Filtered: {s.filterReason}</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                            <h3 style={{ marginTop: 0, borderBottom: '1px solid #F3F4F6', paddingBottom: '0.75rem', color: '#374151' }}>
                                Phase 2: Matched Pharmacies (Count: {(selectedLogData.matchedPharmacies || selectedLogData.top20)?.length || 0})
                            </h3>
                            {(selectedLogData.matchedPharmacies || selectedLogData.top20)?.length === 0 ? (
                                <div style={{ padding: '1rem', color: '#6B7280', textAlign: 'center' }}>No valid pharmacies passed the filtering phase.</div>
                            ) : (
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {(selectedLogData.matchedPharmacies || selectedLogData.top20)?.map((t, index) => (
                                        <li key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <div style={{ background: '#3B82F6', color: 'white', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                                    {index + 1}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 600, color: '#1F2937' }}>{t.name} <span style={{ fontSize: '0.75rem', color: '#9CA3AF', fontWeight: 'normal' }}>{t.id}</span></div>
                                                    <div style={{ fontSize: '0.85rem', color: '#6B7280' }}>Fast Resp: {t.fastResponderScore} | Rel: {t.reliabilityScore}</div>
                                                </div>
                                            </div>
                                            <div style={{ fontWeight: 600, color: '#059669' }}>
                                                📍 {t.distanceKm?.toFixed(2)} km
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
