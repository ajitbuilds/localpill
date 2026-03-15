import React, { useState, useEffect, useMemo } from 'react';
import { signOut } from 'firebase/auth';
import { collection, onSnapshot, doc, updateDoc, setDoc, query, where, getCountFromServer, limit, orderBy } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { ref as rtdbRef, onValue, off } from 'firebase/database';
import { auth, db, functions, rtdb } from './firebase';
import useWindowWidth from './hooks/useWindowWidth';
import { AdminAnalytics } from './components/admin/AdminAnalytics';
import { AdminPharmacies } from './components/admin/AdminPharmacies';
import { AdminRequests } from './components/admin/AdminRequests';
import { useToast } from './components/Toast';

// ── Stat Card Component ───────────────────────────────────────────────────────
function StatCard({ label, value, color, sub }) {
    return (
        <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: `1px solid rgba(255,255,255,0.08)`,
            borderRadius: '12px',
            padding: '1.25rem',
            flex: 1,
            minWidth: '150px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
        }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>{label}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#f8fafc', lineHeight: 1 }}>{value ?? '—'}</div>
                {sub && <div style={{ fontSize: '0.8rem', color: color, fontWeight: 600 }}>{sub}</div>}
            </div>
        </div>
    );
}

// ── Search Bar ────────────────────────────────────────────────────────────────
function SearchBar({ value, onChange, placeholder }) {
    return (
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <svg style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                style={{
                    width: '100%', paddingLeft: '32px', paddingRight: '12px',
                    height: '36px', borderRadius: '8px', boxSizing: 'border-box',
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                    color: '#e2e8f0', fontSize: '0.85rem', outline: 'none',
                }}
            />
        </div>
    );
}

// ── Filter Pill ───────────────────────────────────────────────────────────────
function FilterPill({ label, active, onClick, color = '#6366f1' }) {
    return (
        <button className="btn-dynamic" onClick={onClick} style={{
            background: active ? color : 'rgba(255,255,255,0.06)',
            border: `1px solid ${active ? color : 'rgba(255,255,255,0.12)'}`,
            color: active ? '#fff' : '#94a3b8',
            padding: '0.3rem 0.8rem', borderRadius: '20px',
            fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.2s', whiteSpace: 'nowrap',
        }}>{label}</button>
    );
}

