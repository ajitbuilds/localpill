import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';

// Helper function to extract a cropped image from a source image
function getCroppedImg(imageSrc, pixelCrop) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.src = imageSrc;
        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = pixelCrop.width;
            canvas.height = pixelCrop.height;
            const ctx = canvas.getContext('2d');

            ctx.drawImage(
                image,
                pixelCrop.x,
                pixelCrop.y,
                pixelCrop.width,
                pixelCrop.height,
                0,
                0,
                pixelCrop.width,
                pixelCrop.height
            );

            canvas.toBlob((blob) => {
                if (!blob) {
                    console.error('Canvas is empty');
                    reject(new Error('Canvas is empty'));
                    return;
                }
                const croppedImageUrl = window.URL.createObjectURL(blob);
                resolve({ file: blob, url: croppedImageUrl });
            }, 'image/jpeg', 1);
        };
        image.onerror = () => {
            reject(new Error('Failed to load image for cropping'));
        };
    });
}

export default function ImageCropper({ imageSrc, onCropComplete, onCancel }) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    const onCropChange = useCallback((newCrop) => {
        setCrop(newCrop);
    }, []);

    const onZoomChange = useCallback((newZoom) => {
        setZoom(newZoom);
    }, []);

    const handleCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleSave = async () => {
        try {
            const croppedImageParams = await getCroppedImg(imageSrc, croppedAreaPixels);
            onCropComplete(croppedImageParams.file, croppedImageParams.url);
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '2rem'
        }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '600px', height: '60vh', backgroundColor: '#333', borderRadius: '12px', overflow: 'hidden' }}>
                <Cropper
                    image={imageSrc}
                    crop={crop}
                    zoom={zoom}
                    aspect={1} // Square aspect ratio for profile pics
                    onCropChange={onCropChange}
                    onCropComplete={handleCropComplete}
                    onZoomChange={onZoomChange}
                    cropShape="round" // Round visual guide
                />
            </div>

            <div style={{ marginTop: '1.5rem', width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'white', padding: '1.5rem', borderRadius: '12px' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#374151', fontWeight: 600 }}>Zoom</label>
                    <input
                        type="range"
                        value={zoom}
                        min={1}
                        max={3}
                        step={0.1}
                        onChange={(e) => setZoom(e.target.value)}
                        style={{ width: '100%' }}
                    />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.5rem' }}>
                    <button className="btn-dynamic"
                        onClick={onCancel}
                        style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: '1px solid #D1D5DB', background: '#F3F4F6', color: '#4B5563', cursor: 'pointer', fontWeight: 600 }}
                    >
                        Cancel
                    </button>
                    <button className="btn-dynamic"
                        onClick={handleSave}
                        style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', background: '#3B82F6', color: 'white', cursor: 'pointer', fontWeight: 600 }}
                    >
                        Save Crop
                    </button>
                </div>
            </div>
        </div>
    );
}
