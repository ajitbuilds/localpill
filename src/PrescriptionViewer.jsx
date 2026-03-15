import React, { useState, useEffect } from 'react';
import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';
import useWindowWidth from './hooks/useWindowWidth';

export default function PrescriptionViewer({ requestId, filePath, onClose }) {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [secureUrl, setSecureUrl] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');
    const isMobile = useWindowWidth() < 768;

    useEffect(() => {
        let isMounted = true;

        if (!requestId || !filePath) {
            setHasError(true);
            setErrorMessage("Invalid reference properties.");
            return;
        }

        const fetchSecureUrl = async () => {
            try {
                const fileRef = ref(storage, filePath);
                const url = await getDownloadURL(fileRef);
                if (isMounted) setSecureUrl(url);
            } catch (error) {
                console.error("Storage Access Error:", error);
                if (isMounted) {
                    setHasError(true);
                    setErrorMessage(error.message || "Failed to load document.");
                    setIsLoading(false);
                }
            }
        };

        fetchSecureUrl();

        return () => {
            isMounted = false;
        };
    }, [requestId, filePath]);

    // Simple detection mechanism leveraging file path suffix
    const isPdf = filePath && filePath.toLowerCase().includes('.pdf');

    if (!filePath) {
        return null;
    }

    const handleDownload = () => {
        if (!secureUrl) return;
        const link = document.createElement('a');
        link.href = secureUrl;
        link.download = 'Secure_Prescription_Document';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            padding: isMobile ? '1rem' : '2rem',
            animation: 'overlayFade 0.25s ease both'
        }}>
            <style>{`
                @keyframes overlayFade {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes contentScale {
                    from { opacity: 0; transform: scale(0.96) translateY(10px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            `}</style>
            {/* Header Controls */}
            <div style={{ width: '100%', maxWidth: '900px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg> Secure Prescription Document
                </h3>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn-dynamic"
                        onClick={handleDownload}
                        disabled={!secureUrl}
                        style={{ background: !secureUrl ? '#6B7280' : '#3B82F6', color: 'white', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '8px', fontWeight: 'bold', cursor: !secureUrl ? 'not-allowed' : 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg> Download File
                    </button>
                    <button className="btn-dynamic"
                        onClick={onClose}
                        style={{ background: '#EF4444', color: 'white', border: 'none', width: '40px', height: '40px', borderRadius: '50%', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', transition: '0.2s' }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                </div>
            </div>

            {/* Viewer Container */}
            <div style={{
                width: '100%',
                maxWidth: '900px',
                height: isMobile ? '90vh' : '80vh',
                background: 'white',
                borderRadius: '12px',
                overflow: 'hidden',
                position: 'relative',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                animation: 'contentScale 0.35s cubic-bezier(0.16, 1, 0.3, 1) both'
            }}>

                {isLoading && (
                    <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                        <div className="spinner-large" style={{ width: '40px', height: '40px', border: '4px solid #F3F4F6', borderTop: '4px solid #3B82F6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                        <div style={{ color: '#6B7280', fontWeight: 'bold' }}>Authenticating Access...</div>
                    </div>
                )}

                {hasError && (
                    <div style={{ position: 'absolute', textAlign: 'center', color: '#DC2626', padding: '2rem', background: 'white', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ marginBottom: '1rem', color: '#EF4444' }}>
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                        </div>
                        <h3 style={{ margin: '0 0 0.5rem 0' }}>Access Denied</h3>
                        <p style={{ margin: 0, color: '#6B7280' }}>{errorMessage}</p>
                        <button className="btn-dynamic" onClick={onClose} style={{ marginTop: '1.5rem', background: '#F3F4F6', color: '#1F2937', border: '1px solid #D1D5DB', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Close Viewer</button>
                    </div>
                )}

                {!hasError && secureUrl && isPdf ? (
                    <iframe
                        src={`${secureUrl}#view=FitH`}
                        title="Prescription PDF"
                        style={{ width: '100%', height: '100%', border: 'none', display: isLoading ? 'none' : 'block' }}
                        onLoad={() => setIsLoading(false)}
                        onError={() => setHasError(true)}
                    />
                ) : !hasError && secureUrl ? (
                    <img
                        src={secureUrl}
                        alt="Prescription Scan"
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: isLoading ? 'none' : 'block' }}
                        onLoad={() => setIsLoading(false)}
                        onError={() => setHasError(true)}
                    />
                ) : null}

            </div>
        </div>
    );
}