// ── Export Helper ─────────────────────────────────────────────────────────────
function exportToCSV(filename, rows) {
    if (!rows || !rows.length) return;
    const separator = ',';
    const keys = Object.keys(rows[0]);
    const csvContent =
        keys.join(separator) +
        '\n' +
        rows.map(row => {
            return keys.map(k => {
                let cell = row[k] === null || row[k] === undefined ? '' : row[k];
                cell = cell instanceof Date ? cell.toLocaleString() : cell.toString().replace(/"/g, '""');
                if (cell.search(/("|,|\n)/g) >= 0) cell = `"${cell}"`;
                return cell;
            }).join(separator);
        }).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// ── Live Map Component ────────────────────────────────────────────────────────
function AdminMap({ pharmacies, requests }) {
    const mapRef = React.useRef(null);
    const googleMapRef = React.useRef(null);
    const markersRef = React.useRef([]);

    useEffect(() => {
        if (!window.google?.maps) return;

        if (!googleMapRef.current) {
            googleMapRef.current = new window.google.maps.Map(mapRef.current, {
                center: { lat: 25.5941, lng: 85.1376 }, // Default Patna
                zoom: 12,
                styles: [
                    { featureType: "poi", stylers: [{ visibility: "off" }] },
                    { featureType: "transit", stylers: [{ visibility: "off" }] }
                ],
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: true,
            });
        }

        const map = googleMapRef.current;
        const bounds = new window.google.maps.LatLngBounds();
        let hasPoints = false;

        // Clear old markers
        markersRef.current.forEach(m => m.setMap(null));
        markersRef.current = [];

        // Add Pharmacy Markers (Green)
        pharmacies.forEach(p => {
            if (p.location?.latitude && p.location?.longitude) {
                const pos = { lat: p.location.latitude, lng: p.location.longitude };
                const marker = new window.google.maps.Marker({
                    position: pos,
                    map: map,
                    icon: {
                        path: window.google.maps.SymbolPath.CIRCLE,
                        fillColor: '#34d399',
                        fillOpacity: 1,
                        strokeWeight: 2,
                        strokeColor: '#fff',
                        scale: 8
                    },
                    title: `Pharmacy: ${p.name || 'Unknown'}`
                });
                const infoWindow = new window.google.maps.InfoWindow({
                    content: `<div style="color: black; font-size: 13px;"><b>🏥 ${p.name || 'Pharmacy'}</b><br/>Phone: ${p.phone || 'N/A'}<br/>Score: ${p.fastResponderScore || 0}</div>`
                });
                marker.addListener("click", () => infoWindow.open(map, marker));
                markersRef.current.push(marker);
                bounds.extend(pos);
                hasPoints = true;
            }
        });

        // Add Request Markers (Orange/Red)
        requests.forEach(r => {
            if (r.location?.latitude && r.location?.longitude) {
                const pos = { lat: r.location.latitude, lng: r.location.longitude };
                const marker = new window.google.maps.Marker({
                    position: pos,
                    map: map,
                    icon: {
                        path: window.google.maps.SymbolPath.CIRCLE,
                        fillColor: '#ef4444',
                        fillOpacity: 1,
                        strokeWeight: 2,
                        strokeColor: '#fff',
                        scale: 6
                    },
                    title: `Request from User: ${r.userId}`
                });
                const infoWindow = new window.google.maps.InfoWindow({
                    content: `<div style="color: black; font-size: 13px;"><b>📋 Request</b><br/>Meds: ${(r.typedMedicines || []).join(', ') || 'Prescription Upload'}</div>`
                });
                marker.addListener("click", () => infoWindow.open(map, marker));
                markersRef.current.push(marker);
                bounds.extend(pos);
                hasPoints = true;
            }
        });

        if (hasPoints) {
            map.fitBounds(bounds);
            // Don't zoom in too close on single point
            const listener = window.google.maps.event.addListener(map, "idle", function () {
                if (map.getZoom() > 15) map.setZoom(15);
                window.google.maps.event.removeListener(listener);
            });
        }
    }, [pharmacies, requests]);

    return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function DashboardAdmin({ user }) {
    const toast = useToast();
    const [view, setView] = useState('pharmacies');
    const [pharmacies, setPharmacies] = useState([]);
    const [requests, setRequests] = useState([]);
    const [usersList, setUsersList] = useState([]);
    const [activityLog, setActivityLog] = useState([]);

    // Settings state
    const [platformSettings, setPlatformSettings] = useState({
        defaultSearchRadiusKm: 5,
        requestTimeoutMinutes: 10
    });
    const [savingSettings, setSavingSettings] = useState(false);

    // Stats
    const [statsLoading, setStatsLoading] = useState(true);

    // Pharmacy filters
    const [pharmSearch, setPharmSearch] = useState('');
    const [pharmFilter, setPharmFilter] = useState('all'); // all | online | verified | unverified | suspended

    // User filters
    const [userSearch, setUserSearch] = useState('');
    const [userRoleFilter, setUserRoleFilter] = useState('all'); // all | user | pharmacy | admin

    // Request filters
    const [reqStatusFilter, setReqStatusFilter] = useState('all'); // all | pending | matched | closed | cancelled
    const [expandedReqId, setExpandedReqId] = useState(null);

    // Pharmacy details modal
    const [selectedPharmacy, setSelectedPharmacy] = useState(null);

    // Chat modal state
    const [chatModalReqId, setChatModalReqId] = useState(null);
    const [chatModalPharmacyId, setChatModalPharmacyId] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);

    // Broadcast state
    const [broadcastTitle, setBroadcastTitle] = useState('');
    const [broadcastBody, setBroadcastBody] = useState('');
    const [broadcastTarget, setBroadcastTarget] = useState('online'); // online | all
    const [isBroadcasting, setIsBroadcasting] = useState(false);
    const [broadcastResult, setBroadcastResult] = useState('');

    const isMobile = useWindowWidth() < 768;
    const isMounted = React.useRef(true);

    useEffect(() => {
        return () => {
            isMounted.current = false;
        };
    }, []);

    // Listen to chat messages if modal is open (Issue #3: Admin uses admins RTDB bypass)
    useEffect(() => {
        if (!chatModalReqId) return;
        let isMounted = true;
        const unsubs = [];

        // Get all pharmacy responses for this request and subscribe to each chat
        const { getDocs: fsGetDocs, collection: fsCollection } = require !== undefined
            ? { getDocs: null, collection: null }
            : {};

        import('firebase/firestore').then(({ getDocs, collection: collFS }) => {
            getDocs(collFS(db, 'medicineRequests', chatModalReqId, 'pharmacyResponses')).then(snap => {
                if (!isMounted) return;
                const chatIds = snap.docs.map(d => `${chatModalReqId}_${d.id}`);
                if (chatIds.length === 0) {
                    // Fallback: try chatModalPharmacyId if set
                    if (chatModalPharmacyId) chatIds.push(`${chatModalReqId}_${chatModalPharmacyId}`);
                }
                chatIds.forEach(chatId => {
                    // SEC FIX: Issue #6 - Read from /chats/{chatId}/messages specifically
                    const chatRef = rtdbRef(rtdb, `chats/${chatId}/messages`);
                    const unsub = onValue(chatRef, (snapshot) => {
                        if (!isMounted) return;

                        const msgs = [];
                        if (snapshot.exists()) {
                            const chatObj = snapshot.val();
                            Object.keys(chatObj).forEach(k => {
                                msgs.push({ id: k, pharmacyId: chatId.split('_')[1], ...chatObj[k] });
                            });
                        }

                        setChatMessages(prev => {
                            const otherMsgs = prev.filter(m => `${chatModalReqId}_${m.pharmacyId}` !== chatId);
                            return [...otherMsgs, ...msgs].sort((a, b) => a.timestamp - b.timestamp);
                        });
                    });
                    unsubs.push(unsub);
                });
            }).catch(() => { if (isMounted) setChatMessages([]); });
        });

        return () => {
            isMounted = false;
            unsubs.forEach(u => u());
        };
    }, [chatModalReqId]);

    // ── Real-time listeners ───────────────────────────────────────────────────
    useEffect(() => {
        const unsubPharm = onSnapshot(query(collection(db, 'pharmacies'), limit(500)), (snap) => {
            setPharmacies(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setStatsLoading(false);
        });
        const unsubReq = onSnapshot(query(collection(db, 'medicineRequests'), orderBy('createdAt', 'desc'), limit(500)), (snap) => {
            const reqs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            // Keep sort array fallback in case orderBy fails on unindexed properties
            reqs.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
            setRequests(reqs);
        });
        const unsubUsers = onSnapshot(query(collection(db, 'users'), limit(500)), (snap) => {
            setUsersList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        const unsubSettings = onSnapshot(doc(db, 'settings', 'platformSettings'), (docSnap) => {
            if (docSnap.exists()) {
                setPlatformSettings(prev => ({ ...prev, ...docSnap.data() }));
            }
        });
        return () => { unsubPharm(); unsubReq(); unsubUsers(); unsubSettings(); };
    }, []);

    // ── Computed Stats ────────────────────────────────────────────────────────
    const stats = useMemo(() => ({
        totalUsers: usersList.filter(u => u.role !== 'admin').length,
        totalPharmacies: pharmacies.length,
        onlinePharmacies: pharmacies.filter(p => p.isOnline).length,
        activeRequests: requests.filter(r => r.status === 'pending').length,
        todayRequests: requests.filter(r => {
            if (!r.createdAt) return false;
            const d = r.createdAt.toDate();
            const now = new Date();
            return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }).length,
        verifiedPharmacies: pharmacies.filter(p => p.isVerified).length,
    }), [pharmacies, requests, usersList]);

    // ── Analytics Data ────────────────────────────────────────────────────────
    const analyticsData = useMemo(() => {
        // Line Chart: Requests over the last 7 days
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            d.setHours(0, 0, 0, 0);
            return d;
        });

        const requestsByDay = last7Days.map(dateObj => {
            const dayStart = dateObj.getTime();
            const dayEnd = dayStart + 86400000;
            const count = requests.filter(r => {
                const reqTime = r.createdAt?.toMillis() || 0;
                return reqTime >= dayStart && reqTime < dayEnd;
            }).length;
            return {
                name: dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
                Requests: count
            };
        });

        // Bar Chart: Top Requested Medicines
        const medicineCounts = {};
        requests.forEach(r => {
            if (r.typedMedicines && Array.isArray(r.typedMedicines)) {
                r.typedMedicines.forEach(m => {
                    const med = m.trim().toLowerCase();
                    if (med) {
                        medicineCounts[med] = (medicineCounts[med] || 0) + 1;
                    }
                });
            }
        });

        const topMedicines = Object.entries(medicineCounts)
            .map(([name, count]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), Count: count }))
            .sort((a, b) => b.Count - a.Count)
            .slice(0, 5);

        return { requestsByDay, topMedicines };
    }, [requests]);

    // ── Filtered lists ────────────────────────────────────────────────────────
    const filteredPharmacies = useMemo(() => {
        let list = pharmacies;
        if (pharmSearch.trim()) {
            const q = pharmSearch.toLowerCase();
            list = list.filter(p =>
                (p.name || '').toLowerCase().includes(q) ||
                (p.phone || '').includes(q)
            );
        }
        if (pharmFilter === 'online') list = list.filter(p => p.isOnline);
        else if (pharmFilter === 'verified') list = list.filter(p => p.isVerified);
        else if (pharmFilter === 'unverified') list = list.filter(p => !p.isVerified);
        else if (pharmFilter === 'suspended') list = list.filter(p => p.isSuspended);
        return list;
    }, [pharmacies, pharmSearch, pharmFilter]);

    const filteredUsers = useMemo(() => {
        let list = usersList;
        if (userSearch.trim()) {
            const q = userSearch.toLowerCase();
            list = list.filter(u =>
                (u.name || '').toLowerCase().includes(q) ||
                (u.phone || '').includes(q)
            );
        }
        if (userRoleFilter !== 'all') list = list.filter(u => u.role === userRoleFilter);
        return list;
    }, [usersList, userSearch, userRoleFilter]);

    const filteredRequests = useMemo(() => {
        let list = requests;
        if (reqStatusFilter !== 'all') list = list.filter(r => r.status === reqStatusFilter);
        return list;
    }, [requests, reqStatusFilter]);

    // ── Handlers ──────────────────────────────────────────────────────────────
    const logAction = (action) => {
        setActivityLog(prev => [{
            action,
            time: new Date().toLocaleTimeString(),
            admin: user?.phoneNumber || 'Admin'
        }, ...prev.slice(0, 49)]);
    };

    const handleVerify = async (id, name) => {
        try {
            await updateDoc(doc(db, 'pharmacies', id), {
                isVerified: true,
                isVerifiedAt: new Date()
            });

            // MISS-07 + MISS-10 fix: Write in-app notification so pharmacy sees it on next login
            const { addDoc, collection: col, serverTimestamp: sTs } = await import('firebase/firestore');
            await addDoc(col(db, 'notifications', id, 'userNotifications'), {
                type: 'account_verified',
                title: 'Account Verified!',
                body: 'Congratulations! Your pharmacy has been verified by LocalPill. You can now go Online and start receiving patient requests.',
                read: false,
                createdAt: sTs()
            }).catch(() => { }); // non-critical — ignore if it fails

            logAction(`Verified pharmacy: ${name || id}`);
            toast.success('Pharmacy verified successfully');
        } catch (err) {
            console.error(err);
            toast.error('Failed to verify. Check Firestore rules.');
        }
    };


    const handleSuspendPharmacy = async (id, name, current) => {
        try {
            await updateDoc(doc(db, 'pharmacies', id), { isSuspended: !current });
            logAction(`${current ? 'Unsuspended' : 'Suspended'} pharmacy: ${name || id}`);
            toast.success(`Pharmacy ${!current ? 'suspended' : 'unsuspended'} successfully`);
        } catch (err) {
            console.error(err);
            toast.error('Failed to change suspension status.');
        }
    };

    const handleSuspendUser = async (id, name, current) => {
        try {
            await updateDoc(doc(db, 'users', id), { isSuspended: !current });
            logAction(`${current ? 'Unsuspended' : 'Suspended'} user: ${name || id}`);
            toast.success(`User ${!current ? 'suspended' : 'unsuspended'} successfully`);
        } catch (err) {
            console.error(err);
            toast.error('Failed to change user suspension status.');
        }
    };

    const handleRoleChange = async (id, name, newRole) => {
        if (!window.confirm(`Change role of "${name}" to "${newRole}"?`)) return;
        try {
            await updateDoc(doc(db, 'users', id), { role: newRole });
            logAction(`Changed role of ${name || id} to ${newRole}`);
            toast.success(`User role changed to ${newRole}`);
        } catch (err) {
            console.error(err);
            toast.error('Failed to change role.');
        }
    };

    const handleForceClose = async (id) => {
        if (!window.confirm('Force close this request? This cannot be undone.')) return;
        try {
            await updateDoc(doc(db, 'medicineRequests', id), { status: 'closed' });
            logAction(`Force closed request: ${id}`);
            toast.success('Request closed successfully');
        } catch (err) {
            console.error(err);
            toast.error('Failed to close request.');
        }
    };

    const handleBroadcast = async (e) => {
        e.preventDefault();
        if (!broadcastTitle || !broadcastBody) return;

        if (!window.confirm(`Send this push notification to ${broadcastTarget === 'online' ? 'all online' : 'all verified'} pharmacies?`)) return;

        setIsBroadcasting(true);
        setBroadcastResult('');

        try {
            const broadcastFn = httpsCallable(functions, 'broadcastToPharmacies');
            const result = await broadcastFn({
                title: broadcastTitle,
                body: broadcastBody,
                target: broadcastTarget
            });

            const data = result.data;
            if (isMounted.current) {
                if (data.success) {
                    setBroadcastResult(`✅ Success! Sent to ${data.sentCount} devices. (${data.failureCount} failed)`);
                    setBroadcastTitle('');
                    setBroadcastBody('');
                    logAction(`Broadcast sent to ${broadcastTarget} pharmacies`);
                } else {
                    setBroadcastResult(`❌ Failed: ${data.message || 'Unknown error'}`);
                }
            }
        } catch (err) {
            console.error(err);
            if (isMounted.current) {
                setBroadcastResult(`❌ Error: ${err.message}`);
            }
        } finally {
            if (isMounted.current) {
                setIsBroadcasting(false);
            }
        }
    };

    // ── Export Handlers ───────────────────────────────────────────────────────
    const handleExportPharmacies = () => {
        const data = filteredPharmacies.map(p => ({
            ID: p.id, Name: p.name || '', Phone: p.phone || '',
            Verified: p.isVerified ? 'Yes' : 'No', Suspended: p.isSuspended ? 'Yes' : 'No', Online: p.isOnline ? 'Yes' : 'No',
            Joined: p.createdAt ? p.createdAt.toDate().toLocaleDateString() : '',
            Lat: p.location?.latitude || '', Lng: p.location?.longitude || ''
        }));
        exportToCSV('pharmacies.csv', data);
        logAction('Exported Pharmacies to CSV');
    };

    const handleExportRequests = () => {
        const data = filteredRequests.map(r => ({
            ID: r.id, UserID: r.userId, Status: r.status,
            Medicines: (r.typedMedicines || []).join('; '),
            Created: r.createdAt ? r.createdAt.toDate().toLocaleString() : '',
            MatchedPharmacy: r.matchedPharmacyName || '', RejectionReason: r.rejectionReason || '',
            Lat: r.location?.latitude || '', Lng: r.location?.longitude || ''
        }));
        exportToCSV('requests.csv', data);
        logAction('Exported Requests to CSV');
    };

    const handleExportUsers = () => {
        const data = filteredUsers.map(u => ({
            ID: u.id, Name: u.name || '', Phone: u.phone || '', Role: u.role || 'user',
            Suspended: u.isSuspended ? 'Yes' : 'No'
        }));
        exportToCSV('users.csv', data);
        logAction('Exported Users to CSV');
    };

    // ── Status helpers ────────────────────────────────────────────────────────
    const statusColor = (s) => ({
        pending: '#f59e0b', matched: '#10b981', closed: '#64748b', cancelled: '#ef4444'
    })[s] || '#94a3b8';

    const roleColor = (r) => ({
        admin: '#818cf8', pharmacy: '#34d399', user: '#94a3b8'
    })[r] || '#94a3b8';

    const roleBg = (r) => ({
        admin: 'rgba(99,102,241,0.15)', pharmacy: 'rgba(16,185,129,0.15)', user: 'rgba(255,255,255,0.08)'
    })[r] || 'rgba(255,255,255,0.08)';

    // ── Shared styles ──────────────────────────────────────────────────────────
    const cardStyle = {
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: '12px',
        padding: '1.25rem',
    };

    const btnBase = {
        border: 'none', borderRadius: '7px', padding: '0.35rem 0.8rem',
        fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
    };

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', minHeight: '100vh', width: '100vw', background: '#0f172a', position: 'absolute', top: 0, left: 0, overflow: 'hidden' }}>
            {/* ── Sidebar ── */}
            <div style={{
                width: isMobile ? '100%' : '260px',
                background: '#1e293b',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                borderRight: isMobile ? 'none' : '1px solid rgba(255,255,255,0.05)',
                borderBottom: isMobile ? '1px solid rgba(255,255,255,0.05)' : 'none',
                flexShrink: 0,
                zIndex: 10
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
                    <div className="circle-avatar" style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', width: '42px', height: '42px', fontSize: '1.2rem', margin: 0, flexShrink: 0 }}>AD</div>
                    <div style={{ textAlign: 'left' }}>
                        <h2 style={{ fontSize: '1.1rem', margin: 0, color: '#f1f5f9' }}>LocalPill Admin</h2>
                        <span style={{ fontSize: '0.7rem', color: '#a5b4fc', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Secured Panel</span>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', gap: '0.4rem', overflowX: isMobile ? 'auto' : 'visible' }}>
                    {[
                        { key: 'analytics', label: `Analytics`, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg> },
                        { key: 'pharmacies', label: `Pharmacies (${pharmacies.length})`, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg> },
                        { key: 'requests', label: `Requests (${requests.length})`, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg> },
                        { key: 'users', label: `Users (${usersList.length})`, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg> },
                        { key: 'map', label: `Live Map`, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" /><line x1="9" y1="3" x2="9" y2="22" /><line x1="15" y1="2" x2="15" y2="21" /></svg> },
                        { key: 'broadcast', label: `Broadcast`, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.99 9.99a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.9 1.1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 8.79a16 16 0 0 0 6.13 6.13l1.01-1.01a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.03z" /></svg> },
                        { key: 'settings', label: `Settings`, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg> },
                        { key: 'log', label: `Activity Log`, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg> },
                    ].map(tab => (
                        <button className="btn-dynamic"
                            key={tab.key}
                            onClick={() => setView(tab.key)}
                            style={{
                                border: 'none', borderRadius: '8px', padding: '0.8rem 1rem',
                                fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                                background: view === tab.key ? 'rgba(99,102,241,0.15)' : 'transparent',
                                color: view === tab.key ? '#818cf8' : '#94a3b8',
                                textAlign: 'left', flexShrink: 0
                            }}
                        >
                            <span style={{ display: 'flex', filter: view === tab.key ? 'none' : 'grayscale(100%) opacity(0.7)' }}>{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
                    <button className="btn-dynamic" onClick={() => signOut(auth)} style={{ width: '100%', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '0.8rem', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}>
                        Sign Out
                    </button>
                </div>
            </div>

            {/* ── Main Content Area ── */}
            <div style={{ flex: 1, padding: isMobile ? '1.5rem' : '2.5rem', overflowY: 'auto', background: '#0f172a', position: 'relative' }}>

                {/* ── Header ── */}
                <div style={{ marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '1.8rem', color: '#f8fafc', margin: '0 0 0.4rem 0', fontWeight: 800 }}>{view.charAt(0).toUpperCase() + view.slice(1)}</h1>
                    <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: 0 }}>Manage the platform and view real-time operations.</p>
                </div>

                {/* ── Stats Cards (Only on certain tabs) ── */}
                {['analytics', 'pharmacies', 'requests', 'users', 'map'].includes(view) && (
                    <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', marginBottom: '2.5rem' }}>
                        <StatCard label="Patients" value={stats.totalUsers} color="#60a5fa" sub="registered" />
                        <StatCard label="Pharmacies" value={stats.totalPharmacies} color="#34d399" sub={`${stats.verifiedPharmacies} verified`} />
                        <StatCard label="Online Now" value={stats.onlinePharmacies} color="#4ade80" sub="active" />
                        <StatCard label="Requests" value={stats.activeRequests} color="#fb923c" sub={`${stats.todayRequests} today`} />
                    </div>
                )}

                {/* ══════════ ANALYTICS TAB ══════════ */}
                {view === 'analytics' && (
                    <AdminAnalytics analyticsData={analyticsData} />
                )}

                {/* ══════════ PHARMACIES TAB ══════════ */}
                {view === 'pharmacies' && (
                    <AdminPharmacies
                        filteredPharmacies={filteredPharmacies}
                        pharmSearch={pharmSearch} setPharmSearch={setPharmSearch}
                        pharmFilter={pharmFilter} setPharmFilter={setPharmFilter}
                        handleExportPharmacies={handleExportPharmacies}
                        selectedPharmacy={selectedPharmacy} setSelectedPharmacy={setSelectedPharmacy}
                        handleVerify={handleVerify} handleSuspendPharmacy={handleSuspendPharmacy}
                    />
                )}

                {/* ══════════ REQUESTS TAB ══════════ */}
                {view === 'requests' && (
                    <AdminRequests
                        filteredRequests={filteredRequests}
                        reqStatusFilter={reqStatusFilter} setReqStatusFilter={setReqStatusFilter}
                        handleExportRequests={handleExportRequests}
                        expandedReqId={expandedReqId} setExpandedReqId={setExpandedReqId}
                        handleForceClose={handleForceClose} setChatModalReqId={setChatModalReqId}
                    />
                )}

                {/* ══════════ USERS TAB ══════════ */}
                {view === 'users' && (
                    <div>
                        <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <SearchBar value={userSearch} onChange={setUserSearch} placeholder="Search by name or phone..." />
                            {['all', 'user', 'pharmacy', 'admin'].map(r => (
                                <FilterPill key={r} label={r === 'all' ? 'All Roles' : r.charAt(0).toUpperCase() + r.slice(1)} active={userRoleFilter === r} onClick={() => setUserRoleFilter(r)} color={roleColor(r)} />
                            ))}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <p style={{ color: '#64748b', fontSize: '0.8rem', margin: 0 }}>{filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}</p>
                            <button className="btn-dynamic" onClick={handleExportUsers} style={{ ...btnBase, background: 'rgba(16,185,129,0.15)', color: '#34d399', fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}>📥 Export CSV</button>
                        </div>

                        <div style={{ overflowX: 'auto', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.04)', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        <th style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>User</th>
                                        <th style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Contact</th>
                                        <th style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Role & Status</th>
                                        <th style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.length === 0 && (
                                        <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No users found.</td></tr>
                                    )}
                                    {filteredUsers.map(usr => (
                                        <tr key={usr.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <td style={{ padding: '1rem' }}>
                                                <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '0.95rem' }}>{usr.name || 'Unnamed'}</div>
                                                <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '2px', fontFamily: 'monospace' }}>ID: {usr.id.substring(0, 8)}...</div>
                                            </td>
                                            <td style={{ padding: '1rem', color: '#cbd5e1', fontSize: '0.85rem' }}>{usr.phone || 'No phone'}</td>
                                            <td style={{ padding: '1rem' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                                    <span style={{ background: roleBg(usr.role), color: roleColor(usr.role), padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>{usr.role || 'user'}</span>
                                                    {usr.isSuspended && <span style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>Suspended</span>}
                                                </div>
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
                                                    {usr.role !== 'admin' && (
                                                        <select
                                                            value={usr.role || 'user'}
                                                            onChange={e => handleRoleChange(usr.id, usr.name, e.target.value)}
                                                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: '#94a3b8', borderRadius: '6px', padding: '0.2rem 0.5rem', fontSize: '0.75rem', cursor: 'pointer', outline: 'none' }}
                                                        >
                                                            <option value="user">User</option>
                                                            <option value="pharmacy">Pharmacy</option>
                                                            <option value="admin">Admin</option>
                                                        </select>
                                                    )}
                                                    <button className="btn-dynamic" onClick={() => handleSuspendUser(usr.id, usr.name, usr.isSuspended)} style={{ ...btnBase, background: usr.isSuspended ? 'rgba(59,130,246,0.15)' : 'rgba(239,68,68,0.15)', color: usr.isSuspended ? '#60a5fa' : '#f87171', padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
                                                        {usr.isSuspended ? 'Unsuspend' : 'Suspend'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ══════════ LIVE MAP TAB ══════════ */}
                {view === 'map' && (
                    <div style={{ ...cardStyle, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '600px' }}>
                        <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1.1rem', color: '#f1f5f9', margin: '0 0 0.2rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ display: 'flex' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" /><line x1="9" y1="3" x2="9" y2="22" /><line x1="15" y1="2" x2="15" y2="21" /></svg></span> God View Map
                                </h3>
                                <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: 0 }}>
                                    Live tracking of <span style={{ color: '#34d399', fontWeight: 600 }}>{stats.onlinePharmacies} online pharmacies</span> and <span style={{ color: '#f59e0b', fontWeight: 600 }}>{stats.activeRequests} pending requests</span>.
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#cbd5e1' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#34d399' }}></div> Online Pharmacy</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }}></div> Patient Request</span>
                            </div>
                        </div>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <AdminMap pharmacies={pharmacies.filter(p => p.isOnline && p.location?.latitude)} requests={requests.filter(r => r.status === 'pending' && r.location?.latitude)} />
                        </div>
                    </div>
                )}

                {/* ══════════ BROADCAST TAB ══════════ */}
                {view === 'broadcast' && (
                    <div style={cardStyle}>
                        <h3 style={{ fontSize: '1.2rem', color: '#f1f5f9', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ display: 'flex' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.99 9.99a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.9 1.1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 8.79a16 16 0 0 0 6.13 6.13l1.01-1.01a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.03z" /></svg></span> Send Push Notification
                        </h3>
                        <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                            Send an urgent message or system update directly to partner pharmacies' devices.
                        </p>

                        <form onSubmit={handleBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Target Audience</label>
                                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#e2e8f0', fontSize: '0.9rem', cursor: 'pointer' }}>
                                        <input type="radio" name="target" value="online" checked={broadcastTarget === 'online'} onChange={e => setBroadcastTarget(e.target.value)} />
                                        Online Pharmacies ({stats.onlinePharmacies})
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#e2e8f0', fontSize: '0.9rem', cursor: 'pointer' }}>
                                        <input type="radio" name="target" value="all" checked={broadcastTarget === 'all'} onChange={e => setBroadcastTarget(e.target.value)} />
                                        All Verified Pharmacies ({stats.verifiedPharmacies})
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Title</label>
                                <input
                                    required
                                    value={broadcastTitle}
                                    onChange={e => setBroadcastTitle(e.target.value)}
                                    placeholder="e.g. System Update / Important Notice"
                                    style={{
                                        width: '100%', padding: '0.75rem', borderRadius: '8px',
                                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.15)',
                                        color: 'white', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box'
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Message Body</label>
                                <textarea
                                    required
                                    value={broadcastBody}
                                    onChange={e => setBroadcastBody(e.target.value)}
                                    placeholder="Type the notification content here..."
                                    rows="4"
                                    style={{
                                        width: '100%', padding: '0.75rem', borderRadius: '8px',
                                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.15)',
                                        color: 'white', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', resize: 'vertical'
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                                <button className="btn-dynamic"
                                    type="submit"
                                    disabled={isBroadcasting || !broadcastTitle || !broadcastBody}
                                    style={{
                                        background: isBroadcasting ? '#94a3b8' : '#3b82f6',
                                        color: 'white', border: 'none', borderRadius: '8px',
                                        padding: '0.8rem 1.5rem', fontSize: '0.9rem', fontWeight: 600,
                                        cursor: isBroadcasting ? 'not-allowed' : 'pointer',
                                        transition: 'background 0.2s',
                                        display: 'flex', alignItems: 'center', gap: '0.5rem'
                                    }}
                                >
                                    {isBroadcasting ? 'Sending...' : 'Send Broadcast'}
                                </button>
                                {broadcastResult && (
                                    <span style={{ fontSize: '0.85rem', color: broadcastResult.includes('❌') ? '#f87171' : '#34d399', fontWeight: 500 }}>
                                        {broadcastResult}
                                    </span>
                                )}
                            </div>
                        </form>
                    </div>
                )}

                {/* ══════════ SETTINGS TAB ══════════ */}
                {view === 'settings' && (
                    <div style={cardStyle}>
                        <h3 style={{ fontSize: '1.2rem', color: '#f1f5f9', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>⚙️</span> Global Platform Settings
                        </h3>
                        <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                            Configure default values and limits for the entire LocalPill platform.
                        </p>

                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            setSavingSettings(true);
                            try {
                                await setDoc(doc(db, 'settings', 'platformSettings'), platformSettings, { merge: true });
                                logAction('Updated Platform Settings');
                            } catch (err) {
                                console.error(err);
                            } finally {
                                setSavingSettings(false);
                            }
                        }} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                            <div>
                                <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                    Default Search Radius (km)
                                </label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    max="50"
                                    value={platformSettings.defaultSearchRadiusKm || ''}
                                    onChange={e => setPlatformSettings(prev => ({ ...prev, defaultSearchRadiusKm: Number(e.target.value) }))}
                                    style={{
                                        width: '100%', padding: '0.75rem', borderRadius: '8px',
                                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.15)',
                                        color: 'white', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box'
                                    }}
                                />
                                <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.3rem' }}>The default radius around a patient when searching for pharmacies.</div>
                            </div>

                            <div>
                                <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                    Request Timeout (Minutes)
                                </label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    max="120"
                                    value={platformSettings.requestTimeoutMinutes || ''}
                                    onChange={e => setPlatformSettings(prev => ({ ...prev, requestTimeoutMinutes: Number(e.target.value) }))}
                                    style={{
                                        width: '100%', padding: '0.75rem', borderRadius: '8px',
                                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.15)',
                                        color: 'white', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box'
                                    }}
                                />
                                <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.3rem' }}>Time before an unanswered request is automatically marked as closed/stale.</div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                                <button className="btn-dynamic"
                                    type="submit"
                                    disabled={savingSettings}
                                    style={{
                                        background: savingSettings ? '#94a3b8' : '#3b82f6',
                                        color: 'white', border: 'none', borderRadius: '8px',
                                        padding: '0.8rem 1.5rem', fontSize: '0.9rem', fontWeight: 600,
                                        cursor: savingSettings ? 'not-allowed' : 'pointer',
                                        transition: 'background 0.2s',
                                        display: 'flex', alignItems: 'center', gap: '0.5rem'
                                    }}
                                >
                                    {savingSettings ? 'Saving...' : 'Save Settings'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* ══════════ ACTIVITY LOG TAB ══════════ */}
                {view === 'log' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '1rem', color: '#f1f5f9', margin: 0 }}>Admin Activity Log (this session)</h3>
                            {activityLog.length > 0 && (
                                <button className="btn-dynamic" onClick={() => setActivityLog([])} style={{ ...btnBase, background: 'rgba(239,68,68,0.12)', color: '#f87171', fontSize: '0.75rem' }}>Clear Log</button>
                            )}
                        </div>
                        {activityLog.length === 0 ? (
                            <div style={{ padding: '3rem', textAlign: 'center', color: '#475569' }}>
                                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📝</div>
                                <p style={{ margin: 0 }}>No actions performed yet in this session.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {activityLog.map((log, i) => (
                                    <div key={i} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.85rem 1.1rem' }}>
                                        <span style={{ fontSize: '1.1rem' }}>✅</span>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ color: '#e2e8f0', fontSize: '0.88rem' }}>{log.action}</div>
                                            <div style={{ color: '#475569', fontSize: '0.75rem' }}>by {log.admin}</div>
                                        </div>
                                        <span style={{ color: '#475569', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{log.time}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ══════════ CHAT VIEWER MODAL ══════════ */}
                {chatModalReqId && (
                    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', boxSizing: 'border-box' }}>
                        <div style={{ background: '#1e293b', width: '100%', maxWidth: '500px', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '80vh', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                            <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)' }}>
                                <h3 style={{ margin: 0, fontSize: '1rem', color: '#f1f5f9' }}>Chat Viewer</h3>
                                <button className="btn-dynamic" onClick={() => { setChatModalReqId(null); setChatMessages([]); }} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer', padding: '0.2rem' }}>✕</button>
                            </div>
                            <div style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                Request ID: <span style={{ fontFamily: 'monospace', color: '#cbd5e1' }}>{chatModalReqId}</span>
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: '#0f172a' }}>
                                {chatMessages.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '2rem 0', color: '#64748b', fontSize: '0.9rem' }}>No messages found for this request.</div>
                                ) : (
                                    chatMessages.map(msg => (
                                        <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.senderRole === 'pharmacy' ? 'flex-start' : 'flex-end' }}>
                                            <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '2px', display: 'flex', gap: '0.4rem' }}>
                                                <span style={{ fontWeight: 600, color: msg.senderRole === 'pharmacy' ? '#34d399' : '#60a5fa' }}>{msg.senderName || msg.senderRole}</span>
                                                <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            <div style={{ background: msg.senderRole === 'pharmacy' ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)', border: `1px solid ${msg.senderRole === 'pharmacy' ? 'rgba(16,185,129,0.2)' : 'rgba(59,130,246,0.2)'}`, color: '#f1f5f9', padding: '0.6rem 0.8rem', borderRadius: '12px', borderTopLeftRadius: msg.senderRole === 'pharmacy' ? 0 : '12px', borderTopRightRadius: msg.senderRole === 'user' ? 0 : '12px', fontSize: '0.85rem', maxWidth: '85%' }}>
                                                {msg.text}
                                                {msg.hasPrescriptionReq && <div style={{ marginTop: '0.3rem', color: '#a5b4fc', fontSize: '0.75rem' }}>[Requested Prescription]</div>}
                                                {msg.isPrescriptionShare && <div style={{ marginTop: '0.3rem', color: '#34d399', fontSize: '0.75rem' }}>[Shared Prescription]</div>}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
