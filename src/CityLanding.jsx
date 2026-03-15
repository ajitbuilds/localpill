import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const CityLanding = () => {
    const { city } = useParams();
    const navigate = useNavigate();
    const [scrolled, setScrolled] = useState(false);

    // Format city string (e.g., 'new-delhi' -> 'New Delhi')
    const formattedCity = city
        ? city.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
        : 'Your City';

    useEffect(() => {
        window.scrollTo(0, 0);
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const schemaOrgJSONLD = {
        "@context": "https://schema.org",
        "@type": "MedicalOrganization",
        "name": `LocalPill - Pharmacies in ${formattedCity}`,
        "description": `Find trusted local pharmacies and get medicines quickly in ${formattedCity}. Upload your prescription and let local pharmacies compete to give you the best price.`,
        "url": `https://localpill.app/${city.toLowerCase()}/medicines`,
        "areaServed": formattedCity,
        "serviceType": "Medicine Delivery and Prescription Matching"
    };

    return (
        <div style={{ background: '#F8FAFC', minHeight: '100vh', fontFamily: "'Inter', sans-serif", color: '#0F172A' }}>
            {/* Dynamic SEO Tags */}
            <Helmet>
                <title>Buy Medicines in {formattedCity} | LocalPill Pharmacies</title>
                <meta name="description" content={`Find 24/7 pharmacies, upload prescriptions, and get medicines delivered fast in ${formattedCity}. Compare prices from local medical stores instantly.`} />
                <meta name="keywords" content={`medicines ${formattedCity}, online pharmacy ${formattedCity}, medical store near me, buy medicine online ${formattedCity}, fast medicine delivery`} />
                <link rel="canonical" href={`https://localpill.app/${city.toLowerCase()}/medicines`} />

                {/* Open Graph Tags */}
                <meta property="og:title" content={`Trusted Pharmacies in ${formattedCity} | LocalPill`} />
                <meta property="og:description" content={`Need medicines urgently in ${formattedCity}? Don't run from store to store. Upload your prescription and let verified local pharmacies match your needs.`} />
                <meta property="og:type" content="website" />
                <meta property="og:url" content={`https://localpill.app/${city.toLowerCase()}/medicines`} />
                <meta property="og:image" content="https://localpill.app/og-image-city.jpg" />

                {/* Tracking/Local Business Schema */}
                <script type="application/ld+json">
                    {JSON.stringify(schemaOrgJSONLD)}
                </script>
            </Helmet>

            {/* Header */}
            <header style={{
                position: 'fixed', top: 0, width: '100%', zIndex: 50,
                background: scrolled ? 'rgba(255, 255, 255, 0.95)' : 'transparent',
                backdropFilter: scrolled ? 'blur(10px)' : 'none',
                boxShadow: scrolled ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                transition: 'all 0.3s ease'
            }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => navigate('/')}>
                        <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, #10B981, #059669)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '1.2rem' }}>
                            LP
                        </div>
                        <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#0F172A' }}>
                            LocalPill
                        </span>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <main style={{ paddingTop: '100px', paddingBottom: '4rem', maxWidth: '1200px', margin: '0 auto', padding: '100px 1.5rem 4rem' }}>
                <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto 4rem' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#ECFDF5', color: '#059669', padding: '6px 16px', borderRadius: '20px', fontSize: '0.875rem', fontWeight: 600, marginBottom: '1.5rem' }}>
                        <span style={{ width: '8px', height: '8px', background: '#10B981', borderRadius: '50%', display: 'inline-block' }}></span>
                        Serving all areas in {formattedCity}
                    </div>

                    <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.04em', color: '#0F172A', marginBottom: '1.5rem' }}>
                        Medicines delivered FAST in <span style={{ color: '#10B981', position: 'relative' }}>
                            {formattedCity}
                            <svg width="100%" height="12" viewBox="0 0 100 12" preserveAspectRatio="none" style={{ position: 'absolute', bottom: '-4px', left: 0, zIndex: -1, color: '#D1FAE5' }}><path d="M0 10 Q 50 0 100 10" stroke="currentColor" strokeWidth="4" fill="none" /></svg>
                        </span>
                    </h1>

                    <p style={{ fontSize: '1.25rem', color: '#475569', lineHeight: 1.6, marginBottom: '2.5rem', maxWidth: '600px', margin: '0 auto 2.5rem' }}>
                        Stop calling every medical store. Just upload your prescription and get connected to the closest pharmacies in {formattedCity} within minutes.
                    </p>

                    <button className="btn-dynamic"
                        onClick={() => navigate('/login')}
                        style={{
                            background: '#10B981', color: 'white', border: 'none',
                            padding: '1.2rem 2.5rem', fontSize: '1.125rem', fontWeight: 700,
                            borderRadius: '16px', cursor: 'pointer',
                            boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.4)',
                            transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', gap: '8px'
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        Find Medicines Now <span>→</span>
                    </button>

                    <div style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap', color: '#64748B', fontSize: '0.9rem', fontWeight: 500 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg> 100% Free Service</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg> Verified Pharmacies</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg> Private & Secure</div>
                    </div>
                </div>

                {/* SEO-focused Content Blocks */}
                <style>{`
                    @keyframes sectionFadeUp {
                        from { opacity: 0; transform: translateY(20px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    .section-anim {
                        animation: sectionFadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
                    }
                `}</style>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginTop: '4rem' }}>
                    <div className="section-anim" style={{ background: 'white', padding: '2.5rem', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', animationDelay: '0.1s' }}>
                        <div style={{ width: '48px', height: '48px', background: '#F0FDF4', color: '#10B981', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                        </div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', color: '#0F172A' }}>Local Pharmacies in {formattedCity}</h2>
                        <p style={{ color: '#64748B', lineHeight: 1.6, fontSize: '0.95rem' }}>We connect you directly with nearby medical stores and 24/7 pharmacies across {formattedCity}. Whether you need regular prescription refills or urgent medications, our local network fulfills orders faster than traditional online pharmacies.</p>
                    </div>

                    <div className="section-anim" style={{ background: 'white', padding: '2.5rem', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', animationDelay: '0.2s' }}>
                        <div style={{ width: '48px', height: '48px', background: '#EFF6FF', color: '#3B82F6', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        </div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', color: '#0F172A' }}>Save Time & Effort</h2>
                        <p style={{ color: '#64748B', lineHeight: 1.6, fontSize: '0.95rem' }}>Don't spend hours driving around {formattedCity} looking for specific medicines. One upload sends your request to multiple verified pharmacies instantly. Let them confirm availability and price before you step out.</p>
                    </div>

                    <div className="section-anim" style={{ background: 'white', padding: '2.5rem', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', animationDelay: '0.3s' }}>
                        <div style={{ width: '48px', height: '48px', background: '#FEF2F2', color: '#EF4444', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                        </div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', color: '#0F172A' }}>Safe & Authentic</h2>
                        <p style={{ color: '#64748B', lineHeight: 1.6, fontSize: '0.95rem' }}>Every medical store in our {formattedCity} network undergoes strict verification. We ensure you only deal with licensed pharmacists, guaranteeing the authenticity and quality of your healthcare products.</p>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer style={{ background: '#0F172A', color: '#94A3B8', padding: '3rem 1.5rem', borderTop: '1px solid #1E293B', textAlign: 'center' }}>
                <p style={{ marginBottom: '0.5rem' }}>© {new Date().getFullYear()} LocalPill {formattedCity}. All rights reserved.</p>
                <p style={{ fontSize: '0.85rem' }}>Connecting patients with local medical stores for a healthier community.</p>
            </footer>
        </div>
    );
};

export default CityLanding;
