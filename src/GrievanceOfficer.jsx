import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useWindowWidth from './hooks/useWindowWidth';

export default function GrievanceOfficer() {
    const navigate = useNavigate();
    const isMobile = useWindowWidth() < 768;

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const sections = [
        {
            title: "1. Grievance Officer Details",
            content: (
                <>
                    <p style={{ marginBottom: '0.5rem' }}>In accordance with the provisions of the Information Technology Act, 2000 and the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, LocalPill has appointed a Grievance Officer to address user complaints and concerns.</p>

                    <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '1.5rem' }}>
                        <p style={{ margin: '0 0 0.5rem 0' }}><span style={{ fontWeight: 600, color: '#0f172a' }}>Designation:</span> Grievance Officer</p>
                        <p style={{ margin: '0 0 0.5rem 0' }}><span style={{ fontWeight: 600, color: '#0f172a' }}>Organization:</span> UpcharMitra Healthtech Pvt. Ltd.</p>
                        <p style={{ margin: '0 0 0.5rem 0' }}><span style={{ fontWeight: 600, color: '#0f172a' }}>Platform:</span> LocalPill</p>
                        <p style={{ margin: '0' }}><span style={{ fontWeight: 600, color: '#0f172a' }}>Email:</span> <a href="mailto:hello@localpill.com" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 500 }}>hello@localpill.com</a></p>
                    </div>
                </>
            )
        },
        {
            title: "2. Purpose of the Grievance Mechanism",
            content: (
                <>
                    <p style={{ marginBottom: '0.5rem' }}>Users may contact the Grievance Officer for issues relating to:</p>
                    <ul>
                        <li>Platform usage concerns</li>
                        <li>Privacy or data protection complaints</li>
                        <li>Unauthorized account access</li>
                        <li>Incorrect or misleading information</li>
                        <li>Content-related complaints</li>
                        <li>Legal or regulatory compliance concerns</li>
                    </ul>
                </>
            )
        },
        {
            title: "3. Complaint Submission Process",
            content: (
                <>
                    <p style={{ marginBottom: '0.5rem' }}>To file a grievance, users should send an email including:</p>
                    <ul>
                        <li>Full name</li>
                        <li>Contact details</li>
                        <li>Description of the issue</li>
                        <li>Relevant supporting information (if any)</li>
                    </ul>
                    <p style={{ marginTop: '1rem', fontStyle: 'italic', color: '#64748b' }}>Incomplete complaints may require additional clarification before processing.</p>
                </>
            )
        },
        {
            title: "4. Resolution Timeline",
            content: (
                <>
                    <p>The Grievance Officer shall acknowledge complaints within a reasonable time and endeavor to resolve them within <span style={{ fontWeight: 600, color: '#334155' }}>15 working days</span> from the date of receipt, in accordance with applicable law.</p>
                </>
            )
        },
        {
            title: "5. Commitment to Compliance",
            content: (
                <>
                    <p>LocalPill is committed to maintaining transparency, accountability, and compliance with applicable Indian laws governing intermediary platforms.</p>
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
                    <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 3.5rem)', fontWeight: 800, color: 'white', marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>Grievance Officer</h1>
                    <p style={{ color: '#94a3b8', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
                        Contact details and procedures for addressing user complaints and platform concerns.
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
