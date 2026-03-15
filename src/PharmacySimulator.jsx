import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, limit, onSnapshot, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export default function PharmacySimulator() {
    const [requests, setRequests] = useState([]);
    const [pharmacies, setPharmacies] = useState([]);
    const [selectedRequestId, setSelectedRequestId] = useState('');
    const [selectedPharmacyId, setSelectedPharmacyId] = useState('');
    const [selectedResponse, setSelectedResponse] = useState('available');

    const [requestState, setRequestState] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    useEffect(() => {
        // Fetch recent active requests to populate the dropdown
        const reqQ = query(collection(db, 'medicineRequests'), orderBy('createdAt', 'desc'), limit(20));
        const unsubReq = onSnapshot(reqQ, (snap) => {
            const reqs = [];
            snap.forEach(d => reqs.push({ id: d.id, ...d.data() }));
            setRequests(reqs);
        });

        // Fetch pharmacies to populate the dropdown
        const pharmQ = query(collection(db, 'pharmacies'), limit(50));
        const unsubPharm = onSnapshot(pharmQ, (snap) => {
            const pharms = [];
            snap.forEach(d => pharms.push({ id: d.id, ...d.data() }));
            setPharmacies(pharms);
        });

        return () => { unsubReq(); unsubPharm(); };
    }, []);

    // Live listener for the exact request selected
    useEffect(() => {
        if (!selectedRequestId) {
            setRequestState(null);
            return;
        }

        const reqRef = doc(db, 'medicineRequests', selectedRequestId);
        const unsub = onSnapshot(reqRef, (snap) => {
            if (snap.exists()) {
                setRequestState(snap.data());
            } else {
                setRequestState(null);
            }
        });

        return () => unsub();
    }, [selectedRequestId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setMessage('');

        if (!selectedRequestId || !selectedPharmacyId) {
            setMessage('Please select a request and a pharmacy.');
            setIsSubmitting(false);
            return;
        }

        try {
            // Write to the Exact Backend Schema Payload Expectation
            const responseRef = doc(db, 'medicineRequests', selectedRequestId, 'pharmacyResponses', selectedPharmacyId);
            await setDoc(responseRef, {
                pharmacyId: selectedPharmacyId,
                responseType: selectedResponse,
                respondedAt: serverTimestamp(),
                timeToRespondMs: Math.floor(Math.random() * 8000) + 1000 // Fake latency 1-9s
            });
            if (isMounted.current) {
                setMessage('Response simulated successfully!');
                setTimeout(() => {
                    if (isMounted.current) setMessage('');
                }, 3000);
            }
        } catch (error) {
            console.error(error);
            if (isMounted.current) {
                setMessage('Error simulating response.');
            }
        } finally {
            if (isMounted.current) {
                setIsSubmitting(false);
            }
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
            <h2 style={{ fontSize: '2rem', color: '#111827', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '12px', letterSpacing: '-0.03em', fontWeight: 800 }}>
                <div style={{ background: '#DCFCE7', borderRadius: '12px', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" /></svg>
                </div>
                Pharmacy Response Simulator
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>

                {/* Control Panel */}
                <form onSubmit={handleSubmit} style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                    <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#374151' }}>Select Target Request:</label>
                        <select
                            value={selectedRequestId}
                            onChange={(e) => setSelectedRequestId(e.target.value)}
                            style={{
                                width: '100%', padding: '0.85rem 2.5rem 0.85rem 1rem', borderRadius: '10px',
                                border: '1px solid #D1D5DB', background: '#F9FAFB', fontSize: '0.95rem',
                                color: '#111827', appearance: 'none', cursor: 'pointer',
                                backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
                                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem top 50%', backgroundSize: '0.8rem auto'
                            }}
                            required
                        >
                            <option value="">-- Choose target request --</option>
                            {requests.map(r => (
                                <option key={r.id} value={r.id}>
                                    [{r.status.toUpperCase()}] Req: {r.id.substring(0, 8)}...
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#374151' }}>Simulate As Pharmacy UID:</label>
                        <select
                            value={selectedPharmacyId}
                            onChange={(e) => setSelectedPharmacyId(e.target.value)}
                            style={{
                                width: '100%', padding: '0.85rem 2.5rem 0.85rem 1rem', borderRadius: '10px',
                                border: '1px solid #D1D5DB', background: '#F9FAFB', fontSize: '0.95rem',
                                color: '#111827', appearance: 'none', cursor: 'pointer',
                                backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
                                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem top 50%', backgroundSize: '0.8rem auto'
                            }}
                            required
                        >
                            <option value="">-- Choose source pharmacy --</option>
                            {pharmacies.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.name || 'Unnamed Pharmacy'} ({p.id.substring(0, 6)})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={{ marginBottom: '2rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#374151' }}>Inject Payload Response Type:</label>
                        <select
                            value={selectedResponse}
                            onChange={(e) => setSelectedResponse(e.target.value)}
                            style={{
                                width: '100%', padding: '0.85rem 2.5rem 0.85rem 1rem', borderRadius: '10px',
                                border: '1px solid #D1D5DB', background: '#F9FAFB', fontSize: '0.95rem',
                                fontWeight: 700, appearance: 'none', cursor: 'pointer',
                                color: selectedResponse === 'available' ? '#059669' : selectedResponse === 'partial' ? '#D97706' : '#DC2626',
                                backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
                                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem top 50%', backgroundSize: '0.8rem auto'
                            }}
                        >
                            <option value="available">Available Full Match</option>
                            <option value="partial">Partial Match</option>
                            <option value="not_available">Not Available</option>
                        </select>
                    </div>

                    <button className="btn-dynamic"
                        type="submit"
                        disabled={isSubmitting}
                        style={{
                            width: '100%', padding: '1.1rem',
                            background: isSubmitting ? '#E5E7EB' : 'linear-gradient(135deg, #22C55E, #16A34A)',
                            color: isSubmitting ? '#9CA3AF' : 'white', borderRadius: '12px',
                            border: 'none', fontWeight: 800, fontSize: '1.05rem',
                            cursor: isSubmitting ? 'not-allowed' : 'pointer',
                            boxShadow: isSubmitting ? 'none' : '0 6px 20px rgba(34,197,94,0.3)',
                            transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                        }}
                        onMouseEnter={e => { if (!isSubmitting) e.currentTarget.style.transform = 'translateY(-2px)' }}
                        onMouseLeave={e => { if (!isSubmitting) e.currentTarget.style.transform = 'translateY(0)' }}
                    >
                        {isSubmitting ? 'Injecting HTTP Request...' : (
                            <><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg> Inject Pharmacy Response</>
                        )}
                    </button>

                    {message && (
                        <div style={{ marginTop: '1.25rem', padding: '0.85rem', background: '#DCFCE7', color: '#166534', border: '1px solid #BBF7D0', borderRadius: '12px', textAlign: 'center', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                            {message}
                        </div>
                    )}
                </form>

                {/* Dashboard Native Listeners */}
                <div style={{ background: '#F9FAFB', padding: '1.5rem', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
                    <h3 style={{ marginTop: 0, color: '#1F2937', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ animation: requestState ? 'pulse 2s infinite' : 'none', display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: '#3B82F6', marginRight: '5px' }}></span> Live Request State
                        <style>{`@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }`}</style>
                    </h3>

                    {!requestState ? (
                        <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontStyle: 'italic' }}>
                            Awaiting targeted request lock...
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ background: 'white', padding: '1.25rem', borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                <div style={{ fontSize: '0.8rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current System Status</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: requestState.status === 'matched' ? '#059669' : requestState.status === 'closed' ? '#DC2626' : '#3B82F6', textTransform: 'capitalize' }}>
                                    {requestState.status || 'Unknown'}
                                </div>
                            </div>

                            <div style={{ background: 'white', padding: '1.25rem', borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                <div style={{ fontSize: '0.8rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Responses Array Count</div>
                                <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#111827' }}>
                                    {requestState.responsesCount || 0}
                                </div>
                            </div>

                            <div style={{ background: 'white', padding: '1.25rem', borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                <div style={{ fontSize: '0.8rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notified Target Size</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4B5563' }}>
                                    {requestState.notifiedPharmaciesCount || 0} Pharmacies
                                </div>
                            </div>

                            <div style={{ fontSize: '0.8rem', color: '#9CA3AF', textAlign: 'center', padding: '1rem', background: '#F3F4F6', borderRadius: '8px' }}>
                                <strong>Architecture Note:</strong> The backend processPharmacyResponse Cloud Function listens for standard doc creation here, dynamically triggering transactions updating these states upon receiving UI payloads.
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
