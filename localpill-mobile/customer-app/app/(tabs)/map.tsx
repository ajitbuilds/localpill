import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ActivityIndicator, Platform, Linking, Image, ScrollView, Modal, FlatList, Dimensions, TextInput, Keyboard, Animated, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../../components/icons/AppIcon';
import { Colors, Shadows, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_DEFAULT, PROVIDER_GOOGLE, Circle } from 'react-native-maps';
import firestore from '@react-native-firebase/firestore';

import { AnimatedTouchable } from '../../components/ui/AnimatedTouchable';
import { Skeleton } from '../../components/Skeleton';
import { darkMapStyle } from '@/constants/mapStyle';
import { reportError } from '../../utils/crashReporter';

const screenWidth = Dimensions.get('window').width;

// ── Google Maps Distance Matrix key (set in env or config) ───────────────────
// Replace with your actual key or load from env
const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

interface Pharmacy {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    isOnline: boolean;
    isVerified: boolean;
    address?: string;
    pharmacyImages?: string[];
    profilePhoto?: string;     // main profile / logo photo
    ownerPhotoURL?: string;   // owner's profile photo from Firestore
    distance?: number;
    phone?: string;
    open247?: boolean;
    delivery?: boolean;
    openingHour?: number;  // 0-23 e.g. 8 = 8am
    closingHour?: number;  // 0-23 e.g. 22 = 10pm
    eta?: string;          // "🚗 12 mins" — filled on selection
}

// ── Closing status helper ──────────────────────────────────────────────────
function getClosingStatus(p: Pharmacy, colorScheme: 'light' | 'dark' = 'light'): { label: string; color: string } | null {
    if (p.open247) return null;
    if (p.openingHour === undefined || p.closingHour === undefined) return null;
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    const totalMins = h * 60 + m;
    const closingMins = p.closingHour * 60;
    const openingMins = p.openingHour * 60;

    let isOpen: boolean;
    if (closingMins > openingMins) {
        // Normal schedule: e.g. 08:00–22:00
        isOpen = totalMins >= openingMins && totalMins < closingMins;
    } else {
        // Cross-midnight: e.g. 22:00–06:00
        isOpen = totalMins >= openingMins || totalMins < closingMins;
    }

    if (isOpen) {
        const remaining = closingMins > totalMins
            ? closingMins - totalMins
            : (24 * 60 - totalMins) + closingMins;
        if (remaining <= 30) {
            return { label: `Closes in ${remaining}m`, color: Colors[colorScheme].danger };
        }
        return null;
    }
    // Closed — always show when it reopens
    const oh = Math.floor(openingMins / 60);
    const ampm = oh >= 12 ? 'PM' : 'AM';
    const displayH = oh > 12 ? oh - 12 : oh === 0 ? 12 : oh;
    return { label: `Opens at ${displayH}${ampm}`, color: Colors[colorScheme].textMuted };
}

function checkIsOpenNow(p: Pharmacy): boolean {
    if (p.open247) return true;
    // Note: pass hardcoded 'light' — we only check the label, not the color
    const status = getClosingStatus(p, 'light');
    // If status is null (open) or "Closes in X" (open), it is open now.
    // If status is "Opens at X", it is closed now.
    if (!status) return true;
    if (status.label.startsWith('Closes in')) return true;
    return false;
}

// Haversine formula to calculate distance in km
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}

const INDIA_FALLBACK = { latitude: 20.5937, longitude: 78.9629 }; // India center

// Bottom sheet slide distance (fully off-screen below)
const SHEET_SLIDE = 500;

