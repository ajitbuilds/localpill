import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Image, Animated, Modal, Keyboard, ActionSheetIOS, Alert as RNAlert } from 'react-native';
import { Colors, Shadows, Radius, Spacing, Gradients } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import { showToast } from '../../components/Toast';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { AppIcon } from '../../components/icons/AppIcon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import { AnimatedTouchable } from '../../components/ui/AnimatedTouchable';
import { useLocationContext } from '../../contexts/LocationContext';
import { withRetry } from '../../utils/retry';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientButton } from '../../components/GradientButton';
import { reportError } from '../../utils/crashReporter';
import { logRequestCreated, logPrescriptionUploaded } from '../../utils/analyticsEvents';
import { useScreenTracking } from '../../hooks/useScreenTracking';
import { POPULAR_SEARCHES, simplifyAddress } from '../../constants/app';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { NotificationPrimer } from '@/components/modals/NotificationPrimer';

const MEDICINES_DB = [
    "Paracetamol", "Panadol", "Aspirin", "Amoxicillin", "Azithromycin",
    "Ibuprofen", "Cetirizine", "Crocin", "Dolo 650", "Metformin",
    "Atorvastatin", "Amlodipine", "Losartan", "Omeprazole", "Pantoprazole",
    "Levothyroxine", "Rosuvastatin", "Escitalopram", "Sertraline", "Albuterol"
];



