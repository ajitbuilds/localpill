import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useWindowWidth from './hooks/useWindowWidth';

export default function HowItWorks() {
    const navigate = useNavigate();
    const isMobile = useWindowWidth() < 768;

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const steps = [
        {
            title: "Step 1: Search Your Medicine",
            description: "Enter the medicine name or upload your prescription securely. LocalPill allows you to send a single availability enquiry instead of visiting multiple pharmacies manually.",
            icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        },
        {
            title: "Step 2: Nearby Pharmacies Respond",
            description: "Licensed pharmacies near your location receive your enquiry and confirm whether the medicine is available. You can quickly see which nearby pharmacy has your required medicines in stock.",
            icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
        },
        {
            title: "Step 3: Visit & Collect",
            description: "Once availability is confirmed, you can visit the pharmacy and collect your medicines. LocalPill does not sell or deliver medicines. All transactions take place directly between you and the pharmacy.",
            icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
        }
    ];

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>

            {/* Premium Hero Banner */}
            <div style={{ background: '#0f172a', padding: isMobile ? '3rem 1rem' : '5rem 2rem', color: 'white', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.1, background: 'radial-gradient(circle at center, #10b981 0%, transparent 70%)' }}></div>
                <div style={{ position: 'relative', maxWidth: '800px', margin: '0 auto', zIndex: 1 }}>
                    <button className="btn-dynamic"
                        onClick={() => navigate('/')}
                        style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', fontWeight: 600, cursor: 'pointer', marginBottom: '2rem', fontSize: '0.9rem', padding: '0.5rem 1rem', borderRadius: '20px', transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    >
                        &larr; Back to Home
                    </button>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.1em', color: '#10b981', textTransform: 'uppercase', marginBottom: '1rem' }}>Simple. Fast. Reliable.</div>
                    <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 3.5rem)', fontWeight: 800, color: 'white', marginBottom: '1.5rem', letterSpacing: '-0.02em', lineHeight: 1.1 }}>How LocalPill Works</h1>
                    <p style={{ color: '#94a3b8', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
                        LocalPill helps you quickly discover where your medicines are available at nearby licensed pharmacies — without visiting multiple stores. Our platform is designed to make medicine availability information accessible in real time.
                    </p>
                </div>
            </div>

            <div style={{ maxWidth: '1000px', margin: '-4rem auto 4rem auto', padding: '0 2rem', position: 'relative', zIndex: 10 }}>
                <div style={{ background: 'white', padding: isMobile ? '1.75rem 1.25rem' : '4rem', borderRadius: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}>

                    <div style={{ position: 'relative' }}>
                        <style>{`
                            @keyframes stepBreathing {
                                0%, 100% { transform: scale(1); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
                                50% { transform: scale(1.08); box-shadow: 0 12px 20px -5px rgba(0,0,0,0.15); }
                            }
                            .step-icon-anim {
                                animation: stepBreathing 3s ease-in-out infinite;
                            }
                            @keyframes drawLineDown {
                                from { height: 0; opacity: 0; }
                                to { height: 100%; opacity: 1; }
                            }
                        `}</style>
                        {/* Connecting Vertical Line Track */}
                        <div style={{ position: 'absolute', left: '2rem', top: '0', bottom: '0', width: '2px', background: '#e2e8f0', zIndex: 0, display: isMobile ? 'none' : 'block' }}></div>
                        {/* Animated Gradient Fill */}
                        <div style={{ position: 'absolute', left: '2rem', top: '0', width: '2px', background: 'linear-gradient(180deg, #10b981 0%, #3b82f6 100%)', zIndex: 0, display: isMobile ? 'none' : 'block', animation: 'drawLineDown 2s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}></div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
                            {steps.map((step, index) => (
                                <div key={index} style={{ display: 'flex', gap: isMobile ? '1rem' : '2rem', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                                    <div className="step-icon-anim" style={{ flexShrink: 0, width: '4rem', height: '4rem', borderRadius: '50%', background: index === 0 ? '#10b981' : (index === steps.length - 1 ? '#3b82f6' : 'white'), border: `2px solid ${index === 0 ? '#10b981' : (index === steps.length - 1 ? '#3b82f6' : '#e2e8f0')}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: index === 0 || index === steps.length - 1 ? 'white' : '#64748b', animationDelay: `${index * 0.5}s` }}>
                                        {step.icon}
                                    </div>
                                    <div style={{ background: '#f8fafc', padding: '2rem', borderRadius: '16px', border: '1px solid #e2e8f0', flexGrow: 1, transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateX(10px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}>
                                        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.8rem', letterSpacing: '-0.01em' }}>{step.title}</h2>
                                        <p style={{ color: '#475569', fontSize: '1.05rem', lineHeight: 1.6 }}>{step.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Why This Matters */}
                    <div style={{ marginTop: '5rem' }}>
                        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                            <div style={{ color: '#3b82f6', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: '0.5rem' }}>The Value Proposition</div>
                            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>Why This Matters</h2>
                            <p style={{ color: '#64748b', fontSize: '1.05rem', marginTop: '0.5rem' }}>Instead of running from one store to another, LocalPill helps you:</p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
                            {[
                                { title: "Save Time", desc: "During urgent situations, every minute counts.", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>, color: "#fef3c7" },
                                { title: "Reduce Uncertainty", desc: "Know exactly who has your medicine before leaving home.", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4338ca" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>, color: "#e0e7ff" },
                                { title: "Connect Locally", desc: "Build trust with neighborhood pharmacies you actually know.", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>, color: "#dcfce7" },
                                { title: "Informed Decisions", desc: "Compare availability and chat directly before visiting.", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#db2777" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="9" y1="18" x2="15" y2="18" /><line x1="10" y1="22" x2="14" y2="22" /><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" /></svg>, color: "#fce7f3" }
                            ].map((item, i) => (
                                <div key={i} style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <div style={{ background: item.color, width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem' }}>{item.icon}</div>
                                    <h4 style={{ fontWeight: 700, color: '#0f172a', fontSize: '1.05rem', margin: 0 }}>{item.title}</h4>
                                    <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Our Role as a Platform */}
                    <div style={{ marginTop: '5rem', padding: '3rem', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', borderRadius: '24px', color: 'white', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', right: '-5%', top: '-20%', opacity: 0.05, transform: 'rotate(-15deg)' }}>
                            <svg width="300" height="300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="3" x2="12" y2="21" /><path d="M4 8l16 0" /><path d="M4 16l16 0" /><circle cx="12" cy="12" r="2" /></svg>
                        </div>
                        <div style={{ position: 'relative', zIndex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div style={{ background: 'rgba(255,255,255,0.1)', padding: '0.8rem', borderRadius: '12px', display: 'flex' }}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                                </div>
                                <h3 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, color: 'white' }}>Our Role as a Platform</h3>
                            </div>
                            <p style={{ color: '#cbd5e1', fontSize: '1.1rem', lineHeight: 1.6, margin: 0, maxWidth: '800px' }}>
                                LocalPill operates <strong style={{ color: 'white' }}>purely as a technology intermediary</strong> that facilitates communication between users and licensed pharmacies. <span style={{ color: '#fca5a5' }}>We do not stock, sell, dispense, or deliver medicines.</span>
                            </p>
                        </div>
                    </div>

                    {/* Built for Convenience & Compliance */}
                    <div style={{ marginTop: '5rem' }}>
                        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                            <div style={{ color: '#10b981', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Infrastructure</div>
                            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>Built for Convenience & Compliance</h2>
                            <p style={{ color: '#64748b', fontSize: '1.05rem', marginTop: '0.5rem' }}>LocalPill is designed from the ground up to ensure:</p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
                            {[
                                { text: "Fast discovery of medicine availability", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg> },
                                { text: "Transparent pharmacy communication", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg> },
                                { text: "Secure handling of user information", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg> },
                                { text: "Compliance with applicable regulations", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg> }
                            ].map((item, i) => (
                                <div key={i} style={{ background: 'white', padding: '1.2rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                    <div style={{ flexShrink: 0, display: 'flex' }}>{item.icon}</div>
                                    <div style={{ color: '#334155', fontWeight: 600, fontSize: '0.95rem', lineHeight: 1.4 }}>{item.text}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ marginTop: '5rem', textAlign: 'center', padding: '3rem', background: '#f0fdf4', borderRadius: '16px', border: '1px solid #bbf7d0' }}>
                        <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#065f46', marginBottom: '1rem' }}>Get Started</h3>
                        <p style={{ color: '#064e3b', fontSize: '1.1rem', marginBottom: '2rem' }}>Sign up securely using your phone number and start discovering medicine availability near you in seconds.</p>
                        <button className="btn-dynamic"
                            onClick={() => navigate('/login')}
                            style={{ background: '#10b981', color: 'white', padding: '1rem 2.5rem', borderRadius: '12px', border: 'none', fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(16,185,129,0.4)', transition: 'all 0.2s' }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                        >
                            Get Started Now
                        </button>
                    </div>

                </div>
            </div>

            {/* Simple Footer */}
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
                © 2026 UpcharMitra Healthtech Pvt. Ltd.
            </div>

        </div >
    );
}
