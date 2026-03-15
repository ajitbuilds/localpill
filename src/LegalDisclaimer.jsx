import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useWindowWidth from './hooks/useWindowWidth';

export default function LegalDisclaimer() {
    const navigate = useNavigate();
    const isMobile = useWindowWidth() < 768;

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>

            {/* Premium Hero Banner */}
            <div style={{ background: '#0f172a', padding: '4rem 2rem', color: 'white', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.1, background: 'radial-gradient(circle at center, #3b82f6 0%, transparent 70%)' }}></div>
                <div style={{ position: 'relative', maxWidth: '800px', margin: '0 auto', zIndex: 1 }}>
                    <button className="btn-dynamic"
                        onClick={() => navigate('/')}
                        style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', fontWeight: 600, cursor: 'pointer', marginBottom: '2rem', fontSize: '0.9rem', padding: '0.5rem 1rem', borderRadius: '20px', transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    >
                        &larr; Back to LocalPill Home
                    </button>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.1em', color: '#3b82f6', textTransform: 'uppercase', marginBottom: '1rem' }}>LocalPill Legal</div>
                    <h1 style={{ fontSize: '3rem', fontWeight: 800, color: 'white', marginBottom: '1rem', letterSpacing: '-0.02em' }}>Trust & Safety Center</h1>
                    <p style={{ color: '#94a3b8', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
                        Clear, straightforward policies that explain how LocalPill operates as a discovery platform and protects your data.
                    </p>
                </div>
            </div>

            <div style={{ maxWidth: '1000px', margin: '-3rem auto 4rem auto', padding: isMobile ? '0 1rem' : '0 2rem', position: 'relative', zIndex: 10 }}>
                <style>{`
                    @keyframes sectionFadeUp {
                        from { opacity: 0; transform: translateY(20px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    .section-anim {
                        animation: sectionFadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
                    }
                `}</style>
                <div style={{ background: 'white', padding: isMobile ? '2.5rem 1.5rem' : '3rem 4rem', borderRadius: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}>

                    {/* Date Updated */}
                    <div className="section-anim" style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, borderBottom: '1px solid #e2e8f0', paddingBottom: '1.5rem', marginBottom: '3rem', animationDelay: '0.1s' }}>
                        Last Updated: October 15, 2026
                    </div>

                    {/* Important Red Box */}
                    <div className="section-anim" style={{ marginBottom: '4rem', padding: '2.5rem', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(244, 63, 94, 0.1)', animationDelay: '0.2s' }}>
                        <h2 style={{ fontSize: isMobile ? '1.2rem' : '1.5rem', fontWeight: 800, color: '#e11d48', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ display: 'flex' }}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg></span> Important Legal Disclaimer
                        </h2>
                        <p style={{ color: '#4c0519', lineHeight: 1.6, marginBottom: '1.5rem', fontSize: '1.05rem' }}>
                            LocalPill is a technology platform that enables users to send medicine availability enquiries to independent licensed pharmacies.
                        </p>

                        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #ffe4e6', marginBottom: '1.5rem' }}>
                            <p style={{ fontWeight: 700, color: '#881337', marginBottom: '1rem', textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '0.05em' }}>LocalPill explicitly does not:</p>
                            <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                {[
                                    'Sell medicines',
                                    'Stock medicines',
                                    'Dispense medicines',
                                    'Provide medical advice',
                                    'Operate as an e-pharmacy'
                                ].map((item, i) => (
                                    <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#9f1239', fontWeight: 600 }}>
                                        <span style={{ color: '#f43f5e' }}>✖</span> {item}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <p style={{ color: '#4c0519', lineHeight: 1.6, marginBottom: '1rem', fontSize: '0.95rem' }}>
                            All medicine sales, billing, and regulatory compliance responsibilities remain solely with the respective pharmacies handling the request.
                        </p>
                        <p style={{ fontStyle: 'italic', color: '#9f1239', fontWeight: 600, fontSize: '0.95rem' }}>
                            Users are advised to consult qualified healthcare professionals before consuming any medication.
                        </p>
                    </div>

                    {/* NEW SECTION: How We Verify Pharmacies */}
                    <div className="section-anim" style={{ marginBottom: '5rem', animationDelay: '0.3s' }}>
                        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                            <div style={{ color: '#10b981', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Quality Assurance</div>
                            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>How We Verify Pharmacies</h2>
                            <p style={{ color: '#64748b', fontSize: '1.05rem', marginTop: '0.5rem' }}>
                                We ensure every chemist on our network is a real, registered local business. Zero dark stores.
                            </p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>

                            {/* Step 1 */}
                            <div style={{ background: '#f8fafc', padding: '2rem', borderRadius: '16px', border: '1px solid #e2e8f0', textAlign: 'center', position: 'relative' }}>
                                <div style={{ width: '40px', height: '40px', background: '#3b82f6', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem', position: 'absolute', top: '-15px', left: '50%', transform: 'translateX(-50%)', border: '4px solid white' }}>1</div>
                                <div style={{ marginBottom: '1rem', marginTop: '1rem', display: 'flex', justifyContent: 'center', color: '#475569' }}>
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
                                </div>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.8rem' }}>Drug License Check</h3>
                                <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.5 }}>Pharmacies must provide a valid Form 20 or Form 21 retail drug license issued by the State Pharmacy Council.</p>
                            </div>

                            {/* Step 2 */}
                            <div style={{ background: '#f8fafc', padding: '2rem', borderRadius: '16px', border: '1px solid #e2e8f0', textAlign: 'center', position: 'relative' }}>
                                <div style={{ width: '40px', height: '40px', background: '#3b82f6', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem', position: 'absolute', top: '-15px', left: '50%', transform: 'translateX(-50%)', border: '4px solid white' }}>2</div>
                                <div style={{ marginBottom: '1rem', marginTop: '1rem', display: 'flex', justifyContent: 'center', color: '#475569' }}>
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18" /><path d="M4 17V9" /><path d="M8 17V9" /><path d="M12 17V9" /><path d="M16 17V9" /><path d="M20 17V9" /><path d="M2 9h20L12 2Z" /></svg>
                                </div>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.8rem' }}>GST Verification</h3>
                                <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.5 }}>We verify the GSTIN to ensure the pharmacy operates as a legitimate taxpayer and physical tax-paying entity.</p>
                            </div>

                            {/* Step 3 */}
                            <div style={{ background: '#f8fafc', padding: '2rem', borderRadius: '16px', border: '1px solid #e2e8f0', textAlign: 'center', position: 'relative' }}>
                                <div style={{ width: '40px', height: '40px', background: '#10b981', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem', position: 'absolute', top: '-15px', left: '50%', transform: 'translateX(-50%)', border: '4px solid white' }}>3</div>
                                <div style={{ marginBottom: '1rem', marginTop: '1rem', display: 'flex', justifyContent: 'center', color: '#10b981' }}>
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                </div>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.8rem' }}>Network Activation</h3>
                                <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.5 }}>Only after manual verification is the pharmacy profile activated to receive local availability enquiries.</p>
                            </div>

                        </div>
                    </div>

                    {/* Standard Text Sections */}
                    <div className="section-anim" style={{ marginBottom: '4rem', padding: '2rem', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0', animationDelay: '0.4s' }}>
                        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>Intermediary Status Declaration</h2>
                        <p style={{ color: '#475569', lineHeight: 1.8, fontSize: '1.05rem' }}>
                            LocalPill operates strictly as an intermediary under the Information Technology Act, 2000, facilitating communication between users and licensed pharmacies without participating in the transaction of goods.
                        </p>
                        <p style={{ color: '#475569', lineHeight: 1.8, fontSize: '1.05rem', marginTop: '1rem' }}>
                            The platform claims safe harbour protection under Section 79 of the Information Technology Act, 2000. Information provided on the platform regarding medicine availability is supplied directly by independent pharmacies and is not independently verified by LocalPill.
                        </p>
                    </div>

                    <div className="section-anim" style={{ marginBottom: '3rem', animationDelay: '0.5s' }}>
                        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>Grievance Officer</h2>
                        <p style={{ color: '#475569', lineHeight: 1.8, fontSize: '1.05rem', marginBottom: '2rem' }}>
                            In accordance with the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, and subsequent amendments, the name and contact details of the Grievance Officer are provided below:
                        </p>

                        <div style={{ background: '#f1f5f9', padding: '2rem', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Officer Name</span>
                                <span style={{ fontSize: '1.1rem', color: '#0f172a', fontWeight: 700 }}>Compliance Officer, LocalPill</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Address</span>
                                <span style={{ fontSize: '1.1rem', color: '#3b82f6', fontWeight: 600 }}>hello@localpill.com</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Response Timeline</span>
                                <span style={{ fontSize: '1.1rem', color: '#10b981', fontWeight: 600 }}>Within 15 working days</span>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Footer outside the card */}
                <div style={{ marginTop: '2rem', fontSize: '0.9rem', color: '#64748b', textAlign: 'center', fontWeight: 500 }}>
                    © 2026 UpcharMitra Healthtech Pvt. Ltd. All Rights Reserved.<br />
                    <span style={{ fontSize: '0.8rem', marginTop: '0.5rem', display: 'block' }}>Designed and built with transparency in India.</span>
                </div>
            </div>
        </div>
    );
}
