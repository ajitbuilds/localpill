import React, { useState, useRef, useEffect } from 'react';
import { signInWithPhoneNumber } from 'firebase/auth';
import { auth } from './firebase';

export default function Otp({ confirmationResult, phoneNumber, onBack }) {
    const [digits, setDigits] = useState(['', '', '', '', '', '']);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [shake, setShake] = useState(false);
    const [timer, setTimer] = useState(30);
    const [internalConfirmationResult, setInternalConfirmationResult] = useState(confirmationResult);
    const inputRefs = useRef([]);

    // Auto-focus first box on mount
    useEffect(() => {
        inputRefs.current[0]?.focus();
    }, []);

    // Countdown timer
    useEffect(() => {
        if (timer > 0) {
            const id = setTimeout(() => setTimer(timer - 1), 1000);
            return () => clearTimeout(id);
        }
    }, [timer]);

    const otp = digits.join('');

    const handleDigitChange = (index, value) => {
        const cleaned = value.replace(/\D/g, '').slice(-1);
        const next = [...digits];
        next[index] = cleaned;
        setDigits(next);
        if (cleaned && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }

        const newOtp = next.join('');
        if (newOtp.length === 6 && !loading) {
            // Fix #52: Guard against double-submit — only auto-verify if not already verifying
            verifyCode(newOtp);
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace') {
            if (digits[index]) {
                const next = [...digits];
                next[index] = '';
                setDigits(next);
            } else if (index > 0) {
                inputRefs.current[index - 1]?.focus();
            }
        }
        if (e.key === 'ArrowLeft' && index > 0) inputRefs.current[index - 1]?.focus();
        if (e.key === 'ArrowRight' && index < 5) inputRefs.current[index + 1]?.focus();
    };

    // Handle paste of full 6-digit OTP
    const handlePaste = (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasted.length === 6) {
            setDigits(pasted.split(''));
            inputRefs.current[5]?.focus();
            verifyCode(pasted);
        }
    };

    const triggerShake = () => {
        setShake(true);
        setTimeout(() => setShake(false), 600);
    };

    const handleVerify = (e) => {
        e.preventDefault();
        verifyCode(otp);
    };

    const verifyCode = async (codeToVerify) => {
        setError('');

        if (codeToVerify.length < 6) {
            setError('Please fill all 6 digits');
            triggerShake();
            return;
        }

        setLoading(true);

        try {
            const result = await internalConfirmationResult.confirm(codeToVerify);
            setSuccess(true);
            // App.jsx's onAuthStateChanged listener handles user creation globally
        } catch (err) {
            console.error(err);
            setError('Invalid verification code. Please try again.');
            triggerShake();
            // Clear boxes on wrong OTP
            setDigits(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (timer > 0) return;
        try {
            setError('');
            setLoading(true);
            const appVerifier = window.recaptchaVerifier;
            const newConfirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
            setInternalConfirmationResult(newConfirmationResult);
            setTimer(30);
            setDigits(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
            // Show subtle success here if needed
        } catch (err) {
            console.error(err);
            setError('Failed to resend. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="auth-step animate-in" style={{ textAlign: 'center', padding: '2rem 0' }}>
                <style>{`
                    @keyframes successPulse {
                        0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.4); }
                        50% { box-shadow: 0 0 0 20px rgba(34,197,94,0); }
                    }
                    @keyframes successBounce {
                        0% { transform: scale(0.5); opacity: 0; }
                        70% { transform: scale(1.15); }
                        100% { transform: scale(1); opacity: 1; }
                    }
                `}</style>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
                    <div style={{
                        width: '72px', height: '72px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                        border: '3px solid #BBF7D0',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff',
                        animation: 'successBounce 0.5s ease forwards, successPulse 1.5s ease 0.5s infinite'
                    }}>
                        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    </div>
                </div>
                <h2 style={{ color: '#16A34A', marginBottom: '0.5rem', fontWeight: 800, fontSize: '1.5rem' }}>Verified!</h2>
                <p style={{ color: '#6B7280' }}>Securely logging you in…</p>
            </div>
        );
    }

    return (
        <div className="auth-step form-anim" style={{ maxWidth: '400px', margin: '0 auto' }}>
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
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <div style={{
                    width: '64px', height: '64px', borderRadius: '18px',
                    background: 'linear-gradient(135deg, #111827, #1e3a2f)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
                }}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg></div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', marginBottom: '0.25rem', letterSpacing: '-0.02em' }}>
                    Enter OTP
                </h2>
                <p style={{ color: '#6B7280', fontSize: '0.875rem', margin: 0 }}>
                    Sent to <strong style={{ color: '#111827' }}>{phoneNumber}</strong>
                </p>
            </div>

            <form onSubmit={handleVerify}>
                {/* Progress dots */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '1.5rem' }}>
                    {digits.map((d, i) => (
                        <div key={i} style={{
                            width: '10px', height: '10px', borderRadius: '50%',
                            background: d ? '#22C55E' : '#E5E7EB',
                            transform: d ? 'scale(1.2)' : 'scale(1)',
                            transition: 'all 0.15s ease',
                            boxShadow: d ? '0 0 6px rgba(34,197,94,0.4)' : 'none'
                        }} />
                    ))}
                </div>
                {/* 6 OTP Boxes */}
                <div style={{
                    display: 'flex', gap: '10px', justifyContent: 'center',
                    marginBottom: '1.75rem',
                    animation: shake ? 'otpShake 0.5s ease' : 'none'
                }}>
                    {digits.map((digit, i) => (
                        <input
                            key={i}
                            ref={el => inputRefs.current[i] = el}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={e => handleDigitChange(i, e.target.value)}
                            onKeyDown={e => handleKeyDown(i, e)}
                            onPaste={handlePaste}
                            style={{
                                width: '48px', height: '56px',
                                textAlign: 'center', fontSize: '1.4rem', fontWeight: 800,
                                border: `2px solid ${error ? '#FCA5A5' : digit ? '#22C55E' : '#E5E7EB'}`,
                                borderRadius: '12px', outline: 'none',
                                background: digit ? '#F0FDF4' : '#fff',
                                color: digit ? '#15803D' : '#111827',
                                transition: 'all 0.15s',
                                transform: digit ? 'scale(1.05)' : 'scale(1)',
                                boxShadow: digit ? '0 2px 10px rgba(34,197,94,0.2)' : 'none',
                                caretColor: 'transparent',
                                ...(!digit ? { autoComplete: 'one-time-code' } : {})
                            }}
                            onFocus={e => { e.target.style.borderColor = '#22C55E'; e.target.style.boxShadow = '0 0 0 4px rgba(34,197,94,0.15)'; }}
                            onBlur={e => { e.target.style.borderColor = error ? '#FCA5A5' : digits[parseInt(e.target.dataset.idx || 0)] ? '#22C55E' : '#E5E7EB'; e.target.style.boxShadow = digits[parseInt(e.target.dataset.idx || 0)] ? '0 2px 10px rgba(34,197,94,0.2)' : 'none'; }}
                        />
                    ))}
                </div>

                {/* Shake animation keyframes */}
                <style>{`
                    @keyframes otpShake {
                        0%, 100% { transform: translateX(0); }
                        15% { transform: translateX(-8px); }
                        30% { transform: translateX(8px); }
                        45% { transform: translateX(-6px); }
                        60% { transform: translateX(6px); }
                        75% { transform: translateX(-3px); }
                        90% { transform: translateX(3px); }
                    }
                `}</style>

                {error && (
                    <div style={{
                        background: '#FEF2F2', border: '1px solid #FECACA',
                        color: '#DC2626', borderRadius: '10px',
                        padding: '0.75rem 1rem', fontSize: '0.85rem',
                        fontWeight: 600, marginBottom: '1rem',
                        display: 'flex', alignItems: 'center', gap: '6px',
                        animation: 'otpShake 0.5s ease'
                    }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                        {error}
                    </div>
                )}

                <button className="btn-dynamic"
                    type="submit"
                    disabled={loading || otp.length < 6}
                    style={{
                        width: '100%', padding: '0.9rem',
                        background: (loading || otp.length < 6)
                            ? '#D1D5DB'
                            : 'linear-gradient(135deg, #22C55E, #16A34A)',
                        color: 'white', border: 'none', borderRadius: '14px',
                        fontSize: '1rem', fontWeight: 700,
                        cursor: (loading || otp.length < 6) ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        transition: 'all 0.2s',
                        boxShadow: (loading || otp.length < 6) ? 'none' : '0 4px 16px rgba(34,197,94,0.35)',
                        marginBottom: '0.75rem'
                    }}
                    onMouseEnter={e => { if (!loading && otp.length >= 6) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                    {loading
                        ? <><span className="spinner-small" /> Verifying…</>
                        : <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg> Verify Code</>}
                </button>

                <button className="btn-dynamic"
                    type="button"
                    onClick={handleResend}
                    disabled={timer > 0 || loading}
                    style={{
                        width: '100%', padding: '0.75rem',
                        background: 'transparent', border: 'none',
                        color: timer > 0 ? '#9CA3AF' : '#3B82F6',
                        borderRadius: '14px',
                        fontSize: '0.875rem', fontWeight: 700,
                        cursor: timer > 0 || loading ? 'not-allowed' : 'pointer',
                        marginBottom: '0.5rem', transition: 'color 0.2s'
                    }}
                >
                    {timer > 0 ? `Resend Code in 00:${timer.toString().padStart(2, '0')}` : 'Resend Code'}
                </button>

                <button className="btn-dynamic"
                    type="button"
                    onClick={onBack}
                    disabled={loading}
                    style={{
                        width: '100%', padding: '0.75rem',
                        background: 'transparent', border: '1px solid #E5E7EB',
                        color: '#6B7280', borderRadius: '14px',
                        fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
                    Change Number
                </button>
            </form>
        </div>
    );
}
