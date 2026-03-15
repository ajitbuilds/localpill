import React from 'react';
import { auth } from '../../firebase';

const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
};

const formatDateLabel = (timestamp) => {
    if (!timestamp) return '';
    const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = (now - d) / (1000 * 60 * 60 * 24);
    if (diff < 1) return 'Today';
    if (diff < 2) return 'Yesterday';
    return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
};

export const ChatMessage = React.memo(({
    msg, isMine, isSeen, showDateSep, showTimeSep, isDelivered,
    reaction, isPickerOpen,
    handleReaction, handleLongPressStart, handleLongPressEnd, setReactionPickerFor,
    handleSharePrescription, handleAcceptCall, handleDeclineCall, onOpenLightbox
}) => {

    return (
        <React.Fragment>
            {showDateSep && msg.timestamp && (
                <div style={{
                    textAlign: 'center', fontSize: '0.72rem',
                    color: '#6B7280', margin: '1rem 0 0.5rem',
                    display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                    <div style={{ flex: 1, height: '1px', background: '#E5E7EB' }} />
                    <span style={{
                        background: '#F3F4F6', color: '#6B7280',
                        padding: '3px 10px', borderRadius: '20px',
                        fontWeight: 600, fontSize: '0.68rem', letterSpacing: '0.03em'
                    }}>{formatDateLabel(msg.timestamp)}</span>
                    <div style={{ flex: 1, height: '1px', background: '#E5E7EB' }} />
                </div>
            )}
            <div
                style={{
                    alignSelf: isMine ? 'flex-end' : 'flex-start',
                    maxWidth: '82%',
                    display: 'flex', flexDirection: 'column', gap: '3px', position: 'relative'
                }}
                onMouseDown={() => handleLongPressStart(msg.id)}
                onMouseUp={handleLongPressEnd}
                onMouseLeave={handleLongPressEnd}
                onTouchStart={() => handleLongPressStart(msg.id)}
                onTouchEnd={handleLongPressEnd}
                onContextMenu={(e) => { e.preventDefault(); setReactionPickerFor(msg.id); }}
            >
                <div style={{ position: 'relative' }}>
                    <div style={{
                        background: isMine ? 'linear-gradient(135deg, #22C55E, #16A34A)' : '#FFFFFF',
                        color: isMine ? '#FFFFFF' : '#111827',
                        padding: msg.type === 'image' ? '4px' : '6px 10px 20px 10px',
                        borderRadius: isMine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                        wordBreak: 'break-word',
                        boxShadow: isMine
                            ? '0 2px 8px rgba(34,197,94,0.25)'
                            : '0 1px 4px rgba(0,0,0,0.08)',
                        border: isMine ? 'none' : '1px solid #F0F0F0',
                        fontSize: '0.9375rem', lineHeight: 1.45,
                        position: 'relative',
                        minWidth: msg.type === 'image' ? 'auto' : '85px',
                    }}>
                        {/* Reply Quote Block */}
                        {msg.replyToText && (
                            <div style={{
                                background: isMine ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.05)',
                                borderLeft: `3px solid ${isMine ? 'rgba(255,255,255,0.6)' : '#22C55E'}`,
                                borderRadius: '6px',
                                padding: '5px 8px',
                                marginBottom: '6px',
                                overflow: 'hidden',
                            }}>
                                <div style={{
                                    fontSize: '0.7rem', fontWeight: 700, marginBottom: '2px',
                                    color: isMine ? 'rgba(255,255,255,0.8)' : '#16A34A'
                                }}>
                                    {msg.replyToSenderId === msg.senderId ? 'You' : 'Reply'}
                                </div>
                                <div style={{
                                    fontSize: '0.8rem',
                                    color: isMine ? 'rgba(255,255,255,0.75)' : '#6B7280',
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                }}>
                                    {msg.replyToText}
                                </div>
                            </div>
                        )}
                        {msg.type === 'prescription_request' ? 'I need a prescription to confirm this medication.' :
                            msg.type === 'image' && msg.imageUrl ? (
                                <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                                    <img src={msg.imageUrl} alt="Shared" style={{ display: 'block', maxWidth: '100%', borderRadius: '10px', maxHeight: '250px', cursor: 'zoom-in', objectFit: 'cover' }} onClick={() => onOpenLightbox(msg.imageUrl)} />
                                </div>
                            ) : msg.type === 'call_request' ? (
                                'Pharmacy requested your phone number to discuss the medicines.'
                            ) : msg.type === 'phone_shared' ? (
                                <span>I have shared my number: <br /><a href={`tel:${msg.phoneNumber}`} style={{ color: 'inherit', fontWeight: 'bold' }}>{msg.phoneNumber}</a></span>
                            ) : msg.type === 'call_declined' ? (
                                'I prefer to chat here instead of a call.'
                            ) :
                                msg.text}

                        {/* Inline Metadata — exact WhatsApp sizing */}
                        <div style={{
                            position: 'absolute',
                            bottom: msg.type === 'image' ? '6px' : '3px',
                            right: msg.type === 'image' ? '7px' : '7px',
                            display: 'flex', alignItems: 'center', gap: '2px',
                            zIndex: 2,
                            background: msg.type === 'image' ? 'rgba(0,0,0,0.4)' : 'transparent',
                            padding: msg.type === 'image' ? '1px 5px' : '0',
                            borderRadius: msg.type === 'image' ? '10px' : '0'
                        }}>
                            {/* Time */}
                            <span style={{
                                fontSize: '11px',
                                lineHeight: 1,
                                color: isMine
                                    ? 'rgba(255,255,255,0.65)'
                                    : '#9CA3AF',
                                letterSpacing: '0.01em',
                                fontWeight: 400
                            }}>
                                {msg.timestamp ? formatTime(msg.timestamp) : ''}
                            </span>
                            {/* Ticks — only on outgoing */}
                            {isMine && (
                                <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    color: isSeen ? '#53BDEB' : 'rgba(255,255,255,0.65)',
                                    lineHeight: 1
                                }}>
                                    {/* Single tick = sent only */}
                                    {!isDelivered && !isSeen && (
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    )}
                                    {/* Double tick = delivered or seen */}
                                    {(isDelivered || isSeen) && (
                                        <svg width="16" height="10" viewBox="0 0 28 12" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                                            {/* back tick */}
                                            <polyline points="3 6 8 11 16 2" />
                                            {/* front tick (offset right) */}
                                            <polyline points="9 6 14 11 22 2" />
                                        </svg>
                                    )}
                                </span>
                            )}
                        </div>
                    </div>

                    {reaction && (
                        <div
                            onClick={() => setReactionPickerFor(isPickerOpen ? null : msg.id)}
                            style={{
                                position: 'absolute', bottom: '-12px',
                                [isMine ? 'left' : 'right']: '4px',
                                background: '#fff', border: '1px solid #E5E7EB',
                                borderRadius: '20px', padding: '1px 7px',
                                fontSize: '0.9rem', boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                                cursor: 'pointer', zIndex: 3
                            }}
                        >{reaction.emoji}</div>
                    )}
                </div>
                {msg.type === 'call_request' && !isMine && msg.status === 'pending' && msg.senderId !== auth.currentUser?.uid && (
                    <div style={{ marginTop: '8px', padding: '10px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '12px' }}>
                        <p style={{ margin: '0 0 8px', fontSize: '0.8rem', color: '#166534', fontWeight: 600 }}>Do you want to share your number?</p>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn-dynamic" onClick={() => handleAcceptCall(msg.id)} style={{ flex: 1, background: '#22C55E', color: '#fff', border: 'none', padding: '6px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg> Share</button>
                            <button className="btn-dynamic" onClick={() => handleDeclineCall(msg.id)} style={{ flex: 1, background: '#FEE2E2', color: '#DC2626', border: 'none', padding: '6px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg> Decline</button>
                        </div>
                    </div>
                )}
                {msg.type === 'prescription_request' && !isMine && msg.senderId !== auth.currentUser?.uid && (
                    <div style={{ marginTop: '8px', padding: '10px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px' }}>
                        <p style={{ margin: '0 0 8px', fontSize: '0.8rem', color: '#991B1B', fontWeight: 600 }}>Pharmacy needs to see the prescription to confirm.</p>
                        <label style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                            textAlign: 'center', background: '#EF4444', color: '#fff',
                            padding: '6px 12px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700,
                            cursor: 'pointer'
                        }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg> Share Prescription
                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                                if (e.target.files[0]) handleSharePrescription(e.target.files[0], msg.id);
                            }} />
                        </label>
                    </div>
                )}
                {msg.type === 'prescription_share' && msg.prescriptionUrl && (
                    <div style={{ marginTop: '8px' }}>
                        <img src={msg.prescriptionUrl} alt="Prescription" style={{ width: '100%', borderRadius: '8px', border: '1px solid #E5E7EB', maxHeight: '200px', objectFit: 'cover', cursor: 'zoom-in' }} onClick={() => onOpenLightbox(msg.prescriptionUrl)} />
                    </div>
                )}
            </div>
        </React.Fragment >
    );
});
