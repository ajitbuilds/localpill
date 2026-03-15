import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Animated, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Colors, Shadows, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppIcon } from '../components/icons/AppIcon';
import { TextInput } from '@/components/ui/TextInput';
import { AnimatedTouchable } from '@/components/ui/AnimatedTouchable';
import { useLocationContext } from '@/contexts/LocationContext';
import * as Location from 'expo-location';
import MapView, { Marker, Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { showToast } from '@/components/Toast';
import { getFormattedAddress } from '../utils/geocode';
import { Linking } from 'react-native';
import { LocationPrimer } from '@/components/modals/LocationPrimer';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { reportError } from '../utils/crashReporter';

const darkMapStyle = [
    { "elementType": "geometry", "stylers": [{ "color": "#242f3e" }] },
    { "elementType": "labels.text.fill", "stylers": [{ "color": "#746855" }] },
    { "elementType": "labels.text.stroke", "stylers": [{ "color": "#242f3e" }] },
    { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
    { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
    { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#263c3f" }] },
    { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{ "color": "#6b9a76" }] },
    { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#38414e" }] },
    { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#212a37" }] },
    { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#9ca5b3" }] },
    { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#746855" }] },
    { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{ "color": "#1f2835" }] },
    { "featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [{ "color": "#f3d19c" }] },
    { "featureType": "transit", "elementType": "geometry", "stylers": [{ "color": "#2f3948" }] },
    { "featureType": "transit.station", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#17263c" }] },
    { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#515c6d" }] },
    { "featureType": "water", "elementType": "labels.text.stroke", "stylers": [{ "color": "#17263c" }] }
];

export default function LocationModal() {
    const colorScheme = useColorScheme() ?? 'light';
    const activeColors = Colors[colorScheme as 'light' | 'dark'];
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { setLocationMode, setRemoteLocation, refreshCurrentAddress } = useLocationContext();
    const { uid } = useAuth();

    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [mapRegion, setMapRegion] = useState<Region | null>(null);
    const [tempAddress, setTempAddress] = useState<string>('');
    const [confirmingLoc, setConfirmingLoc] = useState(false);
    const [isSharingLink, setIsSharingLink] = useState(false);
    const [isCurrentLocation, setIsCurrentLocation] = useState(false);
    const unsubscribeRef = useRef<(() => void) | null>(null);
    const sharingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const geocodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const mapRef = useRef<MapView>(null);
    const [isLocating, setIsLocating] = useState(false);
    const [showLocationPrimer, setShowLocationPrimer] = useState(false);
    const [pendingLocationAction, setPendingLocationAction] = useState<'none' | 'goto' | 'current'>('none');

    const triggerLocationAction = async (action: 'goto' | 'current') => {
        if (action === 'goto') setIsLocating(true);
        else { setIsSearching(true); setIsCurrentLocation(true); }

        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
            if (action === 'goto') executeGoToCurrent();
            else executeCurrentLocation();
        } else {
            setPendingLocationAction(action);
            setShowLocationPrimer(true);
        }
    };

    const handlePrimerAllow = () => {
        setShowLocationPrimer(false);
        if (pendingLocationAction === 'goto') executeGoToCurrent();
        else if (pendingLocationAction === 'current') executeCurrentLocation();
        setPendingLocationAction('none');
    };

    const handlePrimerDeny = () => {
        setShowLocationPrimer(false);
        setPendingLocationAction('none');
        setIsLocating(false);
        setIsSearching(false);
    };

    const executeGoToCurrent = async () => {
        try {
            let loc = await Location.getLastKnownPositionAsync();
            if (!loc) {
                loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
            }
            if (!loc) {
                showToast('Could not fetch current location.', 'error');
                return;
            }
            const region = {
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            };
            if (mapRef.current) {
                mapRef.current.animateToRegion(region, 750);
            }
        } catch (error) {
            reportError(error, 'LocationModal.goToCurrentLocation');
            showToast('Could not fetch current location.', 'error');
        } finally {
            setIsLocating(false);
        }
    };

    React.useEffect(() => {
        return () => {
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
            }
            if (sharingTimeoutRef.current) {
                clearTimeout(sharingTimeoutRef.current);
            }
            if (geocodeTimerRef.current) {
                clearTimeout(geocodeTimerRef.current);
            }
        };
    }, []);

    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Show map with animation when location found
    const showMapAnim = () => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start();
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        try {
            const results = await Location.geocodeAsync(searchQuery.trim());
            if (results && results.length > 0) {
                const { latitude, longitude } = results[0];
                const region = {
                    latitude,
                    longitude,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                };
                setMapRegion(region);

                // Get human readable address for confirmation
                const addrStr = await getFormattedAddress(latitude, longitude);
                if (addrStr) {
                    setTempAddress(addrStr);
                } else {
                    setTempAddress('Selected Location');
                }
                showMapAnim();
            } else {
                showToast('Location not found. Try a broader search.', 'error');
            }
        } catch (e) {
            reportError(e, 'LocationModal.handleSearchSubmit');
            showToast('Could not search location. Check internet.', 'error');
            if (__DEV__) console.error(e);
        } finally {
            setIsSearching(false);
        }
    };

    const executeCurrentLocation = async () => {
        try {
            if (__DEV__) console.log("Modal: Requesting current position...");
            let loc = await Location.getLastKnownPositionAsync();
            if (!loc) {
                if (__DEV__) console.log("Modal: No last known position, requesting current...");
                loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
            }

            if (!loc) {
                showToast('Could not fetch current location.', 'error');
                setIsSearching(false);
                return;
            }
            const { latitude, longitude } = loc.coords;
            const region = {
                latitude,
                longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            };
            setMapRegion(region);

            // Get human readable address for confirmation
            const addressString = await getFormattedAddress(latitude, longitude);
            if (addressString) {
                setTempAddress(addressString);
            } else {
                setTempAddress('Current Location');
            }
            showMapAnim();
        } catch (error) {
            reportError(error, 'LocationModal.executeCurrentLocation');
            showToast('Could not fetch current location.', 'error');
            if (__DEV__) console.error(error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleConfirmRemoteLocation = async () => {
        if (!mapRegion) return;
        setConfirmingLoc(true);

        let finalAddress = tempAddress;
        if (tempAddress === 'Fetching address details...' || tempAddress === 'Location Selected') {
            try {
                const addrStr = await getFormattedAddress(mapRegion.latitude, mapRegion.longitude);
                finalAddress = addrStr || 'Selected Location';
            } catch (e) {
                finalAddress = 'Selected Location';
            }
        }

        setRemoteLocation({
            latitude: mapRegion.latitude,
            longitude: mapRegion.longitude,
            address: finalAddress || searchQuery || 'Selected Location',
            label: 'Selected Location'
        });
        setLocationMode(isCurrentLocation ? 'current' : 'remote');
        if (isCurrentLocation) {
            refreshCurrentAddress();
        }
        setConfirmingLoc(false);
        router.back();
    };

    const handleRegionChangeComplete = useCallback((region: any) => {
        setMapRegion(region);
        // When user drags the map, it's no longer "current" live location
        setIsCurrentLocation(false);

        // Debounce reverse-geocoding to avoid lag/flickering on drag
        if (geocodeTimerRef.current) {
            clearTimeout(geocodeTimerRef.current);
        }
        setTempAddress('Fetching address details...');
        geocodeTimerRef.current = setTimeout(async () => {
            try {
                const addrStr = await getFormattedAddress(region.latitude, region.longitude);
                if (addrStr) {
                    setTempAddress(addrStr);
                } else {
                    setTempAddress('Selected Location');
                }
            } catch (e) {
                if (__DEV__) console.log('Reverse geocode error', e);
                setTempAddress('Location Selected');
            }
        }, 500);
    }, []);

    const cancelSharingWait = useCallback(() => {
        if (unsubscribeRef.current) {
            unsubscribeRef.current();
            unsubscribeRef.current = null;
        }
        if (sharingTimeoutRef.current) {
            clearTimeout(sharingTimeoutRef.current);
            sharingTimeoutRef.current = null;
        }
        setIsSharingLink(false);
    }, []);

    const handleAskToShareLocation = async () => {
        setIsSharingLink(true);
        try {
            // Clean up any existing listener before starting a new one
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
                unsubscribeRef.current = null;
            }
            if (sharingTimeoutRef.current) {
                clearTimeout(sharingTimeoutRef.current);
                sharingTimeoutRef.current = null;
            }

            const docRef = firestore().collection('locationRequests').doc();
            const reqId = docRef.id;

            // Set expiration to 30 minutes from now
            const expiresAt = new Date();
            expiresAt.setMinutes(expiresAt.getMinutes() + 30);

            await docRef.set({
                createdBy: uid || 'anonymous',
                status: 'pending',
                createdAt: firestore.FieldValue.serverTimestamp(),
                expiresAt: firestore.Timestamp.fromDate(expiresAt),
            });

            const link = `https://localpill.com/s/${reqId}`;
            const userName = await AsyncStorage.getItem('user_name');
            const senderName = userName ? `*${userName.trim()}* ko` : 'Mujhe';
            const message = `📍 *Location Request*\n\nHi! ${senderName} dawaai / pharmacy check karne ke liye aapki exact location chahiye. Please is *secure link* par click karke apni location share karein:\n\n${link}\n\n_(Yeh link bas 30 minute tak valid hai)_`;


            try {
                await Linking.openURL(`whatsapp://send?text=${encodeURIComponent(message)}`);
            } catch (linkError) {
                reportError(linkError, 'LocationModal.openWhatsApp');
                showToast('WhatsApp not installed. Try copying the link manually if needed.', 'error');
                setIsSharingLink(false);
                return; // Don't start listener if WhatsApp failed
            }

            // Listen for completion
            unsubscribeRef.current = docRef.onSnapshot((docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data?.status === 'completed' && data?.lat && data?.lng) {
                        setRemoteLocation({
                            latitude: data.lat,
                            longitude: data.lng,
                            address: data.address || 'Exact Location Shared',
                            label: 'Shared Location'
                        });
                        setLocationMode('remote');
                        cancelSharingWait();
                        showToast('Location received successfully!', 'success');
                        router.back();
                    }
                }
            });

            // 5-minute timeout for the sharing wait
            sharingTimeoutRef.current = setTimeout(() => {
                cancelSharingWait();
                showToast('Location sharing timed out. Please try again.', 'error');
            }, 5 * 60 * 1000);

        } catch (error) {
            reportError(error, 'LocationModal.handleShareExactLocation');
            if (__DEV__) console.error(error);
            showToast('Failed to create request link.', 'error');
            setIsSharingLink(false);
        }
    };

    return (
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: activeColors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: activeColors.border, paddingTop: Math.max(insets.top, 10) }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <AnimatedTouchable onPress={() => router.back()} style={styles.closeBtn}>
                        <AppIcon name="close" size={24} color={activeColors.text} />
                    </AnimatedTouchable>
                    <Text style={[styles.headerTitle, { color: activeColors.text }]}>Select search location</Text>
                </View>
            </View>

            <View style={{ flex: 1 }}>
                {/* Search / Options State */}
                {!mapRegion && (
                    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                        <View style={styles.searchContainer}>
                            <TextInput
                                placeholder="Search for area, street name..."
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                containerStyle={{ marginBottom: 0, backgroundColor: activeColors.surface, borderRadius: 12, shadowColor: activeColors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: activeColors.border }}
                                leftIcon={<AppIcon name="search" size={20} color={activeColors.textMuted} />}
                                rightIcon={searchQuery.length > 0 ? (
                                    <AnimatedTouchable onPress={handleSearch} style={{ padding: 4 }}>
                                        <AppIcon name="arrow-forward-circle" size={24} color={activeColors.tint} />
                                    </AnimatedTouchable>
                                ) : undefined}
                                onSubmitEditing={handleSearch}
                                returnKeyType="search"
                            />
                        </View>
                        {isSearching && <Text style={{ textAlign: 'center', marginTop: 10, color: activeColors.textMuted }}>Searching...</Text>}

                        <View style={{ marginTop: 10 }}>
                            {/* Current Location Option */}
                            <AnimatedTouchable style={[styles.card, { backgroundColor: activeColors.surface, borderColor: activeColors.border, marginBottom: 12 }]} onPress={() => triggerLocationAction('current')}>
                                <View style={[styles.optionRow, { borderBottomWidth: 0 }]}>
                                    <View style={[styles.optionIconBase, { backgroundColor: activeColors.successSoft }]}>
                                        <AppIcon name="locate" size={22} color={activeColors.success} />
                                    </View>
                                    <View style={styles.optionTexts}>
                                        <Text style={[styles.optionTitle, { color: activeColors.success }]}>Use current location</Text>
                                        <Text style={[styles.optionSubtitle, { color: activeColors.textMuted }]}>Using GPS</Text>
                                    </View>
                                    <AppIcon name="chevron-forward" size={20} color={activeColors.textMuted} />
                                </View>
                            </AnimatedTouchable>

                            {/* Add New Address / Search Someone Else (Phase 2 Placeholder) */}
                            <AnimatedTouchable style={[styles.card, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]} onPress={handleAskToShareLocation} disabled={isSharingLink}>
                                <View style={[styles.optionRow, { borderBottomWidth: 0 }]}>
                                    <View style={[styles.optionIconBase, { backgroundColor: '#25D366' }]}>
                                        <AppIcon name="logo-whatsapp" size={18} color={activeColors.white || '#fff'} />
                                    </View>
                                    <View style={styles.optionTexts}>
                                        <Text style={[styles.optionTitle, { color: activeColors.text }]}>Request location from someone else</Text>
                                        <Text style={[styles.optionSubtitle, { color: activeColors.textMuted }]}>
                                            {isSharingLink ? 'Waiting for them to open the link...' : 'Send a link via WhatsApp'}
                                        </Text>
                                    </View>
                                    {isSharingLink ? (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <AnimatedTouchable onPress={cancelSharingWait} style={{ padding: 4 }}>
                                                <AppIcon name="close-circle" size={22} color={activeColors.danger || '#EF4444'} />
                                            </AnimatedTouchable>
                                            <ActivityIndicator size="small" color="#25D366" />
                                        </View>
                                    ) : (
                                        <AppIcon name="chevron-forward" size={20} color={activeColors.textMuted} />
                                    )}
                                </View>
                            </AnimatedTouchable>
                        </View>
                    </ScrollView>
                )}

                {/* Map Confirm State. It animates in when mapRegion is set */}
                {mapRegion && (
                    <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: activeColors.background, opacity: fadeAnim }]}>
                        <MapView
                            style={{ flex: 1 }}
                            ref={mapRef}
                            initialRegion={mapRegion}
                            onRegionChangeComplete={handleRegionChangeComplete}
                            showsUserLocation={false}
                            mapType="standard"
                            customMapStyle={colorScheme === 'dark' ? darkMapStyle : []}
                            userInterfaceStyle={colorScheme === 'dark' ? 'dark' : 'light'}
                        />

                        {/* Floating Center Pin */}
                        <View style={[styles.centerPinContainer, { shadowColor: activeColors.shadow }]} pointerEvents="none">
                            <AppIcon name="location" size={40} color={activeColors.tint} />
                        </View>

                        {/* Floating Instruction */}
                        <View style={[styles.floatingInstruction, { top: undefined, bottom: Math.max(insets.bottom + 10, 20) + 240, backgroundColor: activeColors.tint, shadowColor: activeColors.shadow }]}>
                            <Text style={[styles.instructionText, { color: activeColors.white || '#fff' }]}>Move the pin to adjust area</Text>
                        </View>

                        {/* Floating Current Location Button */}
                        <AnimatedTouchable
                            style={[styles.currentLocBtn, { backgroundColor: activeColors.surface, borderColor: activeColors.border, bottom: Math.max(insets.bottom + 10, 20) + 210, shadowColor: activeColors.shadow }]}
                            onPress={() => triggerLocationAction('goto')}
                            disabled={isLocating}
                        >
                            {isLocating ? <ActivityIndicator size="small" color={activeColors.tint} /> : <AppIcon name="locate" size={24} color={activeColors.tint} />}
                        </AnimatedTouchable>

                        {/* Bottom Confirmation Card */}
                        <View style={[styles.confirmCard, { backgroundColor: activeColors.background, paddingBottom: Math.max(insets.bottom + 10, 20), shadowColor: activeColors.shadow }]}>
                            <View style={styles.addressDisplayRow}>
                                <AppIcon name="location" size={24} color={activeColors.text} style={{ marginTop: 2 }} />
                                <View style={{ marginLeft: 10, flex: 1 }}>
                                    <Text style={[styles.addressTitle, { color: activeColors.text }]}>Selected Area</Text>
                                    <Text style={[styles.addressText, { color: activeColors.textMuted }]}>{tempAddress || 'Fetching address details...'}</Text>
                                </View>
                            </View>

                            <Button
                                title="Confirm Location"
                                onPress={handleConfirmRemoteLocation}
                                loading={confirmingLoc}
                                style={{ marginTop: 16 }}
                            />

                            <AnimatedTouchable onPress={() => setMapRegion(null)} style={{ alignItems: 'center', marginTop: 15 }}>
                                <Text style={{ color: activeColors.tint, fontWeight: '600' }}>Search different area</Text>
                            </AnimatedTouchable>
                        </View>
                    </Animated.View>
                )}
            </View>

            <LocationPrimer
                visible={showLocationPrimer}
                onAllow={handlePrimerAllow}
                onDeny={handlePrimerDeny}
                subtitle="We need your location to show pharmacies and available medicines near you."
            />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        backgroundColor: 'transparent',
    },
    closeBtn: {
        padding: 4,
        marginRight: 10,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    searchContainer: {
        marginBottom: 20,
    },
    card: {
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
    optionIconBase: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    optionTexts: {
        flex: 1,
        marginLeft: 12,
    },
    optionTitle: {
        fontSize: 15,
        fontWeight: '600',
    },
    optionSubtitle: {
        fontSize: 12,
        marginTop: 2,
    },
    centerPinContainer: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginLeft: -20,
        marginTop: -40,
        zIndex: 10,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.md,
    },
    floatingInstruction: {
        position: 'absolute',
        top: 20,
        alignSelf: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: Radius.lg,
        ...Shadows.md,
    },
    currentLocBtn: {
        position: 'absolute',
        right: 16,
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.sm,
        borderWidth: 1,
    },
    instructionText: {
        fontWeight: '600',
        fontSize: 14,
    },
    confirmCard: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        ...Shadows.lg,
    },
    addressDisplayRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    addressTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    addressText: {
        fontSize: 13,
        marginTop: 4,
        lineHeight: 18,
    }
});
