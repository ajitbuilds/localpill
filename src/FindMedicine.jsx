import React, { useState } from 'react';
import { doc, getDoc, setDoc, deleteDoc, GeoPoint, serverTimestamp, Timestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytesResumable } from 'firebase/storage';
import { db, storage } from './firebase';
import { useToast } from './components/ToastContext';

export default function FindMedicine({ user, onBack, onSuccess }) {
    const showToast = useToast();
    const [medicines, setMedicines] = useState(['']);
    const [file, setFile] = useState(null);
    const [radius, setRadius] = useState(10);
    const [timeoutMinutes, setTimeoutMinutes] = useState(10);
    const [loading, setLoading] = useState(false);
    const [locating, setLocating] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Pre-fetch location on mount so it's ready when user submits
    const cachedCoordsRef = React.useRef(null);
    const locationErrorRef = React.useRef(null);


    const isMountedRef = React.useRef(true);
    const prescriptionRef = React.useRef(null);

    React.useEffect(() => {
        return () => { isMountedRef.current = false; };
    }, []);

    // Bug #1 fix: if opened with ?mode=prescription, auto-focus the upload zone
    React.useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('mode') === 'prescription' && prescriptionRef.current) {
            setTimeout(() => {
                prescriptionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Trigger file picker automatically
                document.getElementById('prescription-file-input')?.click();
            }, 400);
        }

        // Feature: Pre-populate medicines from URL for "Search Again"
        const medsParam = params.get('meds');
        if (medsParam) {
            try {
                const parsedMeds = JSON.parse(decodeURIComponent(medsParam));
                if (Array.isArray(parsedMeds) && parsedMeds.length > 0) {
                    setMedicines(parsedMeds);
                }
            } catch (e) { console.error("Could not parse meds param:", e); }
        }
    }, []);

    React.useEffect(() => {
        let isMounted = true;
        const fetchSettings = async () => {
            try {
                const snap = await getDoc(doc(db, 'settings', 'platformSettings'));
                if (isMounted && snap.exists()) {
                    const data = snap.data();
                    if (data.defaultSearchRadiusKm) setRadius(data.defaultSearchRadiusKm);
                    if (data.requestTimeoutMinutes) setTimeoutMinutes(data.requestTimeoutMinutes);
                }
            } catch (err) {
                console.error("Error fetching platform settings:", err);
            }
        };
        fetchSettings();
        return () => { isMounted = false; };
    }, []);

    // Auto-suggest logic
    const [suggestions, setSuggestions] = useState({}); // { index: ['Med1', 'Med2'] }

    // Dummy Database for showcase - you would normally fetch this from Firestore/RTDB
    const MEDICINES_DB = [
        "Paracetamol", "Panadol", "Aspirin", "Amoxicillin", "Azithromycin",
        "Ibuprofen", "Cetirizine", "Crocin", "Dolo 650", "Metformin",
        "Atorvastatin", "Amlodipine", "Losartan", "Omeprazole", "Pantoprazole",
        "Levothyroxine", "Rosuvastatin", "Escitalopram", "Sertraline", "Albuterol"
    ];

    const handleMedicineChange = (index, value) => {
        const newMedicines = [...medicines];
        newMedicines[index] = value;
        setMedicines(newMedicines);

        if (value.trim().length > 1) {
            const filtered = MEDICINES_DB.filter(m =>
                m.toLowerCase().startsWith(value.toLowerCase().trim())
            ).slice(0, 5); // top 5 matches
            setSuggestions(prev => ({ ...prev, [index]: filtered }));
        } else {
            setSuggestions(prev => ({ ...prev, [index]: [] }));
        }
    };

    const selectSuggestion = (index, selectedValue) => {
        const newMedicines = [...medicines];
        newMedicines[index] = selectedValue;
        setMedicines(newMedicines);
        setSuggestions(prev => ({ ...prev, [index]: [] }));
    };

    const addMedicineField = () => {
        setMedicines([...medicines, '']);
    };

    const removeMedicineField = (index) => {
        const newMedicines = medicines.filter((_, i) => i !== index);
        setMedicines(newMedicines.length ? newMedicines : ['']);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const filteredMedicines = medicines.filter(m => m.trim().length > 0);
        if (filteredMedicines.length === 0 && !file) {
            showToast('Please add at least one medicine or upload a prescription.', 'error');
            return;
        }

        setLoading(true);

        // Use cached location if available, otherwise fetch now
        const doSubmit = async (coords) => {
            if (!isMountedRef.current) return;
            try {
                setLocating(false);
                const lat = coords.latitude;
                const lng = coords.longitude;
                const geoPoint = new GeoPoint(lat, lng);

                const requestRef = doc(collection(db, 'medicineRequests'));
                const requestId = requestRef.id;

                // BUG 6 FIX: user.displayName is null for phone-auth users.
                // Fetch the name the user saved during PatientSetup from Firestore.
                let patientName = null;
                try {
                    const userSnap = await getDoc(doc(db, 'users', user.uid));
                    if (userSnap.exists()) patientName = userSnap.data().name || null;
                } catch (err) {
                    console.error("Error fetching patient name:", err);
                }

                let prescriptionUrl = null;
                if (file) {
                    prescriptionUrl = `prescriptions/${requestId}/${file.name}`;
                }

                // Create new medicineRequest FIRST to let backend natively handle geohash matching.
                // This explicitly resolves cross-reference exceptions in storage.rules.
                const now = Date.now();
                const expiresAt = Timestamp.fromMillis(now + timeoutMinutes * 60 * 1000);

                await setDoc(requestRef, {
                    userId: user.uid,
                    patientPhone: user.phoneNumber || null,
                    patientName: patientName,
                    typedMedicines: filteredMedicines,
                    prescriptionUrl: prescriptionUrl || null,
                    location: geoPoint,
                    searchRadiusKm: Number(radius),
                    status: "pending",
                    notifiedPharmaciesCount: 0,
                    responsesCount: 0,
                    createdAt: serverTimestamp(),
                    expiresAt: expiresAt,
                });

                // NOW upload the prescription safely
                if (file) {
                    const fileRef = ref(storage, `prescriptions/${requestId}/${file.name}`);
                    const uploadTask = uploadBytesResumable(fileRef, file);

                    try {
                        await new Promise((resolve, reject) => {
                            uploadTask.on(
                                'state_changed',
                                (snapshot) => {
                                    if (isMountedRef.current) {
                                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                                        setUploadProgress(progress);
                                    }
                                },
                                (err) => {
                                    console.error("Upload error", err);
                                    reject(err);
                                },
                                () => {
                                    resolve();
                                }
                            );
                        });
                    } catch (uploadError) {
                        // If upload fails, cleanup the dangling request document
                        console.error("Storage upload failed, cleaning up orphan doc...", uploadError);
                        await deleteDoc(requestRef);
                        throw uploadError; // bubble up to outer catch for Toast
                    }
                }

                if (isMountedRef.current) onSuccess(requestId);
            } catch (err) {
                if (!isMountedRef.current) return;
                console.error(err);
                showToast('Failed to create request. Please try again.', 'error');
                setLoading(false);
            }
        };
        // Use cached location if ready, else fetch fresh
        if (cachedCoordsRef.current) {
            doSubmit(cachedCoordsRef.current);
        } else {
            setLocating(true);

            const handleGeoFallback = async () => {
                try {
                    // IP-based geolocation fallback
                    const response = await fetch('https://ipapi.co/json/');
                    const data = await response.json();

                    if (data && data.latitude && data.longitude) {
                        const fallbackCoords = {
                            latitude: data.latitude,
                            longitude: data.longitude,
                            accuracy: 1000 // Approximate accuracy
                        };
                        // IP fallback succeeded
                        cachedCoordsRef.current = fallbackCoords;
                        doSubmit(fallbackCoords);
                    } else {
                        throw new Error("Invalid IP geo data");
                    }
                } catch (fallbackErr) {
                    console.error("IP fallback also failed:", fallbackErr);
                    if (!isMountedRef.current) return;
                    setLocating(false);
                    setLoading(false);
                    showToast("📍 GPS signal nahi mila. Browser permission check karein ya WiFi on karein.", "error");
                }
            };

            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    cachedCoordsRef.current = pos.coords;
                    doSubmit(pos.coords);
                },
                (geoError) => {
                    console.error("Geolocation API Error:", geoError.message, geoError.code);
                    // Code 1: PERMISSION_DENIED
                    // Code 2: POSITION_UNAVAILABLE (Often kCLErrorLocationUnknown on macOS)
                    // Code 3: TIMEOUT
                    if (geoError.code === 1) {
                        if (!isMountedRef.current) return;
                        setLocating(false);
                        setLoading(false);
                        showToast("📍 Location access blocked! Browser settings mein Location permission 'Allow' karo.", "error");
                    } else {
                        // Fallback for timeout or position unavailable
                        handleGeoFallback();
                    }
                },
                { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
            );
        }
    };

    // Derive current step for the indicator
    const hasAnyMed = medicines.some(m => m.trim().length > 0);
    const hasFile = !!file;
    const currentStep = !hasAnyMed && !hasFile ? 1 : !hasFile ? 2 : 3;

    const [isDragOver, setIsDragOver] = useState(false);

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        const dropped = e.dataTransfer.files[0];
        if (dropped) {
            setFile(dropped);
            setUploadProgress(0);
        }
    };

    const STEPS = [
        { n: 1, label: 'Enter Medicines' },
        { n: 2, label: 'Prescription' },
        { n: 3, label: 'Send Request' },
    ];

    return (
        <div className="page-transition animate-in bottom-nav-padding" style={{ maxWidth: '720px', margin: '0 auto', width: '100%', padding: '0.5rem 0' }}>
            <style>
                {`
                    @keyframes slideInDown {
                        from { opacity: 0; transform: translateY(-10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    @keyframes formSlideUp {
                        from { opacity: 0; transform: translateY(18px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    @keyframes suggFadeDown {
                        from { opacity: 0; transform: translateY(-6px) scaleY(0.95); }
                        to { opacity: 1; transform: translateY(0) scaleY(1); }
                    }
                    .med-input-anim {
                        animation: slideInDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    }
                    .drag-bounce {
                        transform: scale(1.02);
                        box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
                    }
                    .spinner-small {
                        width: 14px; height: 14px;
                        border: 2px solid rgba(255,255,255,0.3);
                        border-radius: 50%;
                        border-top-color: white;
                        animation: spin 1s ease-in-out infinite;
                        display: inline-block;
                        flex-shrink: 0;
                    }
                    @keyframes spin { to { transform: rotate(360deg); } }
                `}
            </style>

            {/* ── Step Indicator ── */}
            <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0', marginBottom: '0.5rem' }}>
                    {STEPS.map((step, i) => {
                        const done = currentStep > step.n;
                        const active = currentStep === step.n;
                        return (
                            <React.Fragment key={step.n}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                    <div style={{
                                        width: '32px', height: '32px', borderRadius: '50%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontWeight: 700, fontSize: '0.85rem',
                                        background: done ? '#22C55E' : active ? '#22C55E' : '#E5E7EB',
                                        color: done || active ? '#fff' : '#9CA3AF',
                                        border: active ? '2px solid #16A34A' : 'none',
                                        boxShadow: active ? '0 0 0 4px rgba(34,197,94,0.15)' : 'none',
                                        flexShrink: 0
                                    }}>
                                        {done ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg> : step.n}
                                    </div>
                                    <span style={{
                                        fontSize: '0.68rem', fontWeight: 600,
                                        color: active ? '#15803D' : done ? '#22C55E' : '#9CA3AF',
                                        whiteSpace: 'nowrap', transition: 'color 0.3s'
                                    }}>{step.label}</span>
                                </div>
                                {i < STEPS.length - 1 && (
                                    <div style={{
                                        flex: 1, height: '2px', margin: '0 6px', marginBottom: '18px',
                                        background: currentStep > step.n ? '#22C55E' : '#E5E7EB',
                                        transition: 'background 0.3s'
                                    }} />
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>

            {/* ── Form ── */}
            <form onSubmit={handleSubmit} style={{ animation: 'formSlideUp 0.45s cubic-bezier(0.16,1,0.3,1) both' }}>

                {/* Step 1: Medicines */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', color: '#374151', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Medicines
                    </label>
                    {medicines.map((med, index) => (
                        <div key={index} className="med-input-anim" style={{ marginBottom: '10px', position: 'relative' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    type="text"
                                    value={med}
                                    onChange={(e) => handleMedicineChange(index, e.target.value)}
                                    placeholder={`Medicine ${index + 1} name`}
                                    className="modern-input"
                                    style={{ flex: 1, transition: 'box-shadow 0.2s, border-color 0.2s' }}
                                    onFocus={e => { e.currentTarget.style.borderColor = '#22c55e'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.15)'; }}
                                    onBlur={e => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.boxShadow = ''; }}
                                    autoComplete="off"
                                />
                                {medicines.length > 1 && (
                                    <button className="btn-dynamic"
                                        type="button"
                                        onClick={() => removeMedicineField(index)}
                                        style={{
                                            width: '38px', flexShrink: 0,
                                            background: '#FEE2E2', border: '1px solid #FECACA',
                                            color: '#DC2626', borderRadius: '8px',
                                            cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            transition: 'background 0.15s'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#FECACA'}
                                        onMouseLeave={e => e.currentTarget.style.background = '#FEE2E2'}
                                        title="Remove"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                    </button>
                                )}
                            </div>

                            {/* Suggestions */}
                            {suggestions[index] && suggestions[index].length > 0 && (
                                <ul style={{
                                    position: 'absolute', top: '100%', left: 0,
                                    right: medicines.length > 1 ? '48px' : 0,
                                    background: 'white', listStyle: 'none',
                                    padding: '0.25rem 0', margin: 0,
                                    borderRadius: '10px',
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                                    border: '1px solid #E5E7EB', zIndex: 10,
                                    maxHeight: '150px', overflowY: 'auto',
                                    animation: 'suggFadeDown 0.2s cubic-bezier(0.16,1,0.3,1) both',
                                    transformOrigin: 'top center'
                                }}>
                                    {suggestions[index].map((sugg, i) => (
                                        <li
                                            key={i}
                                            onClick={() => selectSuggestion(index, sugg)}
                                            style={{
                                                padding: '0.55rem 1rem', cursor: 'pointer',
                                                fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px',
                                                borderBottom: i === suggestions[index].length - 1 ? 'none' : '1px solid #F3F4F6',
                                                transition: 'background 0.1s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = '#F0FDF4'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
                                            {sugg}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    ))}
                    <button className="btn-dynamic"
                        type="button"
                        onClick={addMedicineField}
                        style={{
                            background: '#F3F4F6', border: '1px solid #E5E7EB',
                            color: '#374151', borderRadius: '8px',
                            padding: '0.45rem 0.875rem', fontSize: '0.85rem',
                            fontWeight: 600, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '6px'
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        Add Another Medicine
                    </button>
                </div>

                {/* Step 2: Prescription Upload Zone */}
                <div ref={prescriptionRef} style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', color: '#374151', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Prescription <span style={{ color: '#9CA3AF', fontWeight: 500, textTransform: 'none', fontSize: '0.8rem' }}>(Optional)</span>
                    </label>

                    <div
                        className={isDragOver ? "drag-bounce" : ""}
                        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={handleDrop}
                        onClick={() => document.getElementById('prescription-file-input').click()}
                        style={{
                            border: `2px dashed ${file ? '#22C55E' : isDragOver ? '#3B82F6' : '#D1D5DB'}`,
                            borderRadius: '16px',
                            padding: '2rem 1rem',
                            textAlign: 'center',
                            cursor: 'pointer',
                            background: file ? '#F0FDF4' : isDragOver ? '#EFF6FF' : '#F9FAFB',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                    >
                        {file ? (
                            <>
                                {file.type.startsWith('image/') ? (
                                    <div style={{ marginBottom: '1rem', width: '100%', display: 'flex', justifyContent: 'center' }}>
                                        <img
                                            src={URL.createObjectURL(file)}
                                            alt="Prescription preview"
                                            style={{ maxHeight: '120px', maxWidth: '100%', objectFit: 'contain', borderRadius: '8px', border: '1px solid #E5E7EB' }}
                                        />
                                    </div>
                                ) : (
                                    <div style={{ marginBottom: '0.5rem' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    </div>
                                )}
                                <div style={{ fontWeight: 700, color: '#059669', fontSize: '0.95rem', marginBottom: '0.25rem' }}>{file.name}</div>
                                <div style={{ fontSize: '0.78rem', color: '#6B7280' }}>Click to change file</div>
                            </>
                        ) : (
                            <>
                                <div style={{ marginBottom: '0.5rem' }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" /></svg>
                                </div>
                                <div style={{ fontWeight: 700, color: '#374151', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                                    {isDragOver ? 'Drop it here!' : 'Drag & drop or click to upload'}
                                </div>
                                <div style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>JPG, PNG, PDF supported</div>
                            </>
                        )}
                        <input
                            id="prescription-file-input"
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => { setFile(e.target.files[0]); setUploadProgress(0); }}
                            style={{ display: 'none' }}
                        />
                    </div>

                    {/* Upload progress bar */}
                    {uploadProgress > 0 && uploadProgress < 100 && (
                        <div style={{ marginTop: '0.75rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#6B7280', marginBottom: '0.25rem' }}>
                                <span>Uploading…</span>
                                <span>{Math.round(uploadProgress)}%</span>
                            </div>
                            <div style={{ width: '100%', background: '#E5E7EB', height: '6px', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: `${uploadProgress}%`, background: 'linear-gradient(90deg, #22C55E, #16A34A)', height: '100%', borderRadius: '4px', transition: 'width 0.3s ease-out' }} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Step 3: Search Radius */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <label style={{ fontWeight: 700, fontSize: '0.85rem', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Search Radius
                        </label>
                        <span style={{ background: '#EFF6FF', color: '#1D4ED8', fontWeight: 700, fontSize: '0.85rem', padding: '3px 12px', borderRadius: '20px', border: '1px solid #BFDBFE' }}>
                            {radius} km
                        </span>
                    </div>
                    <input
                        type="range"
                        min="1"
                        max="50"
                        step="1"
                        value={radius}
                        onChange={(e) => setRadius(Number(e.target.value))}
                        style={{ width: '100%', accentColor: '#22C55E', cursor: 'pointer' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#9CA3AF', marginTop: '4px' }}>
                        <span>1 km</span><span>25 km</span><span>50 km</span>
                    </div>
                </div>

                <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1.5rem', fontSize: '0.83rem', color: '#6B7280', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <svg style={{ flexShrink: 0, marginTop: '1px', color: '#9CA3AF' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                    <span>We'll request your GPS location to find pharmacies nearby. This request expires in {timeoutMinutes} minutes.</span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <button
                        type="submit"
                        disabled={loading}
                        className="ripple-btn"
                        style={{
                            width: '100%', padding: '0.9rem', minHeight: '52px',
                            background: loading ? '#D1D5DB' : 'linear-gradient(135deg, #22C55E, #15803D)',
                            color: 'white', border: 'none', borderRadius: '14px',
                            fontSize: '1rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            transition: 'all 0.2s',
                            boxShadow: loading ? 'none' : '0 4px 14px rgba(34,197,94,0.35)',
                            transform: loading ? 'scale(0.98)' : 'scale(1)'
                        }}
                        onMouseDown={e => { if (!loading) e.currentTarget.style.transform = 'scale(0.96)'; }}
                        onMouseUp={e => { if (!loading) e.currentTarget.style.transform = 'scale(1)'; }}
                    >
                        {loading ? <><span className="spinner-small" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff', animationDuration: '0.6s' }} />{locating ? 'Getting location…' : 'Searching nearby pharmacies...'}</> : 'Send Request to Nearby Pharmacies'}
                    </button>
                    <button className="btn-dynamic"
                        type="button"
                        onClick={onBack}
                        disabled={loading}
                        style={{
                            width: '100%', padding: '0.75rem',
                            background: 'transparent', border: '1px solid #E5E7EB',
                            color: '#6B7280', borderRadius: '14px',
                            fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}
