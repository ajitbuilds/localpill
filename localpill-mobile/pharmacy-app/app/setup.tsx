import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Image,
    TouchableOpacity,
    ScrollView,
    TextInput as RNTextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Animated } from 'react-native';
import { AnimatedTouchable } from '@/components/ui/AnimatedTouchable';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Store, Check, Camera, Plus, Building2, CreditCard, MapPin, ArrowRight } from 'lucide-react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import MapView, { Marker } from 'react-native-maps';
import { Colors, DesignTokens } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import * as geofire from 'geofire-common';
import { getFormattedAddress } from '../utils/geocode';
import { isValidString } from '../utils/validation';
import { withRetry } from '../utils/retry';

export default function PharmacySetup() {
    const [name, setName] = useState('');
    const [license, setLicense] = useState('');
    const [profilePic, setProfilePic] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [location, setLocation] = useState<any>(null);
    const [mapRegion, setMapRegion] = useState<any>(null);
    const [locationDenied, setLocationDenied] = useState(false);
    const router = useRouter();
    const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
    const colors = Colors[colorScheme];

    const requestLocation = async () => {
        setLocationDenied(false);
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            setLocationDenied(true);
            return;
        }
        let loc = await Location.getCurrentPositionAsync({});
        const initialRegion = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
        };
        setMapRegion(initialRegion);
        setLocation(loc.coords);
    };

    useEffect(() => {
        requestLocation();
    }, []);

    const handlePickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });
        if (!result.canceled && result.assets[0].uri) {
            setProfilePic(result.assets[0].uri);
        }
    };

    const handleCompleteSetup = async () => {
        if (!isValidString(name) || !isValidString(license) || !location) {
            Alert.alert('Error', 'Please fill all empty fields and select location on map.');
            return;
        }
        setLoading(true);
        try {
            const uid = auth().currentUser?.uid;
            if (!uid) throw new Error('No user ID');

            let address = '';
            try {
                address = await getFormattedAddress(location.latitude, location.longitude);
            } catch (e) {
                console.log("Reverse geocode failed", e);
            }

            let updatedProfilePic = profilePic;
            if (profilePic && !profilePic.startsWith('http')) {
                const path = `pharmacies/${uid}/profile/pic_${Date.now()}.jpg`;
                const reference = storage().ref(path);
                await withRetry(async () => await reference.putFile(profilePic));
                updatedProfilePic = await withRetry(async () => await reference.getDownloadURL());
            }

            await withRetry(async () => await firestore().collection('pharmacies').doc(uid).update({
                name: name.trim(),
                pharmacyName: name.trim(),
                licenseNumber: license.trim(),
                profilePic: updatedProfilePic || null,
                profilePicUrl: updatedProfilePic || null,
                location: new firestore.GeoPoint(location.latitude, location.longitude),
                geohash: geofire.geohashForLocation([location.latitude, location.longitude]),
                address: address,
                businessHours: '',
                hasDelivery: false,
                freeDeliveryRadiusKm: 0,
                minOrderForFreeDelivery: 0,
                discountPercentage: 0,
                frontPhotoUrl: '',
                isVerified: false,
                status: 'active',
                isOnline: true,
                updatedAt: firestore.FieldValue.serverTimestamp()
            }));

            // Update users doc with pharmacy role for web app compatibility
            await withRetry(async () => await firestore().collection('users').doc(uid).set({
                role: 'pharmacy',
                name: name.trim(),
                phone: auth().currentUser?.phoneNumber || '',
            }, { merge: true }));

            await AsyncStorage.setItem('user_name', name.trim());
            router.replace('/(tabs)');
        } catch (err: any) {
            console.error(err);
            Alert.alert('Error', 'Failed to save setup. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Check completion
    const step1Done = name.trim().length > 0;
    const step2Done = license.trim().length > 0;
    const step3Done = !!location;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>

                    {/* Header */}
                    <View style={styles.header}>
                        <View style={[styles.stepBadge, { backgroundColor: colors.primaryGlow }]}>
                            <Store size={22} color={colors.primary} />
                        </View>
                        <Text style={[styles.headerTitle, { color: colors.text }]}>Set Up Your Pharmacy</Text>
                        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                            Complete your profile to start receiving medicine requests from nearby patients.
                        </Text>

                        {/* Progress Steps */}
                        <View style={styles.stepsRow}>
                            {[
                                { done: step1Done, label: 'Details' },
                                { done: step2Done, label: 'License' },
                                { done: step3Done, label: 'Location' },
                            ].map((step, i) => (
                                <React.Fragment key={i}>
                                    <View style={styles.stepItem}>
                                        <View style={[
                                            styles.stepDot,
                                            { backgroundColor: step.done ? colors.primary : colors.border }
                                        ]}>
                                            {step.done && <Check size={12} color="#FFF" strokeWidth={3} />}
                                        </View>
                                        <Text style={[styles.stepLabel, { color: step.done ? colors.primary : colors.textMuted }]}>
                                            {step.label}
                                        </Text>
                                    </View>
                                    {i < 2 && (
                                        <View style={[styles.stepLine, { backgroundColor: step.done ? colors.primary : colors.border }]} />
                                    )}
                                </React.Fragment>
                            ))}
                        </View>
                    </View>

                    {/* Avatar Upload */}
                    <View style={[styles.card, { backgroundColor: colors.surface }]}>
                        <AnimatedTouchable onPress={handlePickImage} style={styles.avatarSection} activeOpacity={0.8}>
                            <View style={styles.avatarContainer}>
                                {profilePic ? (
                                    <Image source={{ uri: profilePic }} style={styles.avatar} />
                                ) : (
                                    <View style={[styles.avatarPlaceholder, { borderColor: colors.primary }]}>
                                        <Camera size={28} color={colors.primary} />
                                    </View>
                                )}
                                <View style={styles.avatarBadge}>
                                    <Plus size={16} color="#FFF" strokeWidth={3} />
                                </View>
                            </View>
                            <Text style={[styles.avatarLabel, { color: colors.textSecondary }]}>
                                {profilePic ? 'Change Logo' : 'Upload Pharmacy Logo'}
                            </Text>
                        </AnimatedTouchable>
                    </View>

                    {/* Form Fields */}
                    <View style={[styles.card, { backgroundColor: colors.surface }]}>
                        <View style={styles.formField}>
                            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>PHARMACY NAME *</Text>
                            <View style={[styles.fieldInputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
                                <Building2 size={18} color={colors.textMuted} />
                                <TextInputField
                                    value={name}
                                    onChangeText={setName}
                                    placeholder="e.g. Apollo Pharmacy"
                                    colors={colors}
                                />
                            </View>
                        </View>

                        <View style={styles.formField}>
                            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>LICENSE NUMBER *</Text>
                            <View style={[styles.fieldInputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
                                <CreditCard size={18} color={colors.textMuted} />
                                <TextInputField
                                    value={license}
                                    onChangeText={setLicense}
                                    placeholder="e.g. DL-12345678"
                                    colors={colors}
                                />
                            </View>
                        </View>
                    </View>

                    {/* Map */}
                    <View style={[styles.card, { backgroundColor: colors.surface }]}>
                        <View style={styles.mapHeader}>
                            <MapPin size={18} color={colors.primary} />
                            <Text style={[styles.mapTitle, { color: colors.text }]}>Pharmacy Location</Text>
                        </View>
                        <Text style={[styles.mapHint, { color: colors.textMuted }]}>
                            Drag the marker to set your exact pharmacy location
                        </Text>
                        <View style={styles.mapContainer}>
                            {mapRegion ? (
                                <MapView
                                    style={styles.map}
                                    initialRegion={mapRegion}
                                    onRegionChangeComplete={(region) => {
                                        setLocation({ latitude: region.latitude, longitude: region.longitude });
                                    }}
                                >
                                    {location && (
                                        <Marker
                                            coordinate={location}
                                            draggable
                                            onDragEnd={(e) => setLocation(e.nativeEvent.coordinate)}
                                        />
                                    )}
                                </MapView>
                            ) : locationDenied ? (
                                <View style={styles.mapLoading}>
                                    <MapPin size={28} color={colors.textMuted} />
                                    <Text style={[styles.mapLoadingText, { color: colors.text, fontWeight: '600', marginBottom: 4 }]}>
                                        Location Permission Required
                                    </Text>
                                    <Text style={[styles.mapLoadingText, { color: colors.textMuted, textAlign: 'center', marginBottom: 12 }]}>
                                        We need your location to set your pharmacy address on the map.
                                    </Text>
                                    <AnimatedTouchable
                                        onPress={requestLocation}
                                        style={{ backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 }}
                                    >
                                        <Text style={{ color: '#FFF', fontFamily: DesignTokens.font.semibold, fontSize: 14 }}>Grant Permission</Text>
                                    </AnimatedTouchable>
                                </View>
                            ) : (
                                <View style={styles.mapLoading}>
                                    <ActivityIndicator color={colors.primary} />
                                    <Text style={[styles.mapLoadingText, { color: colors.textMuted }]}>
                                        Detecting your location...
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* CTA */}
                    <View style={styles.ctaContainer}>
                        <AnimatedTouchable
                            style={[styles.ctaBtn, loading && { opacity: 0.7 }]}
                            onPress={handleCompleteSetup}
                            disabled={loading}
                            activeOpacity={0.85}
                        >
                            <LinearGradient
                                colors={colors.buttonGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.ctaGradient}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <>
                                        <Text style={styles.ctaText}>Start Receiving Requests</Text>
                                        <ArrowRight size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
                                    </>
                                )}
                            </LinearGradient>
                        </AnimatedTouchable>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// Simple text input component to avoid import issues
function TextInputField({ value, onChangeText, placeholder, colors }: any) {
    return (
        <RNTextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.placeholder}
            style={[styles.fieldInput, { color: colors.text }]}
        />
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },

    // Header
    header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 8, alignItems: 'center' },
    stepBadge: {
        width: 52, height: 52, borderRadius: 18,
        justifyContent: 'center', alignItems: 'center', marginBottom: 16,
    },
    headerTitle: { fontFamily: DesignTokens.font.bold, fontSize: DesignTokens.fontSize.heading, marginBottom: 6, textAlign: 'center' },
    headerSubtitle: { fontFamily: DesignTokens.font.regular, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 24 },

    // Steps
    stepsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    stepItem: { alignItems: 'center' },
    stepDot: {
        width: 24, height: 24, borderRadius: 12,
        justifyContent: 'center', alignItems: 'center', marginBottom: 4,
    },
    stepLabel: { fontFamily: DesignTokens.font.medium, fontSize: 11 },
    stepLine: { width: 40, height: 2, borderRadius: 1, marginHorizontal: 6, marginBottom: 16 },

    // Card
    card: {
        marginHorizontal: 16, marginBottom: 12,
        borderRadius: DesignTokens.radius.lg, padding: 20,
        ...DesignTokens.shadow.card,
    },

    // Avatar
    avatarSection: { alignItems: 'center' },
    avatarContainer: { position: 'relative', marginBottom: 10 },
    avatar: { width: 88, height: 88, borderRadius: 28 },
    avatarPlaceholder: {
        width: 88, height: 88, borderRadius: 28,
        borderWidth: 2, borderStyle: 'dashed',
        justifyContent: 'center', alignItems: 'center',
    },
    avatarBadge: {
        position: 'absolute', bottom: -2, right: -2,
        width: 28, height: 28, borderRadius: 10,
        backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, borderColor: '#FFF',
    },
    avatarLabel: { fontFamily: DesignTokens.font.medium, fontSize: 13 },

    // Form
    formField: { marginBottom: 16 },
    fieldLabel: { fontFamily: DesignTokens.font.medium, fontSize: 11, marginBottom: 6, letterSpacing: 0.5 },
    fieldInputWrapper: {
        flexDirection: 'row', alignItems: 'center',
        borderWidth: 1, borderRadius: DesignTokens.radius.md,
        paddingHorizontal: 14, paddingVertical: 13, gap: 10,
    },
    fieldInput: { flex: 1, fontFamily: DesignTokens.font.medium, fontSize: 15, padding: 0 },

    // Map
    mapHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    mapTitle: { fontFamily: DesignTokens.font.bold, fontSize: 16 },
    mapHint: { fontFamily: DesignTokens.font.regular, fontSize: 12, marginBottom: 12 },
    mapContainer: { height: 250, borderRadius: DesignTokens.radius.md, overflow: 'hidden' },
    map: { flex: 1 },
    mapLoading: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
    mapLoadingText: { fontFamily: DesignTokens.font.medium, fontSize: 13 },

    // CTA
    ctaContainer: { paddingHorizontal: 16, paddingTop: 8 },
    ctaBtn: { borderRadius: DesignTokens.radius.md, overflow: 'hidden', ...DesignTokens.shadow.elevated },
    ctaGradient: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 17, borderRadius: DesignTokens.radius.md,
    },
    ctaText: { fontFamily: DesignTokens.font.bold, fontSize: 16, color: '#FFFFFF' },
});
