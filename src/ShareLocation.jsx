import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

export default function ShareLocation() {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const reqId = id || searchParams.get('reqId');
    const navigate = useNavigate();

    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [errorMsg, setErrorMsg] = useState('');
    const [requestDoc, setRequestDoc] = useState(null);

    useEffect(() => {
        if (reqId) {
            verifyRequest();
        } else {
            setStatus('error');
            setErrorMsg('Invalid or missing request ID link.');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reqId]);

    const verifyRequest = async () => {
        try {
            setStatus('loading');
            const docRef = doc(db, 'locationRequests', reqId);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                setStatus('error');
                setErrorMsg('Location request not found or has expired.');
                return;
            }

            const data = docSnap.data();
            if (data.status === 'completed') {
                setStatus('error');
                setErrorMsg('This location request has already been completed.');
                return;
            }

            if (data.expiresAt && data.expiresAt.toDate() < new Date()) {
                setStatus('error');
                setErrorMsg('This location request link has expired for your security.');
                return;
            }

            setRequestDoc(data);
            setStatus('idle');
        } catch (error) {
            console.error(error);
            setStatus('error');
            setErrorMsg('Failed to verify request. Please check your connection.');
        }
    };

    const [detectedAddress, setDetectedAddress] = useState('');

    const handleShareLocation = () => {
        if (!navigator.geolocation) {
            setStatus('error');
            setErrorMsg('Geolocation is not supported by your browser.');
            return;
        }

        setStatus('loading');

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude, accuracy } = position.coords;
                console.log(`Detected location with accuracy: ${accuracy} meters`);

                try {
                    let address = 'Exact Location Shared';

                    // Use Google Maps Geocoding for best accuracy if available
                    if (window.google && window.google.maps && window.google.maps.Geocoder) {
                        try {
                            const geocoder = new window.google.maps.Geocoder();
                            const response = await new Promise((resolve, reject) => {
                                geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
                                    if (status === 'OK' && results[0]) {
                                        resolve(results[0].formatted_address);
                                    } else {
                                        reject(new Error(`Geocoder failed with status: ${status}`));
                                    }
                                });
                            });
                            address = response;
                        } catch (e) {
                            console.log('Google Geocoding failed, trying Nominatim...', e);
                        }
                    }

                    // Fallback to Nominatim if Google fails or isn't loaded
                    if (address === 'Exact Location Shared') {
                        try {
                            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`, {
                                headers: {
                                    'User-Agent': 'LocalPillWebApp/1.0'
                                }
                            });
                            const data = await response.json();
                            if (data && data.display_name) {
                                address = data.display_name;
                            } else if (data && data.address) {
                                address = Object.values(data.address).filter(Boolean).join(', ');
                            }
                        } catch (e) {
                            console.log('Reverse geocoding fallback failed', e);
                        }
                    }

                    setDetectedAddress(address);

                    const docRef = doc(db, 'locationRequests', reqId);
                    await updateDoc(docRef, {
                        status: 'completed',
                        lat: latitude,
                        lng: longitude,
                        address: address,
                        accuracy: accuracy // Optional: store accuracy for reference
                    });

                    setStatus('success');
                } catch (error) {
                    console.error(error);
                    setStatus('error');
                    setErrorMsg('Failed to save location. Please try again.');
                }
            },
            (error) => {
                console.error(error);
                setStatus('error');
                let userMsg = 'Unable to retrieve your location.';
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        userMsg = 'You denied the request for Geolocation. Please enable it in browser settings.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        userMsg = 'Location information is unavailable.';
                        break;
                    case error.TIMEOUT:
                        userMsg = 'The request to get user location timed out.';
                        break;
                }
                setErrorMsg(userMsg);
            },
            {
                enableHighAccuracy: true,
                timeout: 15000, // Slightly longer timeout for better accuracy
                maximumAge: 0
            }
        );
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <div style={styles.header}>
                    <h1 style={styles.title}>Secure Location Sharing</h1>
                </div>

                <div style={styles.content}>
                    {status === 'loading' && (
                        <div style={styles.centerBox}>
                            <div className="spinner" style={styles.spinner}></div>
                            <p style={styles.text}>Processing...</p>
                        </div>
                    )}

                    {status === 'error' && (
                        <div style={styles.centerBox}>
                            <div style={styles.errorIcon}>⚠️</div>
                            <p style={styles.errorText}>{errorMsg}</p>
                            <button style={styles.secondaryButton} onClick={() => navigate('/')}>
                                Go to Homepage
                            </button>
                        </div>
                    )}

                    {status === 'success' && (
                        <div style={styles.centerBox}>
                            <svg className="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                                <circle className="checkmark__circle" cx="26" cy="26" r="25" fill="none" />
                                <path className="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
                            </svg>
                            <h2 style={{ color: 'var(--success-color)', fontSize: '1.5rem', fontWeight: 700, marginBottom: '20px' }}>Location Shared!</h2>
                            
                            <div style={styles.addressBox}>
                                <div style={styles.addressBoxIcon}>📍</div>
                                <div style={styles.addressBoxText}>{detectedAddress}</div>
                            </div>
                            
                            <p style={styles.text}>We've successfully received your location. The sender can now check pharmacies near you.</p>
                            
                            <button 
                                style={styles.secondaryButton} 
                                onClick={() => window.location.href = 'whatsapp://send'}
                                onMouseOver={(e) => e.target.style.backgroundColor = 'var(--secondary-btn-hover)'}
                                onMouseOut={(e) => e.target.style.backgroundColor = 'var(--secondary-btn-bg)'}
                            >
                                Back to WhatsApp
                            </button>
                        </div>
                    )}

                    {status === 'idle' && reqId && (
                        <div style={styles.centerBox}>
                            <div style={styles.illustrationWrapper}>
                                <div style={styles.pulsingPin}>
                                    <img src="/localpill_nobg.png" alt="LocalPill" style={styles.pinImage} />
                                </div>
                            </div>
                            <h2 style={styles.heading}>Share your exact location</h2>
                            <p style={styles.text}>
                                Click the button below to securely share your location. This helps in checking pharmacies near you.
                            </p>

                            <button
                                style={styles.primaryButton}
                                onClick={handleShareLocation}
                            >
                                Share My Location
                            </button>

                            <p style={styles.subText}>
                                Your browser will prompt you for permission. Please allow it.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                :root {
                    --bg-color: #f8fafc;
                    --card-bg: white;
                    --header-bg: #0f172a;
                    --title-color: white;
                    --text-color: #64748b;
                    --heading-color: #1e293b;
                    --subtext-color: #94a3b8;
                    --address-bg: #f8fafc;
                    --address-border: #e2e8f0;
                    --address-text: #334155;
                    --secondary-btn-bg: #f1f5f9;
                    --secondary-btn-text: #475569;
                    --secondary-btn-border: #cbd5e1;
                    --secondary-btn-hover: #e2e8f0;
                    --success-color: #10b981;
                    --error-color: #ef4444;
                }
                @media (prefers-color-scheme: dark) {
                    :root {
                        --bg-color: #020617;
                        --card-bg: #0f172a;
                        --header-bg: #020617;
                        --title-color: #f8fafc;
                        --text-color: #cbd5e1;
                        --heading-color: #f8fafc;
                        --subtext-color: #94a3b8;
                        --address-bg: #1e293b;
                        --address-border: #334155;
                        --address-text: #f8fafc;
                        --secondary-btn-bg: #334155;
                        --secondary-btn-text: #f8fafc;
                        --secondary-btn-border: #475569;
                        --secondary-btn-hover: #475569;
                    }
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes pulse-ring {
                    0% { transform: scale(0.85); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
                    70% { transform: scale(1); box-shadow: 0 0 0 15px rgba(16, 185, 129, 0); }
                    100% { transform: scale(0.85); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
                }
                .checkmark__circle {
                    stroke-dasharray: 166;
                    stroke-dashoffset: 166;
                    stroke-width: 2;
                    stroke-miterlimit: 10;
                    stroke: var(--success-color);
                    fill: none;
                    animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
                }
                .checkmark {
                    width: 72px;
                    height: 72px;
                    border-radius: 50%;
                    display: block;
                    stroke-width: 3;
                    stroke: var(--card-bg);
                    stroke-miterlimit: 10;
                    margin: 0 auto 20px auto;
                    box-shadow: inset 0px 0px 0px var(--success-color);
                    animation: fill .4s ease-in-out .4s forwards, scale .3s ease-in-out .9s both;
                }
                .checkmark__check {
                    transform-origin: 50% 50%;
                    stroke-dasharray: 48;
                    stroke-dashoffset: 48;
                    animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.8s forwards;
                }
                @keyframes stroke {
                    100% { stroke-dashoffset: 0; }
                }
                @keyframes scale {
                    0%, 100% { transform: none; }
                    50% { transform: scale3d(1.1, 1.1, 1); }
                }
                @keyframes fill {
                    100% { box-shadow: inset 0px 0px 0px 40px var(--success-color); }
                }
            `}</style>
        </div>
    );
}

