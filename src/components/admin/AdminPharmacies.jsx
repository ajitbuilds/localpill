import React from 'react';

// Shared internal components required by AdminPharmacies
const SearchBar = ({ value, onChange, placeholder }) => (
    <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '200px' }}>
        <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '1rem' }}>🔍</span>
        <input
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={e => onChange(e.target.value)}
            style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.2rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: '#f8fafc', fontSize: '0.85rem', outline: 'none' }}
        />
    </div>
);

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

export const AdminPharmacies = ({
    filteredPharmacies, pharmSearch, setPharmSearch, pharmFilter, setPharmFilter,
    handleExportPharmacies, selectedPharmacy, setSelectedPharmacy, handleVerify, handleSuspendPharmacy
}) => {
    return (
        <div>
            {/* Filters */}
            <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <SearchBar value={pharmSearch} onChange={setPharmSearch} placeholder="Search by name or phone..." />
                {['all', 'online', 'verified', 'unverified', 'suspended'].map(f => (
                    <FilterPill key={f} label={f.charAt(0).toUpperCase() + f.slice(1)} active={pharmFilter === f} onClick={() => setPharmFilter(f)} color="#10b981" />
                ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <p style={{ color: '#64748b', fontSize: '0.8rem', margin: 0 }}>{filteredPharmacies.length} result{filteredPharmacies.length !== 1 ? 's' : ''}</p>
                <button className="btn-dynamic" onClick={handleExportPharmacies} style={{ ...btnBase, background: 'rgba(16,185,129,0.15)', color: '#34d399', fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}>📥 Export CSV</button>
            </div>

            <div style={{ overflowX: 'auto', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.04)', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            <th style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Pharmacy</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Contact</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Status</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Metrics</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredPharmacies.length === 0 && (
                            <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No pharmacies found.</td></tr>
                        )}
                        {filteredPharmacies.map(pharm => (
                            <React.Fragment key={pharm.id}>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s', background: selectedPharmacy?.id === pharm.id ? 'rgba(255,255,255,0.02)' : 'transparent' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.background = selectedPharmacy?.id === pharm.id ? 'rgba(255,255,255,0.02)' : 'transparent'}>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            {pharm.name || 'Unnamed Pharmacy'}
                                            {pharm.isVerified && <span title="Verified" style={{ color: '#3b82f6', fontSize: '0.9rem' }}>✓</span>}
                                        </div>
                                        <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '2px', fontFamily: 'monospace' }}>ID: {pharm.id.substring(0, 8)}...</div>
                                    </td>
                                    <td style={{ padding: '1rem', color: '#cbd5e1', fontSize: '0.85rem' }}>{pharm.phone || 'N/A'}</td>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                            {pharm.isOnline ?
                                                <span style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 600 }}>Online</span> :
                                                <span style={{ background: 'rgba(255,255,255,0.05)', color: '#64748b', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 600 }}>Offline</span>
                                            }
                                            {pharm.isSuspended && <span style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 600 }}>Suspended</span>}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Score: <span style={{ color: (pharm.fastResponderScore >= 80 ? '#34d399' : pharm.fastResponderScore >= 50 ? '#fbbf24' : '#f87171'), fontWeight: 600 }}>{pharm.fastResponderScore || 0}</span></div>
                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Reliability: <span style={{ color: (pharm.reliabilityScore >= 80 ? '#34d399' : pharm.reliabilityScore >= 50 ? '#fbbf24' : '#f87171'), fontWeight: 600 }}>{pharm.reliabilityScore || 0}</span></div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                            <button className="btn-dynamic" onClick={() => setSelectedPharmacy(selectedPharmacy?.id === pharm.id ? null : pharm)} style={{ ...btnBase, background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
                                                {selectedPharmacy?.id === pharm.id ? 'Hide' : 'Details'}
                                            </button>
                                            {!pharm.isVerified && (
                                                <button className="btn-dynamic" onClick={() => handleVerify(pharm.id, pharm.name)} style={{ ...btnBase, background: 'rgba(16,185,129,0.15)', color: '#34d399', padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
                                                    Verify
                                                </button>
                                            )}
                                            <button className="btn-dynamic" onClick={() => handleSuspendPharmacy(pharm.id, pharm.name, pharm.isSuspended)} style={{ ...btnBase, background: pharm.isSuspended ? 'rgba(59,130,246,0.15)' : 'rgba(239,68,68,0.15)', color: pharm.isSuspended ? '#60a5fa' : '#f87171', padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
                                                {pharm.isSuspended ? 'Unsuspend' : 'Suspend'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                {/* Expanded Details Panel */}
                                {selectedPharmacy?.id === pharm.id && (
                                    <tr>
                                        <td colSpan="5" style={{ padding: 0, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ padding: '1.25rem', background: 'rgba(99,102,241,0.04)', fontSize: '0.85rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'flex-start' }}>
                                                {pharm.profilePicUrl && (
                                                    <div style={{ flexShrink: 0 }}><div style={{ color: '#94a3b8', marginBottom: '0.25rem', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>Profile</div><img src={pharm.profilePicUrl} alt="Store" style={{ width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} /></div>
                                                )}
                                                <div><div style={{ color: '#94a3b8', marginBottom: '0.25rem', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>Location</div><div style={{ color: '#cbd5e1' }}>{pharm.location ? `${pharm.location.latitude?.toFixed(5)}, ${pharm.location.longitude?.toFixed(5)}` : 'Not set'}</div>{pharm.location && (<a href={`https://maps.google.com/?q=${pharm.location.latitude},${pharm.location.longitude}`} target="_blank" rel="noreferrer" style={{ color: '#60a5fa', fontSize: '0.78rem' }}>View on Map ↗</a>)}</div>
                                                <div><div style={{ color: '#94a3b8', marginBottom: '0.25rem', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>Account ID</div><div style={{ color: '#64748b', fontFamily: 'monospace', fontSize: '0.78rem' }}>{pharm.id}</div></div>
                                                <div><div style={{ color: '#94a3b8', marginBottom: '0.25rem', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>Joined</div><div style={{ color: '#cbd5e1' }}>{pharm.createdAt ? pharm.createdAt.toDate().toLocaleDateString('en-IN') : 'Unknown'}</div></div>
                                                <div><div style={{ color: '#94a3b8', marginBottom: '0.25rem', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>Setup</div><div style={{ color: '#cbd5e1' }}>Radius: {pharm.searchRadiusKm || 5} km</div></div>
                                                <div style={{ paddingLeft: '1.5rem', borderLeft: '1px solid rgba(255,255,255,0.1)' }}><div style={{ color: '#94a3b8', marginBottom: '0.25rem', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>Licensing (Govt)</div><div style={{ color: '#e2e8f0', fontWeight: 500 }}>No. {pharm.licenseNumber || 'Not Provided'}</div>{pharm.licenseDocumentUrl ? (<a href={pharm.licenseDocumentUrl} target="_blank" rel="noreferrer" style={{ color: '#10b981', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}><span>📄</span> View Document ↗</a>) : (<span style={{ color: '#ef4444', fontSize: '0.75rem' }}>No Document Uploaded</span>)}</div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
