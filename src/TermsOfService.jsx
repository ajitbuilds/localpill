import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useWindowWidth from './hooks/useWindowWidth';

export default function TermsOfService() {
    const navigate = useNavigate();
    const isMobile = useWindowWidth() < 768;

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const sections = [
        {
            title: "1. Platform Description",
            content: (
                <>
                    <p>LocalPill is a technology-based healthcare discovery platform that enables users to discover medicine availability at nearby licensed pharmacies.</p>
                    <p>LocalPill acts solely as an intermediary facilitating communication between users and independent pharmacies.</p>
                    <p style={{ fontWeight: 500 }}>LocalPill does not sell, stock, dispense, or deliver medicines.</p>
                </>
            )
        },
        {
            title: "2. Eligibility",
            content: (
                <>
                    <p style={{ marginBottom: '0.5rem' }}>To use LocalPill, you must:</p>
                    <ul>
                        <li>Be at least 18 years old</li>
                        <li>Provide accurate information</li>
                        <li>Be legally capable of entering a binding agreement</li>
                    </ul>
                </>
            )
        },
        {
            title: "3. User Responsibilities",
            content: (
                <>
                    <p style={{ marginBottom: '0.5rem' }}>Users agree to:</p>
                    <ul>
                        <li>Provide accurate and truthful information</li>
                        <li>Upload valid prescriptions where required</li>
                        <li>Use the platform only for lawful purposes</li>
                        <li>Not misuse or disrupt platform services</li>
                    </ul>
                    <p style={{ marginTop: '1rem', fontWeight: 500 }}>Users are solely responsible for verifying pharmacy details before purchasing medicines.</p>
                </>
            )
        },
        {
            title: "4. Independent Pharmacy Services",
            content: (
                <>
                    <p style={{ marginBottom: '0.5rem' }}>Pharmacies listed on LocalPill are independent entities.</p>
                    <p style={{ marginBottom: '0.5rem' }}>They are solely responsible for:</p>
                    <ul>
                        <li>Drug licensing compliance</li>
                        <li>Medicine authenticity and quality</li>
                        <li>Pricing and billing</li>
                        <li>Prescription verification</li>
                        <li>Regulatory obligations</li>
                    </ul>
                    <p style={{ marginTop: '1rem', fontWeight: 500 }}>LocalPill does not control pharmacy operations.</p>
                </>
            )
        },
        {
            title: "5. No Medical Advice",
            content: (
                <>
                    <p>LocalPill does not provide medical advice, diagnosis, or treatment recommendations.</p>
                    <p>Users must consult qualified healthcare professionals before consuming any medication.</p>
                </>
            )
        },
        {
            title: "6. Intermediary Status",
            content: (
                <>
                    <p>LocalPill operates as an intermediary under the Information Technology Act, 2000.</p>
                    <p>The platform only facilitates communication and does not participate in transactions between users and pharmacies.</p>
                </>
            )
        },
        {
            title: "7. No Transaction Liability",
            content: (
                <>
                    <p style={{ marginBottom: '0.5rem' }}>LocalPill is not a party to any transaction between users and pharmacies.</p>
                    <p style={{ marginBottom: '0.5rem' }}>LocalPill shall not be liable for:</p>
                    <ul>
                        <li>Medicine availability</li>
                        <li>Pricing disputes</li>
                        <li>Delivery arrangements</li>
                        <li>Pharmacy conduct</li>
                        <li>Quality of medicines</li>
                    </ul>
                </>
            )
        },
        {
            title: "8. User Accounts & Security",
            content: (
                <>
                    <p>Users are responsible for maintaining the confidentiality of their login credentials.</p>
                    <p>LocalPill is not liable for unauthorized access caused by user negligence.</p>
                </>
            )
        },
        {
            title: "9. Prohibited Activities",
            content: (
                <>
                    <p style={{ marginBottom: '0.5rem' }}>Users shall not:</p>
                    <ul>
                        <li>Upload false prescriptions</li>
                        <li>Attempt fraud or misuse</li>
                        <li>Use automated scraping tools</li>
                        <li>Violate applicable laws</li>
                    </ul>
                    <p style={{ marginTop: '1rem' }}>LocalPill may suspend accounts for violations.</p>
                </>
            )
        },
        {
            title: "10. Intellectual Property",
            content: (
                <>
                    <p>All platform content, branding, logos, and technology are owned by UpcharMitra Healthtech Pvt. Ltd.</p>
                    <p>Unauthorized copying or reproduction is prohibited.</p>
                </>
            )
        },
        {
            title: "11. Limitation of Liability",
            content: (
                <>
                    <p style={{ marginBottom: '0.5rem' }}>To the maximum extent permitted by law, LocalPill shall not be liable for:</p>
                    <ul>
                        <li>Direct or indirect damages</li>
                        <li>Data loss</li>
                        <li>Service interruptions</li>
                        <li>Third-party actions</li>
                    </ul>
                    <p style={{ marginTop: '1rem', fontWeight: 500 }}>Use of the platform is at the user’s own risk.</p>
                </>
            )
        },
        {
            title: "12. Indemnification",
            content: (
                <>
                    <p style={{ marginBottom: '0.5rem' }}>Users agree to indemnify and hold harmless LocalPill from any claims arising due to:</p>
                    <ul>
                        <li>Misuse of the platform</li>
                        <li>Violation of laws</li>
                        <li>False information provided</li>
                    </ul>
                </>
            )
        },
        {
            title: "13. Service Availability",
            content: (
                <>
                    <p>LocalPill does not guarantee uninterrupted service and may modify or suspend platform features without notice.</p>
                </>
            )
        },
        {
            title: "14. Regulatory Position",
            content: (
                <>
                    <p>LocalPill operates strictly as a discovery and enquiry routing platform and does not engage in online sale or distribution of medicines.</p>
                </>
            )
        },
        {
            title: "15. Termination",
            content: (
                <>
                    <p>LocalPill may suspend or terminate user access for violations of these Terms.</p>
                </>
            )
        },
        {
            title: "16. Governing Law",
            content: (
                <>
                    <p>These Terms shall be governed by the laws of India.</p>
                    <p style={{ fontWeight: 500 }}>Jurisdiction: Courts of Patna, Bihar shall have exclusive jurisdiction.</p>
                </>
            )
        },
        {
            title: "17. Changes to Terms",
            content: (
                <>
                    <p>LocalPill may update these Terms periodically. Continued use of the platform constitutes acceptance of revised Terms.</p>
                </>
            )
        },
        {
            title: "18. Contact Information",
            content: (
                <>
                    <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <p style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.5rem' }}>For legal inquiries, support, or grievances:</p>
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
                    <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 3.5rem)', fontWeight: 800, color: 'white', marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>Terms of Service</h1>
                    <p style={{ color: '#94a3b8', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
                        These Terms govern your access to and use of the LocalPill platform.
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
                        <p style={{ marginBottom: '1rem', fontWeight: 500 }}>These Terms of Service (“Terms”) govern your access to and use of the LocalPill platform operated by UpcharMitra Healthtech Pvt. Ltd. (“Company”, “we”, “our”, “us”).</p>
                        <p style={{ margin: 0 }}>By using LocalPill, you agree to these Terms. If you do not agree, please do not use the platform.</p>
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
