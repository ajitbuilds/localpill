import React, { useState, useEffect, useRef } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from './firebase';
import { signOut } from 'firebase/auth';
import ImageCropper from './components/ImageCropper';
import imageCompression from 'browser-image-compression';
import { useToast } from './components/ToastContext';

const GENDER_OPTIONS = ['Prefer not to say', 'Male', 'Female', 'Other'];

export default function UserProfile({ user, onBack, onSaved }) {
    const showToast = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Profile fields
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [gender, setGender] = useState('Prefer not to say');

    // Profile picture
    const [profilePicUrl, setProfilePicUrl] = useState('');
    const [newProfilePic, setNewProfilePic] = useState(null);
    const [newProfilePicPreview, setNewProfilePicPreview] = useState('');
    const [cropperImageSrc, setCropperImageSrc] = useState(null);

    const isMountedRef = useRef(true);
    useEffect(() => { return () => { isMountedRef.current = false; }; }, []);

    // Load existing profile
    useEffect(() => {
        let alive = true;
        const load = async () => {
            try {
                const snap = await getDoc(doc(db, 'users', user.uid));
                if (!alive) return;
                if (snap.exists()) {
                    const d = snap.data();
                    setName(d.name || '');
                    setAge(d.age ? String(d.age) : '');
                    setGender(d.gender || 'Prefer not to say');
                    setProfilePicUrl(d.profilePicUrl || '');
                }
            } catch (err) {
                console.error('Error loading user profile:', err);
            } finally {
                if (alive) setLoading(false);
            }
        };
        load();
        return () => { alive = false; };
    }, [user.uid]);

    // Profile pic selection → open cropper
    const handleProfilePicSelection = (e) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setCropperImageSrc(reader.result?.toString() || null);
            });
            reader.readAsDataURL(e.target.files[0]);
            e.target.value = null;
        }
    };

    // After crop → compress and preview
    const handleCropComplete = async (croppedBlob, croppedUrl) => {
        setCropperImageSrc(null);
        try {
            const compressed = await imageCompression(croppedBlob, {
                maxSizeMB: 0.2, maxWidthOrHeight: 800, useWebWorker: true,
            });
            const finalFile = new File([compressed], 'profile.jpg', { type: 'image/jpeg' });
            setNewProfilePic(finalFile);
            setNewProfilePicPreview(croppedUrl);
        } catch (err) {
            console.error('Compression error:', err);
            showToast('Could not process image. Try another.', 'error');
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!name.trim()) return showToast('Name is required', 'error');
        if (age && (isNaN(Number(age)) || Number(age) < 1 || Number(age) > 120)) {
            return showToast('Please enter a valid age (1–120)', 'error');
        }

        setSaving(true);
        try {
            let finalPicUrl = profilePicUrl;

            if (newProfilePic) {
                const path = `users/${user.uid}/profile/pic_${Date.now()}.jpg`;
                const storageRef = ref(storage, path);
                const snapshot = await uploadBytesResumable(storageRef, newProfilePic);
                finalPicUrl = await getDownloadURL(snapshot.ref);
            }

            await setDoc(doc(db, 'users', user.uid), {
                name: name.trim(),
                age: age ? Number(age) : null,
                gender,
                profilePicUrl: finalPicUrl,
                updatedAt: serverTimestamp(),
            }, { merge: true });

            setProfilePicUrl(finalPicUrl);
            setNewProfilePic(null);
            setNewProfilePicPreview('');
            showToast('Profile updated!', 'success');
            onSaved?.(name.trim(), finalPicUrl);
        } catch (err) {
            console.error('Save error:', err);
            showToast('Failed to save. Please try again.', 'error');
        } finally {
            setSaving(false);
        }
    };

    // Profile completion
    const completionFields = [
        { label: 'Name', value: name },
        { label: 'Age', value: age },
        { label: 'Gender', value: gender !== 'Prefer not to say' ? gender : '' },
        { label: 'Profile Picture', value: profilePicUrl || newProfilePicPreview },
    ];
    const completedCount = completionFields.filter(f => f.value?.toString().trim()).length;
    const completionPct = Math.round((completedCount / completionFields.length) * 100);
    const progressColor = completionPct === 100 ? '#22C55E' : completionPct >= 50 ? '#F59E0B' : '#EF4444';
    const missingField = completionFields.find(f => !f.value?.toString().trim());

    const avatarSrc = newProfilePicPreview || profilePicUrl;

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#6B7280' }}>
                Loading profile…
            </div>
        );
    }

    return (
        <div className="animate-in bottom-nav-padding" style={{ width: '100%', maxWidth: '720px', padding: '0.5rem 0', textAlign: 'left' }}>
            {cropperImageSrc && (
                <ImageCropper
                    imageSrc={cropperImageSrc}
                    onCropComplete={handleCropComplete}
                    onCancel={() => setCropperImageSrc(null)}
                />
            )}

            {/* ── Cover Banner ── */}
            <div style={{ borderRadius: '20px', overflow: 'hidden', marginBottom: '1.5rem', position: 'relative' }}>
                <div style={{
                    height: '130px',
                    background: 'linear-gradient(135deg, #0f172a 0%, #1a2e3d 60%, #0a192a 100%)',
                    position: 'relative',
                }}>
                    <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '140px', height: '140px', background: 'rgba(220,252,231,0.08)', borderRadius: '50%' }} />
                    <div style={{ position: 'absolute', bottom: '-20px', left: '-20px', width: '100px', height: '100px', background: 'rgba(34,197,94,0.07)', borderRadius: '50%' }} />

                    {/* Back button */}
                    <button className="btn-dynamic"
                        onClick={onBack}
                        style={{
                            position: 'absolute', top: '14px', left: '14px',
                            background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
                            color: '#fff', borderRadius: '10px',
                            width: '34px', height: '34px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1rem', zIndex: 2
                        }}
                    >←</button>
                </div>

                {/* Avatar + name row */}
                <div style={{
                    background: '#fff', padding: '0 1.5rem 1.25rem',
                    borderRadius: '0 0 20px 20px', border: '1px solid #E5E7EB',
                    borderTop: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.06)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
                        {/* Avatar — click to change */}
                        <div
                            style={{
                                width: '76px', height: '76px', borderRadius: '50%',
                                border: '4px solid #fff', background: '#F3F4F6',
                                overflow: 'hidden', flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                                cursor: 'pointer', position: 'relative',
                                marginTop: '-38px'
                            }}
                            onClick={() => document.getElementById('user-pic-input').click()}
                            title="Click to change profile picture"
                        >
                            {avatarSrc ? (
                                <img src={avatarSrc} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                                </svg>
                            )}
                            {/* Hover overlay */}
                            <div style={{
                                position: 'absolute', inset: 0,
                                background: 'rgba(0,0,0,0)', display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                                transition: 'background 0.2s', borderRadius: '50%'
                            }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.3)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0)'}
                            >
                                <span style={{ opacity: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}
                                    onMouseEnter={e => e.currentTarget.style.opacity = 1}
                                    onMouseLeave={e => e.currentTarget.style.opacity = 0}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                                </span>
                            </div>
                        </div>
                        <input id="user-pic-input" type="file" accept="image/*" onChange={handleProfilePicSelection} style={{ display: 'none' }} />

                        {/* Name + phone */}
                        <div style={{ flex: 1, paddingTop: '10px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#111827' }}>
                                {name || 'Your Name'}
                            </h3>
                            <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.65 3.42 2 2 0 0 1 3.62 1.24h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.83a16 16 0 0 0 6 6l.86-.86a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.5 16.92z" /></svg>
                                {user.phoneNumber || 'No phone'}
                            </p>
                        </div>
                    </div>

                    {/* Profile Completion Bar */}
                    <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '0.875rem 1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151' }}>Profile Completion</span>
                            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: progressColor }}>{completionPct}%</span>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: '#E5E7EB', borderRadius: '8px', overflow: 'hidden' }}>
                            <div style={{ width: `${completionPct}%`, height: '100%', background: progressColor, borderRadius: '8px', transition: 'width 0.4s ease' }} />
                        </div>
                        {completionPct < 100 && missingField && (
                            <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: '#6B7280' }}>
                                Add your <strong>{missingField.label}</strong> to complete your profile
                            </p>
                        )}
                        {completionPct === 100 && (
                            <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: '#22C55E', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                                Profile 100% complete!
                            </p>
                        )}
                    </div>
                </div>
            </div>


            {/* ── Form ── */}
            <form onSubmit={handleSave} className="form-anim" style={{ marginTop: '1rem' }}>
                <style>{`
                    @keyframes formSlideUp {
                        from { opacity: 0; transform: translateY(15px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    .form-anim {
                        animation: formSlideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
                    }
                    .spinner-small {
                        width: 14px;
                        height: 14px;
                        border: 2px solid rgba(255, 255, 255, 0.3);
                        border-radius: 50%;
                        border-top-color: white;
                        animation: spin 1s ease-in-out infinite;
                    }
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                `}</style>
                <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid #E5E7EB', marginBottom: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <h4 style={{ margin: '0 0 1.25rem', color: '#111827', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', paddingBottom: '0.75rem', borderBottom: '1px solid #F3F4F6' }}>
                        Personal Details
                    </h4>

                    {/* Profile picture (also in form) */}
                    <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#F3F4F6', border: '1px solid #E5E7EB', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {avatarSrc ? (
                                <img src={avatarSrc} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                                </svg>
                            )}
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, color: '#374151', fontSize: '0.85rem' }}>Profile Picture</label>
                            <input type="file" accept="image/*" onChange={handleProfilePicSelection} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px dashed #D1D5DB', background: '#F9FAFB', boxSizing: 'border-box', fontSize: '0.85rem' }} />
                        </div>
                    </div>

                    {/* Name */}
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, color: '#374151', fontSize: '0.85rem' }}>Full Name *</label>
                        <input
                            type="text" value={name} required
                            onChange={e => setName(e.target.value)}
                            className="modern-input" placeholder="Your full name"
                        />
                    </div>

                    {/* Phone (read‑only) */}
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, color: '#374151', fontSize: '0.85rem' }}>Mobile Number</label>
                        <input
                            type="tel" value={user.phoneNumber || 'Not linked'} readOnly
                            className="modern-input"
                            style={{ background: '#F3F4F6', color: '#6B7280', cursor: 'default' }}
                        />
                        <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                            Linked via OTP — cannot be changed here
                        </p>
                    </div>

                    {/* Age */}
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, color: '#374151', fontSize: '0.85rem' }}>Age</label>
                        <input
                            type="number" value={age} min="1" max="120"
                            onChange={e => setAge(e.target.value)}
                            className="modern-input" placeholder="e.g. 28"
                        />
                    </div>

                    {/* Gender */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, color: '#374151', fontSize: '0.85rem' }}>Gender</label>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {GENDER_OPTIONS.map(opt => (
                                <button className="btn-dynamic"
                                    key={opt} type="button"
                                    onClick={() => setGender(opt)}
                                    style={{
                                        padding: '0.45rem 1rem', borderRadius: '20px', fontSize: '0.82rem', fontWeight: 600,
                                        border: gender === opt ? '1.5px solid #16A34A' : '1.5px solid #E5E7EB',
                                        background: gender === opt ? '#16A34A' : '#F9FAFB',
                                        color: gender === opt ? '#fff' : '#374151',
                                        cursor: 'pointer', transition: 'all 0.15s'
                                    }}
                                >{opt}</button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Save button */}
                <button
                    type="submit" disabled={saving}
                    className="ripple-btn"
                    style={{
                        width: '100%', padding: '0.9rem', minHeight: '52px',
                        background: saving ? '#D1D5DB' : 'linear-gradient(135deg, #22C55E, #15803D)',
                        color: 'white', border: 'none', borderRadius: '14px',
                        fontSize: '1rem', fontWeight: 700,
                        cursor: saving ? 'not-allowed' : 'pointer',
                        boxShadow: saving ? 'none' : '0 4px 14px rgba(34,197,94,0.35)',
                        transition: 'all 0.2s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        transform: 'scale(1)'
                    }}
                    onMouseDown={e => { if (!saving) e.currentTarget.style.transform = 'scale(0.98)'; }}
                    onMouseUp={e => { if (!saving) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                >
                    {saving ? <><span className="spinner-small" /> Saving…</> : 'Save Profile'}
                </button>
            </form>

            {/* ── Logout ── */}
            <button className="btn-dynamic"
                onClick={() => signOut(auth)}
                style={{
                    width: '100%', marginTop: '1.75rem', marginBottom: '1rem',
                    background: '#FEF2F2', border: '1px solid #FECACA',
                    color: '#DC2626', padding: '0.875rem',
                    borderRadius: '14px', fontWeight: 700, fontSize: '0.95rem',
                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: '8px', transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#FEF2F2'; }}
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Log Out
            </button>
        </div >
    );
}
