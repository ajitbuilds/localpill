import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFormattedAddress } from '../utils/geocode';

type LocationMode = 'current' | 'remote';

interface RemoteLocation {
    latitude: number;
    longitude: number;
    address: string;
    label?: string;
}

interface LocationContextType {
    locationMode: LocationMode;
    setLocationMode: (mode: LocationMode) => void;
    remoteLocation: RemoteLocation | null;
    setRemoteLocation: (loc: RemoteLocation | null) => void;
    currentAddress: string | null;
    refreshCurrentAddress: () => Promise<void>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: React.ReactNode }) {
    const [locationMode, setLocationMode] = useState<LocationMode>('current');
    const [remoteLocation, setRemoteLocation] = useState<RemoteLocation | null>(null);
    const [currentAddress, setCurrentAddress] = useState<string | null>(null);
    const currentAddressRef = useRef<string | null>(null);

    // Keep ref in sync with state
    useEffect(() => {
        currentAddressRef.current = currentAddress;
    }, [currentAddress]);

    const refreshCurrentAddress = async () => {
        try {
            const res = await Location.getForegroundPermissionsAsync();
            if (res.status !== 'granted') return;

            // ── Phase 1: Instant — show last known location immediately ──
            if (__DEV__) console.log("Phase 1: Getting last known position (instant)...");
            const lastKnown = await Location.getLastKnownPositionAsync();

            if (lastKnown) {
                if (__DEV__) console.log("Last known location:", lastKnown.coords.latitude, lastKnown.coords.longitude);
                // If we don't have any address yet (no cache), geocode the last known
                if (!currentAddressRef.current) {
                    const quickAddress = await getFormattedAddress(lastKnown.coords.latitude, lastKnown.coords.longitude);
                    setCurrentAddress(quickAddress);
                    AsyncStorage.setItem('cached_current_address', quickAddress);
                }
            }

            // ── Phase 2: Background — fetch high accuracy GPS silently ──
            if (__DEV__) console.log("Phase 2: Requesting HIGH accuracy GPS...");
            try {
                // Timeout to prevent indefinite hang on some Android devices
                const gpsPromise = Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.High,
                });
                const timeoutPromise = new Promise<null>((_, reject) =>
                    setTimeout(() => reject(new Error('GPS High accuracy timeout')), 8000)
                );

                const highAccLoc = await Promise.race([gpsPromise, timeoutPromise]);

                if (highAccLoc) {
                    if (__DEV__) console.log("✅ High accuracy GPS:", highAccLoc.coords.latitude, highAccLoc.coords.longitude);
                    const preciseAddress = await getFormattedAddress(highAccLoc.coords.latitude, highAccLoc.coords.longitude);
                    if (__DEV__) console.log("Precise address:", preciseAddress);
                    setCurrentAddress(preciseAddress);
                    AsyncStorage.setItem('cached_current_address', preciseAddress);
                }
            } catch (gpsError) {
                // High accuracy failed/timed out — Phase 1 result is still showing, so no problem
                if (__DEV__) console.warn("High accuracy GPS failed, keeping last known location:", gpsError);
                // If we still don't have any address, use last known or fallback
                if (!currentAddressRef.current && lastKnown) {
                    const fallbackAddress = await getFormattedAddress(lastKnown.coords.latitude, lastKnown.coords.longitude);
                    setCurrentAddress(fallbackAddress);
                    AsyncStorage.setItem('cached_current_address', fallbackAddress);
                }
            }

            // ── Fallback: no location at all ──
            if (!lastKnown && !currentAddressRef.current) {
                if (__DEV__) console.warn("No location available at all");
                setCurrentAddress('Current Location');
            }
        } catch (error) {
            // Silently fail if GPS disabled, just show "Current Location"
            if (!currentAddressRef.current) {
                setCurrentAddress('Current Location');
            }
            if (__DEV__) console.log('Error refreshing address:', error);
        }
    };

    // Load saved preference on mount
    useEffect(() => {
        const loadSavedMode = async () => {
            try {
                const savedMode = await AsyncStorage.getItem('saved_location_mode');
                const savedRemoteStr = await AsyncStorage.getItem('saved_remote_location');
                const cachedAddress = await AsyncStorage.getItem('cached_current_address');

                if (cachedAddress) {
                    setCurrentAddress(cachedAddress);
                }

                if (savedMode === 'remote' && savedRemoteStr) {
                    setLocationMode('remote');
                    setRemoteLocation(JSON.parse(savedRemoteStr));
                } else {
                    setLocationMode('current');
                }
            } catch (e) {
                if (__DEV__) console.error('Failed to load saved location stats from storage', e);
            }
        // Check if permission already granted before refreshing to avoid prompting on startup
        const perm = await Location.getForegroundPermissionsAsync();
        if (perm.status === 'granted') {
            refreshCurrentAddress();
        }
        };
        loadSavedMode();
    }, []);

    // Save changes
    useEffect(() => {
        AsyncStorage.setItem('saved_location_mode', locationMode);
        if (locationMode === 'remote' && remoteLocation) {
            AsyncStorage.setItem('saved_remote_location', JSON.stringify(remoteLocation));
        } else if (locationMode === 'current') {
            AsyncStorage.removeItem('saved_remote_location');
        }
    }, [locationMode, remoteLocation]);

    const handleSetLocationMode = (mode: LocationMode) => {
        setLocationMode(mode);
        if (mode === 'current') {
            setRemoteLocation(null);
        }
    };

    return (
        <LocationContext.Provider
            value={{
                locationMode,
                setLocationMode: handleSetLocationMode,
                remoteLocation,
                setRemoteLocation,
                currentAddress,
                refreshCurrentAddress
            }}
        >
            {children}
        </LocationContext.Provider>
    );
}

export function useLocationContext() {
    const context = useContext(LocationContext);
    if (context === undefined) {
        throw new Error('useLocationContext must be used within a LocationProvider');
    }
    return context;
}
