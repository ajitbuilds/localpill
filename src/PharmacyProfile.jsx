import React, { useState, useEffect, useRef } from 'react';
import { doc, getDoc, setDoc, serverTimestamp, GeoPoint } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from './firebase';
import { signOut } from 'firebase/auth';
import ImageCropper from './components/ImageCropper';
import imageCompression from 'browser-image-compression';
import { useToast } from './components/ToastContext';

export default function PharmacyProfile({ user, onNavigate }) {
    const showToast = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form fields
    const [ownerName, setOwnerName] = useState('');
    const [mobile, setMobile] = useState('');
    const [email, setEmail] = useState('');

    const [pharmacyName, setPharmacyName] = useState('');
    const [address, setAddress] = useState('');
    const [licenseNumber, setLicenseNumber] = useState('');
    const [currentGeoPoint, setCurrentGeoPoint] = useState(null);

    // Existing URLs
    const [profilePicUrl, setProfilePicUrl] = useState('');
    const [licenseDocumentUrl, setLicenseDocumentUrl] = useState('');
    const [frontPhotoUrl, setFrontPhotoUrl] = useState('');
    const [pharmacyImages, setPharmacyImages] = useState([]);
    const [isVerified, setIsVerified] = useState(false);

    // Business Details
    const [businessHours, setBusinessHours] = useState('');
    const [hasDelivery, setHasDelivery] = useState(false);
    const [freeDeliveryRadiusKm, setFreeDeliveryRadiusKm] = useState(5);
    const [minOrderForFreeDelivery, setMinOrderForFreeDelivery] = useState(500);
    const [discountPercentage, setDiscountPercentage] = useState(0);

    // New file uploads
    const [newProfilePic, setNewProfilePic] = useState(null);
    const [newProfilePicPreview, setNewProfilePicPreview] = useState('');
    const [newLicenseDocument, setNewLicenseDocument] = useState(null);
    const [newFrontPhoto, setNewFrontPhoto] = useState(null);
    const [newFrontPhotoPreview, setNewFrontPhotoPreview] = useState('');
    const [newPharmacyImages, setNewPharmacyImages] = useState([]);

    // Preview URLs for new images
    const [newImagesPreview, setNewImagesPreview] = useState([]);

    const isMountedRef = useRef(true);
    useEffect(() => {
        return () => { isMountedRef.current = false; };
    }, []);

    useEffect(() => {
        let isMounted = true;
        const fetchProfile = async () => {
            try {
                const docSnap = await getDoc(doc(db, 'pharmacies', user.uid));
                if (!isMounted) return;

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setOwnerName(data.ownerName || '');
                    setMobile(data.mobile || user.phoneNumber || '');
                    setEmail(data.email || '');
                    setPharmacyName(data.pharmacyName || data.name || '');
                    const fetchedAddress = data.address || data.locationName || '';
                    setAddress(fetchedAddress);

                    if (data.location) {
                        setCurrentGeoPoint(data.location);
                        // Auto-fill address via Geocoding if it is still empty but they have a location
                        if (!fetchedAddress && window.google?.maps?.Geocoder) {
                            const geocoder = new window.google.maps.Geocoder();
                            geocoder.geocode({ location: { lat: data.location.latitude, lng: data.location.longitude } }, (results, status) => {
                                if (isMounted && status === 'OK' && results[0]) {
                                    setAddress(results[0].formatted_address);
                                }
                            });
                        }
                    }

                    setLicenseNumber(data.licenseNumber || '');
                    setLicenseDocumentUrl(data.licenseDocumentUrl || '');
                    setProfilePicUrl(data.profilePicUrl || '');
                    setFrontPhotoUrl(data.frontPhotoUrl || '');
                    setPharmacyImages(data.pharmacyImages || []);
                    setIsVerified(data.isVerified || false);
                    setBusinessHours(data.businessHours || '');
                    setHasDelivery(data.hasDelivery || false);
                    setFreeDeliveryRadiusKm(data.freeDeliveryRadiusKm !== undefined ? data.freeDeliveryRadiusKm : 5);
                    setMinOrderForFreeDelivery(data.minOrderForFreeDelivery !== undefined ? data.minOrderForFreeDelivery : 500);
                    setDiscountPercentage(data.discountPercentage || 0);
                } else {
                    setMobile(user.phoneNumber || '');
                    setAddress('');
                }
            } catch (err) {
                console.error("Error fetching profile:", err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        fetchProfile();
        return () => { isMounted = false; };
    }, [user]);

    const handleDetectLocation = () => {
        if (!navigator.geolocation) {
            showToast("Geolocation is not supported by your browser", "error");
            return;
        }

        setAddress('Detecting location...');

        navigator.geolocation.getCurrentPosition(
            (position) => {
                if (!isMountedRef.current) return;
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                setCurrentGeoPoint(new GeoPoint(lat, lng));

                if (window.google?.maps?.Geocoder) {
                    const geocoder = new window.google.maps.Geocoder();
                    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
                        if (!isMountedRef.current) return;
                        if (status === 'OK' && results[0]) {
                            setAddress(results[0].formatted_address);
                        } else {
                            setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
                        }
                    });
                } else {
                    setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
                }
            },
            (err) => {
                if (!isMountedRef.current) return;
                console.error('[Location]', err);
                setAddress('');
                if (err.code === 1) {
                    // Permission denied — user must enable from browser settings
                    showToast("Location access blocked. Please allow location in your browser settings and try again.", "error");
                } else {
                    // GPS unavailable / timeout — just ask to retry
                    showToast("Could not detect location. Please try again.", "error");
                }
            },
            // maximumAge: 0 = ALWAYS get fresh location, never use cached
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    const MAX_PHARMACY_IMAGES = 5;
    const MAX_IMAGE_SIZE_MB = 5;

    const handleImageSelection = (e) => {
        if (!e.target.files) return;

        const currentTotal = pharmacyImages.length + newPharmacyImages.length;
        const slotsLeft = MAX_PHARMACY_IMAGES - currentTotal;

        if (slotsLeft <= 0) {
            showToast(`Maximum ${MAX_PHARMACY_IMAGES} photos allowed.`, 'error');
            e.target.value = null;
            return;
        }

        const incoming = Array.from(e.target.files);
        const validFiles = [];
        const validPreviews = [];

        for (const file of incoming) {
            if (validFiles.length >= slotsLeft) break;
            if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
                showToast(`"${file.name}" is too large. Max ${MAX_IMAGE_SIZE_MB}MB per photo.`, 'error');
                continue;
            }
            validFiles.push(file);
            validPreviews.push(URL.createObjectURL(file));
        }

        if (validFiles.length > 0) {
            setNewPharmacyImages(prev => [...prev, ...validFiles]);
            setNewImagesPreview(prev => [...prev, ...validPreviews]);
        }

        e.target.value = null;
    };

    const removeNewImage = (index) => {
        setNewPharmacyImages(prev => prev.filter((_, i) => i !== index));
        setNewImagesPreview(prev => {
            // Revoke object url to prevent memory leak
            URL.revokeObjectURL(prev[index]);
            return prev.filter((_, i) => i !== index);
        });
    };

    const handleFrontPhotoSelection = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
                showToast(`Image is too large. Max ${MAX_IMAGE_SIZE_MB}MB.`, 'error');
                return;
            }
            setNewFrontPhoto(file);
            setNewFrontPhotoPreview(URL.createObjectURL(file));
        }
    };

    const [cropperImageSrc, setCropperImageSrc] = useState(null);
    const [showVerifiedTooltip, setShowVerifiedTooltip] = useState(false);

    const handleProfilePicSelection = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setCropperImageSrc(reader.result?.toString() || null);
            });
            reader.readAsDataURL(file);
            // Clear input value so selecting the same file again triggers onChange
            e.target.value = null;
        }
    };

    const handleCropComplete = async (croppedBlob, croppedUrl) => {
        setCropperImageSrc(null); // Close cropper modal

        try {
            // Internally compress the cropped image to lowest reasonable size but high quality
            const options = {
                maxSizeMB: 0.2, // Aim for ~200kb
                maxWidthOrHeight: 800, // Profile pics don't need to be huge
                useWebWorker: true,
            };

            const compressedFile = await imageCompression(croppedBlob, options);

            // Re-wrap the blob as a File object so the rest of the existing code works seamlessly
            const finalImageFile = new File([compressedFile], `profile_crop.jpg`, { type: 'image/jpeg' });

            setNewProfilePic(finalImageFile);
            setNewProfilePicPreview(croppedUrl);
        } catch (error) {
            console.error("Error compressing image", error);
            showToast("Failed to process profile picture. Please try another image.", "error");
        }
    };

    const removeExistingImage = (url) => {
        setPharmacyImages(prev => prev.filter(item => item !== url));
    };

    const handleSave = async (e) => {
        e.preventDefault();

        // Basic Validation
        if (!ownerName.trim()) return showToast('Owner Name is required', 'error');
        if (!pharmacyName.trim()) return showToast('Pharmacy Name is required', 'error');
        if (!address.trim()) return showToast('Address is required', 'error');

        setSaving(true);

        try {
            let updatedLicenseUrl = licenseDocumentUrl;
            let updatedProfilePicUrl = profilePicUrl;
            let updatedFrontPhotoUrl = frontPhotoUrl;

            // Upload Profile Pic
            if (newProfilePic) {
                const ext = newProfilePic.name.split('.').pop();
                const path = `pharmacies/${user.uid}/profile/pic_${Date.now()}.${ext}`;
                const profileRef = ref(storage, path);
                const snapshot = await uploadBytesResumable(profileRef, newProfilePic);
                updatedProfilePicUrl = await getDownloadURL(snapshot.ref);
            }

            // Upload License Doc
            if (newLicenseDocument) {
                const ext = newLicenseDocument.name.split('.').pop();
                const path = `pharmacies/${user.uid}/license/doc_${Date.now()}.${ext}`;
                const licenseRef = ref(storage, path);
                const snapshot = await uploadBytesResumable(licenseRef, newLicenseDocument);
                updatedLicenseUrl = await getDownloadURL(snapshot.ref);
            }

            // Upload Front Photo
            if (newFrontPhoto) {
                let fileToUpload = newFrontPhoto;
                try {
                    fileToUpload = await imageCompression(newFrontPhoto, { maxSizeMB: 1, maxWidthOrHeight: 1280, useWebWorker: true });
                } catch (compressErr) {
                    console.warn('Front photo compression failed', compressErr);
                }
                const ext = fileToUpload.name?.split('.').pop() || 'jpg';
                const path = `pharmacies/${user.uid}/front/pic_${Date.now()}.${ext}`;
                const frontRef = ref(storage, path);
                const snapshot = await uploadBytesResumable(frontRef, fileToUpload);
                updatedFrontPhotoUrl = await getDownloadURL(snapshot.ref);
            }

            // Upload Pharmacy Images (auto-compress to ≤1MB before upload)
            const newUploadedUrls = [];
            for (const file of newPharmacyImages) {
                let fileToUpload = file;
                try {
                    fileToUpload = await imageCompression(file, {
                        maxSizeMB: 1,
                        maxWidthOrHeight: 1280,
                        useWebWorker: true,
                    });
                } catch (compressErr) {
                    console.warn('Image compression failed, uploading original:', compressErr);
                }
                const ext = fileToUpload.name?.split('.').pop() || 'jpg';
                const path = `pharmacies/${user.uid}/images/img_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
                const fileRef = ref(storage, path);
                const snapshot = await uploadBytesResumable(fileRef, fileToUpload);
                const url = await getDownloadURL(snapshot.ref);
                newUploadedUrls.push(url);
            }

            const finalPharmacyImages = [...pharmacyImages, ...newUploadedUrls];

            const profileData = {
                ownerName: ownerName.trim(),
                mobile: mobile.trim(),
                email: email.trim(),
                name: pharmacyName.trim(),
                pharmacyName: pharmacyName.trim(),
                address: address.trim(),
                licenseNumber: licenseNumber.trim(),
                licenseDocumentUrl: updatedLicenseUrl,
                profilePicUrl: updatedProfilePicUrl,
                frontPhotoUrl: updatedFrontPhotoUrl,
                pharmacyImages: finalPharmacyImages,
                businessHours: businessHours.trim(),
                hasDelivery,
                freeDeliveryRadiusKm: hasDelivery ? Number(freeDeliveryRadiusKm) : 0,
                minOrderForFreeDelivery: hasDelivery ? Number(minOrderForFreeDelivery) : 0,
                discountPercentage: Number(discountPercentage),
                updatedAt: serverTimestamp()
            };

            if (currentGeoPoint) {
                profileData.location = currentGeoPoint;
            }

            await setDoc(doc(db, 'pharmacies', user.uid), profileData, { merge: true });

            setLicenseDocumentUrl(updatedLicenseUrl);
            setProfilePicUrl(updatedProfilePicUrl);
            setFrontPhotoUrl(updatedFrontPhotoUrl);
            setPharmacyImages(finalPharmacyImages);
            setNewPharmacyImages([]);
            setNewImagesPreview([]);
            setNewLicenseDocument(null);
            setNewProfilePic(null);
            setNewProfilePicPreview('');
            setNewFrontPhoto(null);
            setNewFrontPhotoPreview('');

            showToast('Profile updated successfully', 'success');

        } catch (err) {
            console.error("Error saving profile — full error:", err);
            console.error("Error code:", err?.code);
            console.error("Error message:", err?.message);
            console.error("Error name:", err?.name);
            // Show specific error messages based on error type
            const code = err?.code || '';
            const msg = err?.message?.toLowerCase() || '';
            if (code === 'storage/unauthorized' || code === 'permission-denied' || msg.includes('unauthorized')) {
                showToast('Upload not authorized. Please log out and log in again.', 'error');
            } else if (code === 'storage/quota-exceeded') {
                showToast('Storage quota exceeded. Please contact support.', 'error');
            } else if (code === 'storage/invalid-format' || msg.includes('invalid format')) {
                showToast('Image format not supported. Please use JPG or PNG.', 'error');
            } else if (msg.includes('network') || code === 'storage/retry-limit-exceeded' || msg.includes('fetch')) {
                showToast('Network error. Please check your connection and try again.', 'error');
            } else if (code.includes('appCheck') || msg.includes('appcheck') || msg.includes('app-check') || msg.includes('recaptcha')) {
                showToast('Verification failed. Please refresh the page and try again.', 'error');
            } else if (msg.includes('cross-origin') || msg.includes('cors')) {
                showToast('Browser blocked the upload. Please try again.', 'error');
            } else {
                showToast(`Save failed: ${err?.code || err?.message || 'Unknown error'}`, 'error');
            }
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div style={{ textAlign: 'center', padding: '2rem' }}>Loading profile...</div>;
    }

    // ── Profile Completion Calculation ──
    const completionFields = [
        { key: 'ownerName', value: ownerName, label: 'Owner Name' },
        { key: 'pharmacyName', value: pharmacyName, label: 'Pharmacy Name' },
        { key: 'address', value: address, label: 'Address' },
        { key: 'mobile', value: mobile, label: 'Mobile' },
        { key: 'email', value: email, label: 'Email' },
        { key: 'licenseNumber', value: licenseNumber, label: 'License Number' },
        { key: 'profilePic', value: profilePicUrl || newProfilePicPreview, label: 'Profile Picture' },
        { key: 'licenseDoc', value: licenseDocumentUrl, label: 'License Document' },
        { key: 'frontPhoto', value: frontPhotoUrl || newFrontPhotoPreview, label: 'Front Photo' }
    ];
    const completedCount = completionFields.filter(f => f.value?.toString().trim()).length;
    const completionPct = Math.round((completedCount / completionFields.length) * 100);
    const missingField = completionFields.find(f => !f.value?.toString().trim());
    const progressColor = completionPct === 100 ? '#22C55E' : completionPct >= 60 ? '#F59E0B' : '#EF4444';

    return (
        <div style={{ textAlign: 'left', paddingBottom: '2rem' }}>
            <style>{`
                .spinner-small {
                    width: 14px;
                    height: 14px;
                    border: 2px solid rgba(255, 255, 255, 0.3);
                    border-radius: 50%;
                    border-top-color: white;
                    animation: spin 1s ease-in-out infinite;
                    display: inline-block;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
            {cropperImageSrc && (
                <ImageCropper
                    imageSrc={cropperImageSrc}
                    onCropComplete={handleCropComplete}
                    onCancel={() => setCropperImageSrc(null)}
                />
            )}

            {/* ── Cover Banner Hero ── */}
            <div style={{
                borderRadius: '20px',
                overflow: 'hidden',
                marginBottom: '1.5rem',
                position: 'relative',
            }}>
                {/* Banner background */}
                <div style={{
                    height: '140px',
                    background: newFrontPhotoPreview ? `url(${newFrontPhotoPreview})` : frontPhotoUrl ? `url(${frontPhotoUrl})` : pharmacyImages?.length > 0 ? `url(${pharmacyImages[0]})` : 'linear-gradient(135deg, #0f172a 0%, #1e3a2f 60%, #0a2013 100%)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    position: 'relative',
                }}>
                    {/* Dark gradient overlay at the top to ensure back button visibility */}
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 50%)' }} />
                    {/* Decorative circles */}
                    <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '140px', height: '140px', background: 'rgba(34,197,94,0.08)', borderRadius: '50%' }} />
                    <div style={{ position: 'absolute', bottom: '-20px', left: '-20px', width: '100px', height: '100px', background: 'rgba(59,130,246,0.07)', borderRadius: '50%' }} />

                    {/* Back button */}
                    <button className="btn-dynamic"
                        onClick={() => onNavigate('/')}
                        style={{
                            position: 'absolute', top: '14px', left: '14px',
                            background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
                            color: '#fff', borderRadius: '10px',
                            width: '34px', height: '34px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1rem', zIndex: 2
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
                    </button>
                </div>

                {/* Profile avatar overlaid on banner */}
                <div style={{
                    background: '#fff',
                    padding: '0 1.5rem 1.25rem',
                    borderRadius: '0 0 20px 20px',
                    border: '1px solid #E5E7EB',
                    borderTop: 'none',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.06)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
                        {/* Avatar */}
                        <div style={{
                            width: '76px', height: '76px', borderRadius: '18px',
                            border: '4px solid #fff',
                            background: '#F3F4F6',
                            overflow: 'hidden', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                            cursor: 'pointer',
                            position: 'relative',
                            marginTop: '-38px' // Pulls only the avatar up
                        }}
                            onClick={() => document.getElementById('profile-pic-input-hero').click()}
                            title="Click to change profile picture"
                        >
                            {newProfilePicPreview ? (
                                <img src={newProfilePicPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : profilePicUrl ? (
                                <img src={profilePicUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #DCFCE7, #86EFAC)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#166534', fontWeight: 800, fontSize: '1.8rem', letterSpacing: '-0.02em' }}>
                                    {pharmacyName ? pharmacyName.trim()[0].toUpperCase() : '?'}
                                </div>
                            )}
                            <div style={{
                                position: 'absolute', inset: 0,
                                background: 'rgba(0,0,0,0)', display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                                transition: 'background 0.2s', fontSize: '1.1rem'
                            }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.35)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0)'}
                            >
                            </div>
                        </div>
                        <input
                            id="profile-pic-input-hero"
                            type="file" accept="image/*"
                            onChange={handleProfilePicSelection}
                            style={{ display: 'none' }}
                        />

                        {/* Name + verified badge */}
                        <div style={{ flex: 1, paddingTop: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#111827' }}>
                                    {pharmacyName || 'Your Pharmacy'}
                                </h3>
                                {/* BUG-R-05 fix: only show Verified if isVerified===true */}
                                <div style={{ position: 'relative' }}>
                                    {isVerified ? (
                                        <span
                                            onMouseEnter={() => setShowVerifiedTooltip(true)}
                                            onMouseLeave={() => setShowVerifiedTooltip(false)}
                                            style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                background: '#DCFCE7', color: '#15803D',
                                                border: '1px solid #BBF7D0',
                                                padding: '2px 8px', borderRadius: '20px',
                                                fontSize: '0.7rem', fontWeight: 700,
                                                cursor: 'help'
                                            }}
                                        >
                                            ✓ Verified
                                        </span>
                                    ) : (
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                                            background: '#F3F4F6', color: '#6B7280',
                                            border: '1px solid #E5E7EB',
                                            padding: '2px 8px', borderRadius: '20px',
                                            fontSize: '0.7rem', fontWeight: 600
                                        }}>
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg> Pending Verification
                                        </span>
                                    )}
                                    {showVerifiedTooltip && (
                                        <div style={{
                                            position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%',
                                            transform: 'translateX(-50%)',
                                            background: '#1F2937', color: '#fff',
                                            padding: '8px 12px', borderRadius: '10px',
                                            fontSize: '0.75rem', lineHeight: 1.5,
                                            width: '200px', textAlign: 'center',
                                            boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
                                            zIndex: 20, fontWeight: 500,
                                            pointerEvents: 'none'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center', marginBottom: '4px' }}>
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                            </div>
                                            This pharmacy has been verified by LocalPill — license and address have been confirmed.
                                            <div style={{
                                                position: 'absolute', top: '100%', left: '50%',
                                                transform: 'translateX(-50%)',
                                                borderLeft: '6px solid transparent',
                                                borderRight: '6px solid transparent',
                                                borderTop: '6px solid #1F2937'
                                            }} />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#6B7280' }}>
                                {ownerName ? `Owner: ${ownerName}` : 'Complete your profile below'}
                            </p>
                        </div>
                    </div>

                    {/* ── Profile Completion Progress Bar ── */}
                    <div style={{
                        background: '#F9FAFB', border: '1px solid #E5E7EB',
                        borderRadius: '12px', padding: '0.875rem 1rem'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151' }}>
                                Profile Completion
                            </span>
                            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: progressColor }}>
                                {completionPct}%
                            </span>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: '#E5E7EB', borderRadius: '8px', overflow: 'hidden' }}>
                            <div style={{
                                width: `${completionPct}%`, height: '100%',
                                background: progressColor,
                                borderRadius: '8px',
                                transition: 'width 0.4s ease, background 0.3s'
                            }} />
                        </div>
                        {completionPct < 100 && missingField && (
                            <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: '#6B7280' }}>
                                Add your <strong>{missingField.label}</strong> to improve your profile
                            </p>
                        )}
                        {completionPct === 100 && (
                            <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: '#22C55E', fontWeight: 600 }}>
                                Profile 100% complete!
                            </p>
                        )}
                    </div>
                </div>
            </div>


            <form onSubmit={handleSave}>
                {/* ── Owner Details ── */}
                <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid #E5E7EB', marginBottom: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <h4 style={{ margin: '0 0 1.25rem 0', color: '#111827', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', paddingBottom: '0.75rem', borderBottom: '1px solid #F3F4F6' }}>
                        Owner Details
                    </h4>

                    {/* Hidden profile pic input (also controlled from hero) */}
                    <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '14px', background: '#F3F4F6', border: '1px solid #E5E7EB', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {newProfilePicPreview ? (
                                <img src={newProfilePicPreview} alt="New profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : profilePicUrl ? (
                                <img src={profilePicUrl} alt="Existing profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #DCFCE7, #86EFAC)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#166534', fontWeight: 800, fontSize: '1.4rem' }}>
                                    {pharmacyName ? pharmacyName.trim()[0].toUpperCase() : '?'}
                                </div>
                            )}
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, color: '#374151', fontSize: '0.85rem' }}>Profile Picture</label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0.65rem 1rem', borderRadius: '10px', border: '1.5px dashed #D1D5DB', background: '#F9FAFB', cursor: 'pointer', transition: 'border-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = '#22C55E'} onMouseLeave={e => e.currentTarget.style.borderColor = '#D1D5DB'}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                                <span style={{ fontSize: '0.83rem', color: '#6B7280' }}>{newProfilePicPreview ? 'Tap to change photo' : 'Tap to upload profile photo'}</span>
                                <input type="file" accept="image/*" onChange={handleProfilePicSelection} style={{ display: 'none' }} />
                            </label>
                        </div>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, color: '#374151', fontSize: '0.85rem' }}>Owner Name *</label>
                        <input type="text" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required className="modern-input" placeholder="John Doe" />
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, color: '#374151', fontSize: '0.85rem' }}>Mobile Number</label>
                        <input type="tel" value={mobile} readOnly={!!user.phoneNumber} onChange={(e) => !user.phoneNumber && setMobile(e.target.value)} className="modern-input" placeholder="+91 98765 43210" style={{ background: user.phoneNumber ? '#F3F4F6' : undefined, color: user.phoneNumber ? '#6B7280' : undefined }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, color: '#374151', fontSize: '0.85rem' }}>Email ID</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="modern-input" placeholder="contact@pharmacy.com" />
                    </div>
                </div>

                {/* ── Pharmacy Details ── */}
                <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid #E5E7EB', marginBottom: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <h4 style={{ margin: '0 0 1.25rem 0', color: '#111827', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', paddingBottom: '0.75rem', borderBottom: '1px solid #F3F4F6' }}>
                        Pharmacy Details
                    </h4>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, color: '#374151', fontSize: '0.85rem' }}>Pharmacy Name *</label>
                        <input type="text" value={pharmacyName} onChange={(e) => setPharmacyName(e.target.value)} required className="modern-input" placeholder="LocalPill Pharmacy" />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                            <label style={{ margin: 0, fontWeight: 600, color: '#374151', fontSize: '0.85rem' }}>Address *</label>
                            <button className="btn-dynamic" type="button" onClick={handleDetectLocation} style={{ background: 'none', border: 'none', color: '#22C55E', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                                Detect Location
                            </button>
                        </div>
                        <textarea value={address} onChange={(e) => setAddress(e.target.value)} required style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #D1D5DB', fontSize: '0.95rem', minHeight: '80px', fontFamily: 'inherit', boxSizing: 'border-box', resize: 'none', outline: 'none' }} placeholder="123 Main Street, City..." />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, color: '#374151', fontSize: '0.85rem' }}>License Number</label>
                        <input type="text" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} className="modern-input" placeholder="e.g. MH-12345" />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, color: '#374151', fontSize: '0.85rem' }}>Business Hours</label>
                        <input type="text" value={businessHours} onChange={(e) => setBusinessHours(e.target.value)} className="modern-input" placeholder="e.g. 9:00 AM - 10:00 PM" />
                    </div>

                    <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, color: '#374151', fontSize: '0.85rem' }}>License Document</label>
                        {licenseDocumentUrl && (
                            <div style={{ marginBottom: '0.5rem' }}>
                                <a href={licenseDocumentUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#22C55E', fontSize: '0.85rem', textDecoration: 'none' }}>View Existing Document</a>
                            </div>
                        )}
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0.75rem 1rem', borderRadius: '10px', border: '1.5px dashed #D1D5DB', background: '#F9FAFB', cursor: 'pointer', transition: 'border-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = '#22C55E'} onMouseLeave={e => e.currentTarget.style.borderColor = '#D1D5DB'}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                            <span style={{ fontSize: '0.83rem', color: '#6B7280', flex: 1 }}>{newLicenseDocument ? newLicenseDocument.name : 'Tap to choose file (Image or PDF)'}</span>
                            {newLicenseDocument && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                            <input type="file" accept="image/*,.pdf" onChange={(e) => { if (e.target.files[0]) setNewLicenseDocument(e.target.files[0]); }} style={{ display: 'none' }} />
                        </label>
                    </div>

                    <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, color: '#374151', fontSize: '0.85rem' }}>Front Photo of Pharmacy</label>
                        {frontPhotoUrl && !newFrontPhotoPreview && (
                            <div style={{ marginBottom: '0.5rem' }}>
                                <img src={frontPhotoUrl} alt="Front" style={{ width: '100px', height: '70px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #E5E7EB' }} />
                            </div>
                        )}
                        {newFrontPhotoPreview && (
                            <div style={{ marginBottom: '0.5rem' }}>
                                <img src={newFrontPhotoPreview} alt="Front preview" style={{ width: '100px', height: '70px', objectFit: 'cover', borderRadius: '8px', border: '2px solid #22C55E' }} />
                            </div>
                        )}
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0.75rem 1rem', borderRadius: '10px', border: '1.5px dashed #D1D5DB', background: '#F9FAFB', cursor: 'pointer', transition: 'border-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = '#22C55E'} onMouseLeave={e => e.currentTarget.style.borderColor = '#D1D5DB'}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                            <span style={{ fontSize: '0.83rem', color: '#6B7280', flex: 1 }}>{newFrontPhoto ? newFrontPhoto.name : 'Tap to upload front photo'}</span>
                            <input type="file" accept="image/*" onChange={handleFrontPhotoSelection} style={{ display: 'none' }} />
                        </label>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, color: '#374151', fontSize: '0.85rem' }}>Pharmacy Photos</label>
                        {pharmacyImages.length > 0 && (
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                                {pharmacyImages.map((imgUrl, idx) => (
                                    <div key={`exist-${idx}`} style={{ position: 'relative', width: '76px', height: '76px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #E5E7EB' }}>
                                        <img src={imgUrl} alt={`Pharmacy ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        <button className="btn-dynamic" type="button" onClick={() => removeExistingImage(imgUrl)} style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.55)', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                                    </div>
                                ))}
                            </div>
                        )}
                        {newImagesPreview.length > 0 && (
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                                {newImagesPreview.map((preview, idx) => (
                                    <div key={`new-${idx}`} style={{ position: 'relative', width: '76px', height: '76px', borderRadius: '10px', overflow: 'hidden', border: '2px solid #22C55E', opacity: 0.85 }}>
                                        <img src={preview} alt={`New ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        <button className="btn-dynamic" type="button" onClick={() => removeNewImage(idx)} style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.55)', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0.75rem 1rem', borderRadius: '10px', border: '1.5px dashed #D1D5DB', background: '#F9FAFB', cursor: 'pointer', transition: 'border-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = '#22C55E'} onMouseLeave={e => e.currentTarget.style.borderColor = '#D1D5DB'}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                            <span style={{ fontSize: '0.83rem', color: '#6B7280', flex: 1 }}>{newPharmacyImages.length > 0 ? `${newPharmacyImages.length} photo(s) selected` : `Tap to add photos (max ${MAX_PHARMACY_IMAGES})`}</span>
                            <input type="file" multiple accept="image/*" onChange={handleImageSelection} style={{ display: 'none' }} />
                        </label>
                    </div>
                </div>

                {/* ── Delivery & Discount Details ── */}
                <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid #E5E7EB', marginBottom: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <h4 style={{ margin: '0 0 1.25rem 0', color: '#111827', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', paddingBottom: '0.75rem', borderBottom: '1px solid #F3F4F6' }}>
                        Delivery & Promotions
                    </h4>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <input type="checkbox" id="hasDelivery" checked={hasDelivery} onChange={(e) => setHasDelivery(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#22C55E', cursor: 'pointer' }} />
                        <label htmlFor="hasDelivery" style={{ margin: 0, cursor: 'pointer', fontWeight: 600, color: '#374151', fontSize: '0.9rem' }}>Offers Home Delivery</label>
                    </div>

                    {hasDelivery && (
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, color: '#374151', fontSize: '0.85rem' }}>Free Delivery Radius (km)</label>
                                <input type="number" value={freeDeliveryRadiusKm} onChange={(e) => setFreeDeliveryRadiusKm(e.target.value)} min="0" step="0.1" className="modern-input" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, color: '#374151', fontSize: '0.85rem' }}>Min Order (₹)</label>
                                <input type="number" value={minOrderForFreeDelivery} onChange={(e) => setMinOrderForFreeDelivery(e.target.value)} min="0" className="modern-input" />
                            </div>
                        </div>
                    )}

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, color: '#374151', fontSize: '0.85rem' }}>Discount Percentage (%)</label>
                        <input type="number" value={discountPercentage} onChange={(e) => setDiscountPercentage(e.target.value)} placeholder="0" min="0" max="100" className="modern-input" />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={saving}
                    className="ripple-btn"
                    style={{
                        width: '100%', padding: '0.9rem', minHeight: '52px',
                        background: saving ? '#D1D5DB' : 'linear-gradient(135deg, #22C55E, #15803D)',
                        color: 'white', border: 'none', borderRadius: '14px',
                        fontSize: '1rem', fontWeight: 700,
                        cursor: saving ? 'not-allowed' : 'pointer',
                        boxShadow: saving ? 'none' : '0 4px 12px rgba(34,197,94,0.3)',
                        transition: 'all 0.2s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        transform: 'scale(1)'
                    }}
                    onMouseDown={e => { if (!saving) e.currentTarget.style.transform = 'scale(0.98)'; }}
                    onMouseUp={e => { if (!saving) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseEnter={e => { if (!saving) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                >
                    {saving ? <><span className="spinner-small" /> Saving…</> : 'Save Changes'}
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
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Log Out
            </button>
        </div>
    );
}
