import React from 'react';

// Shared internal components
const FilterPill = ({ label, active, onClick, color }) => (
    <button className="btn-dynamic"
        onClick={onClick}
        style={{
            background: active ? `${color}22` : 'rgba(255,255,255,0.03)',
            color: active ? color : '#94a3b8',
            border: `1px solid ${active ? color : 'rgba(255,255,255,0.1)'}`,
            borderRadius: '20px', padding: '0.4rem 0.8rem', fontSize: '0.75rem',
            fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap'
        }}
    >
        {label}
    </button>
);

const btnBase = {
    border: 'none', borderRadius: '7px', padding: '0.35rem 0.8rem',
    fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
};

const statusColor = (s) => ({
    pending: '#f59e0b', matched: '#10b981', closed: '#64748b', cancelled: '#ef4444'
})[s] || '#94a3b8';

export const AdminRequests = ({
    filteredRequests, reqStatusFilter, setReqStatusFilter, handleExportRequests,
    expandedReqId, setExpandedReqId, handleForceClose, setChatModalReqId
}) => {
    return (
        <div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontSize: '0.82rem', fontWeight: 600 }}>Status:</span>
                {['all', 'pending', 'matched', 'closed', 'cancelled'].map(s => (
                    <FilterPill key={s} label={s.charAt(0).toUpperCase() + s.slice(1)} active={reqStatusFilter === s} onClick={() => setReqStatusFilter(s)} color={statusColor(s)} />
                ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <p style={{ color: '#64748b', fontSize: '0.8rem', margin: 0 }}>{filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''}</p>
                <button className="btn-dynamic" onClick={handleExportRequests} style={{ ...btnBase, background: 'rgba(16,185,129,0.15)', color: '#34d399', fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}>📥 Export CSV</button>
            </div>

            <div style={{ overflowX: 'auto', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.04)', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            <th style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Request Info</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Medicines</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Status</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRequests.length === 0 && (
                            <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No requests found.</td></tr>
                        )}
                        {filteredRequests.map(req => {
                            const expanded = expandedReqId === req.id;
                            const dateStr = req.createdAt ? req.createdAt.toDate().toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Unknown';
                            return (
                                <React.Fragment key={req.id}>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s', background: expanded ? 'rgba(255,255,255,0.02)' : 'transparent' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.background = expanded ? 'rgba(255,255,255,0.02)' : 'transparent'}>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ color: '#f1f5f9', fontSize: '0.85rem' }}>{dateStr}</div>
                                            <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '4px', fontFamily: 'monospace' }}>ID: {req.id.substring(0, 8)}...</div>
                                        </td>
                                        <td style={{ padding: '1rem', maxWidth: '300px' }}>
                                            <div style={{ color: '#cbd5e1', fontSize: '0.88rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {req.typedMedicines?.length > 0 ? req.typedMedicines.join(', ') : '📄 Prescription Upload'}
                                            </div>
                                            <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '4px' }}>
                                                {req.responsesCount || 0} responses · {req.notifiedPharmaciesCount || 0} notified
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <span style={{ background: `${statusColor(req.status)}22`, color: statusColor(req.status), border: `1px solid ${statusColor(req.status)}44`, borderRadius: '20px', padding: '2px 10px', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>
                                                {req.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                                <button className="btn-dynamic" onClick={() => setExpandedReqId(expanded ? null : req.id)} style={{ ...btnBase, background: 'rgba(255,255,255,0.07)', color: '#94a3b8', padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
                                                    {expanded ? 'Hide' : 'Details'}
                                                </button>
                                                {req.status === 'pending' && (
                                                    <button className="btn-dynamic" onClick={() => handleForceClose(req.id)} style={{ ...btnBase, background: 'rgba(239,68,68,0.12)', color: '#f87171', padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
                                                        Close
                                                    </button>
                                                )}
                                                <button className="btn-dynamic" onClick={() => setChatModalReqId(req.id)} style={{ ...btnBase, background: 'rgba(59,130,246,0.15)', color: '#60a5fa', padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
                                                    Chat
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    {expanded && (
                                        <tr>
                                            <td colSpan="4" style={{ padding: 0, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <div style={{ padding: '1rem 1.5rem', background: 'rgba(0,0,0,0.2)', fontSize: '0.82rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
                                                    <div><div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '3px' }}>User ID</div><div style={{ color: '#94a3b8', fontFamily: 'monospace' }}>{req.userId}</div></div>
                                                    <div><div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '3px' }}>Location</div><div style={{ color: '#94a3b8' }}>{req.location ? `${req.location.latitude?.toFixed(4)}, ${req.location.longitude?.toFixed(4)}` : 'N/A'}{req.location && (<a href={`https://maps.google.com/?q=${req.location.latitude},${req.location.longitude}`} target="_blank" rel="noreferrer" style={{ color: '#60a5fa', marginLeft: '6px', fontSize: '0.75rem' }}>Map ↗</a>)}</div></div>
                                                    <div><div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '3px' }}>Request ID</div><div style={{ color: '#475569', fontFamily: 'monospace', fontSize: '0.76rem' }}>{req.id}</div></div>
                                                    {req.matchedPharmacyName && (<div><div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '3px' }}>Matched Pharmacy</div><div style={{ color: '#34d399' }}>{req.matchedPharmacyName}</div></div>)}
                                                    {req.rejectionReason && (<div><div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '3px' }}>Rejection Reason</div><div style={{ color: '#f87171' }}>{req.rejectionReason}</div></div>)}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
