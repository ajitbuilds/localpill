import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useWindowWidth from './hooks/useWindowWidth';

export default function AboutUs() {
    const navigate = useNavigate();
    const isMobile = useWindowWidth() < 768;

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const sections = [
        {
            title: "Who We Are",
            content: (
                <>
                    <p>LocalPill is a healthcare discovery platform operated by UpcharMitra Healthtech Pvt. Ltd., built to help patients quickly find the availability of prescribed medicines at nearby licensed pharmacies.</p>
                    <p>Our platform bridges the information gap between patients and neighborhood pharmacies, making medicine availability transparent, predictable, and easier to access.</p>
                </>
            )
        },
        {
            title: "Our Mission",
            content: (
                <>
                    <p>Our mission is to reduce the uncertainty and time involved in finding essential medicines by enabling real-time visibility into local pharmacy availability.</p>
                    <p>We aim to help patients make informed decisions before visiting a pharmacy, especially during urgent healthcare situations.</p>
                </>
            )
        },
        {
            title: "Why LocalPill Was Built",
            content: (
                <>
                    <p>In many towns and cities, patients often need to visit multiple pharmacies to locate required medicines. This process can be stressful, time-consuming, and uncertain.</p>
                    <p>LocalPill was created to solve this everyday problem by enabling users to discover medicine availability nearby through a simple, technology-driven platform.</p>
                </>
            )
        },
        {
            title: "What We Do",
            content: (
                <>
                    <p>LocalPill allows users to send medicine availability enquiries to nearby licensed pharmacies and receive responses in real time.</p>
                    <p>This helps patients know in advance which pharmacy has their required medicines available.</p>
                    <p>LocalPill does not sell, stock, dispense, or deliver medicines. All transactions take place directly between users and independent pharmacies.</p>
                </>
            )
        },
        {
            title: "Our Ecosystem & Recognition",
            content: (
                <>
                    <p style={{ marginBottom: '0.5rem' }}>LocalPill is supported by a growing innovation ecosystem that promotes healthcare accessibility through technology.</p>
                    <p style={{ marginBottom: '0.5rem' }}>The platform is:</p>
                    <ul style={{ marginBottom: '1rem', paddingLeft: '1.5rem' }}>
                        <li style={{ marginBottom: '0.5rem' }}>Recognized under the Startup India (DPIIT) initiative</li>
                        <li style={{ marginBottom: '0.5rem' }}>Supported by the Startup Bihar ecosystem</li>
                        <li style={{ marginBottom: '0.5rem' }}>Developed with support from Microsoft for Startups technology programs</li>
                    </ul>
                    <p>LocalPill’s journey began at the Startup Cell, Saharsa, where the foundation of the platform was developed with early ecosystem encouragement.</p>
                </>
            )
        },
        {
            title: "Our Approach",
            content: (
                <>
                    <p style={{ marginBottom: '0.5rem' }}>We focus on:</p>
                    <ul style={{ marginBottom: '1rem', paddingLeft: '1.5rem' }}>
                        <li style={{ marginBottom: '0.5rem' }}>Technology-driven healthcare discovery</li>
                        <li style={{ marginBottom: '0.5rem' }}>Strengthening local pharmacy networks</li>
                        <li style={{ marginBottom: '0.5rem' }}>Compliance-first platform design</li>
                        <li style={{ marginBottom: '0.5rem' }}>Secure handling of user information</li>
                    </ul>
                    <p>Our goal is to build a reliable digital infrastructure that connects patients with nearby healthcare resources efficiently.</p>
                </>
            )
        },
        {
            title: "Compliance & Responsibility",
            content: (
                <>
                    <p>LocalPill operates solely as a technology intermediary under applicable Indian laws.</p>
                    <p>We partner only with independent licensed pharmacies, each of which is responsible for medicine dispensing, prescription verification, pricing, and regulatory compliance.</p>
                    <p>LocalPill does not participate in medicine transactions.</p>
                </>
            )
        },
        {
            title: "Our Vision",
            content: (
                <>
                    <p>We envision a future where accessing essential medicines is predictable, transparent, and seamless — supported by a connected digital healthcare ecosystem.</p>
                </>
            )
        },
        {
            title: "Leadership",
            content: (
                <>
                    <strong style={{ display: 'block', fontSize: '1.1rem', color: '#e2e8f0', marginBottom: '0.5rem', marginTop: '1.5rem' }}>Ajit Kumar — Founder</strong>
                    <p>LocalPill was founded by Ajit Kumar, an entrepreneur focused on solving real-world healthcare accessibility challenges through technology.</p>
                    <p>The idea for LocalPill emerged from observing the difficulties patients face when searching for essential medicines across multiple pharmacies, particularly during urgent situations.</p>
                    <p>With support from startup ecosystems and innovation programs, Ajit is building LocalPill as a compliance-first healthcare discovery platform designed to improve transparency and predictability in medicine availability.</p>

                    <strong style={{ display: 'block', fontSize: '1.1rem', color: '#e2e8f0', marginBottom: '0.5rem', marginTop: '2rem' }}>Dharmendra Kumar — Co-Founder</strong>
                    <p>Dharmendra Kumar co-founded LocalPill with the shared vision of leveraging technology to strengthen local healthcare networks and improve access to critical medicine information.</p>
                    <p>As Co-Founder, Dharmendra contributes to strategic direction, platform development initiatives, and ecosystem engagement to help scale LocalPill as a trusted healthcare discovery infrastructure.</p>
                </>
            )
        },
        {
            title: "Contact Information",
            content: (
                <>
                    <strong style={{ display: 'block', color: '#e2e8f0', marginBottom: '0.5rem' }}>For general inquiries:</strong>
                    <p><a href="mailto:hello@localpill.com" style={{ color: '#3b82f6', textDecoration: 'none' }}>hello@localpill.com</a></p>

                    <strong style={{ display: 'block', color: '#e2e8f0', marginBottom: '0.5rem', marginTop: '1.5rem' }}>For pharmacy partnerships:</strong>
                    <p><a href="mailto:hello@localpill.com" style={{ color: '#3b82f6', textDecoration: 'none' }}>hello@localpill.com</a></p>
                </>
            )
        }
    ];

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
            {/* Premium Hero Banner */}
            <div style={{ background: '#0f172a', padding: '4rem 2rem', color: 'white', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.1, background: 'radial-gradient(circle at center, #64748b 0%, transparent 70%)' }}></div>
                <div style={{ position: 'relative', maxWidth: '1000px', margin: '0 auto', zIndex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
                        <button className="btn-dynamic"
                            onClick={() => navigate('/')}
                            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem', padding: '0.5rem 1rem', borderRadius: '20px', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                        >
                            &larr; Back to Home
                        </button>
                    </div>
                    {/* Fixed Logo Display */}
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
                        <div style={{ background: 'white', padding: '0.5rem 1rem', borderRadius: '12px', display: 'inline-flex', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)' }}>
                            <img src="/localpill-logo-full.png" alt="LocalPill Logo" style={{ height: '36px', objectFit: 'contain' }} />
                        </div>
                    </div>

                    <div style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.1em', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '1rem' }}>UpcharMitra Healthtech</div>
                    <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 3.5rem)', fontWeight: 800, color: 'white', marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>About LocalPill</h1>
                    <p style={{ color: '#94a3b8', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
                        A healthcare discovery platform making medicine availability transparent, predictable, and easier to access.
                    </p>
                </div>
            </div>

            <div className={isMobile ? "stack-on-mobile" : ""} style={{ maxWidth: '1200px', margin: '-3rem auto 4rem auto', padding: isMobile ? '0 1rem' : '0 2rem', position: 'relative', zIndex: 10, display: 'flex', gap: '2rem', alignItems: 'flex-start', flexDirection: isMobile ? 'column' : 'row' }}>

                {/* Sticky Sidebar Index */}
                <div style={{ display: isMobile ? 'none' : 'block', flexShrink: 0, width: '280px', position: 'sticky', top: '2rem', background: 'white', padding: '2rem', borderRadius: '24px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', border: '1px solid #e2e8f0', maxHeight: 'calc(100vh - 4rem)', overflowY: 'auto' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.5rem' }}>ON THIS PAGE</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        {sections.map((section, index) => (
                            <a
                                key={index}
                                href={`#section-${index}`}
                                style={{ color: '#475569', textDecoration: 'none', fontSize: '0.9rem', lineHeight: 1.4, transition: 'all 0.2s', display: 'block', transform: 'translateX(0)' }}
                                onMouseEnter={e => { e.currentTarget.style.color = '#0f172a'; e.currentTarget.style.transform = 'translateX(4px)'; e.currentTarget.style.fontWeight = '600'; }}
                                onMouseLeave={e => { e.currentTarget.style.color = '#475569'; e.currentTarget.style.transform = 'translateX(0)'; e.currentTarget.style.fontWeight = '400'; }}
                            >
                                {section.title}
                            </a>
                        ))}
                    </div>
                </div>

                {/* Main Content */}
                <div style={{ flexGrow: 1, background: 'white', padding: isMobile ? '2rem 1.5rem' : '4rem', borderRadius: '24px', boxSizing: 'border-box', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', border: '1px solid #e2e8f0', width: '100%' }}>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4rem' }}>
                        <style>{`
                            @keyframes sectionFadeUp {
                                from { opacity: 0; transform: translateY(20px); }
                                to { opacity: 1; transform: translateY(0); }
                            }
                            .section-anim {
                                animation: sectionFadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
                            }
                        `}</style>
                        {sections.map((section, index) => (
                            <div key={index} id={`section-${index}`} className="section-anim" style={{ scrollMarginTop: '2rem', animationDelay: `${Math.min(index * 0.1, 1.5)}s` }}>
                                <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.5rem', letterSpacing: '-0.02em', display: 'flex', alignItems: 'baseline', gap: '0.8rem' }}>
                                    <span style={{ color: '#cbd5e1', fontSize: '1.2rem', fontWeight: 600 }}>{String(index + 1).padStart(2, '0')}</span>
                                    {section.title.replace(/^\d+\.\s*/, '')}
                                </h2>
                                <div style={{ color: '#475569', fontSize: '1.05rem', lineHeight: 1.8 }} className="legal-content">
                                    {section.content}
                                </div>
                            </div>
                        ))}
                    </div>

                </div>
            </div>

            <div style={{ padding: '2rem', fontSize: '0.9rem', color: '#64748b', textAlign: 'center', fontWeight: 500 }}>
                © {new Date().getFullYear()} UpcharMitra Healthtech Pvt. Ltd. All Rights Reserved.
            </div>

            <style>{`
                html { scroll-behavior: smooth; }
                .legal-content p {
                    margin-bottom: 1rem;
                }
                .legal-content ul {
                    padding-left: 0;
                    margin: 1.5rem 0;
                    list-style: none;
                }
                .legal-content li {
                    position: relative;
                    padding-left: 1.5rem;
                    margin-bottom: 0.8rem;
                }
                .legal-content li::before {
                    content: '•';
                    position: absolute;
                    left: 0;
                    color: #3b82f6;
                    font-weight: bold;
                    font-size: 1.2rem;
                    top: -2px;
                }
                @media (max-width: 768px) {
                    .stack-on-mobile {
                        flex-direction: column !important;
                    }
                    .stack-on-mobile > div:first-child {
                        display: none !important;
                    }
                }
            `}</style>
        </div>
    );
}