const styles = {
    container: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-color)',
        padding: '20px',
        fontFamily: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif',
    },
    card: {
        backgroundColor: 'var(--card-bg)',
        borderRadius: '16px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
        width: '100%',
        maxWidth: '400px',
        overflow: 'hidden',
    },
    header: {
        padding: '24px',
        backgroundColor: 'var(--header-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
    },
    logo: {
        height: '32px',
        width: 'auto',
        objectFit: 'contain',
    },
    title: {
        color: 'var(--title-color)',
        fontSize: '1.25rem',
        margin: 0,
        fontWeight: 600,
    },
    content: {
        padding: '32px 24px',
    },
    centerBox: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
    },
    illustrationWrapper: {
        height: '80px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '20px',
    },
    pulsingPin: {
        width: '64px',
        height: '64px',
        backgroundColor: 'var(--address-bg)',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'pulse-ring 2s infinite cubic-bezier(0.25, 0.8, 0.25, 1)',
    },
    pinImage: {
        width: '40px',
        height: '40px',
        objectFit: 'contain',
    },
    heading: {
        fontSize: '1.5rem',
        color: 'var(--heading-color)',
        marginBottom: '12px',
        fontWeight: 700,
    },
    text: {
        color: 'var(--text-color)',
        fontSize: '0.95rem',
        lineHeight: 1.5,
        marginBottom: '24px',
    },
    subText: {
        color: 'var(--subtext-color)',
        fontSize: '0.8rem',
        marginTop: '16px',
    },
    addressBox: {
        display: 'flex',
        alignItems: 'flex-start',
        backgroundColor: 'var(--address-bg)',
        padding: '16px',
        borderRadius: '12px',
        border: '1px solid var(--address-border)',
        marginBottom: '24px',
        width: '100%',
        boxSizing: 'border-box',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
    },
    addressBoxIcon: {
        fontSize: '1.25rem',
        marginRight: '12px',
        marginTop: '2px',
    },
    addressBoxText: {
        color: 'var(--address-text)',
        fontSize: '0.9rem',
        fontWeight: 500,
        textAlign: 'left',
        lineHeight: 1.4,
    },
    primaryButton: {
        backgroundColor: 'var(--primary-btn-bg)',
        color: 'var(--primary-btn-text)',
        border: 'none',
        borderRadius: '8px',
        padding: '14px 24px',
        fontSize: '1rem',
        fontWeight: 600,
        cursor: 'pointer',
        width: '100%',
        boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)',
        transition: 'background-color 0.2s',
    },
    secondaryButton: {
        backgroundColor: 'var(--secondary-btn-bg)',
        color: 'var(--secondary-btn-text)',
        border: 'none',
        borderRadius: '8px',
        padding: '14px 24px',
        fontSize: '1rem',
        fontWeight: 600,
        cursor: 'pointer',
        width: '100%',
        boxShadow: 'inset 0 0 0 1px var(--secondary-btn-border)',
        transition: 'background-color 0.2s',
    },
    errorIcon: {
        fontSize: '3rem',
        marginBottom: '16px',
    },
    errorText: {
        color: 'var(--error-color)',
        fontSize: '1rem',
        fontWeight: 500,
        marginBottom: '8px',
    },
    spinner: {
        width: '40px',
        height: '40px',
        border: '3px solid rgba(16, 185, 129, 0.2)',
        borderTopColor: 'var(--success-color)',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        marginBottom: '16px',
    }
};
