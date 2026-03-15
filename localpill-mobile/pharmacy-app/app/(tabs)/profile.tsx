import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Switch,
    Image,
    Dimensions
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { getFormattedAddress } from '../../utils/geocode';
import storage from '@react-native-firebase/storage';
import { isValidString, isValidPhone } from '../../utils/validation';
import { Animated } from 'react-native';
import { AnimatedTouchable } from '@/components/ui/AnimatedTouchable';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import '../../i18n';
import * as Location from 'expo-location';
import {
    Camera, ShieldCheck, Clock, User, FileText, Settings,
    Building2, Phone, Mail, CreditCard, Tag, MapPin,
    Bike, LogOut, UploadCloud, ImagePlus, X
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Colors, DesignTokens } from '@/constants/Colors';
import * as geofire from 'geofire-common';
import { useColorScheme } from '@/hooks/useColorScheme';

const { width } = Dimensions.get('window');

export default function PharmacyProfile() {
    const router = useRouter();
    const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
    const colors = Colors[colorScheme];
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [biometricEnabled, setBiometricEnabled] = useState(false);
    const { t, i18n } = useTranslation();

    // Profile Fields
    const [ownerName, setOwnerName] = useState('');
    const [pharmacyName, setPharmacyName] = useState('');
    const [mobile, setMobile] = useState('');
    const [email, setEmail] = useState('');
    const [licenseNumber, setLicenseNumber] = useState('');
    const [businessHours, setBusinessHours] = useState('');
    const [address, setAddress] = useState('');
    const [locationCoords, setLocationCoords] = useState<{ latitude: number, longitude: number } | null>(null);
    const [isVerified, setIsVerified] = useState(false);

    const [hasDelivery, setHasDelivery] = useState(false);
    const [freeDeliveryRadiusKm, setFreeDeliveryRadiusKm] = useState('5');
    const [minOrderForFreeDelivery, setMinOrderForFreeDelivery] = useState('500');
    const [discountPercentage, setDiscountPercentage] = useState('0');

    // Images
    const [profilePicUrl, setProfilePicUrl] = useState('');
    const [newProfilePic, setNewProfilePic] = useState<ImagePicker.ImagePickerAsset | null>(null);
    const [frontPhotoUrl, setFrontPhotoUrl] = useState('');
    const [newFrontPhoto, setNewFrontPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
    const [licenseDocumentUrl, setLicenseDocumentUrl] = useState('');
    const [newLicenseDoc, setNewLicenseDoc] = useState<ImagePicker.ImagePickerAsset | null>(null);
    const [pharmacyImages, setPharmacyImages] = useState<string[]>([]);
    const [newPharmacyImages, setNewPharmacyImages] = useState<ImagePicker.ImagePickerAsset[]>([]);

    useEffect(() => { fetchProfile(); }, []);

    const fetchProfile = async () => {
        if (!auth().currentUser) return;
        try {
            const docSnap = await firestore().collection('pharmacies').doc(auth().currentUser!.uid).get();
            const data = docSnap?.data?.();
            if (data) {
                setOwnerName(data?.ownerName || '');
                setPharmacyName(data?.name || data?.pharmacyName || '');
                setMobile(data?.mobile || auth().currentUser!.phoneNumber || '');
                setEmail(data?.email || '');
                setLicenseNumber(data?.licenseNumber || '');
                setBusinessHours(data?.businessHours || '');
                setAddress(data?.address || '');
                setIsVerified(data?.isVerified || false);
                if (data?.location) {
                    setLocationCoords({ latitude: data.location.latitude, longitude: data.location.longitude });
                }
                setHasDelivery(data?.hasDelivery || false);
                setFreeDeliveryRadiusKm(data?.freeDeliveryRadiusKm?.toString() || '5');
                setMinOrderForFreeDelivery(data?.minOrderForFreeDelivery?.toString() || '500');
                setDiscountPercentage(data?.discountPercentage?.toString() || '0');
                setProfilePicUrl(data?.profilePicUrl || '');
                setFrontPhotoUrl(data?.frontPhotoUrl || '');
                setLicenseDocumentUrl(data?.licenseDocumentUrl || '');
                setPharmacyImages(data?.pharmacyImages || []);
            } else {
                setMobile(auth().currentUser!.phoneNumber || '');
            }
            const storedBiometric = await AsyncStorage.getItem('biometric_enabled');
            setBiometricEnabled(storedBiometric === 'true');
        } catch (error) {
            console.error("Error fetching profile", error);
            Alert.alert("Error", "Could not load profile details");
        } finally {
            setLoading(false);
        }
    };

    const handleDetectLocation = async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Location permission is required.');
            return;
        }
        try {
            let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const coords = { latitude: location.coords.latitude, longitude: location.coords.longitude };
            setLocationCoords(coords);
            const addressString = await getFormattedAddress(coords.latitude, coords.longitude);
            setAddress(addressString);
        } catch (error) {
            Alert.alert('Error', 'Failed to detect location.');
        }
    };

    const pickImage = async (setter: Function, allowsEditing = true, maxSelections = 1) => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Camera roll permissions needed.');
            return;
        }
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: maxSelections === 1 ? allowsEditing : false,
            allowsMultipleSelection: maxSelections > 1,
            selectionLimit: maxSelections > 1 ? maxSelections : 1,
            aspect: allowsEditing ? [4, 3] : undefined,
            quality: 0.6,
        });
        if (!result.canceled && result.assets && result.assets.length > 0) {
            if (maxSelections > 1) setter((prev: any) => [...prev, ...result.assets]);
            else setter(result.assets[0]);
        }
    };

    const handleSave = async () => {
        if (!isValidString(ownerName) || !isValidString(pharmacyName) || !isValidString(address)) {
            Alert.alert('Missing Info', 'Owner Name, Pharmacy Name, and Address are required and cannot be empty.');
            return;
        }

        if (mobile && !isValidPhone(mobile)) {
            Alert.alert('Invalid Input', 'Please enter a valid 10-digit mobile number.');
            return;
        }
        setSaving(true);
        try {
            const uid = auth().currentUser?.uid;
            if (!uid) throw new Error('No user logged in');

            let updatedFrontPhotoUrl = frontPhotoUrl;
            let updatedProfilePicUrl = profilePicUrl;
            let updatedLicenseDocUrl = licenseDocumentUrl;

            const uploadImage = async (asset: ImagePicker.ImagePickerAsset, folder: string) => {
                const ext = asset.uri.split('.').pop() || 'jpg';
                const path = `pharmacies/${uid}/${folder}/pic_${Date.now()}.${ext}`;
                const fileRef = storage().ref(path);
                await fileRef.putFile(asset.uri);
                return await fileRef.getDownloadURL();
            };

            if (newFrontPhoto) updatedFrontPhotoUrl = await uploadImage(newFrontPhoto, 'front');
            if (newProfilePic) updatedProfilePicUrl = await uploadImage(newProfilePic, 'profile');
            if (newLicenseDoc) updatedLicenseDocUrl = await uploadImage(newLicenseDoc, 'license');

            const newUploadedUrls = [];
            for (const asset of newPharmacyImages) {
                const ext = asset.uri.split('.').pop() || 'jpg';
                const path = `pharmacies/${uid}/images/img_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
                const fileRef = storage().ref(path);
                await fileRef.putFile(asset.uri);
                newUploadedUrls.push(await fileRef.getDownloadURL());
            }

            const finalPharmacyImages = [...pharmacyImages, ...newUploadedUrls];

            const profileData: any = {
                ownerName: ownerName.trim(),
                name: pharmacyName.trim(),
                pharmacyName: pharmacyName.trim(),
                mobile: mobile.trim(),
                phone: mobile.trim(),
                email: email.trim(),
                address: address.trim(),
                licenseNumber: licenseNumber.trim(),
                businessHours: businessHours.trim(),
                hasDelivery,
                freeDeliveryRadiusKm: hasDelivery ? Math.max(0, Math.min(100, Number(freeDeliveryRadiusKm) || 0)) : 0,
                minOrderForFreeDelivery: hasDelivery ? Math.max(0, Math.min(100000, Number(minOrderForFreeDelivery) || 0)) : 0,
                discountPercentage: Math.max(0, Math.min(100, Number(discountPercentage) || 0)),
                frontPhotoUrl: updatedFrontPhotoUrl,
                profilePicUrl: updatedProfilePicUrl,
                profilePic: updatedProfilePicUrl,
                licenseDocumentUrl: updatedLicenseDocUrl,
                pharmacyImages: finalPharmacyImages,
                updatedAt: firestore.FieldValue.serverTimestamp()
            };

            if (locationCoords) {
                profileData.location = new firestore.GeoPoint(locationCoords.latitude, locationCoords.longitude);
                profileData.geohash = geofire.geohashForLocation([locationCoords.latitude, locationCoords.longitude]);
            }

            await firestore().collection('pharmacies').doc(uid).set(profileData, { merge: true });

            setFrontPhotoUrl(updatedFrontPhotoUrl);
            setProfilePicUrl(updatedProfilePicUrl);
            setLicenseDocumentUrl(updatedLicenseDocUrl);
            setPharmacyImages(finalPharmacyImages);
            setNewFrontPhoto(null);
            setNewProfilePic(null);
            setNewLicenseDoc(null);
            setNewPharmacyImages([]);

            Alert.alert('Success', 'Profile updated successfully!');
        } catch (error) {
            Alert.alert('Error', 'Failed to save profile.');
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = async () => {
        Alert.alert("Log Out", "Are you sure you want to log out?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Log Out",
                style: "destructive",
                onPress: async () => {
                    try {
                        if (auth().currentUser) {
                            await auth().signOut();
                        }
                    } catch (e) {
                        console.log("Sign out error", e);
                    } finally {
                        router.replace('/login');
                    }
                }
            }
        ]);
    };

    // Completion
    const completionFields = [ownerName, pharmacyName, address, mobile, email, licenseNumber, (profilePicUrl || newProfilePic), (licenseDocumentUrl || newLicenseDoc), (frontPhotoUrl || newFrontPhoto)];
    const completedCount = completionFields.filter(f => !!f).length;
    const completionPct = Math.round((completedCount / completionFields.length) * 100);
    const progressColor = completionPct === 100 ? '#3B82F6' : completionPct >= 60 ? '#F59E0B' : '#EF4444';

    if (loading) {
        return (
            <View style={[styles.center, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 120 : 100 }}>

                    {/* ═══ Profile Hero ═══ */}
                    <View style={styles.heroSection}>
                        <View style={[styles.heroCard, { backgroundColor: colors.surface }]}>
                            <AnimatedTouchable onPress={() => pickImage(setNewProfilePic, true)} activeOpacity={0.8}>
                                <View style={styles.avatarContainer}>
                                    {newProfilePic ? (
                                        <Image source={{ uri: newProfilePic.uri }} style={styles.avatar} />
                                    ) : profilePicUrl ? (
                                        <Image source={{ uri: profilePicUrl }} style={styles.avatar} />
                                    ) : (
                                        <LinearGradient
                                            colors={colorScheme === 'dark' ? ['#2563EB', '#3B82F6'] : colors.heroGradient}
                                            style={styles.avatarPlaceholder}
                                        >
                                            <Text style={styles.avatarInitial}>
                                                {pharmacyName ? pharmacyName[0].toUpperCase() : '?'}
                                            </Text>
                                        </LinearGradient>
                                    )}
                                    <View style={styles.cameraIcon}>
                                        <Camera size={14} color="#FFF" />
                                    </View>
                                </View>
                            </AnimatedTouchable>

                            <Text style={[styles.heroName, { color: colors.text }]}>
                                {pharmacyName || 'Your Pharmacy'}
                            </Text>

                            {isVerified ? (
                                <View style={styles.verifiedBadge}>
                                    <ShieldCheck size={14} color="#3B82F6" />
                                    <Text style={styles.verifiedText}>Verified Partner</Text>
                                </View>
                            ) : (
                                <View style={[styles.verifiedBadge, { backgroundColor: 'rgba(245,158,11,0.1)' }]}>
                                    <Clock size={14} color="#F59E0B" />
                                    <Text style={[styles.verifiedText, { color: '#F59E0B' }]}>Pending Verification</Text>
                                </View>
                            )}

                            {/* Completion Progress */}
                            <View style={styles.completionRow}>
                                <View style={styles.completionInfo}>
                                    <Text style={[styles.completionLabel, { color: colors.textSecondary }]}>Profile Completion</Text>
                                    <Text style={[styles.completionPct, { color: progressColor }]}>{completionPct}%</Text>
                                </View>
                                <View style={[styles.progressTrack, { backgroundColor: colors.borderLight }]}>
                                    <View style={[styles.progressFill, { width: `${completionPct}%`, backgroundColor: progressColor }]} />
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* ═══ Basic Details Section ═══ */}
                    <SectionCard title="Basic Details" IconComponent={User} colors={colors}>
                        <FormField label="Owner Name *" value={ownerName} onChangeText={setOwnerName}
                            placeholder="John Doe" IconComponent={User} colors={colors} />
                        <FormField label="Pharmacy Name *" value={pharmacyName} onChangeText={setPharmacyName}
                            placeholder="Apollo Pharmacy" IconComponent={Building2} colors={colors} />
                        <View>
                            <View style={styles.fieldLabelRow}>
                                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Address *</Text>
                                <AnimatedTouchable onPress={handleDetectLocation} style={styles.detectBtn}>
                                    <MapPin size={14} color={colors.primary} />
                                    <Text style={[styles.detectText, { color: colors.primary }]}>Detect</Text>
                                </AnimatedTouchable>
                            </View>
                            <TextInput
                                style={[styles.fieldInput, styles.fieldInputMultiline, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                                value={address} onChangeText={setAddress} placeholder="123 Main Street"
                                placeholderTextColor={colors.placeholder} multiline
                            />
                        </View>
                        <FormField label="Mobile" value={mobile} onChangeText={setMobile}
                            placeholder="+91 9876543210" IconComponent={Phone} colors={colors}
                            editable={!auth().currentUser?.phoneNumber} keyboardType="phone-pad" />
                        <FormField label="Email" value={email} onChangeText={setEmail}
                            placeholder="contact@pharmacy.com" IconComponent={Mail} colors={colors} keyboardType="email-address" />
                        <FormField label="Business Hours" value={businessHours} onChangeText={setBusinessHours}
                            placeholder="9 AM - 9 PM" IconComponent={Clock} colors={colors} />
                    </SectionCard>

                    {/* ═══ Documents Section ═══ */}
                    <SectionCard title="Documents & Photos" IconComponent={FileText} colors={colors}>
                        <FormField label="License Number" value={licenseNumber} onChangeText={setLicenseNumber}
                            placeholder="DL-12345678" IconComponent={CreditCard} colors={colors} />
                        <PhotoUpload label="License Document" currentUrl={licenseDocumentUrl}
                            newAsset={newLicenseDoc} onPick={() => pickImage(setNewLicenseDoc, false)} colors={colors} />
                        <PhotoUpload label="Store Front Photo" currentUrl={frontPhotoUrl}
                            newAsset={newFrontPhoto} onPick={() => pickImage(setNewFrontPhoto, true)} colors={colors} />
                    </SectionCard>

                    {/* ═══ Gallery Section ═══ */}
                    <SectionCard title="Pharmacy Gallery" IconComponent={ImagePlus} colors={colors}>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                            {pharmacyImages.map((url, i) => (
                                <View key={`existing-${i}`} style={{ width: 80, height: 80, borderRadius: 10, overflow: 'hidden' }}>
                                    <Image source={{ uri: url }} style={{ width: 80, height: 80 }} />
                                    <AnimatedTouchable
                                        onPress={() => setPharmacyImages(prev => prev.filter((_, idx) => idx !== i))}
                                        style={{ position: 'absolute', top: 2, right: 2, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10, padding: 2 }}
                                    >
                                        <X size={14} color="#FFF" />
                                    </AnimatedTouchable>
                                </View>
                            ))}
                            {newPharmacyImages.map((asset, i) => (
                                <View key={`new-${i}`} style={{ width: 80, height: 80, borderRadius: 10, overflow: 'hidden', borderWidth: 2, borderColor: colors.primary }}>
                                    <Image source={{ uri: asset.uri }} style={{ width: 80, height: 80 }} />
                                    <AnimatedTouchable
                                        onPress={() => setNewPharmacyImages(prev => prev.filter((_, idx) => idx !== i))}
                                        style={{ position: 'absolute', top: 2, right: 2, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10, padding: 2 }}
                                    >
                                        <X size={14} color="#FFF" />
                                    </AnimatedTouchable>
                                </View>
                            ))}
                            <AnimatedTouchable
                                onPress={() => pickImage(setNewPharmacyImages, false, 5)}
                                style={{ width: 80, height: 80, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }}
                            >
                                <ImagePlus size={24} color={colors.textMuted} />
                                <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 4 }}>Add</Text>
                            </AnimatedTouchable>
                        </View>
                    </SectionCard>

                    {/* ═══ App Security ═══ */}
                    <SectionCard title={t('appSecurity', 'App Security')} IconComponent={ShieldCheck} colors={colors}>
                        <View style={styles.switchRow}>
                            <View style={styles.switchInfo}>
                                <ShieldCheck size={20} color={colors.primary} />
                                <View style={{ marginLeft: 8, flex: 1 }}>
                                    <Text style={[styles.switchLabel, { color: colors.text, marginBottom: 2 }]}>{t('appLock', 'App Lock')}</Text>
                                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>Require FaceID/TouchID to open</Text>
                                </View>
                            </View>
                            <Switch value={biometricEnabled} onValueChange={async (val) => {
                                setBiometricEnabled(val);
                                await AsyncStorage.setItem('biometric_enabled', val ? 'true' : 'false');
                            }}
                                trackColor={{ false: colors.border, true: '#BFDBFE' }}
                                thumbColor={biometricEnabled ? '#3B82F6' : '#F3F4F6'} />
                        </View>
                    </SectionCard>

                    {/* ═══ Settings Section ═══ */}
                    <SectionCard title="Delivery & Discounts" IconComponent={Settings} colors={colors}>
                        <View style={styles.switchRow}>
                            <View style={styles.switchInfo}>
                                <Bike size={20} color={colors.primary} />
                                <Text style={[styles.switchLabel, { color: colors.text }]}>Home Delivery</Text>
                            </View>
                            <Switch value={hasDelivery} onValueChange={setHasDelivery}
                                trackColor={{ false: colors.border, true: '#BFDBFE' }}
                                thumbColor={hasDelivery ? '#3B82F6' : '#F3F4F6'} />
                        </View>
                        {hasDelivery && (
                            <View style={styles.deliveryFields}>
                                <View style={{ flex: 1, marginRight: 8 }}>
                                    <FormField label="Free Radius (km)" value={freeDeliveryRadiusKm}
                                        onChangeText={setFreeDeliveryRadiusKm} placeholder="5"
                                        colors={colors} keyboardType="numeric" />
                                </View>
                                <View style={{ flex: 1, marginLeft: 8 }}>
                                    <FormField label="Min Order (₹)" value={minOrderForFreeDelivery}
                                        onChangeText={setMinOrderForFreeDelivery} placeholder="500"
                                        colors={colors} keyboardType="numeric" />
                                </View>
                            </View>
                        )}
                        <FormField label="Discount (%)" value={discountPercentage}
                            onChangeText={setDiscountPercentage} placeholder="10"
                            IconComponent={Tag} colors={colors} keyboardType="numeric" />
                    </SectionCard>

                    {/* ═══ Language Section ═══ */}
                    <SectionCard title={t('language', 'Language')} IconComponent={Settings} colors={colors}>
                        <View style={styles.genderRow}>
                            {['en', 'hi'].map((lng) => (
                                <AnimatedTouchable
                                    key={lng}
                                    style={[
                                        styles.genderChip,
                                        { backgroundColor: colors.surface, borderColor: colors.border },
                                        i18n.language === lng && { backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: colors.primary }
                                    ]}
                                    onPress={() => {
                                        i18n.changeLanguage(lng);
                                    }}
                                >
                                    <Text style={[
                                        styles.genderText,
                                        { color: colors.textSecondary },
                                        i18n.language === lng && { color: colors.primary, fontFamily: DesignTokens.font.bold }
                                    ]}>{lng === 'en' ? 'English' : 'हिंदी'}</Text>
                                </AnimatedTouchable>
                            ))}
                        </View>
                    </SectionCard>

                    {/* ═══ Actions ═══ */}
                    <View style={styles.actionsSection}>
                        <AnimatedTouchable
                            style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                            onPress={handleSave} disabled={saving} activeOpacity={0.85}
                        >
                            <LinearGradient colors={colors.buttonGradient} start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }} style={styles.saveBtnGradient}>
                                {saving ? <ActivityIndicator color="#FFF" /> :
                                    <Text style={styles.saveBtnText}>Save Changes</Text>}
                            </LinearGradient>
                        </AnimatedTouchable>

                        <AnimatedTouchable style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
                            <LogOut size={18} color="#EF4444" />
                            <Text style={styles.logoutText}>{t('logout', 'Log Out')}</Text>
                        </AnimatedTouchable>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

function SectionCard({ title, IconComponent, colors, children }: { title: string; IconComponent?: any; colors: any; children: React.ReactNode }) {
    return (
        <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
            <View style={styles.sectionHeader}>
                {IconComponent && <IconComponent size={18} color={colors.primary} />}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
            </View>
            <View style={styles.sectionContent}>{children}</View>
        </View>
    );
}

function FormField({ label, value, onChangeText, placeholder, IconComponent, colors, editable = true, keyboardType = 'default' as any, }: {
    label: string; value: string; onChangeText: (t: string) => void; placeholder: string;
    IconComponent?: any; colors: any; editable?: boolean; keyboardType?: any;
}) {
    return (
        <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
            <View style={[styles.fieldInputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
                {IconComponent && <IconComponent size={16} color={colors.textMuted} style={{ marginRight: 10 }} />}
                <TextInput
                    style={[styles.fieldInputInner, { color: colors.text }]}
                    value={value} onChangeText={onChangeText} placeholder={placeholder}
                    placeholderTextColor={colors.placeholder} editable={editable} keyboardType={keyboardType}
                />
            </View>
        </View>
    );
}

function PhotoUpload({ label, currentUrl, newAsset, onPick, colors }: {
    label: string; currentUrl: string; newAsset: any; onPick: () => void; colors: any;
}) {
    const hasImage = newAsset || currentUrl;
    return (
        <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
            <AnimatedTouchable style={[styles.photoUploadBox, { borderColor: colors.border, backgroundColor: colors.inputBackground }]} onPress={onPick} activeOpacity={0.7}>
                {newAsset ? (
                    <Image source={{ uri: newAsset.uri }} style={styles.photoPreview} />
                ) : currentUrl ? (
                    <Image source={{ uri: currentUrl }} style={styles.photoPreview} />
                ) : (
                    <View style={styles.photoPlaceholder}>
                        <UploadCloud size={24} color={colors.textMuted} />
                        <Text style={[styles.photoPlaceholderText, { color: colors.textMuted }]}>Tap to upload</Text>
                    </View>
                )}
            </AnimatedTouchable>
        </View>
    );
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // Hero
    heroSection: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
    heroCard: {
        borderRadius: DesignTokens.radius.xl,
        padding: 24,
        alignItems: 'center',
        ...DesignTokens.shadow.card,
    },
    avatarContainer: { position: 'relative', marginBottom: 16 },
    avatar: { width: 88, height: 88, borderRadius: 28 },
    avatarPlaceholder: {
        width: 88, height: 88, borderRadius: 28,
        justifyContent: 'center', alignItems: 'center',
    },
    avatarInitial: {
        fontFamily: DesignTokens.font.extrabold, fontSize: 32, color: '#FFF',
    },
    cameraIcon: {
        position: 'absolute', bottom: -2, right: -2,
        width: 30, height: 30, borderRadius: 10,
        backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, borderColor: '#FFF',
    },
    heroName: { fontFamily: DesignTokens.font.bold, fontSize: 20, marginBottom: 8 },
    verifiedBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
        backgroundColor: 'rgba(59, 130, 246, 0.1)', marginBottom: 20,
    },
    verifiedText: { fontFamily: DesignTokens.font.semibold, fontSize: 12, color: '#3B82F6' },
    completionRow: { width: '100%' },
    completionInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    completionLabel: { fontFamily: DesignTokens.font.medium, fontSize: 13 },
    completionPct: { fontFamily: DesignTokens.font.bold, fontSize: 13 },
    progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 3 },

    // Section Card
    sectionCard: {
        marginHorizontal: 16, marginBottom: 12,
        borderRadius: DesignTokens.radius.lg, padding: 20,
        ...DesignTokens.shadow.card,
    },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 },
    sectionTitle: { fontFamily: DesignTokens.font.bold, fontSize: 16 },
    sectionContent: { gap: 14 },

    // Form Field
    fieldContainer: {},
    fieldLabel: { fontFamily: DesignTokens.font.medium, fontSize: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
    fieldLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    fieldInputWrapper: {
        flexDirection: 'row', alignItems: 'center',
        borderWidth: 1, borderRadius: DesignTokens.radius.md,
        paddingHorizontal: 14, paddingVertical: 12,
    },
    fieldInputInner: { flex: 1, fontFamily: DesignTokens.font.medium, fontSize: 14, padding: 0 },
    fieldInput: {
        borderWidth: 1, borderRadius: DesignTokens.radius.md,
        paddingHorizontal: 14, paddingVertical: 12,
        fontFamily: DesignTokens.font.medium, fontSize: 14,
    },
    fieldInputMultiline: { height: 80, textAlignVertical: 'top' },
    detectBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    detectText: { fontFamily: DesignTokens.font.semibold, fontSize: 12 },

    // Photo Upload
    photoUploadBox: {
        borderWidth: 1.5, borderStyle: 'dashed', borderRadius: DesignTokens.radius.md,
        height: 120, overflow: 'hidden', justifyContent: 'center', alignItems: 'center',
    },
    photoPreview: { width: '100%', height: '100%', borderRadius: DesignTokens.radius.md - 1 },
    photoPlaceholder: { alignItems: 'center', gap: 6 },
    photoPlaceholderText: { fontFamily: DesignTokens.font.medium, fontSize: 12 },

    // Switch
    switchRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: 4,
    },
    switchInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    switchLabel: { fontFamily: DesignTokens.font.semibold, fontSize: 15 },
    deliveryFields: { flexDirection: 'row', marginTop: 8 },

    // Language selector styling map from customer app logic
    genderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    genderChip: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1.5 },
    genderText: { fontSize: 14, fontFamily: DesignTokens.font.semibold },

    // Actions
    actionsSection: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 120 },
    saveBtn: { borderRadius: DesignTokens.radius.md, overflow: 'hidden', ...DesignTokens.shadow.elevated, marginBottom: 16 },
    saveBtnGradient: {
        paddingVertical: 16, borderRadius: DesignTokens.radius.md,
        alignItems: 'center', justifyContent: 'center',
    },
    saveBtnText: { fontFamily: DesignTokens.font.bold, fontSize: 16, color: '#FFFFFF' },
    logoutBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, paddingVertical: 14,
    },
    logoutText: { fontFamily: DesignTokens.font.semibold, fontSize: 15, color: '#EF4444' },
});
