import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default Leaflet marker icons lacking paths in React
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl,
    iconRetinaUrl,
    shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom Green Icon for Online Pharmacies
const greenIconHtml = `
  <div style="
    background-color: #22C55E;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 0 10px rgba(0,0,0,0.4);
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 10.56L13.44 14M6.92 11.23l6.85-6.85a3.86 3.86 0 0 1 5.46 5.46l-6.85 6.85a3.86 3.86 0 0 1-5.46-5.46z"></path></svg>
  </div>
`;

const GreenIcon = L.divIcon({
    html: greenIconHtml,
    className: 'custom-leaflet-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
});

// Component to recenter map when user location changes
function ChangeView({ center, zoom }) {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.setView(center, zoom);
        }
    }, [center, zoom, map]);
    return null;
}

export default function PharmacyMap({ pharmacies, userLocation, onSelectPharmacy }) {
    const center = userLocation ? [userLocation.latitude, userLocation.longitude] : [28.6139, 77.2090]; // Default to Delhi
    const zoom = userLocation ? 14 : 11;

    return (
        <div style={{
            height: '400px',
            width: '100%',
            borderRadius: '16px',
            overflow: 'hidden',
            border: '1px solid #E5E7EB',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            position: 'relative'
        }}>
            <MapContainer
                center={center}
                zoom={zoom}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />

                <ChangeView center={center} zoom={zoom} />

                {/* User Location Marker */}
                {userLocation && (
                    <Marker position={center}>
                        <Popup>
                            <div style={{ textAlign: 'center' }}>
                                <strong>You are here</strong>
                            </div>
                        </Popup>
                    </Marker>
                )}

                {/* Pharmacy Markers */}
                {pharmacies.map(pharmacy => {
                    if (!pharmacy.location) return null;
                    return (
                        <Marker
                            key={pharmacy.id}
                            position={[pharmacy.location.latitude, pharmacy.location.longitude]}
                            icon={GreenIcon}
                        >
                            <Popup>
                                <div style={{ padding: '4px' }}>
                                    <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: '#111827' }}>
                                        {pharmacy.name}
                                    </h4>
                                    <div style={{ color: '#059669', fontSize: '0.8rem', fontWeight: 600, marginBottom: '8px' }}>
                                        Online & Active
                                    </div>
                                    <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                        {pharmacy.address}
                                    </p>
                                    <button className="btn-dynamic"
                                        onClick={() => onSelectPharmacy(pharmacy)}
                                        style={{
                                            width: '100%',
                                            background: '#2ECC71',
                                            color: '#fff',
                                            border: 'none',
                                            padding: '8px',
                                            borderRadius: '8px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.target.style.background = '#27AE60'}
                                        onMouseLeave={(e) => e.target.style.background = '#2ECC71'}
                                    >
                                        Direct Request
                                    </button>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
            <style>{`
                .leaflet-popup-content-wrapper {
                    border-radius: 12px;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                }
                .leaflet-popup-content {
                    margin: 12px;
                }
            `}</style>
        </div>
    );
}