export default function SearchScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
    const activeColors = Colors[colorScheme];
    const styles = React.useMemo(() => getStyles(activeColors, colorScheme), [activeColors, colorScheme]);
    const { uid } = useAuth();
    const [medicines, setMedicines] = useState<string[]>(['']);
    const [suggestions, setSuggestions] = useState<{ [key: number]: string[] }>({});
    const [prescriptionUris, setPrescriptionUris] = useState<string[]>([]);
    const [radius, setRadius] = useState(10);
    const [timeoutMinutes, setTimeoutMinutes] = useState(10);
    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isSuspended, setIsSuspended] = useState(false);
    const [submissionPhase, setSubmissionPhase] = useState<'idle' | 'uploading' | 'finding' | 'done'>('idle');
    const overlayOpacity = useRef(new Animated.Value(0)).current;
    const overlayScale = useRef(new Animated.Value(0.9)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    const { locationMode, remoteLocation, currentAddress } = useLocationContext();
    const [remotePatientName, setRemotePatientName] = useState('');
    const [remotePatientPhone, setRemotePatientPhone] = useState('');
    const [showConfirmSheet, setShowConfirmSheet] = useState(false);

    const { requestPushPermissions } = usePushNotifications();
    const [showPrimer, setShowPrimer] = useState(false);
    const [createdRequestId, setCreatedRequestId] = useState<string | null>(null);

    const { prefill } = useLocalSearchParams<{ prefill?: string }>();

    // Pre-fill from "Search Again" or popular chip
    useEffect(() => {
        if (prefill) {
            const parts = prefill.split(',').map((m: string) => m.trim()).filter(Boolean);
            setMedicines(parts.length > 0 ? parts : ['']);
        }
    }, [prefill]);

    useEffect(() => {
        let isMounted = true;
        const checkSuspension = async () => {
            try {
                const checkUid = uid;
                if (checkUid) {
                    const userSnap = await firestore().collection('users').doc(checkUid).get();
                    if (userSnap.exists() && isMounted) {
                        setIsSuspended(userSnap.data()?.isSuspended || false);
                    }
                }
            } catch (e) {
                if (__DEV__) console.error("Failed to check suspension status", e);
            }
        };
        checkSuspension();
        return () => { isMounted = false; };
    }, [uid]);

    // Cleanup pulse animation on unmount to prevent memory leak
    useEffect(() => {
        return () => {
            pulseAnim.stopAnimation();
            overlayOpacity.setValue(0);
            overlayScale.setValue(0.9);
        };
    }, []);

    const handleAddMedicine = () => {
        setMedicines([...medicines, '']);
    };

    const handleMedicineChange = (text: string, index: number) => {
        const newMeds = [...medicines];
        newMeds[index] = text;
        setMedicines(newMeds);

        if (text.trim().length > 1) {
            const filtered = MEDICINES_DB.filter(m =>
                m.toLowerCase().startsWith(text.toLowerCase().trim())
            ).slice(0, 5);
            setSuggestions(prev => ({ ...prev, [index]: filtered }));
        } else {
            setSuggestions(prev => ({ ...prev, [index]: [] }));
        }
    };

    const selectSuggestion = (index: number, selectedValue: string) => {
        const newMeds = [...medicines];
        newMeds[index] = selectedValue;
        setMedicines(newMeds);
        setSuggestions(prev => ({ ...prev, [index]: [] }));
    };

    const handleRemoveMedicine = (index: number) => {
        if (medicines.length > 1) {
            const newMeds = medicines.filter((_, i) => i !== index);
            setMedicines(newMeds);
            setSuggestions(prev => {
                const newSuggs: { [key: number]: string[] } = {};
                Object.keys(prev).forEach((key) => {
                    const k = parseInt(key);
                    if (k < index) {
                        newSuggs[k] = prev[k];
                    } else if (k > index) {
                        newSuggs[k - 1] = prev[k];
                    }
                });
                return newSuggs;
            });
        }
    };

    const pickFromGallery = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
            allowsMultipleSelection: true,
        });
        if (!result.canceled && result.assets.length > 0) {
            setPrescriptionUris(prev => [...prev, ...result.assets.map(a => a.uri)]);
        }
    };

    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            showToast('Camera permission is required to take photos.', 'error');
            return;
        }
        let result = await ImagePicker.launchCameraAsync({
            quality: 0.8,
        });
        if (!result.canceled && result.assets[0].uri) {
            setPrescriptionUris(prev => [...prev, result.assets[0].uri]);
        }
    };

    const uploadPrescriptionImage = () => {
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                { options: ['Cancel', 'Take Photo', 'Choose from Gallery'], cancelButtonIndex: 0 },
                (buttonIndex) => {
                    if (buttonIndex === 1) takePhoto();
                    else if (buttonIndex === 2) pickFromGallery();
                }
            );
        } else {
            RNAlert.alert('Upload Prescription', 'Choose an option', [
                { text: 'Take Photo', onPress: takePhoto },
                { text: 'Choose from Gallery', onPress: pickFromGallery },
                { text: 'Cancel', style: 'cancel' },
            ]);
        }
    };

    const removePrescription = (index: number) => {
        setPrescriptionUris(prev => prev.filter((_, i) => i !== index));
    };

    const submittingRef = useRef(false);
    useScreenTracking('SearchScreen');

    const handleSubmit = async () => {
        if (submittingRef.current) return; // Prevent double-tap

        // Rate limiting: 30-second cooldown between requests
        try {
            const lastRequestTime = await AsyncStorage.getItem('last_request_time');
            if (lastRequestTime) {
                const elapsed = Date.now() - parseInt(lastRequestTime, 10);
                const cooldown = 30000; // 30 seconds
                if (elapsed < cooldown) {
                    const remaining = Math.ceil((cooldown - elapsed) / 1000);
                    showToast(`Please wait ${remaining}s before creating another request.`, 'error');
                    return;
                }
            }
        } catch (_) { /* ignore AsyncStorage errors */ }

        const validMeds = medicines.filter(m => m.trim() !== '');

        if (validMeds.length === 0 && prescriptionUris.length === 0) {
            showToast('Please enter at least one medicine or upload a prescription.', 'error');
            return;
        }

        // Close confirm sheet if open
        setShowConfirmSheet(false);
        Keyboard.dismiss();

        submittingRef.current = true;
        setLoading(true);
        // Show submission overlay
        setSubmissionPhase(prescriptionUris.length > 0 ? 'uploading' : 'finding');
        Animated.parallel([
            Animated.timing(overlayOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.spring(overlayScale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
        ]).start();
        Animated.loop(Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])).start();

        try {
            // 1. Get Location based on global mode
            let geoPoint, addressText;
            if (locationMode === 'current') {
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    showToast('Location permission is required to find nearby pharmacies.', 'error');
                    setLoading(false);
                    submittingRef.current = false;
                    return;
                }
                const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                geoPoint = new firestore.GeoPoint(loc.coords.latitude, loc.coords.longitude);
                addressText = currentAddress;
            } else {
                if (!remoteLocation) {
                    showToast('Please select a valid location first.', 'error');
                    setLoading(false);
                    submittingRef.current = false;
                    return;
                }
                geoPoint = new firestore.GeoPoint(remoteLocation.latitude, remoteLocation.longitude);
                addressText = remoteLocation.address;
            }

            // 2. Get user info from storage
            const phone = await AsyncStorage.getItem('user_phone');
            const name = await AsyncStorage.getItem('user_name');

            if (!uid) {
                showToast('Authentication required. Please log in.', 'error');
                setLoading(false);
                submittingRef.current = false;
                return;
            }

            // 3a. Duplicate request guard — check for active requests with same medicines
            if (validMeds.length > 0) {
                try {
                    const activeReqs = await firestore().collection('medicineRequests')
                        .where('userId', '==', uid)
                        .where('status', '==', 'pending')
                        .get();
                    const duplicate = activeReqs.docs.some(doc => {
                        const existing = doc.data().typedMedicines || [];
                        return validMeds.every((m: string) => existing.some((e: string) => e.toLowerCase() === m.toLowerCase()));
                    });
                    if (duplicate) {
                        showToast('You already have an active request for these medicines.', 'error');
                        setLoading(false);
                        submittingRef.current = false;
                        Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
                        setSubmissionPhase('idle');
                        return;
                    }
                } catch (e) {
                    // Don't block submission if check fails
                    if (__DEV__) console.log('Duplicate check failed:', e);
                }
            }

            // 3. Create Firestore document (matches web app schema exactly)
            const requestRef = firestore().collection('medicineRequests').doc();
            const requestId = requestRef.id;
            const expiresAt = firestore.Timestamp.fromMillis(Date.now() + timeoutMinutes * 60 * 1000);

            let prescriptionUrl = null;
            let prescriptionUrls: string[] = [];
            if (prescriptionUris.length > 0) {
                try {
                    let uploadedCount = 0;
                    for (const uri of prescriptionUris) {
                        const filename = uri.split('/').pop() || `upload_${Date.now()}_${uploadedCount}.jpg`;
                        const storagePath = `prescriptions/${requestId}/${filename}`;
                        let uploadUri = uri;
                        if (Platform.OS === 'android' && !uploadUri.startsWith('file://')) {
                            uploadUri = `file://${uploadUri}`;
                        }
                        const reference = storage().ref(storagePath);
                        await withRetry(async () => {
                            const isPdf = uploadUri.toLowerCase().endsWith('.pdf');
                            const metadata = { contentType: isPdf ? 'application/pdf' : 'image/jpeg' };
                            const task = reference.putFile(uploadUri, metadata);
                            task.on('state_changed', taskSnapshot => {
                                const fileProgress = Math.round(taskSnapshot.bytesTransferred / taskSnapshot.totalBytes * 100);
                                const overallProgress = Math.round(((uploadedCount * 100) + fileProgress) / prescriptionUris.length);
                                setUploadProgress(overallProgress);
                            });
                            await task;
                        });
                        const url = await withRetry(async () => await reference.getDownloadURL());
                        prescriptionUrls.push(url);
                        uploadedCount++;
                    }
                    // Keep backward compat: first URL as prescriptionUrl
                    prescriptionUrl = prescriptionUrls[0] || null;
                    setSubmissionPhase('finding');
                } catch (uploadErr) {
                    if (__DEV__) console.error('Prescription upload failed:', uploadErr);
                    reportError(uploadErr, 'SearchScreen.uploadPrescription');
                    showToast('Failed to upload prescription. Try again.', 'error');
                    setLoading(false);
                    submittingRef.current = false;
                    setSubmissionPhase('idle');
                    overlayOpacity.setValue(0);
                    overlayScale.setValue(0.9);
                    pulseAnim.stopAnimation();
                    return;
                }
            }

            await withRetry(async () => await requestRef.set({
                userId: uid,
                patientId: uid,           // used by web app for queries
                patientPhone: phone || null,
                patientName: name || null,
                typedMedicines: validMeds,
                prescriptionUrl: prescriptionUrl,
                prescriptionUrls: prescriptionUrls.length > 0 ? prescriptionUrls : null,
                location: geoPoint,
                searchRadiusKm: Number(radius),
                searchMode: locationMode === 'remote' ? 'remote' : 'self',
                remotePatientName: locationMode === 'remote' ? remotePatientName : null,
                remotePatientPhone: locationMode === 'remote' ? remotePatientPhone : null,
                remoteAddress: locationMode === 'remote' ? addressText : null,
                status: 'pending',
                notifiedPharmaciesCount: 0,
                responsesCount: 0,
                createdAt: firestore.FieldValue.serverTimestamp(),
                expiresAt: expiresAt,
                source: 'mobile',
            }));

            // Upload already done above before Firestore write

            // 5. Save locally for fast access
            await AsyncStorage.setItem('active_request_id', requestId);
            await AsyncStorage.setItem('last_request_time', Date.now().toString());

            logRequestCreated({
                medicineCount: validMeds.length,
                hasPrescription: prescriptionUris.length > 0,
                radiusKm: radius,
                timeoutMinutes: timeoutMinutes,
            });
            if (prescriptionUris.length > 0) logPrescriptionUploaded();

            setSubmissionPhase('done');
            showToast('Request sent! Finding pharmacies...', 'success');
            setTimeout(() => {
                setLoading(false);
                setSubmissionPhase('idle');
                submittingRef.current = false;
                overlayOpacity.setValue(0);
                overlayScale.setValue(0.9);
                pulseAnim.stopAnimation();
                
                // Show notification primer instead of immediate redirect
                setCreatedRequestId(requestId);
                setShowPrimer(true);
            }, 1200);

        } catch (error: any) {
            if (__DEV__) console.error('Submission error:', error);
            reportError(error, 'SearchScreen.handleSubmit');
            showToast('Could not submit the request. Please try again.', 'error');
            setLoading(false);
            setSubmissionPhase('idle');
            submittingRef.current = false;
            overlayOpacity.setValue(0);
            overlayScale.setValue(0.9);
            pulseAnim.stopAnimation();
        }
    };

    const handlePrimerAllow = async () => {
        setShowPrimer(false);
        await requestPushPermissions();
        if (createdRequestId) {
            router.push(`/request/${createdRequestId}`);
        }
    };

    const handlePrimerDeny = () => {
        setShowPrimer(false);
        if (createdRequestId) {
            router.push(`/request/${createdRequestId}`);
        }
    };

    const hasAnyMed = medicines.some(m => m.trim().length > 0);
    const hasFile = prescriptionUris.length > 0;
    const currentStep = !hasAnyMed && !hasFile ? 1 : !hasFile ? 2 : 3;

    if (isSuspended) {
        return (
            <View style={[styles.container, { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: activeColors.background }]}>
                <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: activeColors.dangerSoft, justifyContent: 'center', alignItems: 'center', marginBottom: 24 }}>
                    <AppIcon name="ban" size={40} color={activeColors.danger} />
                </View>
                <Text style={{ fontSize: 24, fontWeight: '700', color: activeColors.text, marginBottom: 12, textAlign: 'center' }}>Account Suspended</Text>
                <Text style={{ fontSize: 16, color: activeColors.textMuted, textAlign: 'center', lineHeight: 24 }}>
                    You are temporarily blocked from making new requests. Please contact support to resolve this issue.
                </Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: activeColors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={[styles.container, { paddingTop: Math.max(insets.top + 16, 56) }]} keyboardShouldPersistTaps="handled">

                {/* Location Banner */}
                <AnimatedTouchable
                    style={[styles.warningBox, { backgroundColor: activeColors.accentSoft, borderColor: activeColors.border, marginTop: 10, paddingVertical: 12, alignItems: 'center' }]}
                    onPress={() => router.push('/location-modal')}
                >
                    <AppIcon name={locationMode === 'current' ? 'navigate' : 'location'} size={20} color={activeColors.tint} />
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 12, color: activeColors.tint, fontWeight: '600' }}>
                            {locationMode === 'current' ? 'Searching near current location' : 'Searching in selected area'}
                        </Text>
                        <Text style={{ fontSize: 14, color: activeColors.text, fontWeight: '700', marginTop: 2 }} numberOfLines={1}>
                            {locationMode === 'current' ? simplifyAddress(currentAddress) || 'Fetching location...' : simplifyAddress(remoteLocation?.address)}
                        </Text>
                    </View>
                    <Text style={{ color: activeColors.tint, fontSize: 12, fontWeight: '700' }}>CHANGE</Text>
                </AnimatedTouchable>

                {/* Step Indicator */}
                <View style={styles.stepIndicatorContainer}>
                    {[
                        { n: 1, label: 'Medicines' },
                        { n: 2, label: 'Prescription' },
                        { n: 3, label: 'Search' },
                    ].map((step, i) => {
                        const done = currentStep > step.n;
                        const active = currentStep === step.n;
                        return (
                            <React.Fragment key={step.n}>
                                <View style={{ alignItems: 'center' }}>
                                    <View style={[
                                        styles.stepCircle,
                                        done ? styles.stepDone : active ? styles.stepActive : styles.stepInactive
                                    ]}>
                                        <Text style={[styles.stepText, (done || active) && styles.stepTextActive]}>
                                            {done ? '✓' : step.n}
                                        </Text>
                                    </View>
                                    <Text style={[styles.stepLabel, active && styles.stepLabelActive, done && styles.stepLabelDone]}>
                                        {step.label}
                                    </Text>
                                </View>
                                {i < 2 && <View style={[styles.stepLine, currentStep > step.n && styles.stepLineActive]} />}
                            </React.Fragment>
                        );
                    })}
                </View>

                {/* Step 1: Medicines */}
                <View style={[styles.section, { backgroundColor: activeColors.surface, borderColor: activeColors.border, overflow: 'hidden' }]}>
                    <LinearGradient colors={colorScheme === 'dark' ? Gradients.heroDark : Gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg }} />
                    <Text style={[styles.sectionTitle, { color: activeColors.text }]}>MEDICINES</Text>

                    {medicines.length === 1 && medicines[0] === '' && (
                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ fontSize: 13, color: activeColors.textMuted, marginBottom: 10, fontFamily: 'Inter_600SemiBold' }}>Popular Searches</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                                {POPULAR_SEARCHES.map((med, index) => (
                                    <AnimatedTouchable
                                        key={index}
                                        style={[styles.quickChip, { backgroundColor: activeColors.accentSoft, borderColor: activeColors.border }]}
                                        onPress={() => selectSuggestion(0, med)}
                                    >
                                        <Text style={[styles.quickChipText, { color: activeColors.tint }]}>{med}</Text>
                                    </AnimatedTouchable>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    {medicines.map((med, index) => (
                        <View key={index} style={{ marginBottom: 16 }}>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={styles.input}
                                    containerStyle={{ marginBottom: 0, flex: 1 }}
                                    placeholder={`Medicine ${index + 1} name`}
                                    value={med}
                                    onChangeText={(val) => handleMedicineChange(val, index)}
                                    rightIcon={
                                        medicines.length > 1 ? (
                                            <AnimatedTouchable onPress={() => handleRemoveMedicine(index)} style={{ padding: 4 }}>
                                                <AppIcon name="close-circle" size={20} color={activeColors.danger} />
                                            </AnimatedTouchable>
                                        ) : undefined
                                    }
                                />
                            </View>

                            {/* Suggestions Dropdown */}
                            {suggestions[index] && suggestions[index].length > 0 && (
                                <View style={styles.suggestionBox}>
                                    {suggestions[index].map((sugg, i) => (
                                        <AnimatedTouchable
                                            key={i}
                                            style={[styles.suggestionItem, i === suggestions[index].length - 1 && { borderBottomWidth: 0 }]}
                                            onPress={() => selectSuggestion(index, sugg)}
                                        >
                                            <Text style={styles.suggestionText}>{sugg}</Text>
                                        </AnimatedTouchable>
                                    ))}
                                </View>
                            )}
                        </View>
                    ))}

                    <AnimatedTouchable style={styles.addMoreBtn} onPress={handleAddMedicine}>
                        <AppIcon name="add-circle-outline" size={16} color={activeColors.tint} />
                        <Text style={[styles.addMoreText, { color: activeColors.tint }]}>Add another medicine</Text>
                    </AnimatedTouchable>
                </View>


                {/* Step 2: Prescription */}
                <View style={[styles.section, { backgroundColor: activeColors.surface, borderColor: activeColors.border, overflow: 'hidden' }]}>
                    <LinearGradient colors={colorScheme === 'dark' ? [activeColors.success + '60', activeColors.success + '20'] : [activeColors.success + '30', activeColors.success + '10']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg }} />
                    <Text style={[styles.sectionTitle, { color: activeColors.text }]}>PRESCRIPTION <Text style={{ fontWeight: '400', color: activeColors.textMuted, textTransform: 'none' }}>(Optional)</Text></Text>

                    {/* Uploaded images grid */}
                    {prescriptionUris.length > 0 && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, marginBottom: 14 }}>
                            {prescriptionUris.map((uri, idx) => (
                                <View key={idx} style={{ position: 'relative' }}>
                                    <Image source={{ uri }} style={styles.previewImage} borderRadius={8} />
                                    <AnimatedTouchable
                                        style={styles.removeImageBtn}
                                        onPress={() => removePrescription(idx)}
                                    >
                                        <AppIcon name="close-circle" size={22} color={activeColors.danger} />
                                    </AnimatedTouchable>
                                </View>
                            ))}
                        </ScrollView>
                    )}

                    <AnimatedTouchable style={[styles.uploadCard, { borderColor: activeColors.border, backgroundColor: activeColors.background }]} onPress={uploadPrescriptionImage}>
                        <View style={styles.uploadContent}>
                            <View style={styles.uploadIconWrapper}>
                                <AppIcon name="camera" size={24} color={activeColors.icon} />
                            </View>
                            <Text style={styles.uploadTitle}>{prescriptionUris.length > 0 ? 'Add More Photos' : 'Tap to Upload'}</Text>
                            <Text style={styles.uploadSubtitle}>Camera or Gallery • Multiple files supported</Text>
                        </View>
                    </AnimatedTouchable>

                    {uploadProgress > 0 && uploadProgress < 100 && (
                        <View style={styles.progressWrapper}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                <Text style={{ fontSize: 12, color: activeColors.textMuted }}>Uploading...</Text>
                                <Text style={{ fontSize: 12, color: activeColors.textMuted }}>{uploadProgress}%</Text>
                            </View>
                            <View style={styles.progressBg}>
                                <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
                            </View>
                        </View>
                    )}
                </View>

                {/* Remote Patient Details (Only if Remote Mode) */}
                {locationMode === 'remote' && (
                    <View style={[styles.section, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
                        <Text style={[styles.sectionTitle, { color: activeColors.text }]}>PATIENT DETAILS <Text style={{ fontWeight: '400', color: activeColors.textMuted, textTransform: 'none' }}>(Optional)</Text></Text>
                        <View style={{ marginBottom: 12 }}>
                            <TextInput
                                placeholder="Patient Name (e.g., Mom)"
                                value={remotePatientName}
                                onChangeText={setRemotePatientName}
                                containerStyle={{ marginBottom: 12 }}
                            />
                            <TextInput
                                placeholder="Patient Phone Number"
                                value={remotePatientPhone}
                                onChangeText={setRemotePatientPhone}
                                keyboardType="phone-pad"
                                containerStyle={{ marginBottom: 0 }}
                            />
                        </View>
                        <Text style={{ fontSize: 12, color: activeColors.textMuted }}>Providing these details helps the pharmacy identify the correct person for medicine pickup.</Text>
                    </View>
                )}

                {/* Step 3: Search Radius Simulator slider  */}
                <View style={[styles.section, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <Text style={[styles.sectionTitle, { color: activeColors.text }]}>SEARCH RADIUS</Text>
                        <View style={{ backgroundColor: activeColors.accentSoft, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: activeColors.border }}>
                            <Text style={{ color: activeColors.accent, fontWeight: 'bold', fontSize: 12 }}>{radius} km</Text>
                        </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10 }}>
                        <Text style={{ fontSize: 12, color: activeColors.textMuted }}>1km</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', width: '60%' }}>
                            <AnimatedTouchable onPress={() => setRadius(Math.max(1, radius - 5))} style={[styles.radiusBtn, { backgroundColor: activeColors.background, borderColor: activeColors.border }]}>
                                <Text style={[styles.radiusBtnText, { color: activeColors.text }]}>-</Text>
                            </AnimatedTouchable>
                            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }}>
                                <View style={{ width: '100%', height: 4, backgroundColor: activeColors.border, borderRadius: 2, overflow: 'hidden' }}>
                                    <View style={{ width: `${Math.round(((radius - 1) / 49) * 100)}%`, height: '100%', backgroundColor: activeColors.accent, borderRadius: 2 }} />
                                </View>
                            </View>
                            <AnimatedTouchable onPress={() => setRadius(Math.min(50, radius + 5))} style={[styles.radiusBtn, { backgroundColor: activeColors.background, borderColor: activeColors.border }]}>
                                <Text style={[styles.radiusBtnText, { color: activeColors.text }]}>+</Text>
                            </AnimatedTouchable>
                        </View>
                        <Text style={{ fontSize: 12, color: activeColors.textMuted }}>50km</Text>
                    </View>
                </View>

                {/* Timeout Selector */}
                <View style={[styles.section, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <Text style={[styles.sectionTitle, { color: activeColors.text }]}>REQUEST TIMEOUT</Text>
                        <View style={{ backgroundColor: activeColors.warningSoft, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: activeColors.warning }}>
                            <Text style={{ color: activeColors.warning, fontWeight: 'bold', fontSize: 12 }}>{timeoutMinutes} min</Text>
                        </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        {[5, 10, 15, 20].map(t => (
                            <AnimatedTouchable
                                key={t}
                                onPress={() => setTimeoutMinutes(t)}
                                style={[styles.timeoutChip, timeoutMinutes === t && styles.timeoutChipActive]}
                            >
                                <Text style={[styles.timeoutChipText, timeoutMinutes === t && styles.timeoutChipTextActive]}>{t} min</Text>
                            </AnimatedTouchable>
                        ))}
                    </View>
                    <Text style={{ fontSize: 11, color: activeColors.textMuted, marginTop: 10, fontFamily: 'Inter_500Medium' }}>
                        After this time, your request will expire and you'll need to create a new one.
                    </Text>
                </View>

                {/* Warning message */}
                <View style={[styles.warningBox, { backgroundColor: activeColors.warningSoft, borderColor: activeColors.warning }]}>
                    <AppIcon name="location" size={18} color={activeColors.warning} />
                    <Text style={[styles.warningText, { color: activeColors.text }]}>
                        {locationMode === 'current'
                            ? `We'll use your current location to find pharmacies nearby. This request expires in ${timeoutMinutes} minutes.`
                            : `We'll find pharmacies near the selected location. This request expires in ${timeoutMinutes} minutes.`}
                    </Text>
                </View>

            </ScrollView>

            <View style={[styles.footerAction, { paddingBottom: Math.max(insets.bottom + 12, 20), backgroundColor: activeColors.surface, borderTopColor: activeColors.border }]}>
                <LinearGradient colors={colorScheme === 'dark' ? Gradients.heroDark : Gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3 }} />
                <GradientButton
                    label={loading ? 'Locating Pharmacies...' : 'Send Request to Nearby Pharmacies'}
                    onPress={() => {
                        Keyboard.dismiss();
                        const validMeds = medicines.filter(m => m.trim() !== '');
                        if (validMeds.length === 0 && prescriptionUris.length === 0) {
                            showToast('Please enter at least one medicine or upload a prescription.', 'error');
                            return;
                        }
                        setShowConfirmSheet(true);
                    }}
                    disabled={loading}
                    colors={colorScheme === 'dark' ? Gradients.primaryDark : Gradients.primary}
                    icon={<AppIcon name="paper-plane" size={18} color="#fff" />}
                />
                <Button
                    title="Cancel"
                    onPress={() => router.back()}
                    variant="outline"
                    disabled={loading}
                />
            </View>

            {/* Submission Overlay */}
            {submissionPhase !== 'idle' && (
                <Animated.View style={[styles.submissionOverlay, { opacity: overlayOpacity }]}>
                    <Animated.View style={[styles.submissionCard, { backgroundColor: activeColors.surface, transform: [{ scale: overlayScale }] }]}>
                        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                            <View style={[styles.submissionIcon, { backgroundColor: submissionPhase === 'done' ? activeColors.successSoft : activeColors.accentSoft }]}>
                                <AppIcon
                                    name={(submissionPhase === 'uploading' ? 'cloud-upload' : submissionPhase === 'finding' ? 'search' : 'checkmark-circle-outline') as any}
                                    size={36}
                                    color={submissionPhase === 'done' ? activeColors.success : activeColors.tint}
                                />
                            </View>
                        </Animated.View>
                        <Text style={[styles.submissionTitle, { color: activeColors.text }]}>
                            {submissionPhase === 'uploading' ? 'Uploading Prescription...' : submissionPhase === 'finding' ? 'Finding Nearby Pharmacies...' : 'Request Sent! ✓'}
                        </Text>
                        <Text style={[styles.submissionSubtitle, { color: activeColors.textMuted }]}>
                            {submissionPhase === 'uploading' ? `${uploadProgress}% complete` : submissionPhase === 'finding' ? 'Matching pharmacies in your area' : 'Redirecting you now...'}
                        </Text>
                        {submissionPhase === 'uploading' && (
                            <View style={[styles.submissionProgress, { backgroundColor: activeColors.border }]}>
                                <View style={[styles.submissionProgressFill, { width: `${uploadProgress}%`, backgroundColor: activeColors.tint }]} />
                            </View>
                        )}
                    </Animated.View>
                </Animated.View>
            )}

            {/* ── Confirmation Bottom Sheet ── */}
            <Modal visible={showConfirmSheet} transparent animationType="slide" onRequestClose={() => setShowConfirmSheet(false)}>
                <View style={styles.confirmOverlay}>
                    <AnimatedTouchable style={{ flex: 1 }} onPress={() => setShowConfirmSheet(false)}>
                        <View style={{ flex: 1 }} />
                    </AnimatedTouchable>
                    <View style={[styles.confirmSheet, { backgroundColor: activeColors.surface }]}>
                        <View style={[styles.confirmHandle, { backgroundColor: activeColors.border }]} />
                        <Text style={[styles.confirmTitle, { color: activeColors.text }]}>Confirm Your Request</Text>
                        <Text style={[styles.confirmSubtitle, { color: activeColors.textMuted }]}>Review your details before notifying nearby pharmacies</Text>

                        {/* Summary Items */}
                        <View style={[styles.confirmSummary, { backgroundColor: activeColors.background, borderColor: activeColors.border }]}>
                            {medicines.filter(m => m.trim()).length > 0 && (
                                <View style={styles.confirmRow}>
                                    <AppIcon name="medkit-outline" size={18} color={activeColors.accent} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.confirmRowLabel, { color: activeColors.textMuted }]}>Medicines</Text>
                                        <Text style={[styles.confirmRowValue, { color: activeColors.text }]}>{medicines.filter(m => m.trim()).join(', ')}</Text>
                                    </View>
                                </View>
                            )}
                            {prescriptionUris.length > 0 && (
                                <View style={styles.confirmRow}>
                                    <AppIcon name="document-attach-outline" size={18} color={activeColors.accent} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.confirmRowLabel, { color: activeColors.textMuted }]}>Prescription</Text>
                                        <Text style={[styles.confirmRowValue, { color: activeColors.success }]}>{prescriptionUris.length} file{prescriptionUris.length > 1 ? 's' : ''} attached ✓</Text>
                                    </View>
                                </View>
                            )}
                            <View style={styles.confirmRow}>
                                <AppIcon name="location-outline" size={18} color={activeColors.accent} />
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.confirmRowLabel, { color: activeColors.textMuted }]}>Search Radius</Text>
                                    <Text style={[styles.confirmRowValue, { color: activeColors.text }]}>{radius} km</Text>
                                </View>
                            </View>
                            <View style={[styles.confirmRow, { borderBottomWidth: 0 }]}>
                                <AppIcon name="timer-outline" size={18} color={activeColors.accent} />
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.confirmRowLabel, { color: activeColors.textMuted }]}>Expires In</Text>
                                    <Text style={[styles.confirmRowValue, { color: activeColors.text }]}>{timeoutMinutes} minutes</Text>
                                </View>
                            </View>
                        </View>

                        <GradientButton
                            label="Confirm & Send"
                            onPress={handleSubmit}
                            colors={colorScheme === 'dark' ? Gradients.primaryDark : Gradients.primary}
                            icon={<AppIcon name="paper-plane" size={18} color="#fff" />}
                        />
                        <Button
                            title="Go Back"
                            onPress={() => setShowConfirmSheet(false)}
                            variant="ghost"
                            style={{ marginTop: 8 }}
                        />
                    </View>
                </View>
            </Modal>

            <NotificationPrimer
                visible={showPrimer}
                onAllow={handlePrimerAllow}
                onDeny={handlePrimerDeny}
            />
        </KeyboardAvoidingView>
    );
}

