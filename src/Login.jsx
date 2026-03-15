import React, { useState, useEffect } from 'react';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from './firebase';

export default function Login({ onOtpSent }) {
    const [phone, setPhone] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [focused, setFocused] = useState(false);
    const isMounted = React.useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    useEffect(() => {
        if (!window.recaptchaVerifier) {
            window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                'size': 'invisible',
            });
        }
        return () => {
            // Fix #50: Clean up RecaptchaVerifier on unmount to prevent stale DOM references
            if (window.recaptchaVerifier) {
                window.recaptchaVerifier.clear();
                window.recaptchaVerifier = null;
            }
        };
    }, []);

    const handleSendOtp = async (e) => {
        e.preventDefault();
        setError('');

        if (!phone || phone.length < 10) {
            setError('Please enter a valid 10-digit phone number');
            return;
        }

        setLoading(true);

        try {
            const formattedPhone = `+91${phone}`;
            const appVerifier = window.recaptchaVerifier;
            const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
            if (isMounted.current) onOtpSent(confirmationResult, formattedPhone);
        } catch (err) {
            console.error(err);
            if (isMounted.current) setError(err.message || 'Failed to send OTP. Try again.');
            if (window.recaptchaVerifier) {
                // Fix #51: Added .catch() to prevent unhandled rejection on slow networks
                window.recaptchaVerifier.render()
                    .then(widgetId => {
                        if (window.grecaptcha) window.grecaptcha.reset(widgetId);
                    })
                    .catch(() => { /* Recaptcha reset failed silently */ });
            }
        } finally {
            if (isMounted.current) setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100%', background: 'linear-gradient(160deg, #f0fdf4 0%, #f8fafc 60%, #eff6ff 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
            <style>{`
                @keyframes formSlideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .form-anim {
                    animation: formSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
                }
                .spinner-small {
                    width: 14px;
                    height: 14px;
                    border: 2px solid rgba(255, 255, 255, 0.3);
                    border-radius: 50%;
                    border-top-color: white;
                    animation: spin 1s ease-in-out infinite;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
            <div className="auth-step form-anim" style={{ maxWidth: '400px', width: '100%', margin: '0 auto' }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
                        <img src="/localpill-logo-full.png" alt="LocalPill Logo" style={{ height: '44px', objectFit: 'contain' }} />
                    </div>
                    {/* Trust badge */}
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#FFFFFF', border: '1px solid #BBF7D0', borderRadius: '20px', padding: '4px 12px', marginBottom: '0.75rem', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22C55E', display: 'inline-block', animation: 'pulse 2s infinite' }}></span>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#15803D' }}>Trusted by 10,000+ users across India</span>
                    </div>
                    <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#111827', marginBottom: '0.25rem', letterSpacing: '-0.03em' }}>
                        Welcome to LocalPill
                    </h2>
                    <p style={{ color: '#6B7280', fontSize: '0.9rem', margin: 0 }}>
                        Enter your number to login or sign up
                    </p>
                </div>

                <form onSubmit={handleSendOtp} style={{ opacity: loading ? 0.7 : 1, pointerEvents: loading ? 'none' : 'auto', transition: 'all 0.3s ease' }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Phone Number
                        </label>
                        <div style={{
                            display: 'flex', alignItems: 'center',
                            background: '#fff',
                            border: `2px solid ${focused ? '#22C55E' : '#E5E7EB'}`,
                            borderRadius: '14px',
                            overflow: 'hidden',
                            transition: 'border-color 0.2s, box-shadow 0.2s',
                            boxShadow: focused ? '0 0 0 4px rgba(34,197,94,0.15)' : '0 1px 3px rgba(0,0,0,0.04)'
                        }}>
                            {/* Flag + dial code */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                padding: '0 1rem', height: '52px',
                                borderRight: '1px solid #E5E7EB',
                                background: '#F9FAFB',
                                flexShrink: 0
                            }}>
                                {/* SVG India flag */}
                                <svg width="22" height="16" viewBox="0 0 22 16" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: '2px', flexShrink: 0 }}>
                                    <rect width="22" height="16" fill="#fff" />
                                    <rect width="22" height="5.33" fill="#FF9933" />
                                    <rect y="10.67" width="22" height="5.33" fill="#138808" />
                                    <circle cx="11" cy="8" r="2" fill="none" stroke="#000080" strokeWidth="0.5" />
                                    <circle cx="11" cy="8" r="0.6" fill="#000080" />
                                </svg>
                                <span style={{ fontWeight: 700, color: '#374151', fontSize: '0.95rem' }}>+91</span>
                            </div>

                            <input
                                type="tel"
                                maxLength="10"
                                value={phone}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    if (val.length <= 10) setPhone(val);
                                }}
                                onFocus={() => setFocused(true)}
                                onBlur={() => setFocused(false)}
                                placeholder="98765 43210"
                                style={{
                                    flex: 1, border: 'none', background: 'transparent',
                                    padding: '0 1rem', height: '52px',
                                    fontSize: '1.1rem', outline: 'none',
                                    color: '#111827', fontWeight: 600,
                                    letterSpacing: '0.05em'
                                }}
                                required
                            />
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '0.78rem', fontWeight: 600, color: phone.length === 10 ? '#22C55E' : '#9CA3AF', marginTop: '0.35rem', transition: 'color 0.2s' }}>
                            {phone.length}/10
                        </div>
                    </div>

                    {error && (
                        <div style={{
                            background: '#FEF2F2', border: '1px solid #FECACA',
                            color: '#DC2626', borderRadius: '10px',
                            padding: '0.75rem 1rem', fontSize: '0.85rem',
                            fontWeight: 600, marginBottom: '1rem',
                            display: 'flex', alignItems: 'center', gap: '6px'
                        }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                            {error}
                        </div>
                    )}

                    <button className="btn-dynamic"
                        type="submit"
                        disabled={loading || phone.length < 10}
                        style={{
                            width: '100%', padding: '0.9rem',
                            background: (loading || phone.length < 10)
                                ? '#D1D5DB'
                                : 'linear-gradient(135deg, #22C55E, #16A34A)',
                            color: 'white', border: 'none', borderRadius: '14px',
                            fontSize: '1rem', fontWeight: 700,
                            cursor: (loading || phone.length < 10) ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            transition: 'all 0.2s',
                            boxShadow: (loading || phone.length < 10) ? 'none' : '0 4px 16px rgba(34,197,94,0.35)'
                        }}
                        onMouseEnter={e => { if (!loading && phone.length >= 10) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(34,197,94,0.45)'; } }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = (loading || phone.length < 10) ? 'none' : '0 4px 16px rgba(34,197,94,0.35)'; }}
                    >
                        {loading
                            ? <><span className="spinner-small" /> Sending OTP…</>
                            : <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></svg> Send Verification Code</>}
                    </button>
                </form>

                {/* Privacy note + quick trust icons */}
                <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#9CA3AF', fontSize: '0.78rem' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                        <span>We never share or sell your number. OTP only.</span>
                    </div>
                    <div style={{ display: 'flex', gap: '1.25rem', color: '#D1D5DB', fontSize: '0.75rem', fontWeight: 500 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg> No spam</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg> Instant OTP</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg> India only</span>
                    </div>
                </div>

                <div id="recaptcha-container" />
            </div>
        </div>
    );
}
