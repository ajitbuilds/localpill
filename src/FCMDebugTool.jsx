import React, { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from './firebase';
import { useToast } from "./components/Toast";

export default function FCMDebugTool() {
    const toast = useToast();
    const [pharmacies, setPharmacies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ success: 0, failure: 0 });
    const [sendingId, setSendingId] = useState(null);
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    useEffect(() => {
        const q = query(collection(db, 'pharmacies'), orderBy('name', 'asc')); // Or any valid field
        const unsub = onSnapshot(collection(db, 'pharmacies'), (snap) => {
            const pharms = [];
            snap.forEach(d => pharms.push({ id: d.id, ...d.data() }));
            // Client-side sort if index is missing
            pharms.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            setPharmacies(pharms);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const handleSendTest = async (pharmacy) => {
        if (!pharmacy.fcmToken) {
            toast.error("No FCM token available for this pharmacy.");
            return;
        }

        setSendingId(pharmacy.id);

        try {
            const sendTestFCM = httpsCallable(functions, 'sendTestFCM');
            const result = await sendTestFCM({
                pharmacyId: pharmacy.id,
                fcmToken: pharmacy.fcmToken
            });

            const data = result.data;
            if (isMounted.current) {
                if (data.success) {
                    setStats(s => ({ ...s, success: s.success + 1 }));
                } else {
                    setStats(s => ({ ...s, failure: s.failure + 1 }));
                    console.error("FCM Delivery Failed:", data.error);
                }
            }
        } catch (err) {
            if (isMounted.current) {
                setStats(s => ({ ...s, failure: s.failure + 1 }));
            }
            console.error("Cloud Function Error:", err);
        } finally {
            if (isMounted.current) {
                setSendingId(null);
            }
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
            <h2 style={{ fontSize: '2rem', color: '#1F2937', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>📱</span> FCM Notification Testing Center
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2.5rem' }}>
                <div style={{ background: '#F0FDF4', padding: '1.5rem', borderRadius: '12px', border: '1px solid #BBF7D0', textAlign: 'center' }}>
                    <div style={{ color: '#166534', fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Delivery Successes</div>
                    <div style={{ fontSize: '3rem', fontWeight: 800, color: '#15803D' }}>{stats.success}</div>
                </div>
                <div style={{ background: '#FEF2F2', padding: '1.5rem', borderRadius: '12px', border: '1px solid #FECACA', textAlign: 'center' }}>
                    <div style={{ color: '#991B1B', fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Delivery Failures</div>
                    <div style={{ fontSize: '3rem', fontWeight: 800, color: '#DC2626' }}>{stats.failure}</div>
                </div>
            </div>

            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: '#F9FAFB', borderBottom: '2px solid #E5E7EB' }}>
                        <tr>
                            <th style={{ padding: '1rem', color: '#374151', fontSize: '0.9rem' }}>Pharmacy</th>
                            <th style={{ padding: '1rem', color: '#374151', fontSize: '0.9rem' }}>FCM Token Status</th>
                            <th style={{ padding: '1rem', color: '#374151', fontSize: '0.9rem' }}>Last Sent</th>
                            <th style={{ padding: '1rem', color: '#374151', fontSize: '0.9rem', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#6B7280' }}>Loading pharmacies...</td></tr>
                        ) : pharmacies.length === 0 ? (
                            <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#6B7280' }}>No pharmacies registered in system.</td></tr>
                        ) : pharmacies.map(p => (
                            <tr key={p.id} style={{ borderBottom: '1px solid #F3F4F6', transition: '0.2s', background: sendingId === p.id ? '#EFF6FF' : 'transparent' }}>
                                <td style={{ padding: '1rem' }}>
                                    <div style={{ fontWeight: 600, color: '#111827' }}>{p.name || 'Unnamed Pharmacy'}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'monospace' }}>{p.id}</div>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    {p.fcmToken ? (
                                        <span style={{ padding: '4px 8px', background: '#D1FAE5', color: '#065F46', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600 }}>✅ Linked</span>
                                    ) : (
                                        <span style={{ padding: '4px 8px', background: '#FEE2E2', color: '#991B1B', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600 }}>❌ Missing Token</span>
                                    )}
                                </td>
                                <td style={{ padding: '1rem', fontSize: '0.85rem', color: '#4B5563' }}>
                                    {p.lastNotificationAt ? p.lastNotificationAt.toDate().toLocaleString() : 'Never tested'}
                                </td>
                                <td style={{ padding: '1rem', textAlign: 'right' }}>
                                    <button className="btn-dynamic"
                                        onClick={() => handleSendTest(p)}
                                        disabled={!p.fcmToken || sendingId === p.id}
                                        style={{
                                            background: !p.fcmToken ? '#E5E7EB' : sendingId === p.id ? '#93C5FD' : '#3B82F6',
                                            color: !p.fcmToken ? '#9CA3AF' : 'white',
                                            border: 'none',
                                            padding: '0.5rem 1rem',
                                            borderRadius: '6px',
                                            cursor: !p.fcmToken || sendingId === p.id ? 'not-allowed' : 'pointer',
                                            fontWeight: 'bold',
                                            fontSize: '0.85rem',
                                            transition: '0.2s'
                                        }}
                                    >
                                        {sendingId === p.id ? 'Sending...' : '⚡ Send Test'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div style={{ marginTop: '1.5rem', textAlign: 'center', color: '#6B7280', fontSize: '0.85rem' }}>
                Note: The Cloud Function explicitly triggers <code>admin.messaging().send()</code> securely returning delivery status to these metrics natively.
            </div>
        </div>
    );
}
