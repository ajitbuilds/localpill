import React, { useState, useRef, useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export default function PatientSetup({ user, onComplete }) {
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const isMounted = useRef(true);

    useEffect(() => {
        return () => {
            isMounted.current = false;
        };
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('Please enter your name');
            return;
        }
        setLoading(true);
        try {
            const userRef = doc(db, 'users', user.uid);
            await setDoc(userRef, {
                role: 'user',
                name: name.trim(),
                phone: user.phoneNumber || null,
            }, { merge: true });
            if (isMounted.current) {
                onComplete();
            }
        } catch (err) {
            console.error(err);
            if (isMounted.current) {
                setError('Failed to update profile. Please try again.');
            }
        } finally {
            if (isMounted.current) {
                setLoading(false);
            }
        }
    };

    return (
        <div style={{ minHeight: '100%', background: 'linear-gradient(160deg, #f0fdf4 0%, #f8fafc 60%, #eff6ff 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
            <div className="auth-step animate-in" style={{ textAlign: 'center', maxWidth: '400px', width: '100%' }}>
                <div style={{
                    width: '72px', height: '72px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                    border: '6px solid #DCFCE7',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff',
                    marginBottom: '1rem',
                    boxShadow: '0 8px 24px rgba(34,197,94,0.25)'
                }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                </div>
                {/* Step badge */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '20px', padding: '3px 10px', marginBottom: '0.75rem', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22C55E', display: 'inline-block' }}></span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#15803D', letterSpacing: '0.05em', textTransform: 'uppercase' }}>One-time setup</span>
                </div>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#111827', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
                    Welcome to LocalPill!
                </h2>
                <p className="subtitle" style={{ color: '#6B7280', fontSize: '0.95rem', marginBottom: '2rem' }}>
                    Let's personalise your experience in seconds.
                </p>

                <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#374151', paddingLeft: '4px', marginBottom: '0.5rem' }}>Full Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Rahul Sharma"
                            className="modern-input"
                            style={{
                                width: '100%', padding: '0.9rem 1rem', fontSize: '1.05rem',
                                border: '1px solid #D1D5DB', borderRadius: '12px', outline: 'none',
                                transition: 'border-color 0.2s', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                            }}
                            onFocus={(e) => { e.target.style.borderColor = '#22C55E'; e.target.style.boxShadow = '0 0 0 4px rgba(34,197,94,0.15)'; }}
                            onBlur={(e) => { e.target.style.borderColor = '#D1D5DB'; e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.02)'; }}
                            required
                            autoFocus
                        />
                    </div>
                    {error && (
                        <div className="error-alert" style={{ marginBottom: '1rem', background: '#FEF2F2', color: '#DC2626', padding: '0.75rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600, border: '1px solid #FECACA', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading || !name.trim()}
                        style={{
                            width: '100%', padding: '1rem',
                            background: (loading || !name.trim())
                                ? '#D1D5DB'
                                : 'linear-gradient(135deg, #22C55E, #16A34A)',
                            color: 'white', border: 'none', borderRadius: '12px', fontSize: '1.05rem', fontWeight: 700,
                            cursor: (loading || !name.trim()) ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s',
                            boxShadow: (loading || !name.trim()) ? 'none' : '0 4px 16px rgba(34,197,94,0.35)',
                            transform: 'scale(1)'
                        }}
                        onMouseDown={e => { if (!loading && name.trim()) e.currentTarget.style.transform = 'scale(0.98)'; }}
                        onMouseUp={e => { if (!loading && name.trim()) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseEnter={e => { if (!loading && name.trim()) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                    >
                        {loading ? <><span className="spinner-small"></span> Setting up...</> : 'Continue to Dashboard →'}
                    </button>
                    <div style={{ textAlign: 'center', marginTop: '1.2rem', display: 'flex', alignItems: 'flex-start', gap: '6px', justifyContent: 'center', color: '#9CA3AF', fontSize: '0.75rem' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#86EFAC" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                        <p style={{ margin: 0 }}>Your location is only used to find nearby pharmacies when you search.</p>
                    </div>
                </form>
            </div>
        </div>
    );
}