export default function MapScreen() {
    const insets = useSafeAreaInsets();
    const mapRef = useRef<MapView>(null);
    const colorScheme = useColorScheme() ?? 'light';
    const activeColors = Colors[colorScheme as 'light' | 'dark'];

    const [loading, setLoading] = useState(true);
    // user profile context
    // tracksViewChanges was removed to fix Android rendering bugs

    // userLocation = actual GPS position (NEVER changed by search — this controls the blue dot & user marker)
    const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    // distanceOrigin = what we use to calculate distances (starts = GPS, updates when user searches a new area)
    const [distanceOrigin, setDistanceOrigin] = useState<{ latitude: number; longitude: number } | null>(null);
    const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
    const [selectedPharmacy, setSelectedPharmacy] = useState<Pharmacy | null>(null);
    const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
    const [locationError, setLocationError] = useState(false);

    // New Enhancements State
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [loadingETA, setLoadingETA] = useState(false);
    const [filters, setFilters] = useState({
        verified: false,
        open247: false,
        delivery: false,
        openNow: false,
    });

    // Setup for map transition timeout cancellation
    const selectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Bottom sheet height (measured via onLayout) for proper floating button offset
    const [sheetHeight, setSheetHeight] = useState(280);

    // Bottom sheet animation — starts offscreen (SHEET_SLIDE), animates to 0 (visible)
    const sheetAnim = useRef(new Animated.Value(SHEET_SLIDE)).current;
    const sheetOpen = useRef(false);

    const openBottomSheet = () => {
        sheetOpen.current = true;
        Animated.spring(sheetAnim, { toValue: 0, useNativeDriver: true, tension: 60, friction: 11 }).start();
    };
    const closeBottomSheet = () => {
        sheetOpen.current = false;
        Animated.spring(sheetAnim, { toValue: SHEET_SLIDE, useNativeDriver: true, tension: 80, friction: 13 }).start(
            () => setSelectedPharmacy(null)
        );
    };

    // ── 1. Get user's location ──────────────────────────────────────────
    useEffect(() => {
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    setLocationError(true);
                    setUserLocation(INDIA_FALLBACK);
                    setDistanceOrigin(INDIA_FALLBACK);
                    setLoading(false);
                    return;
                }

                // ── Phase 1: Instant — use last known position immediately ──
                // Cached by the OS, returns in <50ms. Map shows right away.
                const lastKnown = await Location.getLastKnownPositionAsync();
                if (lastKnown) {
                    const coords = { latitude: lastKnown.coords.latitude, longitude: lastKnown.coords.longitude };
                    setUserLocation(coords);
                    setDistanceOrigin(coords);
                }
                // Stop the skeleton immediately — map is now visible
                setLoading(false);

                // ── Phase 2: Background — fetch precise GPS silently ──
                // Map is already visible. When this resolves, the blue dot and
                // pharmacy distances update quietly with no loading state.
                try {
                    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                    const preciseCoords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
                    setUserLocation(preciseCoords);
                    setDistanceOrigin(preciseCoords);
                } catch (gpsErr) {
                    if (__DEV__) console.warn('Precise GPS failed, keeping last known location:', gpsErr);
                    reportError(gpsErr, 'MapScreen.preciseGPS');
                    if (!lastKnown) {
                        setLocationError(true);
                        setUserLocation(INDIA_FALLBACK);
                        setDistanceOrigin(INDIA_FALLBACK);
                    }
                }

            } catch (e) {
                if (__DEV__) console.warn('Location error:', e);
                reportError(e, 'MapScreen.initLocation');
                setLocationError(true);
                setUserLocation(INDIA_FALLBACK);
                setDistanceOrigin(INDIA_FALLBACK);
                setLoading(false);
            }
        })();
    }, []);


    const distanceOriginRef = useRef<{ latitude: number; longitude: number } | null>(null);
    useEffect(() => {
        distanceOriginRef.current = distanceOrigin;
    }, [distanceOrigin]);

    // ── 2. Live listener: online pharmacies (with optional bounds filter) ──
    const fetchPharmacies = useCallback((bounds?: { minLat: number; maxLat: number; minLng: number; maxLng: number }) => {
        let query: any = firestore().collection('pharmacies').where('isOnline', '==', true);

        const unsub = query.onSnapshot(
            (snap: any) => {
                if (!snap) return;
                const data: Pharmacy[] = [];
                snap.forEach((doc: any) => {
                    const d = doc.data();
                    const geo = d.location;
                    if (!geo) return;
                    const lat: number = geo.latitude ?? geo.lat;
                    const lng: number = geo.longitude ?? geo.lng;
                    if (!lat || !lng) return;

                    // Client-side bounding box filter (works even without geohash indexing)
                    if (bounds) {
                        if (lat < bounds.minLat || lat > bounds.maxLat || lng < bounds.minLng || lng > bounds.maxLng) return;
                    }

                    // Parse opening/closing hours (stored as integers or ommitted)
                    const openingHour: number | undefined = typeof d.openingHour === 'number' ? d.openingHour : undefined;
                    const closingHour: number | undefined = typeof d.closingHour === 'number' ? d.closingHour : undefined;

                    data.push({
                        id: doc.id,
                        name: d.name || 'Pharmacy',
                        latitude: lat,
                        longitude: lng,
                        isOnline: true,
                        isVerified: d.isVerified === true,
                        address: d.address || d.street || '',
                        pharmacyImages: d.pharmacyImages || [],
                        // profilePhoto: dedicated field first, else first store image
                        profilePhoto: d.profilePhoto || d.logoUrl || (d.pharmacyImages && d.pharmacyImages[0]) || undefined,
                        // owner's profile photo (set via Firebase Auth or profile update)
                        ownerPhotoURL: d.photoURL || d.ownerPhotoURL || undefined,
                        phone: d.phone || d.phoneNumber || '',
                        open247: d.open247 === true,
                        delivery: d.delivery === true,
                        openingHour,
                        closingHour,
                    });
                });

                // Calculate distances & cap at 50 km to limit data
                const originToUse = distanceOriginRef.current || userLocation;
                if (originToUse) {
                    data.forEach(p => {
                        p.distance = calculateDistance(originToUse.latitude, originToUse.longitude, p.latitude, p.longitude);
                    });
                }
                // Client-side distance cap: only keep pharmacies within 50 km
                const capped = originToUse ? data.filter(p => (p.distance ?? 0) <= 50) : data;
                setPharmacies(capped);
                // Sync selectedPharmacy with latest data from Firestore
                setSelectedPharmacy(prev => {
                    if (!prev) return prev;
                    const updated = data.find(p => p.id === prev.id);
                    return updated ? { ...prev, ...updated } : prev;
                });
            },
            (err: any) => { if (__DEV__) console.warn('Pharmacy map listener error:', err); }
        );
        return unsub;
    }, [userLocation]);

    // Re-subscribe to pharmacy listener when userLocation changes so distances are fresh
    useEffect(() => {
        const unsub = fetchPharmacies();
        return () => unsub();
    }, [fetchPharmacies]);

    // ── 3. Fit map to show user and all online pharmacies (only on initial load / count change) ──
    const pharmacyCount = pharmacies.length;
    useEffect(() => {
        if (userLocation && mapRef.current) {
            if (pharmacyCount > 0) {
                const coordinates = [
                    userLocation,
                    ...pharmacies.map(p => ({ latitude: p.latitude, longitude: p.longitude }))
                ];
                (mapRef.current as any).fitToCoordinates(coordinates, {
                    edgePadding: { top: 80, right: 60, bottom: 80, left: 60 },
                    animated: true,
                });
            } else {
                (mapRef.current as any).animateToRegion({
                    latitude: userLocation.latitude,
                    longitude: userLocation.longitude,
                    latitudeDelta: 0.08,
                    longitudeDelta: 0.08,
                }, 600);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userLocation, pharmacyCount]);

    // Update distances when distanceOrigin changes (GPS location OR searched area)
    useEffect(() => {
        if (distanceOrigin && pharmacies.length > 0) {
            setPharmacies(prev => {
                let changed = false;
                const updated = prev.map(p => {
                    const newDistance = calculateDistance(distanceOrigin.latitude, distanceOrigin.longitude, p.latitude, p.longitude);
                    if (p.distance !== newDistance) {
                        changed = true;
                        return { ...p, distance: newDistance };
                    }
                    return p;
                });
                return changed ? updated : prev;
            });
        }
    }, [distanceOrigin?.latitude, distanceOrigin?.longitude, distanceOrigin, pharmacies.length]);

    // ── Region change (kept for future use / server-side bounding box query) ──
    const handleRegionChangeComplete = useCallback((_region: any) => {
        // Server-side bounds query can be re-enabled here if needed:
        // unsubPharmacies.current?.();
        // unsubPharmacies.current = fetchPharmacies(bounds);
    }, []);

    // ── Live ETA from Google Distance Matrix API ─────────────────────────
    const fetchETA = useCallback(async (pharmacy: Pharmacy) => {
        if (!userLocation || !GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY') return;
        setLoadingETA(true);
        try {
            const origin = `${userLocation.latitude},${userLocation.longitude}`;
            const dest = `${pharmacy.latitude},${pharmacy.longitude}`;
            const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${dest}&mode=driving&key=${GOOGLE_MAPS_API_KEY}`;
            const resp = await fetch(url);
            const json = await resp.json();
            const element = json?.rows?.[0]?.elements?.[0];
            if (element?.status === 'OK') {
                const durationText = element.duration_in_traffic?.text || element.duration?.text || '';
                setPharmacies(prev => prev.map(p => p.id === pharmacy.id ? { ...p, eta: `🚗 ${durationText}` } : p));
                setSelectedPharmacy(prev => prev ? { ...prev, eta: `🚗 ${durationText}` } : prev);
            }
        } catch (e) {
            if (__DEV__) console.warn('ETA fetch error:', e);
            reportError(e, 'MapScreen.fetchETA');
        } finally {
            setLoadingETA(false);
        }
    }, [userLocation]);

    const centerOnUser = () => {
        if (userLocation && mapRef.current) {
            if (pharmacies.length > 0) {
                const coordinates = [
                    userLocation,
                    ...pharmacies.map(p => ({ latitude: p.latitude, longitude: p.longitude }))
                ];
                (mapRef.current as any).fitToCoordinates(coordinates, {
                    edgePadding: { top: 80, right: 60, bottom: 80, left: 60 },
                    animated: true,
                });
            } else {
                (mapRef.current as any).animateToRegion({
                    latitude: userLocation.latitude,
                    longitude: userLocation.longitude,
                    latitudeDelta: 0.06,
                    longitudeDelta: 0.06,
                }, 400);
            }
        }
    };

    // Select pharmacy: open bottom sheet + fetch ETA
    const selectPharmacy = (pharmacy: Pharmacy) => {
        setSelectedPharmacy(pharmacy);

        if (mapRef.current) {
            if (userLocation) {
                // Determine padding based on whether the sheet is already open
                // If it wasn't open, assume a default sheet height (e.g. 250) for framing
                const bottomPadding = sheetHeight > 0 ? sheetHeight + 60 : 300;

                (mapRef.current as any).fitToCoordinates([
                    { latitude: userLocation.latitude, longitude: userLocation.longitude },
                    { latitude: pharmacy.latitude, longitude: pharmacy.longitude }
                ], {
                    edgePadding: { top: 100, right: 60, bottom: bottomPadding, left: 60 },
                    animated: true
                });
            } else {
                (mapRef.current as any).animateToRegion({
                    latitude: pharmacy.latitude,
                    longitude: pharmacy.longitude,
                    latitudeDelta: 0.02,
                    longitudeDelta: 0.02
                }, 600);
            }
        }

        openBottomSheet();
        fetchETA(pharmacy);
    };

    // ── 4. Search Location + Pharmacy Name ───────────────────────────────
    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        Keyboard.dismiss();

        // First: check if any pharmacy name matches
        const nameLower = searchQuery.trim().toLowerCase();
        const nameMatches = pharmacies.filter(p => p.name.toLowerCase().includes(nameLower));
        if (nameMatches.length > 0) {
            // Pan to first matching pharmacy
            const first = nameMatches[0];
            if (mapRef.current) {
                (mapRef.current as any).animateToRegion({
                    latitude: first.latitude,
                    longitude: first.longitude,
                    latitudeDelta: 0.02,
                    longitudeDelta: 0.02,
                }, 600);
            }
            // Auto-select if only one match
            if (nameMatches.length === 1) {
                selectPharmacy(first);
            }
            return;
        }

        // Fallback: geocode as area/place name
        setLoadingSearch(true);
        try {
            const geocoded = await Location.geocodeAsync(searchQuery);
            if (geocoded.length > 0) {
                const { latitude, longitude } = geocoded[0];
                if (mapRef.current) {
                    (mapRef.current as any).animateToRegion({
                        latitude, longitude, latitudeDelta: 0.08, longitudeDelta: 0.08
                    }, 800);
                }
                setDistanceOrigin({ latitude, longitude });
            } else {
                Alert.alert('Location not found', 'Please try searching for a different area.');
            }
        } catch (e) {
            if (__DEV__) console.warn('Geocoding error:', e);
            reportError(e, 'MapScreen.handleSearch');
            Alert.alert('Search Error', 'Unable to perform the search at this time.');
        } finally {
            setLoadingSearch(false);
        }
    };

    const mapRegion = useMemo(() => userLocation
        ? { latitude: userLocation.latitude, longitude: userLocation.longitude, latitudeDelta: 0.08, longitudeDelta: 0.08 }
        : { latitude: INDIA_FALLBACK.latitude, longitude: INDIA_FALLBACK.longitude, latitudeDelta: 8, longitudeDelta: 8 }
        , [userLocation]);

    // Apply Filters (must be before early return — used in both map and list view)
    const filteredPharmacies = useMemo(() => pharmacies.filter(p => {
        if (filters.verified && !p.isVerified) return false;
        if (filters.open247 && !p.open247) return false;
        if (filters.delivery && !p.delivery) return false;
        if (filters.openNow && !checkIsOpenNow(p)) return false;
        return true;
    }), [pharmacies, filters]);

    // Sort pharmacies by distance for the list view
    const sortedPharmacies = useMemo(() =>
        [...filteredPharmacies].sort((a, b) => (a.distance || 0) - (b.distance || 0))
        , [filteredPharmacies]);

    const toggleFilter = (key: keyof typeof filters) => {
        setFilters(prev => ({ ...prev, [key]: !prev[key] }));
    };

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: activeColors.background, paddingTop: insets.top }]}>
                <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={activeColors.background} />
                <View style={{ width: '100%', paddingHorizontal: 16, marginTop: 10, gap: 12 }}>
                    <Skeleton width="100%" height={50} borderRadius={16} />
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Skeleton width={80} height={32} borderRadius={16} />
                        <Skeleton width={80} height={32} borderRadius={16} />
                        <Skeleton width={80} height={32} borderRadius={16} />
                    </View>
                </View>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Skeleton width={80} height={80} borderRadius={40} style={{ marginBottom: 20 }} />
                    <Skeleton width={150} height={20} borderRadius={10} style={{ marginBottom: 8 }} />
                    <Skeleton width={200} height={16} borderRadius={8} />
                </View>
            </View>
        );
    }

    // ── Header UI (Search + Filters + Stats) ──────────────────
    const renderHeader = (isListMode = false) => (
        <View style={[
            styles.advancedHeader,
            isListMode && { position: 'relative', backgroundColor: activeColors.background, paddingBottom: 16 },
            { paddingTop: insets.top + 8 }
        ]}>
            {/* Search Bar */}
            <View style={[styles.searchContainer, { backgroundColor: activeColors.surface, shadowColor: colorScheme === 'dark' ? activeColors.shadow : 'rgba(0,0,0,0.1)' }]}>
                <AppIcon name="search" size={20} color={activeColors.icon} style={styles.searchIcon} />
                <TextInput
                    style={[styles.searchInput, { color: activeColors.text }]}
                    placeholder="Search area, colony, or landmark"
                    placeholderTextColor={activeColors.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSubmitEditing={handleSearch}
                    returnKeyType="search"
                />
                {loadingSearch && <ActivityIndicator size="small" color={activeColors.tint} style={{ marginRight: 8 }} />}
                {searchQuery.length > 0 && !loadingSearch && (
                    <AnimatedTouchable onPress={() => {
                        setSearchQuery('');
                        Keyboard.dismiss();
                        if (userLocation) {
                            setDistanceOrigin(userLocation);
                            centerOnUser();
                        }
                    }} style={{ padding: 4 }}>
                        <AppIcon name="close-circle" size={18} color={activeColors.icon} />
                    </AnimatedTouchable>
                )}
            </View>

            {/* Filter Pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll} contentContainerStyle={styles.filtersContent}>
                <AnimatedTouchable
                    style={[styles.filterPill, { backgroundColor: activeColors.surface, borderColor: activeColors.border }, filters.verified && { backgroundColor: activeColors.accent, borderColor: activeColors.accent }]}
                    onPress={() => toggleFilter('verified')}
                >
                    <AppIcon name="shield-checkmark" size={14} color={filters.verified ? activeColors.white : activeColors.icon} />
                    <Text style={[styles.filterText, { color: activeColors.textMuted }, filters.verified && { color: activeColors.white }]}>Verified</Text>
                </AnimatedTouchable>
                <AnimatedTouchable
                    style={[styles.filterPill, { backgroundColor: activeColors.surface, borderColor: activeColors.border }, filters.open247 && { backgroundColor: activeColors.accent, borderColor: activeColors.accent }]}
                    onPress={() => toggleFilter('open247')}
                >
                    <AppIcon name="time" size={14} color={filters.open247 ? activeColors.white : activeColors.icon} />
                    <Text style={[styles.filterText, { color: activeColors.textMuted }, filters.open247 && { color: activeColors.white }]}>24/7 Open</Text>
                </AnimatedTouchable>
                <AnimatedTouchable
                    style={[styles.filterPill, { backgroundColor: activeColors.surface, borderColor: activeColors.border }, filters.openNow && { backgroundColor: activeColors.accent, borderColor: activeColors.accent }]}
                    onPress={() => toggleFilter('openNow')}
                >
                    <AppIcon name="medical" size={14} color={filters.openNow ? activeColors.white : activeColors.icon} />
                    <Text style={[styles.filterText, { color: activeColors.textMuted }, filters.openNow && { color: activeColors.white }]}>Open Now</Text>
                </AnimatedTouchable>
                <AnimatedTouchable
                    style={[styles.filterPill, { backgroundColor: activeColors.surface, borderColor: activeColors.border }, filters.delivery && { backgroundColor: activeColors.accent, borderColor: activeColors.accent }]}
                    onPress={() => toggleFilter('delivery')}
                >
                    <AppIcon name="bicycle" size={14} color={filters.delivery ? activeColors.white : activeColors.icon} />
                    <Text style={[styles.filterText, { color: activeColors.textMuted }, filters.delivery && { color: activeColors.white }]}>Delivery</Text>
                </AnimatedTouchable>
            </ScrollView>

            {/* Stats Pill */}
            <View style={{ alignItems: 'flex-start', marginLeft: 16, marginTop: 8 }}>
                <View style={[styles.headerPill, { backgroundColor: activeColors.background, shadowColor: activeColors.shadow }]}>
                    <View style={[styles.onlineDot, { backgroundColor: activeColors.success }]} />
                    <Text style={[styles.headerText, { color: activeColors.text }]}>
                        {filteredPharmacies.length} {filteredPharmacies.length === 1 ? 'pharmacy' : 'pharmacies'} online nearby
                    </Text>
                </View>
            </View>
        </View>
    );

    // ── List View UI ──────────────────────────────────────────
    const renderListView = () => (
        <View style={[styles.listContainer, { backgroundColor: activeColors.background }]}>
            {renderHeader(true)}
            <FlatList
                data={sortedPharmacies}
                keyExtractor={p => p.id}
                contentContainerStyle={[{ padding: 16, paddingBottom: 100 }, sortedPharmacies.length === 0 && { flex: 1 }]}
                ListEmptyComponent={
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 60 }}>
                        <AppIcon name="search-outline" size={48} color={activeColors.icon} />
                        <Text style={{ marginTop: 16, fontSize: 18, fontFamily: 'Inter_600SemiBold', color: activeColors.text }}>No pharmacies found</Text>
                        <Text style={{ marginTop: 8, fontSize: 15, fontFamily: 'Inter_400Regular', color: activeColors.textMuted, textAlign: 'center', paddingHorizontal: 40 }}>
                            Adjust your filters or search a different area to find pharmacies.
                        </Text>
                    </View>
                }
                renderItem={({ item: p }) => (
                    <AnimatedTouchable
                        style={[styles.listItemCard, { backgroundColor: activeColors.surface, shadowColor: activeColors.shadow }]}
                        activeOpacity={0.8}
                        onPress={() => {
                            setViewMode('map');
                            if (mapRef.current) {
                                (mapRef.current as any).animateToRegion({
                                    latitude: p.latitude, longitude: p.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01
                                }, 500);
                            }
                            // Clear any previous timeout to prevent racing sheets
                            if (selectTimeoutRef.current) clearTimeout(selectTimeoutRef.current);
                            selectTimeoutRef.current = setTimeout(() => selectPharmacy(p), 600);
                        }}
                    >

                        <View style={[styles.pharmacyIconCircle, { backgroundColor: activeColors.background, borderColor: activeColors.border }]}>
                            <AppIcon name="storefront" size={20} color={activeColors.tint} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={[styles.pharmacyCardName, { color: activeColors.text }]}>{p.name}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                {p.isVerified && <AppIcon name="shield-checkmark" size={12} color={activeColors.success} />}
                                {p.distance !== undefined && (
                                    <Text style={[styles.pharmacyCardDistance, { color: activeColors.accent }]}>{p.distance.toFixed(1)} km away</Text>
                                )}
                            </View>
                            {p.address ? <Text style={[styles.pharmacyCardAddress, { color: activeColors.textMuted }]} numberOfLines={2}>{p.address}</Text> : null}
                        </View>
                        <AppIcon name="chevron-forward" size={20} color={activeColors.icon} />
                    </AnimatedTouchable>
                )}
            />
        </View>
    );

    if (viewMode === 'list') {
        return (
            <View style={[styles.container, { backgroundColor: activeColors.background }]}>
                <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
                {renderListView()}

                {/* Toggle Button */}
                <AnimatedTouchable style={[styles.toggleModeBtn, { bottom: insets.bottom + 20, backgroundColor: activeColors.text }]} onPress={() => setViewMode('map')}>
                    <AppIcon name="map" size={20} color={activeColors.background} />
                    <Text style={[styles.toggleModeBtnText, { color: activeColors.background }]}>Map</Text>
                </AnimatedTouchable>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: activeColors.background }]}>
            <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

            {/* ── Map ─────────────────────────────────── */}
            <MapView
                ref={mapRef as any}
                style={StyleSheet.absoluteFillObject}
                provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
                customMapStyle={colorScheme === 'dark' ? darkMapStyle : []}
                userInterfaceStyle={colorScheme === 'dark' ? 'dark' : 'light'}
                initialRegion={mapRegion}
                showsUserLocation={true}
                showsMyLocationButton={false}
                showsCompass={false}
                pitchEnabled={false}
                rotateEnabled={false}
                onPress={() => {
                    Keyboard.dismiss();
                    if (selectedPharmacy) closeBottomSheet();
                }}
                onRegionChangeComplete={handleRegionChangeComplete}
            >
                {/* Search radius circle (5 km) around user */}
                {userLocation && (
                    <Circle
                        center={userLocation}
                        radius={5000}
                        fillColor={colorScheme === 'dark' ? 'rgba(99, 102, 241, 0.04)' : 'rgba(2,132,199,0.06)'}
                        strokeColor={colorScheme === 'dark' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(2,132,199,0.25)'}
                        strokeWidth={1.5}
                    />
                )}

                {/* Standard native user location is shown via showsUserLocation={true} on MapView */}

                {/* Standard native user location is shown via showsUserLocation={true} on MapView */}


                {/* ── Pharmacy markers (always visible) ────────────── */}
                {filteredPharmacies.map(pharmacy => {
                    const isSelected = selectedPharmacy?.id === pharmacy.id;
                    const size = isSelected ? 52 : 44;
                    const innerSize = size - 6;
                    const borderColor = isSelected ? activeColors.accent : (pharmacy.isVerified ? activeColors.success : activeColors.background);
                    const markerBg = activeColors.background;
                    return (
                        <Marker
                            key={pharmacy.id}
                            coordinate={{
                                latitude: pharmacy.latitude,
                                longitude: pharmacy.longitude,
                            }}
                            onPress={() => selectPharmacy(pharmacy)}
                            zIndex={isSelected ? 10 : 1}
                        >
                            <View style={{
                                width: size,
                                height: size,
                                borderRadius: size / 2,
                                backgroundColor: markerBg,
                                borderWidth: isSelected ? 3 : 2,
                                borderColor: borderColor,
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                                shadowColor: activeColors.shadow,
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.2,
                                shadowRadius: 3,
                                elevation: 4,
                            }}>
                                {(pharmacy.ownerPhotoURL || pharmacy.profilePhoto) ? (
                                    <Image
                                        source={{ uri: pharmacy.ownerPhotoURL || pharmacy.profilePhoto }}
                                        style={{ width: innerSize, height: innerSize, borderRadius: innerSize / 2, backgroundColor: activeColors.surface }}
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <Text style={{ fontSize: isSelected ? 20 : 17, fontWeight: '700', color: activeColors.tint }}>
                                        {(pharmacy.name || 'P').charAt(0).toUpperCase()}
                                    </Text>
                                )}
                            </View>
                        </Marker>
                    );
                })}
            </MapView>

            {/* ── Map Empty State Banner ─────────────── */}
            {(filteredPharmacies.length === 0 && pharmacies.length > 0) && (
                <View style={[styles.errorBanner, { top: insets.top + 70, backgroundColor: activeColors.surface, borderColor: activeColors.danger, borderWidth: 1 }]}>
                    <AppIcon name="information-circle-outline" size={16} color={activeColors.danger} />
                    <Text style={[styles.errorBannerText, { color: activeColors.danger, marginLeft: 6 }]}>
                        No pharmacies match your filters
                    </Text>
                </View>
            )}

            {/* ── Top header overlay ─────────────────── */}
            {renderHeader()}

            {/* ── Floating Buttons (Right Side) ──────── */}
            <Animated.View style={[styles.floatingButtonsContainer, {
                bottom: insets.bottom + 20,
                transform: [{
                    translateY: sheetAnim.interpolate({
                        inputRange: [0, 500], // SHEET_SLIDE is 500
                        outputRange: [-(sheetHeight - 4), 0],
                        extrapolate: 'clamp'
                    })
                }]
            }]}>
                <AnimatedTouchable style={[styles.floatingBtn, { backgroundColor: activeColors.surface }]} onPress={centerOnUser} activeOpacity={0.85}>
                    <AppIcon name="locate" size={22} color={activeColors.accent} />
                </AnimatedTouchable>
                <AnimatedTouchable style={[styles.floatingBtn, { marginTop: 12, backgroundColor: activeColors.surface }]} onPress={() => setViewMode('list')} activeOpacity={0.85}>
                    <AppIcon name="list" size={22} color={activeColors.accent} />
                </AnimatedTouchable>
            </Animated.View>



            {/* ── Location error banner ─────────────── */}
            {locationError && (
                <View style={[styles.errorBanner, { top: insets.top + 60, backgroundColor: activeColors.background, borderColor: activeColors.warning, borderWidth: 1 }]}>
                    <AppIcon name="location-outline" size={14} color={activeColors.warning} />
                    <Text style={[styles.errorBannerText, { color: activeColors.warning }]}>Using approximate location — enable GPS for accuracy</Text>
                </View>
            )}

            {/* ── Bottom Sheet ─────────────────────────── */}
            {selectedPharmacy && (
                <Animated.View
                    style={[
                        styles.bottomSheet,
                        { bottom: insets.bottom, transform: [{ translateY: sheetAnim }], backgroundColor: activeColors.surface }
                    ]}
                    onLayout={(e) => setSheetHeight(e.nativeEvent.layout.height)}
                >
                    {/* Drag handle + close */}
                    <View style={styles.sheetHandle}>
                        <View style={[styles.sheetHandleBar, { backgroundColor: activeColors.icon }]} />
                    </View>

                    {/* Name + close button */}
                    <View style={styles.sheetHeader}>
                        {/* Owner Photo → Profile Photo → Initials Avatar */}
                        {(selectedPharmacy.ownerPhotoURL || selectedPharmacy.profilePhoto) ? (
                            <Image
                                source={{ uri: selectedPharmacy.ownerPhotoURL || selectedPharmacy.profilePhoto }}
                                style={[styles.pharmacyProfilePhoto, { borderColor: activeColors.border, backgroundColor: activeColors.background }]}
                            />
                        ) : (
                            <View style={[styles.pharmacyProfilePhoto, {
                                backgroundColor: activeColors.tint,
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: 12,
                                borderColor: activeColors.border,
                            }]}>
                                <Text style={{ color: activeColors.white, fontSize: 22, fontFamily: 'Inter_700Bold' }}>
                                    {(selectedPharmacy.name || 'P').charAt(0).toUpperCase()}
                                </Text>
                            </View>
                        )}
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={[styles.pharmacyCardName, { color: activeColors.text }]} numberOfLines={2}>{selectedPharmacy.name}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 8, flexWrap: 'wrap' }}>
                                {selectedPharmacy.distance !== undefined && (
                                    <Text style={[styles.pharmacyCardDistance, { color: activeColors.tint }]}>
                                        📍 {selectedPharmacy.distance.toFixed(1)} km away
                                    </Text>
                                )}
                                {loadingETA
                                    ? <ActivityIndicator size="small" color={activeColors.tint} />
                                    : selectedPharmacy.eta
                                        ? <Text style={[styles.etaText, { color: activeColors.tint }]}>{selectedPharmacy.eta}</Text>
                                        : null
                                }
                            </View>
                        </View>
                        <AnimatedTouchable onPress={closeBottomSheet} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <AppIcon name="close-circle" size={28} color={activeColors.icon} />
                        </AnimatedTouchable>
                    </View>

                    {/* Address */}
                    {selectedPharmacy.address ? (
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, marginBottom: 10, gap: 6 }}>
                            <AppIcon name="location-outline" size={14} color={activeColors.icon} style={{ marginTop: 2 }} />
                            <Text style={[styles.pharmacyCardAddress, { color: activeColors.textMuted }]} numberOfLines={2}>{selectedPharmacy.address}</Text>
                        </View>
                    ) : null}

                    {/* Badges */}
                    <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 20, marginBottom: 12, flexWrap: 'wrap' }}>
                        <View style={[styles.badgeOnline, { backgroundColor: activeColors.successSoft, borderColor: activeColors.success + '40' }]}>
                            <View style={[styles.onlineDot, { backgroundColor: activeColors.success }]} />
                            <Text style={[styles.badgeOnlineText, { color: activeColors.success }]}>Online</Text>
                        </View>
                        {selectedPharmacy.isVerified && (
                            <View style={[styles.badgeVerified, { backgroundColor: activeColors.successSoft, borderColor: activeColors.success + '40' }]}>
                                <AppIcon name="shield-checkmark" size={12} color={activeColors.success} />
                                <Text style={[styles.badgeVerifiedText, { color: activeColors.success }]}>Verified</Text>
                            </View>
                        )}
                        {selectedPharmacy.open247 && (
                            <View style={[styles.badgeVerified, { backgroundColor: activeColors.accentSoft, borderColor: activeColors.accent + '40' }]}>
                                <AppIcon name="time" size={12} color={activeColors.accent} />
                                <Text style={[styles.badgeVerifiedText, { color: activeColors.accent }]}>24/7</Text>
                            </View>
                        )}
                        {(() => {
                            const status = getClosingStatus(selectedPharmacy, colorScheme);
                            return status ? (
                                <View style={[styles.closingBadge, { backgroundColor: status.color }]}>
                                    <Text style={[styles.closingBadgeText, { color: activeColors.white }]}>{status.label}</Text>
                                </View>
                            ) : null;
                        })()}
                    </View>

                    {/* Photos */}
                    {selectedPharmacy.pharmacyImages && selectedPharmacy.pharmacyImages.length > 0 && (
                        <View style={{ marginBottom: 12 }}>
                            <Text style={[styles.pharmacyImagesTitle, { paddingHorizontal: 20, marginBottom: 8, color: activeColors.text }]}>
                                Store Photos ({selectedPharmacy.pharmacyImages.length})
                            </Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
                                {selectedPharmacy.pharmacyImages.map((uri, idx) => (
                                    <AnimatedTouchable key={idx} activeOpacity={0.8} onPress={() => setSelectedImageIndex(idx)}>
                                        <Image source={{ uri }} style={[styles.pharmacyPhoto, { backgroundColor: activeColors.border }]} />
                                    </AnimatedTouchable>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    {/* Action Buttons */}
                    <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingBottom: 16 }}>
                        {selectedPharmacy.phone ? (
                            <AnimatedTouchable
                                style={[styles.callBtn, { flex: 1, justifyContent: 'center', backgroundColor: activeColors.accentSoft, borderColor: activeColors.accent + '30' }]}
                                onPress={() => Linking.openURL(`tel:${selectedPharmacy.phone}`)}
                            >
                                <AppIcon name="call" size={16} color={activeColors.accent} />
                                <Text style={[styles.callBtnText, { color: activeColors.accent }]}>Call</Text>
                            </AnimatedTouchable>
                        ) : null}
                        <AnimatedTouchable
                            style={[styles.directionsBtn, { flex: 2, justifyContent: 'center', backgroundColor: activeColors.tint }]}
                            onPress={() => {
                                const lat = selectedPharmacy.latitude;
                                const lng = selectedPharmacy.longitude;
                                const label = encodeURIComponent(selectedPharmacy.name);
                                // Works on iOS (Apple Maps/Google Maps) and all Android
                                const url = Platform.OS === 'ios'
                                    ? `maps://app?daddr=${lat},${lng}&dirflg=d`
                                    : `https://maps.google.com/maps?daddr=${lat},${lng}&q=${label}`;
                                Linking.openURL(url).catch(() =>
                                    Linking.openURL(`https://maps.google.com/maps?daddr=${lat},${lng}`)
                                );
                            }}
                        >
                            <AppIcon name="navigate" size={16} color={activeColors.white} />
                            <Text style={[styles.directionsBtnText, { color: activeColors.white }]}>Get Directions</Text>
                        </AnimatedTouchable>
                    </View>
                </Animated.View>
            )}

            {/* ── Full Screen Image Modal ─────────────── */}
            <Modal visible={selectedImageIndex !== null} transparent={true} animationType="fade" onRequestClose={() => setSelectedImageIndex(null)}>
                <View style={[styles.modalOverlay, { backgroundColor: activeColors.overlay }]}>
                    <AnimatedTouchable style={styles.modalCloseButton} onPress={() => setSelectedImageIndex(null)}>
                        <AppIcon name="close" size={28} color={activeColors.white} />
                    </AnimatedTouchable>
                    {selectedImageIndex !== null && selectedPharmacy?.pharmacyImages && (
                        <FlatList
                            data={selectedPharmacy.pharmacyImages}
                            keyExtractor={(_, index) => index.toString()}
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            initialScrollIndex={selectedImageIndex}
                            getItemLayout={(_, index) => ({ length: screenWidth, offset: screenWidth * index, index })}
                            renderItem={({ item }) => (
                                <View style={{ width: screenWidth, height: '100%', justifyContent: 'center', alignItems: 'center' }}>
                                    <Image source={{ uri: item }} style={styles.fullScreenImage} resizeMode="contain" />
                                </View>
                            )}
                        />
                    )}
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    loadingText: {
        fontSize: 15,
        fontFamily: 'Inter_500Medium',
    },

    // Advanced Header
    advancedHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    searchContainer: {
        marginHorizontal: 16,
        borderRadius: Radius.lg,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 50,
        ...Shadows.md,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        fontFamily: 'Inter_400Regular',
        height: '100%',
    },

    // Filters
    filtersScroll: {
        marginTop: 12,
        flexGrow: 0,
    },
    filtersContent: {
        paddingHorizontal: 16,
        gap: 8,
    },
    filterPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: Radius.lg,
        borderWidth: 1,
        gap: 6,
    },
    filterPillActive: {
    },
    filterText: {
        fontSize: 13,
        fontFamily: 'Inter_500Medium',
    },
    filterTextActive: {
    },

    // Header Pill
    headerPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 9,
        borderRadius: Radius.lg,
        gap: 7,
        ...Shadows.sm,
    },
    headerText: {
        fontSize: 14,
        fontFamily: 'Inter_600SemiBold',
    },

    // Online dot
    onlineDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },

    // Floating Buttons (Right Side)
    floatingButtonsContainer: {
        position: 'absolute',
        right: 16,
        alignItems: 'center',
        zIndex: 5,
    },
    floatingBtn: {
        width: 48,
        height: 48,
        borderRadius: Radius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.sm,
    },

    // Custom User Marker
    userMarkerContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.sm,
        borderWidth: 2,
    },

    // Marker
    // Pharmacy pill marker
    pharmacyPill: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: Radius.lg,
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 6,
        ...Shadows.md,
        borderWidth: 1.5,
        minWidth: 100,
    },
    pharmacyPillSelected: {
        shadowOpacity: 0.4,
        elevation: 8,
    },
    pharmacyPillIcon: {
        width: 20,
        height: 20,
        borderRadius: Radius.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pharmacyPillText: {
        fontSize: 13,
        fontFamily: 'Inter_600SemiBold',
        maxWidth: 110,
    },
    markerTip: {
        width: 0,
        height: 0,
        borderLeftWidth: 5,
        borderRightWidth: 5,
        borderTopWidth: 7,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        marginTop: -1,
    },
    // Snap Map style marker container
    markerContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
    },
    markerContainerSelected: {
        width: 56,
        height: 56,
        borderRadius: 28,
        borderWidth: 4,
        zIndex: 1,
    },
    markerContainerVerified: {
    },
    markerImage: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    markerAvatarFallback: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    markerAvatarText: {
        fontSize: 18,
        fontFamily: 'Inter_700Bold',
    },

    // Bottom Sheet
    bottomSheet: {
        position: 'absolute',
        left: 0,
        right: 0,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 0,
        ...Shadows.lg,
        zIndex: 20,
    },
    sheetHandle: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    sheetHandleBar: {
        width: 40,
        height: 4,
        borderRadius: 2,
    },
    sheetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 10,
    },
    // Closing badge on marker
    closingBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: Radius.sm,
        marginBottom: 4,
    },
    closingBadgeText: {
        fontSize: 9,
        fontFamily: 'Inter_700Bold',
    },
    etaText: {
        fontSize: 12,
        fontFamily: 'Inter_600SemiBold',
    },
    // Legacy pharmacyCard alias kept for list view
    pharmacyCard: {
        position: 'absolute',
        left: 16,
        right: 16,
        borderRadius: Radius.lg,
        padding: 16,
        ...Shadows.md,
    },
    pharmacyCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    pharmacyIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    pharmacyProfilePhoto: {
        width: 52,
        height: 52,
        borderRadius: Radius.md,
        borderWidth: 1.5,
    },
    pharmacyCardName: {
        fontSize: 16,
        fontFamily: 'Inter_700Bold',
        marginBottom: 2,
    },
    pharmacyCardDistance: {
        fontSize: 12,
        fontFamily: 'Inter_600SemiBold',
        marginBottom: 2,
    },
    pharmacyCardAddress: {
        fontSize: 13,
        fontFamily: 'Inter_400Regular',
    },
    pharmacyImagesSection: {
        marginTop: 12,
        marginBottom: 8,
        borderTopWidth: 1,
        paddingTop: 12,
    },
    pharmacyImagesTitle: {
        fontSize: 13,
        fontFamily: 'Inter_600SemiBold',
        marginBottom: 8,
    },
    pharmacyImagesScroll: {
        flexGrow: 0,
    },
    pharmacyPhoto: {
        width: 100,
        height: 70,
        borderRadius: Radius.sm,
        marginRight: 8,
    },
    pharmacyCardBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    callBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: Radius.md,
        gap: 6,
    },
    callBtnText: {
        fontSize: 13,
        fontFamily: 'Inter_600SemiBold',
    },
    directionsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: Radius.md,
        gap: 6,
    },
    directionsBtnText: {
        fontSize: 13,
        fontFamily: 'Inter_600SemiBold',
    },
    badgeOnline: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: Radius.lg,
        borderWidth: 1,
    },
    badgeOnlineText: {
        fontSize: 12,
        fontFamily: 'Inter_600SemiBold',
    },
    badgeVerified: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: Radius.lg,
        borderWidth: 1,
    },
    badgeVerifiedText: {
        fontSize: 12,
        fontFamily: 'Inter_600SemiBold',
    },

    // Error banner
    errorBanner: {
        position: 'absolute',
        left: 16,
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderRadius: Radius.md,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    errorBannerText: {
        fontSize: 12,
        fontFamily: 'Inter_500Medium',
        flex: 1,
    },

    // Modal
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalCloseButton: {
        position: 'absolute',
        top: 60,
        right: 20,
        zIndex: 10,
        padding: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: Radius.lg,
    },
    fullScreenImage: {
        width: '100%',
        height: '80%',
    },

    // List View
    listContainer: {
        flex: 1,
    },
    listItemCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: Radius.lg,
        marginBottom: 12,
        ...Shadows.sm,
    },
    toggleModeBtn: {
        position: 'absolute',
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: Radius.lg,
        gap: 8,
        ...Shadows.md,
    },
    toggleModeBtnText: {
        fontSize: 15,
        fontFamily: 'Inter_600SemiBold',
    },
});
