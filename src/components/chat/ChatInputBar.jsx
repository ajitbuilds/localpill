import React from 'react';

export const ChatInputBar = React.memo(({
    newMessage, handleInputChange, handleSendMessage,
    isUploading, setShowAttachMenu, inputRef, haptic, currentUser, chatId, rtdb,
    replyingTo, setReplyingTo
}) => {
    return (
        <div className="chat-input-bar" style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Reply Banner */}
            {replyingTo && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 12px',
                    background: '#F9FAFB',
                    borderTop: '1px solid #E5E7EB',
                    borderLeft: '3px solid #22C55E',
                    marginBottom: '2px',
                    animation: 'fadeInUp 0.15s ease both'
                }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 17 4 12 9 7" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" />
                    </svg>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#16A34A', marginBottom: '1px' }}>Replying</div>
                        <div style={{
                            fontSize: '0.82rem', color: '#6B7280',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                        }}>
                            {replyingTo.text || (replyingTo.type === 'image' ? '📷 Photo' : '📎 Attachment')}
                        </div>
                    </div>
                    <button className="btn-dynamic"
                        onClick={() => setReplyingTo(null)}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: '#9CA3AF', padding: '4px', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
            )}

            <form
                onSubmit={handleSendMessage}
                style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
            >
                {/* Issue #33: Attachment Menu Toggle */}
                <button className="btn-dynamic"
                    type="button"
                    onClick={() => { haptic.light(); setShowAttachMenu(true); }}
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: '38px', height: '38px', borderRadius: '50%',
                        background: '#F3F4F6', color: '#6B7280', border: 'none', cursor: 'pointer',
                        flexShrink: 0, transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#DCFCE7'; e.currentTarget.style.color = '#16A34A'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#F3F4F6'; e.currentTarget.style.color = '#6B7280'; }}
                    disabled={isUploading}
                >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
                <input
                    ref={inputRef}
                    type="text"
                    value={newMessage}
                    onChange={handleInputChange}
                    placeholder={isUploading ? "Uploading..." : "Message..."}
                    disabled={isUploading}
                    className="chat-input-field"
                    autoComplete="off"
                    autoCorrect="on"
                    enterKeyHint="send"
                    onBlur={() => {
                        if (currentUser) {
                            import('firebase/database').then(({ set, ref }) => {
                                set(ref(rtdb, `chats/${chatId}/typing/${currentUser.uid}`), false);
                            });
                        }
                    }}
                />
                <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="chat-send-btn btn-dynamic btn-send"
                    style={{
                        background: newMessage.trim()
                            ? 'linear-gradient(135deg, #22C55E, #16A34A)'
                            : '#E5E7EB',
                        color: newMessage.trim() ? 'white' : '#9CA3AF',
                        boxShadow: newMessage.trim() ? '0 4px 12px rgba(34,197,94,0.35)' : 'none',
                        transform: newMessage.trim() ? 'scale(1)' : 'scale(0.92)',
                    }}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                </button>
            </form>
        </div>
    );
});
