import React from 'react';

// Timeline step icons — rendered as SVG inside the node circles
const TL_ICONS = {
    sent: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.99 9.99a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.9 1.1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 8.79a16 16 0 0 0 6.13 6.13l1.01-1.01a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.03z" /></svg>,
    notified: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>,
    responded: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>,
    matched: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
    cancelled: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
    pending: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
};

export default function RequestTimeline({ request }) {
    if (!request) return null;

    // Determine current state
    const isSent = true; // Always true if it exists
    const isNotified = request.notifiedPharmaciesCount > 0 || request.viewedPharmaciesCount > 0 || request.responsesCount > 0 || request.status === 'matched';
    const isResponded = request.responsesCount > 0 || request.status === 'matched';
    const isMatched = request.status === 'matched' || request.status === 'completed';
    const isCancelled = request.status === 'cancelled';
    const isExpired = request.expiresAt?.toMillis() < Date.now() && !isMatched && !isCancelled;

    const steps = [
        {
            id: 'sent',
            label: 'Request Sent',
            subtext: 'Looking for pharmacies nearby',
            active: isSent,
            completed: isNotified || isMatched || isCancelled || isExpired,
            icon: TL_ICONS.sent
        },
        {
            id: 'notified',
            label: 'Pharmacies Notified',
            subtext: request.notifiedPharmaciesCount ? `Alerted ${request.notifiedPharmaciesCount} pharmacies` : 'Waiting for views...',
            active: isNotified && !isResponded && !isCancelled && !isExpired,
            completed: isResponded || isMatched,
            icon: TL_ICONS.notified
        },
        {
            id: 'responded',
            label: 'Responses Received',
            subtext: request.responsesCount ? `${request.responsesCount} pharmacy replied` : 'Waiting for replies...',
            active: isResponded && !isMatched && !isCancelled && !isExpired,
            completed: isMatched,
            icon: TL_ICONS.responded
        },
        {
            id: 'matched',
            label: 'Matched',
            subtext: isMatched ? 'Connection successfully made' : (isCancelled ? 'Request cancelled' : isExpired ? 'Request expired' : 'Finalize your choice'),
            active: isMatched,
            completed: isMatched,
            icon: isMatched ? TL_ICONS.matched : (isCancelled || isExpired ? TL_ICONS.cancelled : TL_ICONS.pending)
        }
    ];

    // Determine the color theme based on the final status
    let activeColor = '#3B82F6'; // Blue for active searching
    if (isMatched) activeColor = '#10B981'; // Green for completion
    if (isCancelled || isExpired) activeColor = '#9CA3AF'; // Gray for dead ends

    return (
        <div style={{ padding: '1.25rem', background: '#fff', borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#6B7280' }}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg> Status Tracking
            </h3>

            <div style={{ position: 'relative' }}>
                {steps.map((step, index) => {
                    const isLast = index === steps.length - 1;
                    const isActiveOrCompleted = step.active || step.completed;

                    return (
                        <div key={step.id} style={{ display: 'flex', gap: '1rem', position: 'relative', paddingBottom: isLast ? '0' : '1.75rem' }}>

                            {/* Line connecting nodes */}
                            {!isLast && (
                                <div style={{
                                    position: 'absolute',
                                    top: '28px',
                                    bottom: 0,
                                    left: '14px', // Center under 28px icon
                                    width: '2px',
                                    background: step.completed ? activeColor : '#E5E7EB',
                                    zIndex: 0,
                                    transition: 'background 0.4s ease'
                                }} />
                            )}

                            {/* Node Icon */}
                            <div style={{
                                width: '30px', height: '30px', borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: step.completed ? activeColor : step.active ? `${activeColor}20` : '#F3F4F6',
                                border: `2px solid ${isActiveOrCompleted ? activeColor : '#E5E7EB'}`,
                                zIndex: 1, flexShrink: 0, fontSize: '0.9rem',
                                color: step.completed ? '#fff' : '#6B7280',
                                transition: 'all 0.3s ease',
                                boxShadow: step.active && !step.completed ? `0 0 0 4px ${activeColor}15` : 'none'
                            }}>
                                {step.icon}
                            </div>

                            {/* Text Content */}
                            <div style={{ paddingTop: '4px' }}>
                                <div style={{
                                    fontSize: '0.9rem',
                                    fontWeight: isActiveOrCompleted ? 700 : 500,
                                    color: isActiveOrCompleted ? '#111827' : '#9CA3AF'
                                }}>
                                    {step.label}
                                </div>
                                <div style={{
                                    fontSize: '0.8rem',
                                    color: step.active ? activeColor : '#6B7280',
                                    marginTop: '2px',
                                    fontWeight: step.active ? 600 : 400
                                }}>
                                    {step.subtext}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
