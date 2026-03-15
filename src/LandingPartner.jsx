import React, { useState, useEffect } from 'react';
import useWindowWidth from './hooks/useWindowWidth';

export default function LandingPartner({ onStartClick }) {
    const [scrolled, setScrolled] = useState(false);
    const [activeFaq, setActiveFaq] = useState(null);
    const [dailyOrders, setDailyOrders] = useState(10);
    const width = useWindowWidth();
    const isMobile = width < 768;
    const isTablet = width >= 768 && width < 1024;

    // Reacting to dailyOrders slider with smooth count up
    const [displayEarnings, setDisplayEarnings] = useState(dailyOrders * 500 * 30);
    useEffect(() => {
        const target = dailyOrders * 500 * 30;
        let start = displayEarnings;
        let startTime = null;
        let animationFrame;

        const duration = 300; // ms

        const updateCounter = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            const easeOutQuad = progress * (2 - progress);

            setDisplayEarnings(Math.floor(start + (target - start) * easeOutQuad));

            if (progress < 1) {
                animationFrame = window.requestAnimationFrame(updateCounter);
            }
        };

        animationFrame = window.requestAnimationFrame(updateCounter);
        return () => window.cancelAnimationFrame(animationFrame);
    }, [dailyOrders]);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                }
            });
        }, { threshold: 0.1 });

        const sections = document.querySelectorAll('.fade-in-section');
        sections.forEach(section => observer.observe(section));

        return () => {
            window.removeEventListener('scroll', handleScroll);
            sections.forEach(section => observer.unobserve(section));
        };
    }, []);

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a', fontFamily: 'Inter, sans-serif' }}>
            {/* Header / Navbar */}
            <header style={{
                background: scrolled ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(10px)', padding: isMobile ? '0.75rem 1rem' : '1rem 2rem',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                borderBottom: scrolled ? '1px solid #e2e8f0' : '1px solid transparent',
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
                transition: 'all 0.3s ease',
                boxShadow: scrolled ? '0 4px 6px -1px rgba(0, 0, 0, 0.05)' : 'none'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }} onClick={() => window.scrollTo(0, 0)}>
                    {/* Dark Logo for Light Theme */}
                    <img src="/localpill-logo-full.png" alt="LocalPill Logo" style={{ height: '32px', objectFit: 'contain' }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1E293B', background: '#F1F5F9', padding: '4px 10px', borderRadius: '12px', letterSpacing: '0.05em', textTransform: 'uppercase', border: '1px solid #E2E8F0' }}>Partner</span>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <button className="btn-dynamic"
                        onClick={onStartClick}
                        style={{
                            background: '#10b981', color: 'white', padding: isMobile ? '0.4rem 0.75rem' : '0.5rem 1rem',
                            borderRadius: '8px', border: 'none', fontWeight: 600, fontSize: isMobile ? '0.8rem' : '0.9rem',
                            cursor: 'pointer', boxShadow: '0 2px 4px rgba(16,185,129,0.2)',
                            transition: 'background 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#059669'}
                        onMouseLeave={e => e.currentTarget.style.background = '#10b981'}
                    >
                        Sign In / Register
                    </button>
                </div>
            </header>

            {/* Global Animation Styles */}
            <style>
                {`
                    .fade-in-section {
                        opacity: 0;
                        transform: translateY(20px);
                        transition: opacity 0.8s ease-out, transform 0.8s ease-out;
                        will-change: opacity, visibility;
                    }
                    .fade-in-section.is-visible {
                        opacity: 1;
                        transform: none;
                    }
                    @keyframes pulse-glow {
                        0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
                        70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
                        100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
                    }
                `}
            </style>

            <div style={{ paddingTop: '70px' }}>

                {/* Hero Section */}
                <section className="fade-in-section" style={{
                    padding: isMobile ? '3rem 1rem' : isTablet ? '5rem 1.5rem 4rem 1.5rem' : '8rem 2rem 6rem 2rem', textAlign: 'center',
                    background: 'radial-gradient(circle at top, #e0f2fe 0%, #f8fafc 70%)',
                    borderBottom: '1px solid #e2e8f0'
                }}>
                    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                        <div style={{ display: 'inline-block', background: '#dcfce7', color: '#166534', padding: '0.4rem 1.2rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700, marginBottom: '2rem', border: '1px solid #bbf7d0' }}>
                            Join 500+ Verified Pharmacies
                        </div>
                        <h1 style={{
                            fontSize: 'clamp(2rem, 5vw, 4rem)', fontWeight: 800, color: '#0f172a',
                            lineHeight: 1.1, marginBottom: '1.5rem', letterSpacing: '-0.03em'
                        }}>
                            Grow your medical store <br /><span style={{ color: '#10b981' }}>digitally. 0% Commission.</span>
                        </h1>
                        <p style={{ fontSize: '1.25rem', color: '#475569', marginBottom: '3rem', lineHeight: 1.6, maxWidth: '700px', margin: '0 auto 3rem auto' }}>
                            LocalPill connects you directly with patients searching for medicines in your neighborhood.
                            Zero set-up costs. Real-time orders. Instant chat.
                        </p>
                        <button className="btn-dynamic"
                            onClick={onStartClick}
                            style={{
                                background: '#10b981', color: 'white', padding: '1rem 2.5rem',
                                borderRadius: '12px', border: 'none', fontWeight: 700, fontSize: '1.1rem',
                                cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(16,185,129,0.3)',
                                transform: 'translateY(0)', transition: 'all 0.2s',
                                animation: 'pulse-glow 2s infinite'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(16,185,129,0.4)'; e.currentTarget.style.background = '#059669'; e.currentTarget.style.animation = 'none'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(16,185,129,0.3)'; e.currentTarget.style.background = '#10b981'; e.currentTarget.style.animation = 'pulse-glow 2s infinite'; }}
                        >
                            Open Your Digital Storefront
                        </button>
                        <div style={{ marginTop: '2.5rem', fontSize: '0.9rem', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', fontWeight: 500 }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>5-Minute Setup</span>
                            <span>•</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>Manage from Phone</span>
                            <span>•</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>Keep 100% of Profits</span>
                        </div>
                    </div>
                </section>

                {/* David vs Goliath Section */}
                <section className="fade-in-section" style={{ padding: '6rem 2rem', background: '#ffffff', borderTop: '1px solid #e2e8f0' }}>
                    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                            <div style={{ display: 'inline-block', background: '#fef2f2', color: '#ef4444', padding: '0.5rem 1.2rem', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 800, marginBottom: '1.5rem', border: '1px solid #fecaca' }}>
                                The E-Pharmacy Trap
                            </div>
                            <h2 style={{ fontSize: 'clamp(2rem, 4vw, 2.5rem)', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '1rem' }}>
                                Big apps are taking your customers. <br /><span style={{ color: '#10b981' }}>It's time to fight back.</span>
                            </h2>
                            <p style={{ color: '#475569', fontSize: '1.2rem', maxWidth: '700px', margin: '0 auto', lineHeight: 1.6 }}>
                                See how the current system is designed to squeeze local medical stores, and how LocalPill flips the script to put you back in charge.
                            </p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '2.5rem' : '2rem' }}>
                            {/* Left Side: The Problem */}
                            <div className="fade-in-section" style={{ flex: 1, background: '#fff1f2', padding: isMobile ? '2rem' : '3rem', borderRadius: '24px', border: '1px solid #fecdd3', position: 'relative', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(225, 29, 72, 0.05)', transition: 'transform 0.3s ease' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>

                                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#be123c', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    The Delivery App Way
                                </h3>

                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <li style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                        <div style={{ color: '#ef4444', marginTop: '0.2rem', display: 'flex' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg></div>
                                        <div>
                                            <strong style={{ display: 'block', color: '#881337', fontSize: '1.1rem', marginBottom: '0.3rem' }}>Lost Customers</strong>
                                            <span style={{ color: '#9f1239', fontSize: '0.95rem', lineHeight: 1.5 }}>They divert your neighborhood patients to their own centralized dark stores.</span>
                                        </div>
                                    </li>
                                    <li style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                        <div style={{ color: '#ef4444', marginTop: '0.2rem', display: 'flex' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg></div>
                                        <div>
                                            <strong style={{ display: 'block', color: '#881337', fontSize: '1.1rem', marginBottom: '0.3rem' }}>Margin Drain</strong>
                                            <span style={{ color: '#9f1239', fontSize: '0.95rem', lineHeight: 1.5 }}>They charge exorbitant 20-30% commissions, destroying your profit margins.</span>
                                        </div>
                                    </li>
                                    <li style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                        <div style={{ color: '#ef4444', marginTop: '0.2rem', display: 'flex' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg></div>
                                        <div>
                                            <strong style={{ display: 'block', color: '#881337', fontSize: '1.1rem', marginBottom: '0.3rem' }}>No Relationships</strong>
                                            <span style={{ color: '#9f1239', fontSize: '0.95rem', lineHeight: 1.5 }}>You become an invisible supplier. They own the patient data and the loyalty.</span>
                                        </div>
                                    </li>
                                </ul>
                            </div>

                            {/* Right Side: The Solution */}
                            <div className="fade-in-section" style={{ flex: 1, background: '#f0fdf4', padding: isMobile ? '2rem' : '3rem', borderRadius: '24px', border: '1px solid #bbf7d0', position: 'relative', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.05)', transition: 'transform 0.3s ease' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>

                                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#047857', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    The LocalPill Advantage
                                </h3>

                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <li style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                        <div style={{ color: '#10b981', marginTop: '0.2rem', display: 'flex' }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg></div>
                                        <div>
                                            <strong style={{ display: 'block', color: '#064e3b', fontSize: '1.1rem', marginBottom: '0.3rem' }}>Reclaiming Footfall</strong>
                                            <span style={{ color: '#065f46', fontSize: '0.95rem', lineHeight: 1.5 }}>We route local online enquiries directly to <b>your</b> counter.</span>
                                        </div>
                                    </li>
                                    <li style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                        <div style={{ color: '#10b981', marginTop: '0.2rem', display: 'flex' }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg></div>
                                        <div>
                                            <strong style={{ display: 'block', color: '#064e3b', fontSize: '1.1rem', marginBottom: '0.3rem' }}>100% Margins</strong>
                                            <span style={{ color: '#065f46', fontSize: '0.95rem', lineHeight: 1.5 }}>We charge ₹0 commission on sales. You keep every single rupee.</span>
                                        </div>
                                    </li>
                                    <li style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                        <div style={{ color: '#10b981', marginTop: '0.2rem', display: 'flex' }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg></div>
                                        <div>
                                            <strong style={{ display: 'block', color: '#064e3b', fontSize: '1.1rem', marginBottom: '0.3rem' }}>Direct Relationships</strong>
                                            <span style={{ color: '#065f46', fontSize: '0.95rem', lineHeight: 1.5 }}>Patients chat directly with you, build trust, and become loyal lifelong customers.</span>
                                        </div>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Benefits Row */}
                <section className="fade-in-section" style={{ padding: isMobile ? '3rem 1rem' : isTablet ? '4rem 1.5rem' : '6rem 2rem', background: '#f8fafc' }}>
                    <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${isMobile ? '240px' : '300px'}, 1fr))`, gap: isMobile ? '1.25rem' : '2rem' }}>
                        <div className="fade-in-section" style={{ background: '#ffffff', padding: '3rem 2.5rem', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)', transition: 'transform 0.3s ease', cursor: 'default', transitionDelay: '0ms' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                            <div style={{ background: '#ecfdf5', color: '#10b981', width: '60px', height: '60px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>
                            </div>
                            <h3 style={{ fontSize: '1.4rem', color: '#0f172a', marginBottom: '1rem', fontWeight: 800, letterSpacing: '-0.01em' }}>Increase Footfall</h3>
                            <p style={{ color: '#475569', lineHeight: 1.7, fontSize: '1.05rem' }}>Receive live push notifications when anyone near you searches for a medicine. Be the first to reply and bring them directly to your counter.</p>
                        </div>
                        <div className="fade-in-section" style={{ background: '#ffffff', padding: '3rem 2.5rem', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)', transition: 'transform 0.3s ease', cursor: 'default', transitionDelay: '150ms' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                            <div style={{ background: '#eff6ff', color: '#3b82f6', width: '60px', height: '60px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                            </div>
                            <h3 style={{ fontSize: '1.4rem', color: '#0f172a', marginBottom: '1rem', fontWeight: 800, letterSpacing: '-0.01em' }}>Direct Customer Chat</h3>
                            <p style={{ color: '#475569', lineHeight: 1.7, fontSize: '1.05rem' }}>Communicate directly with the patient. See their prescription, clarify dosages, or offer generic alternatives instantly.</p>
                        </div>
                        <div className="fade-in-section" style={{ background: '#ffffff', padding: '3rem 2.5rem', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)', transition: 'transform 0.3s ease', cursor: 'default', transitionDelay: '300ms' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>

                            <div style={{ background: '#fef3c7', color: '#f59e0b', width: '60px', height: '60px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"></path><path d="M12 18V6"></path></svg>
                            </div>
                            <h3 style={{ fontSize: '1.4rem', color: '#0f172a', marginBottom: '1rem', fontWeight: 800, letterSpacing: '-0.01em' }}>Keep All Revenue</h3>
                            <p style={{ color: '#475569', lineHeight: 1.7, fontSize: '1.05rem' }}>Unlike massive delivery apps, we don't charge 20% platform fees. We charge exactly ₹0. You handle the transaction directly with the patient.</p>
                        </div>
                    </div>
                </section>

                {/* Earnings Calculator */}
                <section className="fade-in-section" style={{ padding: isMobile ? '3rem 1.5rem' : '6rem 2rem', background: '#ffffff', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
                    <div style={{ maxWidth: '1000px', margin: '0 auto', background: '#f8fafc', borderRadius: '24px', padding: isMobile ? '2rem 1rem' : '4rem', border: '1px solid #e2e8f0', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)' }}>
                        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                            <div style={{ display: 'inline-block', background: '#ecfdf5', color: '#059669', padding: '0.5rem 1.2rem', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 800, marginBottom: '1.5rem', border: '1px solid #a7f3d0' }}>
                                Savings Calculator
                            </div>
                            <h2 style={{ fontSize: 'clamp(2rem, 4vw, 2.5rem)', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '1rem' }}>Increase Local Visibility. <span style={{ color: '#10b981' }}>Keep Full Margins.</span></h2>
                            <p style={{ color: '#475569', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>Estimate how many additional nearby customers your pharmacy could connect with through LocalPill — without paying any listing or commission fees.</p>
                            <p style={{ color: '#64748b', fontSize: '1.05rem', maxWidth: '600px', margin: '1rem auto 0 auto', lineHeight: 1.6 }}>LocalPill helps increase your visibility among patients searching for medicine availability in your area.</p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '3rem' : '4rem', alignItems: 'center' }}>
                            {/* Left Side: Slider */}
                            <div style={{ flex: 1, width: '100%' }}>
                                <label style={{ display: 'block', fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', marginBottom: '2rem' }}>
                                    Estimated Daily Customer Enquiries: <span style={{ color: '#10b981', fontSize: '1.5rem', marginLeft: '0.5rem' }}>{dailyOrders}</span>
                                </label>
                                <input
                                    type="range"
                                    min="1"
                                    max="50"
                                    value={dailyOrders}
                                    onChange={(e) => setDailyOrders(Number(e.target.value))}
                                    style={{
                                        width: '100%',
                                        height: '6px',
                                        background: '#cbd5e1',
                                        borderRadius: '4px',
                                        outline: 'none',
                                        accentColor: '#10b981',
                                        cursor: 'pointer'
                                    }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', color: '#64748b', fontSize: '0.9rem', fontWeight: 600 }}>
                                    <span>1 enquiry</span>
                                    <span>50 enquiries</span>
                                </div>
                                <div style={{ marginTop: '3rem', padding: '1.5rem', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)' }}>
                                    <p style={{ margin: 0, color: '#475569', fontSize: '0.95rem', lineHeight: 1.7 }}>
                                        <strong style={{ color: '#0f172a' }}>Standard Assumption:</strong> Average request value is used only for estimation purposes. LocalPill does not participate in medicine sales, billing, or transactions.
                                    </p>
                                </div>
                            </div>

                            {/* Right Side: Results */}
                            <div style={{ flex: 1, width: '100%', background: '#ffffff', padding: isMobile ? '1.5rem' : '3rem', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)', position: 'relative', overflow: 'hidden' }}>
                                {/* Decorative Gradient Drop */}
                                <div style={{ position: 'absolute', top: 0, right: 0, width: '150px', height: '150px', background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, rgba(255,255,255,0) 70%)', transform: 'translate(30%, -30%)', borderRadius: '50%' }} />

                                <div style={{ marginBottom: '2.5rem' }}>
                                    <div style={{ color: '#64748b', fontSize: '0.95rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Estimated Additional Monthly Sales Opportunity</div>
                                    <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'baseline', gap: '0.2rem', letterSpacing: '-0.02em' }}>
                                        <span style={{ fontSize: '1.5rem', color: '#94a3b8' }}>₹</span>
                                        {displayEarnings.toLocaleString('en-IN')}
                                    </div>
                                    <p style={{ color: '#475569', fontSize: '0.95rem', marginTop: '0.5rem', lineHeight: 1.5 }}>Estimated additional customer demand based on typical visibility impact and average industry assumptions.</p>
                                </div>

                                <div style={{ width: '100%', height: '1px', background: '#e2e8f0', marginBottom: '2.5rem' }} />

                                <div>
                                    <div style={{ color: '#64748b', fontSize: '0.95rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        No Commission Charges
                                    </div>
                                    <p style={{ color: '#059669', fontSize: '0.95rem', marginTop: '0.5rem', fontWeight: 600, lineHeight: 1.5 }}>LocalPill charges 0% commission on pharmacy sales. Pharmacies retain full control over pricing, billing, and customer interaction.</p>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px dashed #e2e8f0', textAlign: 'center' }}>
                            <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>
                                <i>Figures shown are illustrative estimates based on average assumptions of customer visibility and typical pharmacy engagement. Actual outcomes may vary. LocalPill operates solely as a medicine discovery and enquiry routing platform and does not participate in medicine transactions.</i>
                            </p>
                        </div>
                    </div>
                </section>

                {/* How it Works Flow for Partners */}
                <section className="fade-in-section" style={{ padding: '6rem 2rem', background: '#ffffff', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
                    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '1rem' }}>How LocalPill Partner Works</h2>
                            <p style={{ color: '#475569', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto' }}>Turn your smartphone into a digital sales channel in 4 simple steps.</p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '2rem', position: 'relative' }}>
                            <div style={{ flex: 1, background: '#f8fafc', padding: '2.5rem', borderRadius: '20px', border: '1px solid #e2e8f0', position: 'relative' }}>
                                <div style={{ background: '#eff6ff', color: '#1d4ed8', width: '50px', height: '50px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.4rem', marginBottom: '1.5rem', boxShadow: '0 4px 6px rgba(59,130,246,0.1)' }}>1</div>
                                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem' }}>Get Notified</h3>
                                <p style={{ color: '#475569', lineHeight: 1.6 }}>Your phone rings when someone near your shop searches for a medicine or uploads a prescription.</p>
                            </div>
                            <div style={{ flex: 1, background: '#ffffff', padding: '2.5rem', borderRadius: '20px', border: '2px solid #10b981', boxShadow: '0 20px 25px -5px rgba(16,185,129,0.15)', position: 'relative', transform: isMobile ? 'none' : 'scale(1.05)', zIndex: 1 }}>
                                <div style={{ background: '#10b981', color: 'white', width: '50px', height: '50px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.4rem', marginBottom: '1.5rem', boxShadow: '0 4px 10px rgba(16,185,129,0.3)' }}>2</div>
                                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem' }}>Check & Reply</h3>
                                <p style={{ color: '#475569', lineHeight: 1.6 }}>Check your shelves. If you have it, tap "Available". You can also offer partial stock or generic brands.</p>
                            </div>
                            <div style={{ flex: 1, background: '#f8fafc', padding: '2.5rem', borderRadius: '20px', border: '1px solid #e2e8f0', position: 'relative' }}>
                                <div style={{ background: '#fef3c7', color: '#b45309', width: '50px', height: '50px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.4rem', marginBottom: '1.5rem', boxShadow: '0 4px 6px rgba(245,158,11,0.1)' }}>3</div>
                                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem' }}>Fulfill Request</h3>
                                <p style={{ color: '#475569', lineHeight: 1.6 }}>The patient will chat with you to confirm. They walk into your store, pay you directly, and pick it up!</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* FAQ Accordion Section */}
                <section className="fade-in-section" style={{ padding: '6rem 2rem', background: '#f8fafc' }}>
                    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '1rem' }}>Frequently Asked Questions</h2>
                            <p style={{ color: '#475569', fontSize: '1.2rem' }}>Everything you need to know about partnering with LocalPill.</p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {[
                                { q: "Do I have to deliver the medicines myself?", a: "No. LocalPill is primarily a 'Reserve & Pickup' platform. Patients will walk into your store to collect the medicines. If you already offer home delivery, you can coordinate that with the patient over the direct chat." },
                                { q: "How much commission does LocalPill take?", a: "0%. We do not take any cut from your sales, and there are no onboarding fees. You receive 100% of the patient's payment directly at your counter via Cash or UPI." },
                                { q: "How do I verify my pharmacy?", a: "After creating an account with your phone number, you will need to upload a photo of your valid Drug License. Our team verifies it quickly so you get a 'Trusted Partner' badge on your profile." },
                                { q: "What if I only have a generic alternative?", a: "You can tap 'Partial / Generic Available' when a request comes in, and then use the Chat feature to explain to the patient what generic molecule you have. It's a great way to educate patients and move inventory." }
                            ].map((faq, idx) => (
                                <div key={idx} style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                                    <button className="btn-dynamic"
                                        onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                                        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 2rem', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: 700, fontSize: '1.15rem', color: '#0f172a' }}
                                    >
                                        <span>{faq.q}</span>
                                        <span style={{ color: '#10b981', transform: activeFaq === idx ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s', display: 'flex' }}>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                                        </span>
                                    </button>
                                    <div style={{ maxHeight: activeFaq === idx ? '200px' : '0', overflow: 'hidden', transition: 'max-height 0.3s ease' }}>
                                        <p style={{ padding: '0 2rem 1.5rem 2rem', color: '#475569', lineHeight: 1.7, margin: 0, fontSize: '1.05rem' }}>
                                            {faq.a}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Support Ecosystem Section */}
                <section className="fade-in-section" style={{ padding: '5rem 2rem', background: '#ffffff', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
                    <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'center', marginBottom: '2.5rem' }}>
                            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
                            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', letterSpacing: '0.05em', whiteSpace: 'nowrap', margin: 0, textTransform: 'uppercase' }}>Supported Ecosystem</h2>
                            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
                        </div>
                        <p style={{ color: '#64748b', marginBottom: '3rem', fontSize: '1.1rem' }}>LocalPill is proudly supported and recognized by leading institutions</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '3rem' }}>
                            {[
                                { src: '/logo-startup-india.png', alt: 'Startup India — DPIIT Recognised', url: 'https://www.startupindia.gov.in' },
                                { src: '/logo-startup-bihar.png', alt: 'Startup Bihar', url: 'https://startupbihar.in' },
                                { src: '/logo-microsoft-startups.png', alt: 'Microsoft for Startups', url: 'https://www.microsoft.com/en-us/startups' },
                                { src: '/logo-sce-saharsa.png', alt: 'Start-Up Cell SCE Saharsa', url: '#' },
                            ].map((partner, i) => (
                                <a key={i} href={partner.url} target="_blank" rel="noopener noreferrer"
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        height: '90px', width: '180px',
                                        transition: 'all 0.3s ease',
                                        padding: '16px', background: 'white', borderRadius: '16px',
                                        border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                                >
                                    <img src={partner.src} alt={partner.alt}
                                        style={{ maxHeight: '60px', maxWidth: '140px', width: 'auto', height: 'auto', objectFit: 'contain' }}
                                    />
                                </a>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Final CTA */}
                <section className="fade-in-section" style={{ padding: isMobile ? '4rem 1rem' : isTablet ? '5rem 1.5rem' : '8rem 2rem', background: '#10b981', color: 'white', textAlign: 'center' }}>
                    <div style={{ maxWidth: '700px', margin: '0 auto' }}>
                        <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, marginBottom: '1.5rem', letterSpacing: '-0.02em', color: 'white' }}>
                            Ready to modernize your pharmacy?
                        </h2>
                        <p style={{ color: '#dcfce7', fontSize: '1.25rem', marginBottom: '3rem', lineHeight: 1.6 }}>
                            Join hundreds of smart medical stores. Stop letting big delivery apps eat your neighborhood business. Registration takes 5 minutes using your phone number.
                        </p>
                        <button className="btn-dynamic"
                            onClick={onStartClick}
                            style={{
                                background: 'white', color: '#10b981', padding: '1.2rem 3.5rem',
                                borderRadius: '16px', border: 'none', fontWeight: 800, fontSize: '1.25rem',
                                cursor: 'pointer', boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 15px 30px rgba(0,0,0,0.2)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.15)'; }}
                        >
                            Register Store Now
                        </button>
                    </div>
                </section>

                {/* Professional Legal & Compliance Footer (Remains Dark for grounding) */}
                <footer className="fade-in-section" style={{ background: '#0f172a', padding: '6rem 2rem 2rem 2rem', color: '#94a3b8', fontSize: '0.95rem' }}>
                    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4rem', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '4rem', marginBottom: '3rem' }}>
                            <div style={{ flex: '1 1 300px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem', gap: '0.5rem' }}>
                                    <img src="/localpill-logo-white.png" alt="LocalPill Logo" style={{ height: '36px', objectFit: 'contain' }} />
                                    <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#94a3b8', borderLeft: '2px solid rgba(255,255,255,0.2)', paddingLeft: '0.75rem' }}>Partner</span>
                                </div>
                                <div style={{ color: '#f8fafc', fontWeight: 600, marginBottom: '1rem', fontSize: '1.05rem' }}>by UpcharMitra Healthtech Pvt. Ltd.</div>
                                <p style={{ lineHeight: 1.7, marginBottom: '2rem', fontSize: '0.95rem', maxWidth: '400px' }}>
                                    LocalPill provides pharmacies with simple, zero-commission digital tools to intercept and fulfill local medicine demands before patients resort to massive online delivery portals.
                                </p>
                                {/* Social Media Links */}
                                <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
                                    {[
                                        { href: 'https://www.facebook.com/localpillofficial', label: 'Facebook', color: '#1877F2', svg: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg> },
                                        { href: 'https://www.instagram.com/localpillofficial', label: 'Instagram', color: '#E1306C', svg: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg> },
                                        { href: 'https://x.com/localpillreal', label: 'Twitter / X', color: '#000', svg: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.849L1.254 2.25H8.08l4.261 5.632L18.244 2.25Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" /></svg> },
                                        { href: 'https://www.linkedin.com/company/localpillofficial', label: 'LinkedIn', color: '#0A66C2', svg: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></svg> },
                                    ].map((social, i) => (
                                        <a key={i} href={social.href} target="_blank" rel="noopener noreferrer" aria-label={social.label}
                                            style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', transition: 'all 0.2s', textDecoration: 'none' }}
                                            onMouseEnter={e => { e.currentTarget.style.background = social.color; e.currentTarget.style.color = 'white'; e.currentTarget.style.border = `1px solid ${social.color}`; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                        >{social.svg}</a>
                                    ))}
                                </div>
                            </div>

                            <div style={{ flex: '1 1 150px' }}>
                                <h4 style={{ color: 'white', fontWeight: 700, marginBottom: '1.75rem', letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '0.9rem' }}>Portals</h4>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                    <li><a href="https://localpill.com" style={{ color: '#94a3b8', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = 'white'} onMouseLeave={e => e.target.style.color = '#94a3b8'}>Main Website (Patients)</a></li>
                                    <li><button className="btn-dynamic" onClick={onStartClick} style={{ background: 'transparent', border: 'none', padding: 0, color: '#94a3b8', cursor: 'pointer', transition: 'color 0.2s', fontSize: '0.95rem' }} onMouseEnter={e => e.target.style.color = 'white'} onMouseLeave={e => e.target.style.color = '#94a3b8'}>Partner Login</button></li>
                                </ul>
                            </div>

                            <div style={{ flex: '1 1 200px' }}>
                                <h4 style={{ color: 'white', fontWeight: 700, marginBottom: '1.75rem', letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '0.9rem' }}>Legal & Compliance</h4>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                    <li><button className="btn-dynamic" onClick={() => window.location.href = '/about-us'} style={{ background: 'transparent', border: 'none', padding: 0, color: '#94a3b8', cursor: 'pointer', transition: 'color 0.2s', fontSize: '0.95rem' }} onMouseEnter={e => e.target.style.color = 'white'} onMouseLeave={e => e.target.style.color = '#94a3b8'}>About Us</button></li>
                                    <li><button className="btn-dynamic" onClick={() => window.location.href = '/disclaimer'} style={{ background: 'transparent', border: 'none', padding: 0, color: '#94a3b8', cursor: 'pointer', transition: 'color 0.2s', fontSize: '0.95rem' }} onMouseEnter={e => e.target.style.color = 'white'} onMouseLeave={e => e.target.style.color = '#94a3b8'}>Legal Disclaimer</button></li>
                                    <li><button className="btn-dynamic" onClick={() => window.location.href = '/privacy-policy'} style={{ background: 'transparent', border: 'none', padding: 0, color: '#94a3b8', cursor: 'pointer', transition: 'color 0.2s', fontSize: '0.95rem' }} onMouseEnter={e => e.target.style.color = 'white'} onMouseLeave={e => e.target.style.color = '#94a3b8'}>Privacy Policy</button></li>
                                    <li><button className="btn-dynamic" onClick={() => window.location.href = '/terms'} style={{ background: 'transparent', border: 'none', padding: 0, color: '#94a3b8', cursor: 'pointer', transition: 'color 0.2s', fontSize: '0.95rem' }} onMouseEnter={e => e.target.style.color = 'white'} onMouseLeave={e => e.target.style.color = '#94a3b8'}>Terms of Service</button></li>
                                    <li><button className="btn-dynamic" onClick={() => window.location.href = '/grievance'} style={{ background: 'transparent', border: 'none', padding: 0, color: '#94a3b8', cursor: 'pointer', transition: 'color 0.2s', fontSize: '0.95rem' }} onMouseEnter={e => e.target.style.color = 'white'} onMouseLeave={e => e.target.style.color = '#94a3b8'}>Grievance Officer</button></li>
                                </ul>
                            </div>
                        </div>

                        {/* Sticky Disclaimer Line */}
                        <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '1.2rem 2rem', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)', marginBottom: '3rem', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                                <span style={{ color: '#ef4444', fontWeight: 800, whiteSpace: 'nowrap', fontSize: '0.95rem' }}>IMPORTANT:</span>
                            </div>
                            <span style={{ color: '#cbd5e1', fontSize: '0.95rem', lineHeight: 1.6 }}>
                                Only pharmacies holding an active, valid retail drug license are permitted to operate on LocalPill Partner. Accounts failing verification will be terminated.
                            </span>
                        </div>

                        {/* Bottom Row: Copyright & Contact */}
                        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: '0.75rem' }}>
                            <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
                                &copy; 2026 UpcharMitra Healthtech Pvt. Ltd. All Rights Reserved.
                            </div>
                            <div style={{ display: 'flex', gap: '2rem', fontSize: '0.9rem' }}>
                                <div><strong style={{ color: '#cbd5e1' }}>Partner Support:</strong> hello@localpill.com</div>
                            </div>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}
