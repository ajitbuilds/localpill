import React, { useState, useEffect, useRef } from 'react';
import { collection, doc, setDoc, GeoPoint, Timestamp, onSnapshot, query, where, getDoc } from 'firebase/firestore';
import { db } from './firebase';

export default function LoadTestSimulator() {
    const [testRunId, setTestRunId] = useState(null);
    const [testStatus, setTestStatus] = useState('idle'); // idle, generating, processing, completed
    const [targetCount, setTargetCount] = useState(10);
    const [requestsCreated, setRequestsCreated] = useState(0);
    const [requestsCompleted, setRequestsCompleted] = useState(0);

    // Metrics storage
    const [metrics, setMetrics] = useState([]);
    const [aggregate, setAggregate] = useState({
        avgWrite: 0,
        avgE2E: 0,
        avgFnExec: 0,
        successRate: 0
    });
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    // Start a new load test
    const startTest = async (count) => {
        const runId = 'run_' + Date.now();
        setTestRunId(runId);
        setTargetCount(count);
        setTestStatus('generating');
        setRequestsCreated(0);
        setRequestsCompleted(0);
        setMetrics([]);

        const newMetrics = [];

        // Generate requests sequentially or in small batches to measure write time
        for (let i = 0; i < count; i++) {
            const reqId = `${runId}_req_${i}`;
            const startTime = performance.now();
            const now = Date.now();

            try {
                await setDoc(doc(db, 'medicineRequests', reqId), {
                    userId: 'load_tester',
                    testRunId: runId,
                    typedMedicines: [`Load Test Drug ${i}`],
                    location: new GeoPoint(28.6139 + (Math.random() * 0.1), 77.2090 + (Math.random() * 0.1)),
                    searchRadiusKm: 15,
                    status: 'pending',
                    createdAt: Timestamp.fromMillis(now),
                    expiresAt: Timestamp.fromMillis(now + 10 * 60 * 1000)
                });
                const writeLatency = performance.now() - startTime;
                newMetrics.push({
                    id: reqId,
                    createdTime: now,
                    writeLatency: writeLatency,
                    status: 'pending',
                    e2eLatency: null,
                    fnExecTime: null
                });
            } catch (e) {
                console.error("Write error:", e);
                newMetrics.push({
                    id: reqId,
                    createdTime: now,
                    status: 'failed_write'
                });
            }
            // Update UI periodically to avoid freezing
            if (i % 5 === 0 && isMounted.current) setRequestsCreated(i + 1);
        }

        if (isMounted.current) {
            setRequestsCreated(count);
            setMetrics(newMetrics);
            setTestStatus('processing');
        }
    };

    // Monitor backend processing
    useEffect(() => {
        if (testStatus !== 'processing' || !testRunId) return;

        const q = query(collection(db, 'medicineRequests'), where('testRunId', '==', testRunId));

        const unsub = onSnapshot(q, async (snap) => {
            let completedCount = 0;
            const updatedMetrics = [...metrics];
            let allDone = true;

            const logsToFetch = [];

            snap.docs.forEach(docSnap => {
                const data = docSnap.data();
                const metricIdx = updatedMetrics.findIndex(m => m.id === docSnap.id);

                if (metricIdx !== -1 && updatedMetrics[metricIdx].status === 'pending') {
                    if (data.status === 'completed' || data.status === 'failed') {
                        // Mark as done
                        updatedMetrics[metricIdx].status = data.status;
                        updatedMetrics[metricIdx].e2eLatency = Date.now() - updatedMetrics[metricIdx].createdTime;
                        logsToFetch.push(docSnap.id);
                    } else {
                        allDone = false;
                    }
                }
            });

            // Fetch exact function execution times from matchingLogs for completed ones
            if (logsToFetch.length > 0) {
                for (const lid of logsToFetch) {
                    const logSnap = await getDoc(doc(db, 'matchingLogs', lid));
                    if (logSnap.exists()) {
                        const logData = logSnap.data();
                        const idx = updatedMetrics.findIndex(m => m.id === lid);
                        if (idx > -1) {
                            updatedMetrics[idx].fnExecTime = logData.executionTimeMs || 0;
                        }
                    }
                }
            }

            completedCount = updatedMetrics.filter(m => m.status === 'completed' || m.status === 'failed').length;

            if (isMounted.current) {
                setRequestsCompleted(completedCount);
                setMetrics(updatedMetrics);

                // Re-evaluate completion based on the actual tracked count
                if (completedCount >= targetCount && testStatus === 'processing') {
                    setTestStatus('completed');
                    calculateAggregates(updatedMetrics);
                }
            }
        });

        return () => unsub();
    }, [testStatus, testRunId, targetCount, metrics]);

    const calculateAggregates = (finalMetrics) => {
        let wrSum = 0, e2eSum = 0, fnSum = 0;
        let wrCount = 0, e2eCount = 0, fnCount = 0, successCount = 0;

        finalMetrics.forEach(m => {
            if (m.writeLatency != null) { wrSum += m.writeLatency; wrCount++; }
            if (m.e2eLatency != null) { e2eSum += m.e2eLatency; e2eCount++; }
            if (m.fnExecTime != null) { fnSum += m.fnExecTime; fnCount++; }
            if (m.status === 'completed') successCount++;
        });

        setAggregate({
            avgWrite: wrCount > 0 ? (wrSum / wrCount).toFixed(1) : 0,
            avgE2E: e2eCount > 0 ? (e2eSum / e2eCount).toFixed(1) : 0,
            avgFnExec: fnCount > 0 ? (fnSum / fnCount).toFixed(1) : 0,
            successRate: finalMetrics.length > 0 ? ((successCount / finalMetrics.length) * 100).toFixed(1) : 0
        });
    };

    // Calculate max value for chart scaling
    const maxE2E = Math.max(...metrics.map(m => m.e2eLatency || 0), 1000);

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
            <h2 style={{ fontSize: '2rem', color: '#1F2937', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                Load & Performance Simulator
            </h2>

            {/* Control Panel */}
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', marginBottom: '2rem' }}>
                <h3 style={{ marginTop: 0, color: '#374151', marginBottom: '1rem' }}>Initiate Stress Test</h3>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn-dynamic"
                        onClick={() => startTest(10)}
                        disabled={testStatus === 'generating' || testStatus === 'processing'}
                        style={btnStyle('#3B82F6')}
                    >10 Requests</button>
                    <button className="btn-dynamic"
                        onClick={() => startTest(50)}
                        disabled={testStatus === 'generating' || testStatus === 'processing'}
                        style={btnStyle('#8B5CF6')}
                    >50 Requests</button>
                    <button className="btn-dynamic"
                        onClick={() => startTest(100)}
                        disabled={testStatus === 'generating' || testStatus === 'processing'}
                        style={btnStyle('#DC2626')}
                    >100 Requests</button>
                </div>

                <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#F3F4F6', borderRadius: '8px' }}>
                    <strong>Status: </strong>
                    <span style={{ textTransform: 'uppercase', fontWeight: 600, color: testStatus === 'completed' ? '#059669' : testStatus === 'idle' ? '#6B7280' : '#D97706' }}>
                        {testStatus}
                    </span>
                    {(testStatus === 'generating' || testStatus === 'processing') && (
                        <div style={{ marginTop: '0.5rem', width: '100%', background: '#E5E7EB', height: '10px', borderRadius: '5px', overflow: 'hidden' }}>
                            <div style={{ width: `${(requestsCompleted / targetCount) * 100}%`, background: '#3B82F6', height: '100%', transition: '0.3s' }}></div>
                        </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.85rem', color: '#6B7280' }}>
                        <span>Created: {requestsCreated}/{targetCount}</span>
                        <span>Processed: {requestsCompleted}/{targetCount}</span>
                    </div>
                </div>
            </div>

            {/* Results & Metrics */}
            {testStatus === 'completed' && (
                <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                        <MetricCard title="Avg Firestore Write" value={`${aggregate.avgWrite} ms`} color="#2563EB" />
                        <MetricCard title="Avg Native Match Engine" value={`${aggregate.avgFnExec} ms`} color="#7C3AED" />
                        <MetricCard title="Avg End-to-End Latency" value={`${aggregate.avgE2E} ms`} color="#DC2626" />
                        <MetricCard title="Pipeline Success Rate" value={`${aggregate.successRate} %`} color="#059669" />
                    </div>

                    <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                        <h3 style={{ marginTop: 0, color: '#374151', borderBottom: '1px solid #F3F4F6', paddingBottom: '0.75rem' }}>Latency Distribution Chart (End-to-End)</h3>

                        <div style={{ height: '300px', display: 'flex', alignItems: 'flex-end', gap: '4px', overflowX: 'auto', padding: '1rem 0' }}>
                            {metrics.map((m, i) => {
                                const heightPercent = m.e2eLatency ? (m.e2eLatency / maxE2E) * 100 : 0;
                                return (
                                    <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '20px', flexShrink: 0 }}>
                                        <div
                                            title={`Req ${i}: ${m.e2eLatency}ms`}
                                            style={{
                                                width: '100%',
                                                height: `${Math.max(heightPercent, 1)}%`,
                                                background: m.status === 'completed' ? '#EF4444' : '#9CA3AF',
                                                borderRadius: '3px 3px 0 0',
                                                transition: 'height 0.5s'
                                            }}
                                        ></div>
                                    </div>
                                );
                            })}
                        </div>
                        <div style={{ textAlign: 'center', color: '#6B7280', fontSize: '0.8rem', marginTop: '0.5rem' }}>Individual Request Index →</div>

                        <div style={{ marginTop: '2rem', borderTop: '1px solid #F3F4F6', paddingTop: '1rem' }}>
                            <h4 style={{ color: '#4B5563', marginBottom: '1rem' }}>Raw Sampling Data</h4>
                            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                <table style={{ width: '100%', fontSize: '0.85rem', textAlign: 'left', borderCollapse: 'collapse' }}>
                                    <thead style={{ position: 'sticky', top: 0, background: 'white', boxShadow: '0 1px 0 #E5E7EB' }}>
                                        <tr>
                                            <th style={{ padding: '0.5rem' }}>Target ID</th>
                                            <th style={{ padding: '0.5rem' }}>Write (ms)</th>
                                            <th style={{ padding: '0.5rem' }}>Match Logic (ms)</th>
                                            <th style={{ padding: '0.5rem' }}>Total Latency (ms)</th>
                                            <th style={{ padding: '0.5rem' }}>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {metrics.slice(0, 50).map(m => (
                                            <tr key={m.id} style={{ borderBottom: '1px solid #F9FAFB' }}>
                                                <td style={{ padding: '0.5rem', fontFamily: 'monospace' }}>{m.id.substring(m.id.length - 8)}</td>
                                                <td style={{ padding: '0.5rem' }}>{m.writeLatency?.toFixed(1) || '-'}</td>
                                                <td style={{ padding: '0.5rem' }}>{m.fnExecTime?.toFixed(1) || '-'}</td>
                                                <td style={{ padding: '0.5rem', fontWeight: 'bold' }}>{m.e2eLatency || '-'}</td>
                                                <td style={{ padding: '0.5rem', color: m.status === 'completed' ? '#059669' : '#DC2626' }}>{m.status}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function MetricCard({ title, value, color }) {
    return (
        <div style={{ background: 'white', borderLeft: `5px solid ${color}`, padding: '1.25rem', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '0.8rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>{title}</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#111827' }}>{value}</div>
        </div>
    );
}

const btnStyle = (bg) => ({
    flex: 1,
    padding: '1rem',
    background: bg,
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 'bold',
    fontSize: '1rem',
    cursor: 'pointer',
    boxShadow: `0 4px 6px ${bg}40`,
    transition: '0.2s',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '8px'
});
