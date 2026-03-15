import React, { useState, useEffect, useRef } from 'react';
import useWindowWidth from './hooks/useWindowWidth';
import { httpsCallable } from 'firebase/functions';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { functions, db } from './firebase';

export default function LandingUser({ onStartClick }) {
    const [scrolled, setScrolled] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [userCity, setUserCity] = useState('');
    const [activeFaq, setActiveFaq] = useState(null);
    const [language, setLanguage] = useState('en');
    const [monthlySpend, setMonthlySpend] = useState(2000);
    const [stats, setStats] = useState({ requestsCount: null, pharmaciesCount: null }); // Live stats (Issue #34)

    // Typewriter effect for placeholder
    const placeholders = language === 'en'
        ? ["Ex: Dolo 650...", "Ex: Electral Powder...", "Ex: Paracetamol 500mg...", "Ex: Digene..."]
        : ["जैसे: Dolo 650...", "जैसे: Electral Powder...", "जैसे: Paracetamol...", "जैसे: Digene..."];
    const [placeholderText, setPlaceholderText] = useState('');
    const [placeholderIdx, setPlaceholderIdx] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const timeout = setTimeout(() => {
            const currentObj = placeholders[placeholderIdx];

            if (!isDeleting) {
                setPlaceholderText(currentObj.substring(0, placeholderText.length + 1));
                if (placeholderText.length + 1 === currentObj.length) {
                    setTimeout(() => setIsDeleting(true), 2000); // Pause at full text
                }
            } else {
                setPlaceholderText(currentObj.substring(0, placeholderText.length - 1));
                if (placeholderText.length === 0) {
                    setIsDeleting(false);
                    setPlaceholderIdx((prev) => (prev + 1) % placeholders.length);
                }
            }
        }, isDeleting ? 40 : 100);

        return () => clearTimeout(timeout);
    }, [placeholderText, isDeleting, placeholderIdx, placeholders]);

    // Count-up hook for stats
    const useCountUp = (end, duration = 2000) => {
        const [count, setCount] = useState(0);
        const [hasStarted, setHasStarted] = useState(false);
        const ref = useRef(null);

        useEffect(() => {
            const observer = new IntersectionObserver(([entry]) => {
                if (entry.isIntersecting && !hasStarted) {
                    setHasStarted(true);
                }
            }, { threshold: 0.5 });
            if (ref.current) observer.observe(ref.current);
            return () => observer.disconnect();
        }, [hasStarted]);

        useEffect(() => {
            if (!hasStarted) return;
            let start = 0;
            const step = (timestamp) => {
                if (!start) start = timestamp;
                const progress = Math.min((timestamp - start) / duration, 1);
                // Ease out quad
                const easeProgress = progress * (2 - progress);
                setCount(Math.floor(easeProgress * end));
                if (progress < 1) window.requestAnimationFrame(step);
                else setCount(end);
            };
            window.requestAnimationFrame(step);
        }, [end, duration, hasStarted]);

        return { count, ref };
    };

    const requestsCountAnim = useCountUp(stats.requestsCount || 10000, 2500);
    const pharmaciesCountAnim = useCountUp(stats.pharmaciesCount || 500, 2000);

    // Live testimonials (Issue #35) with fallback data
    const [testimonials, setTestimonials] = useState([
        { id: '1', name: "Karan Sharma", text: "Maa ki BP ki dawai raat 11 baje nahi mil rahi thi. LocalPill se samne wali dukaan khuli mili. Setup process was so easy." },
        { id: '2', name: "Neha V.", text: "Saved me from driving to 4 different shops looking for an Ayurvedic synergy drop. Got a reply in 2 minutes." },
        { id: '3', name: "Amit J.", text: "Best app for local shopping. Even got a 10% discount from the chemist directly because there was no middleman." }
    ]);
    const width = useWindowWidth();
    const isMobile = width < 768;
    const isTablet = width >= 768 && width < 1024;

    useEffect(() => {
        let isMounted = true;

        // Fetch live stats (Issue #34)
        const fetchStats = async () => {
            try {
                const getPublicStats = httpsCallable(functions, 'getPublicStats');
                const result = await getPublicStats();
                if (!isMounted) return;
                setStats(result.data);
            } catch (error) {
                // Silently fallback to hardcoded numbers on error
            }
        };
        fetchStats();

        // Fetch live testimonials (Issue #35)
        const fetchTestimonials = async () => {
            try {
                const q = query(collection(db, 'testimonials'), limit(5));
                const snap = await getDocs(q);
                if (!isMounted) return;
                if (!snap.empty) {
                    setTestimonials(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                }
            } catch (err) {
                // Silently fallback to hardcoded
            }
        };
        fetchTestimonials();

        // Step 1: Try browser GPS → reverse geocode for most accurate city
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const { latitude, longitude } = pos.coords;
                    fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`)
                        .then(r => r.json())
                        .then(data => {
                            if (!isMounted) return;
                            const city = data.city || data.locality || data.principalSubdivision || '';
                            if (city) setUserCity(city);
                        })
                        .catch(() => { }); // Silent fail — 'Pados ke' fallback text will show
                },
                () => {
                    // GPS denied — show generic 'Pados ke' text instead of wrong IP-based city
                },
                { timeout: 5000 }
            );
        }

        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);

        // Intersection Observer for Scroll Animations
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
            isMounted = false;
            window.removeEventListener('scroll', handleScroll);
            sections.forEach(section => observer.unobserve(section));
        };
    }, []);


    const toggleLanguage = () => {
        setLanguage(prev => prev === 'en' ? 'hi' : 'en');
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            // In a real app, we might pass this query to login, then to the dashboard.
            // For now, we just trigger the login flow.
            onStartClick();
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
            {/* Header / Navbar */}
            <header style={{
                background: scrolled ? 'rgba(255, 255, 255, 0.95)' : 'white',
                backdropFilter: scrolled ? 'blur(10px)' : 'none',
                padding: isMobile ? '0.75rem 1rem' : '1rem 2rem',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                boxShadow: scrolled ? '0 4px 6px -1px rgba(0,0,0,0.05)' : '0 1px 3px rgba(0,0,0,0.05)',
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
                transition: 'all 0.3s ease'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => window.scrollTo(0, 0)}>
                    <img src="/localpill-logo-full.png" alt="LocalPill Logo" style={{ height: '36px', objectFit: 'contain' }} />
                </div>
                <div style={{ display: 'flex', gap: isMobile ? '0.5rem' : '1.5rem', alignItems: 'center' }}>
                    <button className="btn-dynamic"
                        onClick={toggleLanguage}
                        style={{ background: 'transparent', border: '1px solid #e2e8f0', borderRadius: '20px', padding: isMobile ? '0.25rem 0.5rem' : '0.3rem 0.8rem', fontSize: isMobile ? '0.75rem' : '0.85rem', fontWeight: 600, color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', transition: 'all 0.2s' }}
                    >
                        {language === 'en' ? 'हिन्दी' : 'English'}
                    </button>
                    <a
                        href="https://partner.localpill.com"
                        style={{ color: '#64748b', textDecoration: 'none', fontWeight: 600, fontSize: isMobile ? '0.78rem' : '0.9rem', transition: 'color 0.2s', display: isMobile ? 'none' : 'flex', alignItems: 'center', gap: '0.3rem' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#10b981'}
                        onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
                    >
                        For Pharmacies
                    </a>
                    <button className="btn-dynamic"
                        onClick={onStartClick}
                        style={{
                            background: '#3b82f6', color: 'white', padding: isMobile ? '0.4rem 0.75rem' : '0.5rem 1rem',
                            borderRadius: '8px', border: 'none', fontWeight: 600, fontSize: isMobile ? '0.8rem' : '0.9rem',
                            cursor: 'pointer', boxShadow: '0 2px 4px rgba(59,130,246,0.2)'
                        }}
                    >
                        {language === 'en' ? 'Login' : 'लॉग इन'}
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
                `}
            </style>

            {/* Main Content Padding for Fixed Header */}
            <div style={{ paddingTop: '70px' }}>

                {/* Live Status Bar */}
                <div style={{ background: '#10b981', color: 'white', padding: isMobile ? '0.4rem 0.75rem' : '0.5rem', textAlign: 'center', fontSize: isMobile ? '0.72rem' : '0.85rem', fontWeight: 600, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ height: '8px', width: '8px', background: 'white', borderRadius: '50%', display: 'inline-block', animation: 'pulse 2s infinite' }}></span>
                    <style>
                        {`@keyframes pulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.5); opacity: 0.5; } 100% { transform: scale(1); opacity: 1; } }`}
                    </style>
                    {language === 'en' ? '142 Local Pharmacies online and accepting requests right now.' : '142 लोकल मेडिकल स्टोर्स अभी ऑनलाइन हैं और ऑर्डर्स ले रहे हैं।'}
                </div>

                {/* Hero Section */}
                <section className="fade-in-section hero-gradient" style={{
                    padding: isMobile ? '3rem 1rem' : isTablet ? '4rem 1.5rem' : '5rem 2rem', textAlign: 'center',
                    display: 'flex', flexDirection: 'column', alignItems: 'center'
                }}>
                    <div style={{ maxWidth: '800px', width: '100%' }}>
                        <div style={{ display: 'inline-block', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '0.3rem 1rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700, marginBottom: '1.5rem', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                            {language === 'en' ? "India's First Local Pharmacy Network" : "भारत का पहला लोकल फार्मेसी नेटवर्क"}
                        </div>
                        <h1 style={{
                            fontSize: 'clamp(1.8rem, 5vw, 3.5rem)', fontWeight: 800, color: '#0f172a',
                            lineHeight: 1.15, marginBottom: '1.5rem', letterSpacing: '-0.03em'
                        }}>
                            {language === 'en' ? 'Dawai nahi mil rahi?' : 'दवाई नहीं मिल रही?'}<br />
                            <span style={{ color: '#3b82f6' }}>
                                {language === 'en'
                                    ? (userCity ? `${userCity} ke chemists se puchiye.` : 'Pados ke chemists se puchiye.')
                                    : (userCity ? `${userCity} के केमिस्ट्स से पूछिए।` : 'पड़ोस के केमिस्ट्स से पूछिए।')}
                            </span>
                        </h1>
                        <p style={{ fontSize: '1.2rem', color: '#475569', marginBottom: '2.5rem', lineHeight: 1.6, maxWidth: '600px', margin: '0 auto 2.5rem auto' }}>
                            {language === 'en'
                                ? `Don't run from store to store in an emergency. Type your medicine name, and we'll instantly check with verified medical stores ${userCity ? `across ${userCity}` : 'near you'}.`
                                : `इमरजेंसी में दुकान-दूकान मत भागिए। दवाई का नाम लिखिए, और हम तुरंत ${userCity ? `${userCity} के` : 'आपके आस-पास के'} वेरिफाइड मेडिकल स्टोर्स से चेक करेंगे।`}
                        </p>

                        {/* Hero Search Bar Action */}
                        <form onSubmit={handleSearchSubmit} style={{
                            display: 'flex', flexDirection: isMobile ? 'column' : 'row',
                            background: 'white', padding: '0.5rem', borderRadius: '16px',
                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                            maxWidth: '600px', margin: '0 auto', border: '1px solid #e2e8f0',
                            gap: isMobile ? '0.5rem' : '0'
                        }}>
                            <input
                                type="text"
                                placeholder={placeholderText || (language === 'en' ? "Ex: Dolo 650..." : "जैसे: Dolo 650...")}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    flex: 1, border: 'none', padding: '1rem 1.5rem', fontSize: '1.1rem',
                                    outline: 'none', background: 'transparent', color: '#0f172a'
                                }}
                                required
                            />
                            <button className="btn-dynamic"
                                type="submit"
                                style={{
                                    background: '#3b82f6', color: 'white', padding: '0 2rem',
                                    borderRadius: '12px', border: 'none', fontWeight: 700, fontSize: '1.1rem',
                                    cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap',
                                    position: 'relative', overflow: 'hidden'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = '#2563eb'}
                                onMouseLeave={e => e.currentTarget.style.background = '#3b82f6'}
                                onMouseDown={e => {
                                    e.currentTarget.style.transform = 'scale(0.96)';
                                }}
                                onMouseUp={e => {
                                    e.currentTarget.style.transform = 'scale(1)';
                                }}
                            >
                                Find Now
                            </button>
                        </form>

                        {/* Visual Category Chips */}
                        <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '1.5rem' }}>
                            {['Ayurvedic', 'Baby Care', 'Skincare', 'Daily Needs', 'First Aid'].map(chip => (
                                <button className="btn-dynamic" key={chip} onClick={onStartClick} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '0.4rem 1rem', fontSize: '0.9rem', color: '#475569', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = '#3b82f6'} onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}>{chip}</button>
                            ))}
                        </div>

                        <div style={{ marginTop: '2.5rem', fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap', fontWeight: 500 }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>Fast Responses</span>
                            <span>•</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>100% Genuine Pharmacies</span>
                            <span>•</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>Direct Chatting</span>
                        </div>
                    </div>
                </section>

                {/* Comparison Table Section */}
                <section style={{ padding: '4rem 2rem', background: 'white' }}>
                    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>Complete Transparency</h2>
                            <p style={{ color: '#64748b' }}>A straightforward process directly with local chemists.</p>
                        </div>

                        <div style={{ overflowX: 'auto', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                        <th style={{ padding: '1.5rem', color: '#64748b', fontWeight: 600, width: '33%' }}>Feature</th>
                                        <th style={{ padding: '1.5rem', background: 'rgba(16, 185, 129, 0.1)', color: '#059669', fontWeight: 800, width: '33%' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                <img src="/localpill-logo-full.png" alt="LocalPill Logo" style={{ height: '36px', objectFit: 'contain' }} />
                                            </div>
                                        </th>
                                        <th style={{ padding: '1.5rem', color: '#64748b', fontWeight: 600, width: '33%' }}>Quick Commerce</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                        <td style={{ padding: '1.2rem 1.5rem', fontWeight: 600, color: '#0f172a' }}>Delivery Time</td>
                                        <td style={{ padding: '1.2rem 1.5rem', background: 'rgba(16, 185, 129, 0.02)', color: '#10b981', fontWeight: 700 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                                Pickup Instantly (0 mins)
                                            </div>
                                        </td>
                                        <td style={{ padding: '1.2rem 1.5rem', color: '#64748b' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                                15-45 mins
                                            </div>
                                        </td>
                                    </tr>
                                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                        <td style={{ padding: '1.2rem 1.5rem', fontWeight: 600, color: '#0f172a' }}>Delivery/Platform Fees</td>
                                        <td style={{ padding: '1.2rem 1.5rem', background: 'rgba(16, 185, 129, 0.02)', color: '#10b981', fontWeight: 700 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                                ₹0. Forever.
                                            </div>
                                        </td>
                                        <td style={{ padding: '1.2rem 1.5rem', color: '#64748b' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                                ₹30 - ₹80 per request
                                            </div>
                                        </td>
                                    </tr>
                                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                        <td style={{ padding: '1.2rem 1.5rem', fontWeight: 600, color: '#0f172a' }}>Inventory Source</td>
                                        <td style={{ padding: '1.2rem 1.5rem', background: 'rgba(16, 185, 129, 0.02)', color: '#10b981', fontWeight: 700 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                                Pados ki Medical Store
                                            </div>
                                        </td>
                                        <td style={{ padding: '1.2rem 1.5rem', color: '#64748b' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                                Unknown Dark Stores
                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '1.2rem 1.5rem', fontWeight: 600, color: '#0f172a' }}>Rare Medicines</td>
                                        <td style={{ padding: '1.2rem 1.5rem', background: 'rgba(16, 185, 129, 0.02)', color: '#10b981', fontWeight: 700 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                                Ask 50+ stores at once
                                            </div>
                                        </td>
                                        <td style={{ padding: '1.2rem 1.5rem', color: '#64748b' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                                Usually Out of Stock
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Interactive Savings Calculator */}
                        <div className="fade-in-section" style={{ background: '#f8fafc', padding: '3rem 2rem', borderRadius: '16px', border: '1px solid #e2e8f0', marginTop: '3rem', textAlign: 'center' }}>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
                                {language === 'en' ? 'Calculate Your Savings' : 'अपनी बचत चेक करें'}
                            </h3>
                            <p style={{ color: '#64748b', marginBottom: '2rem' }}>
                                {language === 'en' ? 'How much do you spend monthly on medicines?' : 'हर महीने दवाइयों पर आपका कितना खर्च होता है?'}
                            </p>
                            <div style={{ maxWidth: '400px', margin: '0 auto' }}>
                                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#3b82f6', marginBottom: '1rem' }}>₹{monthlySpend}</div>
                                <input
                                    type="range"
                                    min="500"
                                    max="10000"
                                    step="100"
                                    value={monthlySpend}
                                    onChange={(e) => setMonthlySpend(e.target.value)}
                                    style={{ width: '100%', cursor: 'pointer', marginBottom: '1.5rem', accentColor: '#3b82f6' }}
                                />
                                <div style={{ background: '#d1fae5', color: '#065f46', padding: '1rem', borderRadius: '12px', fontWeight: 700, border: '1px solid #a7f3d0' }}>
                                    {language === 'en' ? 'You could save up to ~₹' : 'LocalPill से आप हर महीने ~₹'}{Math.round(monthlySpend * 0.2)}{language === 'en' ? ' / month!' : ' बचा सकते हैं!'}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.75rem', lineHeight: 1.5 }}>
                                    {language === 'en'
                                        ? '*Based on average 20% delivery fees & platform markups by standard quick commerce apps.'
                                        : '*अन्य एप्स के 20% डिलीवरी चार्ज और कमीशन के आधार पर अनुमानित बचत।'}
                                </div>
                            </div>
                        </div>

                    </div>
                </section>

                {/* Trust Stats Row */}
                <section className="fade-in-section" style={{ padding: '3rem 2rem', background: '#f8fafc', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '2rem' }}>
                        <div style={{ textAlign: 'center' }} ref={requestsCountAnim.ref}>
                            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                                {(requestsCountAnim.count / 1000).toFixed(1)}k+
                            </div>
                            <div style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.3rem' }}>Requests Fulfilled</div>
                        </div>
                        <div style={{ textAlign: 'center' }} ref={pharmaciesCountAnim.ref}>
                            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#3b82f6', letterSpacing: '-0.02em' }}>
                                {pharmaciesCountAnim.count}+
                            </div>
                            <div style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.3rem' }}>Verified Partners</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#10b981', letterSpacing: '-0.02em' }}>&lt;5 Min</div>
                            <div style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.3rem' }}>Average Response Time</div>
                        </div>
                    </div>
                </section>

                {/* Social Proof Marquee */}
                <section style={{ padding: '4rem 0', background: '#f8fafc', overflow: 'hidden' }}>
                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>People <svg width="24" height="24" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg> LocalPill</h2>
                    </div>
                    <style>
                        {`
                            @keyframes scroll-left {
                                0% { transform: translateX(0); }
                                100% { transform: translateX(-50%); }
                            }
                            .testimonial-track {
                                display: flex;
                                width: 200%;
                                animation: scroll-left 30s linear infinite;
                            }
                            .testimonial-card {
                                background: white;
                                padding: 1.5rem;
                                border-radius: 12px;
                                box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
                                min-width: 300px;
                                margin: 0 1rem;
                                border: 1px solid #e2e8f0;
                            }
                        `}
                    </style>
                    <div className="testimonial-track">
                        {[1, 2].map((group) => (
                            <React.Fragment key={group}>
                                {testimonials.map((t) => (
                                    <div key={`${group}-${t.id}`} className="testimonial-card">
                                        <div style={{ display: 'flex', gap: '2px', color: '#fbbf24', marginBottom: '0.75rem' }}>
                                            {[1, 2, 3, 4, 5].map(star => <svg key={star} width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>)}
                                        </div>
                                        <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '1rem', fontStyle: 'italic' }}>
                                            "{t.text}"
                                        </p>
                                        <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}>- {t.name}</div>
                                    </div>
                                ))}
                            </React.Fragment>
                        ))}
                    </div>
                </section>

                {/* How it Works Flow */}
                <section style={{ padding: '6rem 2rem', background: '#f8fafc' }}>
                    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '1rem' }}>We bring the Pharmacy to your phone.</h2>
                            <p style={{ color: '#64748b', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto' }}>No inventory, no dark stores. We simply connect you to the trusted medical stores in your own neighborhood.</p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '2rem', position: 'relative' }}>
                            <div className="fade-in-section" style={{ flex: 1, background: 'white', padding: '2.5rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', position: 'relative', transition: 'all 0.3s ease', cursor: 'default' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                                <div style={{ background: '#e0e7ff', color: '#3b82f6', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.2rem', marginBottom: '1.5rem' }}>1</div>
                                <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem' }}>Search</h3>
                                <p style={{ color: '#64748b', lineHeight: 1.6 }}>Type the name of the medicine or upload a photo of your doctor's prescription.</p>
                            </div>
                            <div className="fade-in-section" style={{ flex: 1, background: 'white', padding: '2.5rem', borderRadius: '16px', border: '2px solid #3b82f6', boxShadow: '0 10px 15px -3px rgba(59,130,246,0.1)', position: 'relative', zIndex: 1, transition: 'all 0.3s ease', cursor: 'default' }} onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02) translateY(-5px)'; e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(59,130,246,0.2)' }} onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1.02) translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(59,130,246,0.1)' }}>
                                <div style={{ background: '#3b82f6', color: 'white', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.2rem', marginBottom: '1.5rem', boxShadow: '0 4px 10px rgba(59,130,246,0.3)' }}>2</div>
                                <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem' }}>Match & Chat</h3>
                                <p style={{ color: '#475569', lineHeight: 1.6 }}>Nearby verified shops get notified immediately. They check their stock and reply directly to you.</p>
                            </div>
                            <div className="fade-in-section" style={{ flex: 1, background: 'white', padding: '2.5rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', position: 'relative', transition: 'all 0.3s ease', cursor: 'default' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                                <div style={{ background: '#d1fae5', color: '#10b981', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.2rem', marginBottom: '1.5rem' }}>3</div>
                                <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem' }}>Reserve & Pick Up</h3>
                                <p style={{ color: '#64748b', lineHeight: 1.6 }}>Confirm availability in the chat and go pick it up, saving time and money.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Interactive Phone Mockup Demo */}
                <section style={{ padding: isMobile ? '3rem 1rem' : isTablet ? '4rem 1.5rem' : '5rem 2rem', background: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ maxWidth: '1000px', width: '100%', display: 'flex', flexWrap: 'wrap', gap: isMobile ? '2rem' : '4rem', alignItems: 'center' }}>

                        <div style={{ flex: isMobile ? '1 1 100%' : '1 1 400px' }}>
                            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '1.5rem', lineHeight: 1.2 }}>
                                See how easy it is to find medicines.
                            </h2>
                            <p style={{ color: '#64748b', fontSize: '1.1rem', marginBottom: '2rem', lineHeight: 1.6 }}>
                                Skip the driving. Send a message to the whole neighborhood, and let the pharmacies reply to you with confirmations.
                            </p>
                            <ul style={{ listStyle: 'none', padding: 0 }}>
                                <li style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.5rem' }}>
                                    <span style={{ background: '#dbeafe', color: '#3b82f6', padding: '0.5rem', borderRadius: '8px', display: 'flex' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                    </span>
                                    <div>
                                        <h4 style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.2rem' }}>Real-time Chat</h4>
                                        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Talk directly to the shop owner.</p>
                                    </div>
                                </li>
                                <li style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                                    <span style={{ background: '#dcfce3', color: '#10b981', padding: '0.5rem', borderRadius: '8px', display: 'flex' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                    </span>
                                    <div>
                                        <h4 style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.2rem' }}>Live Map</h4>
                                        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>See exactly who is open near you.</p>
                                    </div>
                                </li>
                            </ul>
                        </div>

                        {/* CSS Phone Mockup */}
                        <div style={{ flex: isMobile ? '1 1 100%' : '1 1 300px', display: 'flex', justifyContent: 'center', margin: '0 auto' }}>
                            <div style={{
                                width: '300px', height: '600px', background: '#f8fafc', borderRadius: '40px',
                                border: '12px solid #0f172a', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                                position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column'
                            }}>
                                {/* Notch */}
                                <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '120px', height: '25px', background: '#0f172a', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px', zIndex: 10 }}></div>

                                {/* App Header */}
                                <div style={{ background: 'white', padding: '2.5rem 1rem 1rem 1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', position: 'relative', zIndex: 5 }}>
                                    <div style={{ width: '35px', height: '35px', background: '#e0e7ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>Apollo Pharmacy</div>
                                        <div style={{ color: '#10b981', fontSize: '0.7rem', fontWeight: 600 }}>● Online Now</div>
                                    </div>
                                </div>

                                {/* Chat Body */}
                                <div style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: '#f8fafc' }}>
                                    {/* Patient Message */}
                                    <div style={{ alignSelf: 'flex-end', background: '#3b82f6', color: 'white', padding: '0.75rem 1rem', borderRadius: '16px 16px 0 16px', maxWidth: '85%', fontSize: '0.85rem', boxShadow: '0 2px 4px rgba(59,130,246,0.2)' }}>
                                        Bhaiya Dolo 650 aur Electral powder hai kya?
                                    </div>

                                    {/* Typing indicator */}
                                    <div style={{ alignSelf: 'flex-start', background: 'white', padding: '0.75rem 1rem', borderRadius: '16px 16px 16px 0', border: '1px solid #e2e8f0', color: '#94a3b8', fontSize: '0.8rem', display: 'flex', gap: '4px', alignItems: 'center' }}>
                                        <span style={{ animation: 'pulse 1.5s infinite', animationDelay: '0s' }}>●</span>
                                        <span style={{ animation: 'pulse 1.5s infinite', animationDelay: '0.2s' }}>●</span>
                                        <span style={{ animation: 'pulse 1.5s infinite', animationDelay: '0.4s' }}>●</span>
                                    </div>

                                    {/* Pharmacy Reply */}
                                    <div style={{ alignSelf: 'flex-start', background: 'white', padding: '0.75rem 1rem', borderRadius: '16px 16px 16px 0', border: '1px solid #e2e8f0', color: '#0f172a', maxWidth: '85%', fontSize: '0.85rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', marginTop: '-0.5rem', animation: 'fadeIn 0.5s ease 2s forwards', opacity: 0 }}>
                                        <style>{`@keyframes fadeIn { to { opacity: 1; } }`}</style>
                                        Haan ji available hai. 2 minute mein aakar le jao.
                                    </div>
                                </div>

                                {/* App Footer Action */}
                                <div style={{ padding: '1rem', background: 'white', borderTop: '1px solid #e2e8f0' }}>
                                    <div style={{ width: '100%', padding: '0.75rem', background: '#f1f5f9', borderRadius: '20px', color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center' }}>
                                        Type a message...
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </section>

                {/* FAQ Accordion Section */}
                <section style={{ padding: '6rem 2rem', background: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
                    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '1rem' }}>Frequently Asked Questions</h2>
                            <p style={{ color: '#64748b', fontSize: '1.2rem' }}>Everything you need to know about how LocalPill works.</p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {[
                                { q: "Kya aap medicines khud deliver karte ho?", a: "Nahi, hum delivery nahi karte. Hum sirf aapko directly locally verified medical stores se connect karte hain. Aap dukaanwale se chat karke khud pickup kar sakte hain ya unse home delivery request kar sakte hain." },
                                { q: "Kya LocalPill use karne ka koi charge hai?", a: "Bilkul nahi! LocalPill patients ke liye 100% free hai. Koi hidden fees, convenience fee, ya platform charges nahi hain." },
                                { q: "Mera payment kaise hoga?", a: "Payments seedhe aap aur dukaandar ke beech honge (Cash, UPI, etc). Hum app par koi payment gateway nahi rakhte taaki zero commission rahe." },
                                { q: "Raat ko 2 baje dawai milegi?", a: "Agar aapke aas-pass koi 24/7 wala chemist LocalPill par online hoga, toh unhe turant aapki request mil jayegi aur aap chat par details confirm kar sakte hain." }
                            ].map((faq, idx) => (
                                <div key={idx} style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                    <button className="btn-dynamic"
                                        onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                                        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: 600, fontSize: '1.1rem', color: '#0f172a' }}
                                    >
                                        <span>{faq.q}</span>
                                        <span style={{ color: '#3b82f6', transform: activeFaq === idx ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s', display: 'flex' }}>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                                        </span>
                                    </button>
                                    <div style={{ maxHeight: activeFaq === idx ? '200px' : '0', overflow: 'hidden', transition: 'max-height 0.3s ease' }}>
                                        <p style={{ padding: '0 1.5rem 1.5rem 1.5rem', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
                                            {faq.a}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Support Ecosystem Section */}
                <section className="fade-in-section" style={{ padding: '4rem 2rem', background: '#fff', borderTop: '1px solid #f1f5f9' }}>
                    <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'center', marginBottom: '2.5rem' }}>
                            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
                            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', whiteSpace: 'nowrap', margin: 0 }}>Support Ecosystem</h2>
                            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
                        </div>
                        <p style={{ color: '#64748b', marginBottom: '2.5rem', fontSize: '1rem' }}>Proudly supported and recognized by leading institutions</p>
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
                                        height: '80px', width: '160px',
                                        transition: 'all 0.3s ease', opacity: 0.75,
                                        padding: '8px'
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1.06)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.opacity = '0.75'; e.currentTarget.style.transform = 'scale(1)'; }}
                                >
                                    <img src={partner.src} alt={partner.alt}
                                        style={{ maxHeight: '60px', maxWidth: '140px', width: 'auto', height: 'auto', objectFit: 'contain', filter: 'grayscale(20%)' }}
                                        onMouseEnter={e => e.currentTarget.style.filter = 'grayscale(0%)'}
                                        onMouseLeave={e => e.currentTarget.style.filter = 'grayscale(20%)'}
                                    />
                                </a>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Partner Teaser Section */}
                <section className="fade-in-section" style={{ padding: '4rem 2rem', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', color: 'white' }}>
                    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: (isMobile || isTablet) ? 'column' : 'row', alignItems: (isMobile || isTablet) ? 'flex-start' : 'center', justifyContent: 'space-between', gap: '2rem' }}>
                        <div>
                            <div style={{ color: '#10b981', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: '0.5rem' }}>For Business</div>
                            <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem', letterSpacing: '-0.02em', color: 'white' }}>
                                {language === 'en' ? 'Are you a Medical Store Owner?' : 'क्या आपकी मेडिकल दुकान है?'}
                            </h2>
                            <p style={{ color: '#94a3b8', fontSize: '1.1rem', maxWidth: '500px' }}>
                                {language === 'en'
                                    ? 'Join the LocalPill network today. Get direct orders from patients in your neighborhood at absolutely 0% commission.'
                                    : 'आज ही LocalPill से जुड़ें। अपने इलाके के मरीजों से डायरेक्ट ऑर्डर पाएं, वो भी 0% कमीशन पर।'}
                            </p>
                        </div>
                        <a
                            href="https://partner.localpill.com"
                            style={{ background: 'white', color: '#0f172a', padding: '1rem 2rem', borderRadius: '12px', fontWeight: 700, fontSize: '1.1rem', textDecoration: 'none', boxShadow: '0 4px 10px rgba(0,0,0,0.2)', transition: 'transform 0.2s', whiteSpace: 'nowrap' }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            {language === 'en' ? 'Join Partner Network →' : 'पार्टनर नेटवर्क से जुड़ें →'}
                        </a>
                    </div>
                </section>

                {/* Final CTA */}
                <section className="fade-in-section" style={{ padding: '6rem 2rem', background: '#0f172a', color: 'white', textAlign: 'center' }}>
                    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                        <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1.5rem', letterSpacing: '-0.02em', color: 'white' }}>
                            {language === 'en' ? 'Find Your Medicines Nearby — Instantly.' : 'अपने आस-पास की दवाइयां खोजें — तुरंत।'}
                        </h2>
                        <p style={{ color: '#94a3b8', fontSize: '1.1rem', marginBottom: '3rem', lineHeight: 1.6 }}>
                            {language === 'en'
                                ? 'Discover real-time medicine availability at licensed neighborhood pharmacies without running store to store. It takes just seconds to sign up securely with your phone number.'
                                : 'बिना एक दुकान से दूसरी दुकान भटके, अपने आस-पास की लाइसेंसी फार्मेसियों में दवाइयों की उपलब्धता का रीयल-टाइम पता पाएं। अपने फोन नंबर से सुरक्षित रूप से साइन अप करने में बस कुछ सेकंड लगते हैं।'}
                        </p>
                        <button className="btn-dynamic"
                            onClick={onStartClick}
                            style={{
                                background: '#10b981', color: 'white', padding: '1.2rem 3rem',
                                borderRadius: '12px', border: 'none', fontWeight: 800, fontSize: '1.2rem',
                                cursor: 'pointer', boxShadow: '0 4px 20px rgba(16,185,129,0.4)',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.background = '#059669'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = '#10b981'; }}
                        >
                            Log In Securely
                        </button>
                    </div>
                </section>

                {/* Professional Legal & Compliance Footer */}
                <footer style={{ background: '#0f172a', padding: '5rem 2rem 2rem 2rem', color: '#94a3b8', fontSize: '0.9rem', borderTop: '1px solid #1e293b' }}>
                    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

                        {/* Top Flex Row: Brand, Links */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3rem', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '3rem', marginBottom: '3rem' }}>
                            <div style={{ flex: '1 1 300px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                                    <img src="/localpill-logo-white.png" alt="LocalPill Logo" style={{ height: '32px', objectFit: 'contain' }} />
                                </div>
                                <div style={{ color: '#cbd5e1', fontWeight: 600, marginBottom: '1rem' }}>by UpcharMitra Healthtech Pvt. Ltd.</div>
                                <p style={{ lineHeight: 1.6, marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                                    LocalPill is a healthcare discovery platform that helps patients quickly find where their medicines are available at nearby licensed pharmacies.<br /><br />
                                    LocalPill partners only with licensed pharmacies complying with applicable drug regulations.<br />
                                    Data protected with industry-standard encryption and security practices.
                                </p>
                                {/* Social Media Links */}
                                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                    {[
                                        { href: 'https://www.facebook.com/localpillofficial', label: 'Facebook', color: '#1877F2', svg: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg> },
                                        { href: 'https://www.instagram.com/localpillofficial', label: 'Instagram', color: '#E1306C', svg: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg> },
                                        { href: 'https://x.com/localpillreal', label: 'Twitter / X', color: '#000', svg: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.849L1.254 2.25H8.08l4.261 5.632L18.244 2.25Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" /></svg> },
                                        { href: 'https://www.linkedin.com/company/localpillofficial', label: 'LinkedIn', color: '#0A66C2', svg: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></svg> },
                                    ].map((social, i) => (
                                        <a key={i} href={social.href} target="_blank" rel="noopener noreferrer" aria-label={social.label}
                                            style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', transition: 'all 0.2s', textDecoration: 'none' }}
                                            onMouseEnter={e => { e.currentTarget.style.background = social.color; e.currentTarget.style.color = 'white'; e.currentTarget.style.border = `1px solid ${social.color}`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.border = '1px solid rgba(255,255,255,0.12)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                        >{social.svg}</a>
                                    ))}
                                </div>
                            </div>

                            <div style={{ flex: '1 1 150px' }}>
                                <h4 style={{ color: 'white', fontWeight: 700, marginBottom: '1.5rem', letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '0.85rem' }}>PRODUCT</h4>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <li><a href="#" onClick={(e) => { e.preventDefault(); onStartClick(); }} style={{ color: '#94a3b8', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = 'white'} onMouseLeave={e => e.target.style.color = '#94a3b8'}>Find Medicines</a></li>
                                    <li><a href="https://partner.localpill.com" style={{ color: '#94a3b8', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = 'white'} onMouseLeave={e => e.target.style.color = '#94a3b8'}>For Pharmacies</a></li>
                                    <li><button className="btn-dynamic" onClick={() => window.location.href = '/how-it-works'} style={{ background: 'transparent', border: 'none', padding: 0, color: '#94a3b8', cursor: 'pointer', transition: 'color 0.2s', fontSize: '0.9rem' }} onMouseEnter={e => e.target.style.color = 'white'} onMouseLeave={e => e.target.style.color = '#94a3b8'}>How It Works</button></li>
                                </ul>
                            </div>

                            <div style={{ flex: '1 1 200px' }}>
                                <h4 style={{ color: 'white', fontWeight: 700, marginBottom: '1.5rem', letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '0.85rem' }}>LEGAL & COMPLIANCE</h4>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <li><button className="btn-dynamic" onClick={() => window.location.href = '/about-us'} style={{ background: 'transparent', border: 'none', padding: 0, color: '#94a3b8', cursor: 'pointer', transition: 'color 0.2s', fontSize: '0.9rem' }} onMouseEnter={e => e.target.style.color = 'white'} onMouseLeave={e => e.target.style.color = '#94a3b8'}>About Us</button></li>
                                    <li><button className="btn-dynamic" onClick={() => window.location.href = '/disclaimer'} style={{ background: 'transparent', border: 'none', padding: 0, color: '#94a3b8', cursor: 'pointer', transition: 'color 0.2s', fontSize: '0.9rem' }} onMouseEnter={e => e.target.style.color = 'white'} onMouseLeave={e => e.target.style.color = '#94a3b8'}>Legal Disclaimer</button></li>
                                    <li><button className="btn-dynamic" onClick={() => window.location.href = '/privacy-policy'} style={{ background: 'transparent', border: 'none', padding: 0, color: '#94a3b8', cursor: 'pointer', transition: 'color 0.2s', fontSize: '0.9rem' }} onMouseEnter={e => e.target.style.color = 'white'} onMouseLeave={e => e.target.style.color = '#94a3b8'}>Privacy Policy</button></li>
                                    <li><button className="btn-dynamic" onClick={() => window.location.href = '/terms'} style={{ background: 'transparent', border: 'none', padding: 0, color: '#94a3b8', cursor: 'pointer', transition: 'color 0.2s', fontSize: '0.9rem' }} onMouseEnter={e => e.target.style.color = 'white'} onMouseLeave={e => e.target.style.color = '#94a3b8'}>Terms of Service</button></li>
                                    <li><button className="btn-dynamic" onClick={() => window.location.href = '/grievance'} style={{ background: 'transparent', border: 'none', padding: 0, color: '#94a3b8', cursor: 'pointer', transition: 'color 0.2s', fontSize: '0.9rem' }} onMouseEnter={e => e.target.style.color = 'white'} onMouseLeave={e => e.target.style.color = '#94a3b8'}>Grievance Officer</button></li>
                                </ul>
                            </div>
                        </div>

                        {/* Shortened Sticky Disclaimer Line */}
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem 1.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                            <span style={{ color: '#ef4444', fontWeight: 700, whiteSpace: 'nowrap' }}>IMPORTANT:</span>
                            <span style={{ color: '#cbd5e1', fontSize: '0.85rem', lineHeight: 1.5 }}>
                                LocalPill is a medicine discovery platform. It does <strong>NOT</strong> sell, stock, or dispense medicines. <button className="btn-dynamic" onClick={() => window.location.href = '/legal'} style={{ background: 'transparent', border: 'none', padding: 0, color: '#3b82f6', cursor: 'pointer', textDecoration: 'underline' }}>Read full disclaimer & IT Act Intermediary Status.</button>
                            </span>
                        </div>

                        {/* Bottom Row: Copyright & Contact */}
                        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: '1rem', borderTop: '1px solid #1e293b', paddingTop: '2rem' }}>
                            <div style={{ fontSize: '0.85rem' }}>
                                © 2026 UpcharMitra Healthtech Pvt. Ltd. All Rights Reserved.
                            </div>
                            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '0.5rem' : '2rem', fontSize: '0.85rem' }}>
                                <div><strong>General Support:</strong> hello@localpill.com</div>
                                <div><strong>Pharmacy Partnerships:</strong> hello@localpill.com</div>
                            </div>
                        </div>

                    </div>
                </footer>

            </div>

            {/* Mobile Responsive Overrides */}
            <style>
                {`
                    .mobile-sticky-cta {
                        display: none;
                        position: fixed;
                        bottom: 0;
                        left: 0;
                        right: 0;
                        background: white;
                        padding: 1rem;
                        box-shadow: 0 -4px 10px rgba(0,0,0,0.1);
                        z-index: 100;
                        border-top: 1px solid #e2e8f0;
                    }
                    @media (max-width: 768px) {
                        .mobile-sticky-cta {
                            display: block;
                        }
                        /* Add padding to bottom to prevent overlap */
                        body {
                            padding-bottom: 80px;
                        }
                        .footer-middle-row {
                            flex-direction: column;
                            gap: 1.5rem !important;
                        }
                        .footer-disclaimer-box {
                            flex: 1 1 auto !important;
                        }
                    }
                `}
            </style>
            <div className="mobile-sticky-cta">
                <button className="btn-dynamic"
                    onClick={onStartClick}
                    style={{
                        width: '100%', background: '#3b82f6', color: 'white', padding: '1rem',
                        borderRadius: '12px', border: 'none', fontWeight: 700, fontSize: '1.1rem',
                        boxShadow: '0 4px 10px rgba(59,130,246,0.3)'
                    }}
                >
                    Find Medicine Now
                </button>
            </div>

        </div >
    );
}
