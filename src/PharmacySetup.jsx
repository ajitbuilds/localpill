import React, { useState } from 'react';
import { doc, setDoc, updateDoc, serverTimestamp, GeoPoint } from 'firebase/firestore';
import { db } from './firebase';
import * as geofire from 'geofire-common';

export default function PharmacySetup({ user, onComplete }) {
    const [storeName, setStoreName] = useState('');
    const [businessHours, setBusinessHours] = useState('9:00 AM - 9:00 PM');
    const [hasDelivery, setHasDelivery] = useState(false);
    const [freeDeliveryRadiusKm, setFreeDeliveryRadiusKm] = useState(5);
    const [minOrderForFreeDelivery, setMinOrderForFreeDelivery] = useState(500);
    const [discountPercentage, setDiscountPercentage] = useState(10);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [locating, setLocating] = useState(false);
    const isMounted = React.useRef(true);

    React.useEffect(() => {
        return () => {
            isMounted.current = false;
        };
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!storeName.trim()) {
            setError('Please enter your pharmacy name');
            return;
        }

        setLoading(true);
        setLocating(true);

        // Get geo-location
        if (!navigator.geolocation) {
            setError("Geolocation is not supported by your browser");
            setLoading(false);
            setLocating(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    const geoPoint = new GeoPoint(lat, lng);

                    // Auto-detect address via reverse geocoding (no API key needed)
                    let detectedAddress = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
                    try {
                        const geoRes = await fetch(
                            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
                            { headers: { 'Accept-Language': 'en' } }
                        );
                        const geoData = await geoRes.json();
                        if (geoData?.display_name) {
                            detectedAddress = geoData.display_name;
                        }
                    } catch (geoErr) {
                        console.warn('[PharmacySetup] Reverse geocoding failed, using coordinates as address', geoErr);
                    }

                    // Update user role
                    const userRef = doc(db, 'users', user.uid);
                    await updateDoc(userRef, {
                        role: 'pharmacy'
                    });

                    // Create pharmacy document with geohash + auto-detected address
                    const pharmacyRef = doc(db, 'pharmacies', user.uid);
                    const geohash = geofire.geohashForLocation([lat, lng]);

                    await setDoc(pharmacyRef, {
                        name: storeName.trim(),
                        phone: user.phoneNumber,
                        location: geoPoint,
                        geohash: geohash,
                        address: detectedAddress,   // Auto-detected from GPS via reverse geocoding
                        businessHours: businessHours.trim(),
                        hasDelivery,
                        freeDeliveryRadiusKm: hasDelivery ? Number(freeDeliveryRadiusKm) : 0,
                        minOrderForFreeDelivery: hasDelivery ? Number(minOrderForFreeDelivery) : 0,
                        discountPercentage: Number(discountPercentage),
                        frontPhotoUrl: '', // To be uploaded in profile
                        isVerified: false,
                        isOnline: false,
                        createdAt: serverTimestamp()
                    });

                    if (isMounted.current) {
                        onComplete();
                    }
                } catch (err) {
                    console.error(err);
                    if (isMounted.current) {
                        setError('Failed to setup pharmacy profile. Try again.');
                        setLoading(false);
                        setLocating(false);
                    }
                }
            },
            (geoError) => {
                console.error(geoError);
                if (isMounted.current) {
                    if (geoError.code === 1) {
                        setError("Location access blocked. Please allow location permission in your browser settings and try again.");
                    } else {
                        setError("GPS signal not found. Please ensure you have a stable internet connection and try again.");
                    }
                    setLoading(false);
                    setLocating(false);
                }
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    return (
        <div className="auth-step form-anim" style={{ maxWidth: '500px', margin: '0 auto', background: 'white', padding: '2.5rem', borderRadius: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}>
            <style>{`
                @keyframes formSlideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .form-anim {
                    animation: formSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
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
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#111827', margin: '0 0 0.5rem', letterSpacing: '-0.02em', textAlign: 'center' }}>Pharmacy Setup</h2>
            <p className="subtitle" style={{ color: '#6B7280', fontSize: '1rem', marginBottom: '2rem', textAlign: 'center' }}>Register your store</p>

            <form onSubmit={handleSubmit}>
                <div className="input-group">
                    <label>Store Name</label>
                    <input
                        type="text"
                        value={storeName}
                        onChange={(e) => setStoreName(e.target.value)}
                        placeholder="Main St Pharmacy"
                        className="modern-input"
                        style={{ transition: 'all 0.2s', width: '100%', boxSizing: 'border-box' }}
                        onFocus={e => { e.target.style.borderColor = '#22C55E'; e.target.style.boxShadow = '0 0 0 4px rgba(34,197,94,0.15)'; }}
                        onBlur={e => { e.target.style.borderColor = '#D1D5DB'; e.target.style.boxShadow = 'none'; }}
                        required
                        autoFocus
                    />
                </div>

                <div className="input-group">
                    <label>Phone Number</label>
                    <input
                        type="text"
                        value={user.phoneNumber || ''}
                        disabled
                        className="modern-input"
                        style={{ opacity: 0.7, cursor: 'not-allowed' }}
                    />
                </div>

                <div className="input-group">
                    <label>Business Hours</label>
                    <input
                        type="text"
                        value={businessHours}
                        onChange={(e) => setBusinessHours(e.target.value)}
                        placeholder="e.g. 9:00 AM - 10:00 PM"
                        className="modern-input"
                        style={{ transition: 'all 0.2s', width: '100%', boxSizing: 'border-box' }}
                        onFocus={e => { e.target.style.borderColor = '#22C55E'; e.target.style.boxShadow = '0 0 0 4px rgba(34,197,94,0.15)'; }}
                        onBlur={e => { e.target.style.borderColor = '#D1D5DB'; e.target.style.boxShadow = 'none'; }}
                    />
                </div>

                <div className="input-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <input
                        type="checkbox"
                        id="hasDelivery"
                        checked={hasDelivery}
                        onChange={(e) => setHasDelivery(e.target.checked)}
                        style={{ width: '18px', height: '18px', accentColor: '#22C55E', cursor: 'pointer' }}
                    />
                    <label htmlFor="hasDelivery" style={{ margin: 0, cursor: 'pointer', fontWeight: 600, color: '#374151' }}>Offers Home Delivery</label>
                </div>

                {hasDelivery && (
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                        <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                            <label>Free Delivery Radius (km)</label>
                            <input
                                type="number"
                                value={freeDeliveryRadiusKm}
                                onChange={(e) => setFreeDeliveryRadiusKm(e.target.value)}
                                min="0" step="0.1"
                                className="modern-input"
                                style={{ transition: 'all 0.2s', width: '100%', boxSizing: 'border-box' }}
                            />
                        </div>
                        <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                            <label>Min Order for Free Delivery (₹)</label>
                            <input
                                type="number"
                                value={minOrderForFreeDelivery}
                                onChange={(e) => setMinOrderForFreeDelivery(e.target.value)}
                                min="0"
                                className="modern-input"
                                style={{ transition: 'all 0.2s', width: '100%', boxSizing: 'border-box' }}
                            />
                        </div>
                    </div>
                )}

                <div className="input-group">
                    <label>Discount Percentage (%)</label>
                    <input
                        type="number"
                        value={discountPercentage}
                        onChange={(e) => setDiscountPercentage(e.target.value)}
                        placeholder="e.g. 10 for 10% off"
                        min="0" max="100"
                        className="modern-input"
                        style={{ transition: 'all 0.2s', width: '100%', boxSizing: 'border-box' }}
                        onFocus={e => { e.target.style.borderColor = '#22C55E'; e.target.style.boxShadow = '0 0 0 4px rgba(34,197,94,0.15)'; }}
                        onBlur={e => { e.target.style.borderColor = '#D1D5DB'; e.target.style.boxShadow = 'none'; }}
                    />
                </div>

                <div className="info-alert" style={{ marginBottom: '1.5rem', fontSize: '0.85rem', color: '#15803D', background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '12px 16px', borderRadius: '12px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                    <span>We will request your GPS location to tag your pharmacy on the map for patients.</span>
                </div>

                {error && <div className="error-alert" style={{ marginBottom: '1.5rem', background: '#FEF2F2', color: '#DC2626', padding: '0.75rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600, border: '1px solid #FECACA', display: 'flex', alignItems: 'center', gap: '6px' }}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>{error}</div>}

                <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', background: (loading || !storeName.trim()) ? '#D1D5DB' : 'linear-gradient(135deg, #22C55E, #16A34A)', boxShadow: (loading || !storeName.trim()) ? 'none' : '0 4px 16px rgba(34,197,94,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '1rem', borderRadius: '12px', fontSize: '1.05rem', fontWeight: 700, border: 'none', color: 'white', cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s', transform: 'scale(1)' }}
                    onMouseDown={e => { if (!loading && storeName.trim()) e.currentTarget.style.transform = 'scale(0.98)'; }}
                    onMouseUp={e => { if (!loading && storeName.trim()) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseEnter={e => { if (!loading && storeName.trim()) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}>
                    {loading ? <span className="spinner-small"></span> : (locating ? <><span className="spinner-small"></span> Finding location...</> : <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg> Complete Registration</>)}
                </button>
            </form>
        </div>
    );
}
