import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useWindowWidth from './hooks/useWindowWidth';

export default function Disclaimer() {
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
                    <p>LocalPill is a technology-based healthcare discovery platform designed to help users discover the availability of medicines at nearby licensed pharmacies.</p>
                    <p>LocalPill acts solely as an intermediary that facilitates communication between users and independent pharmacies.</p>
                </>
            )
        },
        {
            title: "2. No Sale or Dispensing of Medicines",
            content: (
                <>
                    <p style={{ marginBottom: '0.5rem' }}>LocalPill does NOT:</p>
                    <ul>
                        <li>Sell medicines</li>
                        <li>Stock medicines</li>
                        <li>Distribute medicines</li>
                        <li>Dispense medicines</li>
                        <li>Deliver medicines</li>
                        <li>Provide prescription services</li>
                    </ul>
                    <p style={{ marginTop: '0.5rem' }}>All medicines are sold and dispensed directly by independent licensed pharmacies in accordance with applicable laws.</p>
                </>
            )
        },
        {
            title: "3. No Medical Advice",
            content: (
                <>
                    <p>LocalPill does not provide medical advice, diagnosis, treatment recommendations, or prescription services.</p>
                    <p>Users should consult qualified healthcare professionals before consuming any medication.</p>
                </>
            )
        },
        {
            title: "4. Pharmacy Responsibility",
            content: (
                <>
                    <p style={{ marginBottom: '0.5rem' }}>All pharmacies listed on LocalPill are independent entities solely responsible for:</p>
                    <ul>
                        <li>Compliance with drug licensing regulations</li>
                        <li>Medicine quality and authenticity</li>
                        <li>Pricing and billing</li>
                        <li>Prescription verification</li>
                        <li>Regulatory compliance</li>
                    </ul>
                    <p style={{ marginTop: '0.5rem' }}>LocalPill does not control or supervise pharmacy operations.</p>
                </>
            )
        },
        {
            title: "5. Intermediary Status",
            content: (
                <>
                    <p>LocalPill operates as an intermediary under the Information Technology Act, 2000 and applicable rules.</p>
                    <p>The platform’s role is limited to facilitating communication and information exchange between users and pharmacies without participating in medicine transactions.</p>
                </>
            )
        },
        {
            title: "6. No Transaction Liability",
            content: (
                <>
                    <p style={{ marginBottom: '0.5rem' }}>LocalPill is not a party to any transaction between users and pharmacies and shall not be liable for:</p>
                    <ul>
                        <li>Medicine availability</li>
                        <li>Pricing disputes</li>
                        <li>Delivery arrangements</li>
                        <li>Quality or effectiveness of medicines</li>
                        <li>Pharmacy conduct or services</li>
                    </ul>
                </>
            )
        },
        {
            title: "7. User Responsibility",
            content: (
                <>
                    <p style={{ marginBottom: '0.5rem' }}>Users are responsible for:</p>
                    <ul>
                        <li>Providing accurate information</li>
                        <li>Uploading valid prescriptions where required</li>
                        <li>Verifying pharmacy details before transaction</li>
                        <li>Using medicines only as prescribed</li>
                    </ul>
                </>
            )
        },
        {
            title: "8. Limitation of Liability",
            content: (
                <>
                    <p style={{ marginBottom: '0.5rem' }}>To the maximum extent permitted by law, LocalPill shall not be liable for any direct, indirect, incidental, or consequential damages arising from:</p>
                    <ul>
                        <li>Use of the platform</li>
                        <li>Pharmacy actions</li>
                        <li>Medicine usage outcomes</li>
                        <li>Data transmission issues</li>
                    </ul>
                </>
            )
        },
        {
            title: "9. Regulatory Compliance Position",
            content: (
                <>
                    <p>LocalPill operates strictly as a discovery and enquiry routing platform and does not engage in activities that constitute online sale, distribution, or delivery of medicines.</p>
                </>
            )
        },
        {
            title: "10. Updates to Disclaimer",
            content: (
                <>
                    <p>LocalPill reserves the right to update this disclaimer at any time to comply with regulatory requirements or platform changes.</p>
                </>
            )
        },
        {
            title: "11. Contact Information",
            content: (
                <>
                    <p>For legal or compliance inquiries:</p>
                    <p style={{ fontWeight: 600, color: '#0f172a' }}>Email: <a href="mailto:hello@localpill.com" style={{ color: '#3b82f6', textDecoration: 'none' }}>hello@localpill.com</a></p>
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
                    <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 3.5rem)', fontWeight: 800, color: 'white', marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>Legal Disclaimer</h1>
                    <p style={{ color: '#94a3b8', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
                        Important information regarding the nature of our platform and our role as a technology intermediary.
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
                <div style={{ flexGrow: 1, background: 'white', padding: isMobile ? '2rem 1.5rem' : '4rem', borderRadius: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', border: '1px solid #e2e8f0', width: '100%', boxSizing: 'border-box' }}>

                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '2rem', marginBottom: '3rem', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '1rem' : '0', alignItems: isMobile ? 'flex-start' : 'center' }}>
                        <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ color: '#3b82f6' }}>📅</span> Last Updated: February 26, 2026
                        </div>
                        <div style={{ background: '#f1f5f9', padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, color: '#475569', letterSpacing: '0.05em' }}>v1.0</div>
                    </div>

                    <div style={{ color: '#334155', fontSize: '1.1rem', lineHeight: 1.8, marginBottom: '4rem', padding: '2rem', background: '#f8fafc', borderRadius: '16px', borderLeft: '4px solid #3b82f6' }}>
                        <p style={{ marginBottom: '1rem', fontWeight: 500 }}>This Legal Disclaimer governs the use of the LocalPill platform operated by UpcharMitra Healthtech Pvt. Ltd. (“Company”, “we”, “our”, “us”).</p>
                        <p style={{ margin: 0 }}>By accessing or using LocalPill, you acknowledge and agree to the terms outlined in this disclaimer.</p>
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
                    color: #3b82f6;
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
