import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useWindowWidth from './hooks/useWindowWidth';

export default function PrivacyPolicy() {
    const navigate = useNavigate();
    const isMobile = useWindowWidth() < 768;

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const sections = [
        {
            title: "1. Nature of the Platform",
            content: (
                <>
                    <p>LocalPill is a technology-based healthcare discovery platform that enables users to discover medicine availability at nearby licensed pharmacies.</p>
                    <p>LocalPill does not sell, stock, dispense, or deliver medicines.</p>
                </>
            )
        },
        {
            title: "2. Information We Collect",
            content: (
                <>
                    <p style={{ marginBottom: '0.5rem' }}>We may collect the following types of information:</p>

                    <p style={{ fontWeight: 600, marginTop: '1rem', marginBottom: '0.5rem', color: '#1e293b' }}>A. Personal Information</p>
                    <ul>
                        <li>Name</li>
                        <li>Mobile number</li>
                        <li>Location data (if permitted by the user)</li>
                    </ul>

                    <p style={{ fontWeight: 600, marginTop: '1rem', marginBottom: '0.5rem', color: '#1e293b' }}>B. Health-Related Information</p>
                    <ul>
                        <li>Medicine search queries</li>
                        <li>Prescription uploads (if provided by users)</li>
                    </ul>
                    <p style={{ marginTop: '0.5rem', fontStyle: 'italic', color: '#64748b' }}>Health-related information may be treated as Sensitive Personal Data under applicable Indian laws.</p>

                    <p style={{ fontWeight: 600, marginTop: '1rem', marginBottom: '0.5rem', color: '#1e293b' }}>C. Technical Information</p>
                    <ul>
                        <li>Device information</li>
                        <li>IP address</li>
                        <li>Browser type</li>
                        <li>Log data</li>
                        <li>Usage analytics</li>
                    </ul>
                </>
            )
        },
        {
            title: "3. How We Use Information",
            content: (
                <>
                    <p style={{ marginBottom: '0.5rem' }}>We use collected information to:</p>
                    <ul>
                        <li>Facilitate medicine availability enquiries</li>
                        <li>Connect users with nearby pharmacies</li>
                        <li>Improve platform performance</li>
                        <li>Maintain security and prevent misuse</li>
                        <li>Comply with legal obligations</li>
                    </ul>
                    <p style={{ marginTop: '1rem', fontWeight: 500 }}>We do not sell or trade personal data.</p>
                </>
            )
        },
        {
            title: "4. Sharing of Information",
            content: (
                <>
                    <p style={{ marginBottom: '0.5rem' }}>Information may be shared:</p>
                    <ul>
                        <li>With licensed pharmacies to respond to user enquiries</li>
                        <li>With trusted service providers (hosting, authentication, analytics)</li>
                        <li>If required by law, regulation, or legal process</li>
                    </ul>
                    <p style={{ marginTop: '1rem', fontWeight: 500 }}>We do not share data for advertising resale purposes.</p>
                </>
            )
        },
        {
            title: "5. Data Security",
            content: (
                <>
                    <p style={{ marginBottom: '0.5rem' }}>We implement reasonable security measures including:</p>
                    <ul>
                        <li>Encrypted data transmission (HTTPS/SSL)</li>
                        <li>Secure authentication systems</li>
                        <li>Restricted internal access controls</li>
                        <li>Industry-standard security practices</li>
                    </ul>
                    <p style={{ marginTop: '1rem' }}>However, no system can guarantee absolute security.</p>
                </>
            )
        },
        {
            title: "6. Sensitive Personal Data & Consent",
            content: (
                <>
                    <p>Prescription information and health-related queries may qualify as Sensitive Personal Data under Indian law.</p>
                    <p>By providing such information, users give explicit consent for its processing solely for facilitating pharmacy responses.</p>
                </>
            )
        },
        {
            title: "7. Data Retention",
            content: (
                <>
                    <p style={{ marginBottom: '0.5rem' }}>We retain data only for as long as necessary to:</p>
                    <ul>
                        <li>Provide platform services</li>
                        <li>Comply with legal obligations</li>
                        <li>Resolve disputes</li>
                    </ul>
                    <p style={{ marginTop: '1rem' }}>Users may request deletion of their data, subject to applicable legal requirements.</p>
                </>
            )
        },
        {
            title: "8. User Rights",
            content: (
                <>
                    <p style={{ marginBottom: '0.5rem' }}>Users may request:</p>
                    <ul>
                        <li>Access to their personal data</li>
                        <li>Correction of inaccurate information</li>
                        <li>Deletion of personal data</li>
                    </ul>
                    <p style={{ marginTop: '1rem' }}>Requests may be sent to: <a href="mailto:hello@localpill.com" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 500 }}>hello@localpill.com</a></p>
                </>
            )
        },
        {
            title: "9. Third-Party Services",
            content: (
                <>
                    <p style={{ marginBottom: '0.5rem' }}>LocalPill may use third-party services such as:</p>
                    <ul>
                        <li>Cloud hosting providers</li>
                        <li>Authentication services</li>
                        <li>Analytics platforms</li>
                    </ul>
                    <p style={{ marginTop: '1rem' }}>These providers are required to maintain reasonable security safeguards.</p>
                </>
            )
        },
        {
            title: "10. Cookies & Tracking",
            content: (
                <>
                    <p style={{ marginBottom: '0.5rem' }}>We may use cookies and similar technologies to:</p>
                    <ul>
                        <li>Maintain login sessions</li>
                        <li>Improve user experience</li>
                        <li>Analyze usage patterns</li>
                    </ul>
                    <p style={{ marginTop: '1rem' }}>Users may manage cookie preferences through browser settings.</p>
                </>
            )
        },
        {
            title: "11. Children’s Privacy",
            content: (
                <>
                    <p>LocalPill is not intended for use by individuals under 18 years of age without parental supervision.</p>
                </>
            )
        },
        {
            title: "12. Regulatory Compliance",
            content: (
                <>
                    <p style={{ marginBottom: '0.5rem' }}>This Privacy Policy is prepared in accordance with:</p>
                    <ul>
                        <li>Information Technology Act, 2000</li>
                        <li>Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011</li>
                    </ul>
                </>
            )
        },
        {
            title: "13. Updates to Privacy Policy",
            content: (
                <>
                    <p>We may update this Privacy Policy periodically. Updated versions will be posted with a revised date.</p>
                </>
            )
        },
        {
            title: "14. Contact Information",
            content: (
                <>
                    <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <p style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.5rem' }}>For privacy-related inquiries:</p>
                        <p style={{ marginBottom: '1.5rem' }}>Email: <a href="mailto:hello@localpill.com" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 500 }}>hello@localpill.com</a></p>

                        <p style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.5rem' }}>For grievances:</p>
                        <p>Email: <a href="mailto:hello@localpill.com" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 500 }}>hello@localpill.com</a></p>
                    </div>
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
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.1em', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '1rem' }}>Policies & Agreements</div>
                    <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 3.5rem)', fontWeight: 800, color: 'white', marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>Privacy Policy</h1>
                    <p style={{ color: '#94a3b8', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
                        How UpcharMitra Healthtech Pvt. Ltd. collects, uses, and protects your information on LocalPill.
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
                                onMouseEnter={e => { e.currentTarget.style.color = '#16A34A'; e.currentTarget.style.transform = 'translateX(4px)'; e.currentTarget.style.fontWeight = '600'; }}
                                onMouseLeave={e => { e.currentTarget.style.color = '#475569'; e.currentTarget.style.transform = 'translateX(0)'; e.currentTarget.style.fontWeight = '400'; }}
                            >
                                {section.title}
                            </a>
                        ))}
                    </div>
                </div>

                {/* Main Content */}
                <div style={{ flexGrow: 1, background: 'white', padding: isMobile ? '2rem 1.5rem' : '4rem', borderRadius: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', border: '1px solid #e2e8f0', width: '100%', boxSizing: 'border-box' }}>

                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '2rem', marginBottom: '3rem', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '1rem' : '0', alignItems: isMobile ? 'flex-start' : 'center' }}>
                        <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ color: '#3b82f6' }}>📅</span> Last Updated: February 26, 2026
                        </div>
                        <div style={{ background: '#f1f5f9', padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, color: '#475569', letterSpacing: '0.05em' }}>v1.0</div>
                    </div>

                    <div style={{ color: '#334155', fontSize: '1.1rem', lineHeight: 1.8, marginBottom: '4rem', padding: '2rem', background: '#f8fafc', borderRadius: '16px', borderLeft: '4px solid #22c55e' }}>
                        <p style={{ marginBottom: '1rem', fontWeight: 500 }}>This Privacy Policy describes how UpcharMitra Healthtech Pvt. Ltd. (“Company”, “we”, “our”, “us”) collects, uses, and protects information when you use the LocalPill platform.</p>
                        <p style={{ margin: 0 }}>By accessing or using LocalPill, you consent to the practices described in this Privacy Policy.</p>
                    </div>

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
                © 2026 UpcharMitra Healthtech Pvt. Ltd. All Rights Reserved.
            </div>

            <style>{`
                html { scroll-behavior: smooth; }
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
                    content: "•";
                    color: #22c55e;
                    font-weight: bold;
                    position: absolute;
                    left: 0;
                    top: 0;
                }
                .legal-content p {
                    margin-bottom: 1.5rem;
                }
                .legal-content p:last-child {
                    margin-bottom: 0;
                }
            `}</style>
        </div>
    );
}
