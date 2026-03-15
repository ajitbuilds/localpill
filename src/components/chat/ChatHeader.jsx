import React from 'react';

const typingDotsStyle = `
    @keyframes typingBounce {
        0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
        30% { transform: translateY(-5px); opacity: 1; }
    }
    .typing-dot { display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: #4ADE80; margin: 0 1.5px; animation: typingBounce 1.2s infinite; }
    .typing-dot:nth-child(2) { animation-delay: 0.2s; }
    .typing-dot:nth-child(3) { animation-delay: 0.4s; }
`;

const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
};

export const ChatHeader = React.memo(({
    onBack, isPharmacy, resolvedChatTitle, partnerStatus, isPartnerTyping,
    handleRequestPrescription, sharedPhoneNumber, handleRequestCall,
    handleCompleteRequest, patientData, pharmacyData
}) => {
    return (
        <div className="chat-header">
            <style>{typingDotsStyle}</style>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                {/* Back button */}
                <button className="btn-dynamic"
                    onClick={onBack}
                    style={{
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: '#fff',
                        width: '36px', height: '36px',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.1rem', flexShrink: 0,
                        WebkitTapHighlightColor: 'transparent'
                    }}
                ><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg></button>

                {/* Avatar */}
                <div style={{
                    width: '40px', height: '40px', borderRadius: '50%',
                    background: isPharmacy
                        ? 'linear-gradient(135deg, #3B82F6, #1D4ED8)'
                        : 'linear-gradient(135deg, #22C55E, #15803D)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 700, fontSize: '0.85rem',
                    flexShrink: 0, position: 'relative',
                    border: '2px solid rgba(255,255,255,0.2)'
                }}>
                    {getInitials(resolvedChatTitle)}
                    {partnerStatus.online && (
                        <>
                            {/* Pulsing ring exactly same size/position as dot to remain concentric */}
                            <span style={{
                                position: 'absolute', bottom: '1px', right: '1px',
                                width: '14px', height: '14px',
                                borderRadius: '50%',
                                background: 'rgba(74,222,128,0.4)',
                                animation: 'onlinePing 2s cubic-bezier(0, 0, 0.2, 1) infinite',
                                zIndex: 1
                            }} />
                            {/* Solid dot */}
                            <span style={{
                                position: 'absolute', bottom: '1px', right: '1px',
                                width: '10px', height: '10px', /* plus 2px border = 14px total */
                                background: '#4ADE80',
                                borderRadius: '50%',
                                border: '2px solid #111827',
                                zIndex: 2
                            }} />
                            <style>{`
                                @keyframes onlinePing {
                                    0%   { transform: scale(1);   opacity: 0.8; }
                                    75%  { transform: scale(2.4); opacity: 0; }
                                    100% { transform: scale(2.4); opacity: 0; }
                                }
                            `}</style>
                        </>
                    )}
                </div>

                {/* Name + status */}
                <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{
                        color: '#fff', fontWeight: 700,
                        fontSize: '0.9375rem', lineHeight: 1.2,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        maxWidth: 'min(160px, 35vw)'
                    }}>
                        {resolvedChatTitle}
                    </div>
                    <div style={{
                        fontSize: '0.72rem',
                        color: partnerStatus.online ? '#4ADE80' : 'rgba(255,255,255,0.65)',
                        fontWeight: 500, marginTop: '2px', lineHeight: 1
                    }}>
                        {isPartnerTyping
                            ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}><span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /></span>
                            : partnerStatus.online
                                ? 'Online'
                                : partnerStatus.lastSeen
                                    ? `Last seen ${formatTime(partnerStatus.lastSeen)}`
                                    : 'Offline'}
                    </div>
                </div>
            </div>

            {/* Right actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                {/* ── Pharmacy side actions ── */}
                {isPharmacy && (
                    <button className="btn-dynamic"
                        onClick={handleRequestPrescription}
                        style={{
                            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                            color: '#fff', padding: '0.45rem 0.75rem', borderRadius: '20px',
                            fontWeight: '600', fontSize: '0.78rem', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap'
                        }}
                        title="Request Prescription"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg> Rx
                    </button>
                )}

                {/* Pharmacy: Call Now (after phone shared) or Request Call */}
                {isPharmacy && sharedPhoneNumber && (
                    <a
                        href={`tel:${sharedPhoneNumber}`}
                        style={{
                            background: '#22C55E', color: '#fff', padding: '0.45rem 0.75rem',
                            borderRadius: '20px', fontWeight: '600', fontSize: '0.78rem',
                            textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px'
                        }}
                        title="Call Patient"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.99 9.99a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.9 1.1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 8.79a16 16 0 0 0 6.13 6.13l1.01-1.01a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.03z" /></svg> Call Now
                    </a>
                )}

                {isPharmacy && !sharedPhoneNumber && (
                    <button className="btn-dynamic"
                        onClick={handleRequestCall}
                        style={{
                            background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)',
                            color: '#60A5FA', padding: '0.45rem 0.75rem', borderRadius: '20px',
                            fontWeight: '600', fontSize: '0.78rem', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap'
                        }}
                        title="Request Call"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.99 9.99a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.9 1.1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 8.79a16 16 0 0 0 6.13 6.13l1.01-1.01a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.03z" /></svg> Call
                    </button>
                )}

                {/* ── User (customer) side actions ── */}

                {/* BUG FIX #1: Found button
                    Previously: required patientData to be loaded AND status to be exactly pending/matched
                    Fixed: show for pending/matched/undefined status (covers loading state too).
                    Hide only when request is explicitly closed/cancelled. */}
                {!isPharmacy && patientData?.status !== 'closed' && patientData?.status !== 'cancelled' && (
                    <button className="btn-dynamic btn-header-action"
                        onClick={handleCompleteRequest}
                        style={{
                            background: 'rgba(34,197,94,0.85)',
                            color: 'white', border: 'none',
                            padding: '0.45rem 0.75rem',
                            borderRadius: '20px', fontWeight: '600',
                            fontSize: '0.78rem', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '3px',
                            WebkitTapHighlightColor: 'transparent',
                            whiteSpace: 'nowrap'
                        }}
                        title="Mark medicine as found"
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg> Found
                    </button>
                )}

                {/* BUG FIX #2: Navigation button
                    Previously: hidden if pharmacyData.location was null/missing
                    Fixed: always show navigation button. Use lat/lng if available, else fall back to name search. */}
                {!isPharmacy && (pharmacyData || resolvedChatTitle) && (
                    <a
                        href={
                            pharmacyData?.location?.latitude
                                ? `https://www.google.com/maps/dir/?api=1&destination=${pharmacyData.location.latitude},${pharmacyData.location.longitude}`
                                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(resolvedChatTitle || 'pharmacy')}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            background: 'rgba(59,130,246,0.15)',
                            border: '1px solid rgba(59,130,246,0.3)',
                            color: '#60A5FA',
                            padding: '0.45rem 0.75rem',
                            borderRadius: '20px',
                            display: 'flex', alignItems: 'center', gap: '4px',
                            textDecoration: 'none', fontSize: '0.78rem', fontWeight: '600',
                            WebkitTapHighlightColor: 'transparent', whiteSpace: 'nowrap'
                        }}
                        title="Get Directions"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11" /></svg>
                        Directions
                    </a>
                )}

                {/* BUG FIX #3: Call button
                    Previously: hidden if pharmacyData.phone / pharmacyData.mobile was missing
                    Fixed: show call button always for non-pharmacy users.
                    If phone is available → direct tel: link. Else → show "Request Call" to ask pharmacy for number. */}
                {!isPharmacy && (pharmacyData?.phone || pharmacyData?.mobile) ? (
                    <a
                        href={`tel:${pharmacyData.mobile || pharmacyData.phone}`}
                        style={{
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            color: '#fff',
                            width: '36px', height: '36px',
                            borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            textDecoration: 'none',
                            WebkitTapHighlightColor: 'transparent'
                        }}
                        title="Call pharmacy"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.99 9.99a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.9 1.1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 8.79a16 16 0 0 0 6.13 6.13l1.01-1.01a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.03z" /></svg>
                    </a>
                ) : !isPharmacy ? (
                    // Fallback: no phone in Firestore — customer can send a call request via chat
                    <button className="btn-dynamic"
                        onClick={handleRequestCall}
                        style={{
                            background: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            color: 'rgba(255,255,255,0.75)',
                            width: '36px', height: '36px',
                            borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer',
                            WebkitTapHighlightColor: 'transparent'
                        }}
                        title="Request a call from pharmacy"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.99 9.99a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.9 1.1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 8.79a16 16 0 0 0 6.13 6.13l1.01-1.01a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.03z" /></svg>
                    </button>
                ) : null}
            </div>
        </div>
    );
});