const getStyles = (activeColors: any, colorScheme: 'light' | 'dark') => StyleSheet.create({
    container: { padding: 20, paddingBottom: 200 },
    stepIndicatorContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 30, marginTop: 10 },
    stepCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
    stepDone: { backgroundColor: activeColors.accent },
    stepActive: { backgroundColor: activeColors.accent, borderWidth: 2.5, borderColor: activeColors.accentSoft, shadowColor: activeColors.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 4 },
    stepInactive: { backgroundColor: activeColors.border },
    stepText: { fontSize: 14, fontWeight: '800', color: activeColors.textMuted },
    stepTextActive: { color: activeColors.background },
    stepLabel: { fontSize: 10, fontWeight: '700', color: activeColors.textMuted, marginTop: 4, letterSpacing: 0.3 },
    stepLabelActive: { color: activeColors.success },
    stepLabelDone: { color: activeColors.tint },
    stepLine: { flex: 1, height: 2.5, backgroundColor: activeColors.border, marginHorizontal: 8, marginBottom: 15, zIndex: 1, borderRadius: 2 },
    stepLineActive: { backgroundColor: activeColors.accent },
    section: { marginBottom: 24, backgroundColor: activeColors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: activeColors.border, padding: 18, shadowColor: activeColors.shadow, ...Shadows.sm },
    sectionTitle: { fontSize: 11, fontFamily: 'Inter_700Bold', color: activeColors.text, marginBottom: 12, letterSpacing: 1.5 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: activeColors.background, borderWidth: 1.5, borderColor: activeColors.border, borderRadius: Radius.md, paddingHorizontal: 16, height: 52 },
    input: { flex: 1, fontSize: 16, color: activeColors.text, fontFamily: 'Inter_500Medium' },
    removeBtn: { padding: 8, backgroundColor: activeColors.danger + '20', borderRadius: Radius.sm, marginLeft: 10, borderWidth: 1, borderColor: activeColors.danger + '40' },
    removeBtnText: { color: activeColors.danger, fontSize: 14, fontWeight: 'bold' },
    addMoreBtn: { alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 16, backgroundColor: activeColors.background, borderRadius: Radius.md, borderWidth: 1, borderColor: activeColors.border, flexDirection: 'row', alignItems: 'center', gap: 6 },
    addMoreText: { fontWeight: '800', fontSize: 14 },
    suggestionBox: { backgroundColor: activeColors.surface, borderWidth: 1, borderColor: activeColors.border, borderRadius: Radius.md, marginTop: 6, shadowColor: activeColors.shadow, ...Shadows.md },
    suggestionItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: activeColors.border },
    suggestionText: { fontSize: 15, color: activeColors.text, fontWeight: '500' },
    quickChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.lg, borderWidth: 1, backgroundColor: activeColors.tintSurface },
    quickChipText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
    uploadCard: { backgroundColor: activeColors.background, borderWidth: 2, borderColor: activeColors.border, borderStyle: 'dashed', borderRadius: Radius.lg, padding: 24, justifyContent: 'center', alignItems: 'center' },
    uploadContent: { alignItems: 'center' },
    uploadIconWrapper: { marginBottom: 10 },
    uploadTitle: { fontSize: 16, fontWeight: '800', color: activeColors.text },
    uploadSubtitle: { color: activeColors.textMuted, fontSize: 12, marginTop: 4, fontWeight: '500' },
    previewImage: { width: 100, height: 100, resizeMode: 'cover' },
    removeImageBtn: { position: 'absolute', top: -6, right: -6, backgroundColor: 'white', borderRadius: 11 },
    progressWrapper: { marginTop: 14 },
    progressBg: { width: '100%', height: 6, backgroundColor: activeColors.border, borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: activeColors.accent, borderRadius: 3 },
    warningBox: { backgroundColor: activeColors.warning + '20', borderWidth: 1, borderColor: activeColors.warning, borderRadius: Radius.md, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 20 },
    warningText: { flex: 1, fontSize: 12, color: activeColors.text, lineHeight: 18, fontWeight: '500' },
    radiusBtn: { width: 38, height: 38, borderRadius: Radius.md, backgroundColor: activeColors.background, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: activeColors.border },
    radiusBtnText: { fontSize: 18, fontWeight: '800', color: activeColors.text },
    footerAction: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.lg, backgroundColor: activeColors.surface, borderTopWidth: 1, borderTopColor: activeColors.border, gap: 10, shadowColor: activeColors.shadow, ...Shadows.sm, overflow: 'hidden' },
    submissionOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
    submissionCard: { width: 280, borderRadius: Radius.lg, padding: 32, alignItems: 'center', ...Shadows.lg },
    submissionIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    submissionTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', marginBottom: 6, textAlign: 'center' },
    submissionSubtitle: { fontSize: 13, fontFamily: 'Inter_500Medium', textAlign: 'center', marginBottom: 12 },
    submissionProgress: { width: '80%', height: 4, borderRadius: 2, overflow: 'hidden' },
    submissionProgressFill: { height: '100%', borderRadius: 2 },
    submitBtn: { backgroundColor: activeColors.accent, height: 54, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', shadowColor: activeColors.accent, ...Shadows.md },
    submitBtnDisabled: { backgroundColor: activeColors.border, shadowOpacity: 0, elevation: 0 },
    submitText: { color: activeColors.background, fontSize: 16, fontFamily: 'Inter_700Bold' },
    cancelBtn: { height: 50, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: activeColors.border, backgroundColor: activeColors.background },
    cancelBtnText: { color: activeColors.textMuted, fontSize: 15, fontFamily: 'Inter_600SemiBold' },
    timeoutChip: { flex: 1, paddingVertical: 10, borderRadius: Radius.md, backgroundColor: activeColors.background, borderWidth: 1.5, borderColor: activeColors.border, alignItems: 'center' },
    timeoutChipActive: { backgroundColor: activeColors.warningSoft, borderColor: activeColors.warning },
    timeoutChipText: { fontSize: 13, fontWeight: '700', color: activeColors.textMuted },
    timeoutChipTextActive: { color: activeColors.warning, fontWeight: '800' },

    // Confirmation Bottom Sheet
    confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' as const },
    confirmSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
    confirmHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center' as const, marginBottom: 20 },
    confirmTitle: { fontSize: 20, fontFamily: 'Inter_800ExtraBold', letterSpacing: -0.5, marginBottom: 4 },
    confirmSubtitle: { fontSize: 13, fontFamily: 'Inter_400Regular', marginBottom: 20, lineHeight: 18 },
    confirmSummary: { borderRadius: Radius.lg, padding: 16, borderWidth: 1, marginBottom: 20 },
    confirmRow: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: activeColors.border + '60' },
    confirmRowLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.3, marginBottom: 2 },
    confirmRowValue: { fontSize: 14, fontFamily: 'Inter_700Bold' },
});

