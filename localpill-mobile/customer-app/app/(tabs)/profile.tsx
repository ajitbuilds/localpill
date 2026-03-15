import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, Image, Animated, Alert, Linking, Share } from 'react-native';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { showToast } from '../../components/Toast';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import * as ImagePicker from 'expo-image-picker';
import { AppIcon } from '../../components/icons/AppIcon';
import * as Haptics from 'expo-haptics';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import database from '@react-native-firebase/database';
import { Colors, Shadows, Radius, Gradients } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { TextInput } from '@/components/ui/TextInput';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/Skeleton';
import { AnimatedTouchable } from '../../components/ui/AnimatedTouchable';
import { isValidString, isValidAge } from '../../utils/validation';
import { useTranslation } from 'react-i18next';
import '../../i18n'; // Initialize i18n
import { reportError } from '../../utils/crashReporter';
import { logProfileUpdated, logAccountDeleted } from '../../utils/analyticsEvents';
import { useScreenTracking } from '../../hooks/useScreenTracking';

const GENDER_OPTIONS = ['Prefer not to say', 'Male', 'Female', 'Other'];

export default function ProfileScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme as 'light' | 'dark'];
    const { t, i18n } = useTranslation();
    useScreenTracking('ProfileScreen');

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [age, setAge] = useState('');
    const [gender, setGender] = useState('');
    const [profilePic, setProfilePic] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [biometricEnabled, setBiometricEnabled] = useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const insets = useSafeAreaInsets();
    const { uid } = useAuth();

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                if (uid) {
                    // Real Firestore Read
                    const userSnap = await firestore().collection('users').doc(uid).get();
                    if (userSnap.exists()) {
                        const data = userSnap.data();
                        if (data) {
                            setName(data.name || '');
                            setPhone(data.phone || '');
                            setAge(data.age || '');
                            setGender(data.gender || '');
                            setProfilePic(data.profilePicUrl || data.profilePic || null);
                        }
                    } else {
                        // Attempt to populate phone from async storage if new account
                        const storedPhone = await AsyncStorage.getItem('user_phone');
                        setPhone(storedPhone || '');
                    }

                    const storedBiometric = await AsyncStorage.getItem('biometric_enabled');
                    setBiometricEnabled(storedBiometric === 'true');
                }

            } catch (err) {
                if (__DEV__) console.error("Error fetching user data", err);
            } finally {
                setTimeout(() => {
                    setLoading(false);
                    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
                }, 400); // Small delay to show skeleton effect
            }
        };
        fetchUserData();
    }, [fadeAnim, uid]);

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

    const handleSave = async () => {
        if (!isValidString(name)) { showToast('Name is required', 'error'); return; }
        if (age && !isValidAge(age)) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            showToast('Please enter a valid age (1–120)', 'error'); return;
        }
        setSaving(true);
        try {
            const saveUid = uid;

            if (saveUid) {
                let updatedProfilePic = profilePic;

                // Only upload if it's a freshly picked local file (not an existing URL or stale path)
                if (profilePic && !profilePic.startsWith('http')) {
                    // Normalize the file URI for Android Firebase Storage
                    let uploadUri = profilePic;
                    if (Platform.OS === 'android' && !uploadUri.startsWith('file://')) {
                        uploadUri = `file://${uploadUri}`;
                    }

                    if (uploadUri.startsWith('file://')) {
                        try {
                            const path = `users/${saveUid}/profile/pic_${Date.now()}.jpg`;
                            const reference = storage().ref(path);
                            await reference.putFile(uploadUri);
                            updatedProfilePic = await reference.getDownloadURL();
                        } catch (uploadErr: any) {
                            if (__DEV__) console.log('Profile pic upload failed, saving without image:', uploadErr.message);
                            // Keep the old profilePic URL if upload fails (don't overwrite with broken path)
                            const userSnap = await firestore().collection('users').doc(saveUid).get();
                            updatedProfilePic = userSnap.data()?.profilePicUrl || userSnap.data()?.profilePic || null;
                        }
                    } else {
                        // Not a valid local path — use what's already in Firestore
                        const userSnap = await firestore().collection('users').doc(saveUid).get();
                        updatedProfilePic = userSnap.data()?.profilePicUrl || userSnap.data()?.profilePic || null;
                    }
                }

                await firestore().collection('users').doc(saveUid).set({
                    role: 'user',
                    name: name.trim(),
                    phone: phone,
                    age: age ? Number(age) : null,
                    gender: gender || null,
                    profilePicUrl: updatedProfilePic || null,
                    profilePic: updatedProfilePic || null,
                    updatedAt: firestore.FieldValue.serverTimestamp()
                }, { merge: true });

                setProfilePic(updatedProfilePic); // Update state to downloaded URL

                // Also update local cache for fast loading
                await AsyncStorage.setItem('user_name', name.trim());
                await AsyncStorage.setItem('user_phone', phone);
            }


            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast('Profile updated successfully!', 'success');
            logProfileUpdated();
        } catch (err) {
            if (__DEV__) console.error('Save profile error:', err);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            showToast('Failed to update profile.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const { signOut } = useAuth();
    const [deleting, setDeleting] = useState(false);

    const handleLogOut = async () => {
        Alert.alert('Log Out', 'Are you sure you want to log out?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Log Out', style: 'destructive', onPress: async () => {
                    await signOut();
                }
            }
        ]);
    };

    const handleInviteFriend = async () => {
        try {
            await Share.share({
                message: `Hey! Try LocalPill — it helps you find medicines at nearby pharmacies in real-time. No more running around!\n\nDownload: https://play.google.com/store/apps/details?id=com.localpill.customerapp`,
                title: 'Check out LocalPill!',
            });
        } catch (err) {
            if (__DEV__) console.error('Share error:', err);
        }
    };

    const performAccountDeletion = async () => {
        setDeleting(true);
        try {
            const currentUid = uid;
            if (!currentUid) throw new Error('No user logged in');

            // Step 1-4: Clean up all data WHILE STILL AUTHENTICATED
            // (Firestore/RTDB security rules need valid auth)

            // 1. Delete user notifications
            try {
                const notifsSnap = await firestore()
                    .collection('notifications')
                    .doc(currentUid)
                    .collection('userNotifications')
                    .get();
                const batch1 = firestore().batch();
                notifsSnap.docs.forEach(doc => batch1.delete(doc.ref));
                await batch1.commit();
            } catch (e) {
                if (__DEV__) console.log('Notification cleanup skipped:', e);
            }

            // 2. Delete user's request history
            try {
                const requestsSnap = await firestore()
                    .collection('requests')
                    .where('userId', '==', currentUid)
                    .get();
                const docs = requestsSnap.docs;
                for (let i = 0; i < docs.length; i += 450) {
                    const chunk = docs.slice(i, i + 450);
                    const batch = firestore().batch();
                    chunk.forEach(doc => batch.delete(doc.ref));
                    await batch.commit();
                }
            } catch (e) {
                if (__DEV__) console.log('Request history cleanup skipped:', e);
            }

            // 3. Delete Firebase Storage files (profile pics, prescriptions)
            try {
                const storagePaths = [`users/${currentUid}/profile`, `users/${currentUid}/prescriptions`];
                for (const path of storagePaths) {
                    try {
                        const listResult = await storage().ref(path).listAll();
                        await Promise.all(listResult.items.map(item => item.delete()));
                    } catch (e) {
                        // Path may not exist — safe to skip
                    }
                }
            } catch (e) {
                if (__DEV__) console.log('Storage cleanup skipped:', e);
            }

            // 4. Delete user Firestore document
            try {
                await firestore().collection('users').doc(currentUid).delete();
            } catch (e) {
                if (__DEV__) console.log('User doc cleanup skipped:', e);
            }

            // 4. Delete RTDB presence data
            try {
                await database().ref(`/status/${currentUid}`).remove();
            } catch (e) {
                if (__DEV__) console.log('RTDB cleanup skipped:', e);
            }

            // 5. Clear local storage
            await AsyncStorage.multiRemove([
                'user_auth', 'user_uid', 'user_name', 'user_phone',
                'biometric_enabled', 'onboarding_done',
            ]);

            // 6. Delete Firebase Auth account LAST
            // Must be last — after this, auth token is invalidated
            const currentUser = auth().currentUser;
            if (currentUser) {
                try {
                    await currentUser.delete();
                } catch (deleteErr: any) {
                    if (deleteErr.code === 'auth/requires-recent-login') {
                        // Re-authenticate: sign in again with phone to refresh credentials
                        const userPhone = currentUser.phoneNumber;
                        if (!userPhone) throw new Error('No phone number found for re-authentication');

                        showToast('Re-verifying your identity...', 'info');

                        // signInWithPhoneNumber triggers native SMS flow
                        // On Android: auto-verifies via SMS Retriever (no user input needed usually)
                        // On iOS: sends OTP that user needs to enter
                        const confirmation = await auth().signInWithPhoneNumber(userPhone);

                        if (confirmation.verificationId) {
                            // Auto-verification didn't happen — need OTP input
                            // Navigate to login flow for security re-verification
                            showToast('Please verify OTP to complete account deletion', 'info');
                            
                            // Store flag so after re-auth, deletion continues
                            await AsyncStorage.setItem('pending_account_delete', 'true');
                            router.replace({
                                pathname: '/otp',
                                params: { phoneNumber: userPhone, verificationId: confirmation.verificationId }
                            });
                            return; // Will complete deletion after re-login
                        }

                        // If auto-verified (signInWithPhoneNumber resolved without verificationId on Android)
                        // The user is now freshly authenticated, retry delete
                        const freshUser = auth().currentUser;
                        if (freshUser) {
                            await freshUser.delete();
                        }
                    } else {
                        throw deleteErr;
                    }
                }
            }

            showToast('Account deleted successfully', 'success');
            logAccountDeleted();
            router.replace('/login');
        } catch (err: any) {
            if (__DEV__) console.error('Delete account error:', err);
            if (err.message === 'Re-authentication cancelled') {
                showToast('Account deletion cancelled', 'info');
            } else {
                showToast('Failed to delete account. Please try again.', 'error');
            }
        } finally {
            setDeleting(false);
        }
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            '⚠️ Delete Account',
            'This will permanently delete your account, profile, and all request history. This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete Forever',
                    style: 'destructive',
                    onPress: () => {
                        Alert.alert(
                            'Are you absolutely sure?',
                            'Type DELETE in your mind and tap confirm. All your data will be permanently removed.',
                            [
                                { text: 'Go Back', style: 'cancel' },
                                {
                                    text: 'Confirm Delete',
                                    style: 'destructive',
                                    onPress: performAccountDeletion,
                                },
                            ],
                        );
                    },
                },
            ],
        );
    };

    // Completion
    const appVersion = Constants.expoConfig?.version ?? '1.0.0';
    const fields = [
        { label: 'Name', value: name },
        { label: 'Age', value: age },
        { label: 'Gender', value: gender || '' },
        { label: 'Profile Picture', value: profilePic || '' },
    ];
    const completedCount = fields.filter(f => f.value?.toString().trim()).length;
    const completionPct = Math.round((completedCount / fields.length) * 100);
    const progressColor = completionPct === 100 ? colors.success : completionPct >= 50 ? colors.warning : colors.danger;
    const missingField = fields.find(f => !f.value?.toString().trim());

    if (loading) {
        return (
            <View style={[styles.container, { padding: 20, backgroundColor: colors.background }]}>
                {/* Cover skeleton */}
                <Skeleton width="100%" height={160} borderRadius={24} style={{ marginBottom: 30, marginTop: 40 }} />

                {/* Form skeletons */}
                <Skeleton width={80} height={14} style={{ marginBottom: 8 }} />
                <Skeleton width="100%" height={56} borderRadius={16} style={{ marginBottom: 24 }} />

                <Skeleton width={40} height={14} style={{ marginBottom: 8 }} />
                <Skeleton width="100%" height={56} borderRadius={16} style={{ marginBottom: 24 }} />

                <Skeleton width={100} height={14} style={{ marginBottom: 8 }} />
                <Skeleton width="100%" height={56} borderRadius={16} style={{ marginBottom: 40 }} />

                <Skeleton width="100%" height={54} borderRadius={16} />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Animated.ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]} style={{ opacity: fadeAnim }} showsVerticalScrollIndicator={false}>

                {/* ── Cover Banner ── */}
                <View style={[styles.coverBanner, { paddingTop: Math.max(insets.top, 20), shadowColor: colors.shadow }]}>
                    <LinearGradient
                        colors={colorScheme === 'dark' ? Gradients.heroDark : Gradients.hero}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                    />
                    <View style={styles.coverGradient}>
                        <View style={[styles.coverCircle1, { backgroundColor: colors.white + '0A' }]} />
                        <View style={[styles.coverCircle2, { backgroundColor: colors.white + '06' }]} />
                    </View>

                    <View style={styles.avatarNameRow}>
                        <AnimatedTouchable onPress={handlePickImage} style={[styles.avatarWrapper, { borderColor: colors.white, backgroundColor: colors.white + '20' }]} >
                            {profilePic ? (
                                <Image source={{ uri: profilePic }} style={styles.avatarImage} />
                            ) : (
                                <AppIcon name="person" size={42} color={colors.white + '80'} />
                            )}
                            <View style={[styles.cameraOverlay, { backgroundColor: colors.white, borderColor: colors.white }]}>
                                <AppIcon name="camera" size={14} color={colors.tint} />
                            </View>
                        </AnimatedTouchable>
                        <View style={styles.avatarNameInfo}>
                            <Text style={[styles.displayName, { color: colors.white }]} numberOfLines={1}>{name || 'Your Name'}</Text>
                            <View style={styles.phoneRow}>
                                <AppIcon name="call" size={12} color={colors.white + 'B3'} />
                                <Text style={[styles.phoneDisplay, { color: colors.white + 'B3' }]}>{phone}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Completion Bar */}
                    <View style={[styles.completionContainer, { backgroundColor: colors.white + '15', borderColor: colors.white + '20' }]}>
                        <View style={styles.completionHeader}>
                            <Text style={[styles.completionLabel, { color: colors.white + 'CC' }]}>PROFILE COMPLETION</Text>
                            <Text style={[styles.completionPct, { color: colors.white }]}>{completionPct}%</Text>
                        </View>
                        <View style={[styles.progressBg, { backgroundColor: colors.white + '20' }]}>
                            <Animated.View style={[styles.progressFill, { width: `${completionPct}%`, backgroundColor: colors.white }]} />
                        </View>
                        {missingField && (
                            <Text style={[styles.missingHint, { color: colors.white + 'B3' }]}>Add {missingField.label.toLowerCase()} to complete</Text>
                        )}
                    </View>
                </View>

                {/* ── Personal Information Card ── */}
                <View style={styles.sectionWrapper}>
                    <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <View style={styles.sectionHeaderRow}>
                            <AppIcon name="person-circle-outline" size={20} color={colors.tint} />
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Personal Information</Text>
                        </View>

                        <TextInput
                            label="FULL NAME"
                            placeholder="Enter your name"
                            value={name}
                            onChangeText={setName}
                            leftIcon={<AppIcon name="person-outline" size={20} color={colors.textMuted} />}
                            containerStyle={styles.fieldSpacing}
                        />

                        <TextInput
                            label="AGE"
                            placeholder="Age (optional)"
                            value={age}
                            keyboardType="number-pad"
                            maxLength={3}
                            onChangeText={(text) => setAge(text.replace(/[^0-9]/g, ''))}
                            leftIcon={<AppIcon name="calendar-outline" size={20} color={colors.textMuted} />}
                            containerStyle={styles.fieldSpacing}
                        />

                        <View style={styles.fieldGroup}>
                            <Text style={[styles.label, { color: colors.textMuted }]}>GENDER</Text>
                            <View style={styles.chipRow}>
                                {GENDER_OPTIONS.map((g) => (
                                    <AnimatedTouchable
                                        key={g}
                                        style={[
                                            styles.chip,
                                            { backgroundColor: colors.background, borderColor: colors.border },
                                            gender === g && { backgroundColor: colors.accentSoft, borderColor: colors.accent }
                                        ]}
                                        onPress={() => {
                                            Haptics.selectionAsync();
                                            setGender(g);
                                        }}
                                    >
                                        <Text style={[
                                            styles.chipText,
                                            { color: colors.textMuted },
                                            gender === g && { color: colors.tint, fontWeight: '700' }
                                        ]}>{g}</Text>
                                    </AnimatedTouchable>
                                ))}
                            </View>
                        </View>
                    </View>
                </View>

                {/* ── Preferences Card ── */}
                <View style={styles.sectionWrapper}>
                    <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <View style={styles.sectionHeaderRow}>
                            <AppIcon name="settings-outline" size={20} color={colors.tint} />
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Preferences</Text>
                        </View>

                        <View style={styles.fieldGroup}>
                            <Text style={[styles.label, { color: colors.textMuted }]}>{t('language')}</Text>
                            <View style={styles.chipRow}>
                                {['en', 'hi'].map((lng) => (
                                    <AnimatedTouchable
                                        key={lng}
                                        style={[
                                            styles.chip,
                                            { backgroundColor: colors.background, borderColor: colors.border },
                                            i18n.language === lng && { backgroundColor: colors.accentSoft, borderColor: colors.accent }
                                        ]}
                                        onPress={() => {
                                            Haptics.selectionAsync();
                                            i18n.changeLanguage(lng);
                                        }}
                                    >
                                        <Text style={[
                                            styles.chipText,
                                            { color: colors.textMuted },
                                            i18n.language === lng && { color: colors.tint, fontWeight: '700' }
                                        ]}>{lng === 'en' ? 'English' : 'हिंदी'}</Text>
                                    </AnimatedTouchable>
                                ))}
                            </View>
                        </View>

                        <View style={[styles.divider, { backgroundColor: colors.border }]} />

                        <View style={styles.toggleRow}>
                            <View style={styles.toggleInfo}>
                                <Text style={[styles.toggleLabel, { color: colors.text }]}>{t('appLock') || 'App Lock'}</Text>
                                <Text style={[styles.toggleSub, { color: colors.textMuted }]}>Require FaceID / TouchID to open</Text>
                            </View>
                            <AnimatedTouchable
                                onPress={() => {
                                    Haptics.selectionAsync();
                                    const newValue = !biometricEnabled;
                                    setBiometricEnabled(newValue);
                                    AsyncStorage.setItem('biometric_enabled', newValue ? 'true' : 'false');
                                }}
                                style={[styles.toggleTrack, { backgroundColor: biometricEnabled ? colors.success : colors.border }]}
                            >
                                <View style={[
                                    styles.toggleThumb,
                                    { backgroundColor: colors.white },
                                    biometricEnabled && styles.toggleThumbActive,
                                ]} />
                            </AnimatedTouchable>
                        </View>
                    </View>
                </View>

                {/* ── Save Button ── */}
                <View style={styles.sectionWrapper}>
                    <Button
                        title="Save Profile"
                        onPress={handleSave}
                        loading={saving}
                        icon={<AppIcon name="checkmark" size={20} color={colors.white} />}
                        style={{ height: 54, borderRadius: Radius.lg }}
                    />
                </View>

                {/* ── Quick Links ── */}
                <View style={styles.sectionWrapper}>
                    {[
                        { icon: 'information-circle-outline' as any, label: 'About LocalPill', onPress: () => router.push('/about'), iconBg: colors.accentSoft, iconColor: colors.accent },
                        { icon: 'help-circle-outline' as any, label: 'Help & Support', onPress: () => router.push('/help'), iconBg: colors.accentSoft, iconColor: colors.accent },
                        { icon: 'gift-outline' as any, label: 'Invite Friends', onPress: handleInviteFriend, iconBg: colors.successSoft, iconColor: colors.success },
                    ].map((link, idx) => (
                        <AnimatedTouchable key={link.label} style={[styles.quickLinkInCard, { backgroundColor: colors.surface, borderColor: colors.border }, idx > 0 && { marginTop: 10 }]} onPress={link.onPress}>
                            <View style={[styles.quickLinkIcon, { backgroundColor: link.iconBg }]}>
                                <AppIcon name={link.icon} size={20} color={link.iconColor} />
                            </View>
                            <Text style={[styles.quickLinkText, { color: colors.text }]}>{link.label}</Text>
                            <AppIcon name="chevron-forward" size={16} color={colors.textMuted} />
                        </AnimatedTouchable>
                    ))}
                </View>

                {/* ── Account ── */}
                <View style={styles.sectionWrapper}>
                    <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <View style={styles.sectionHeaderRow}>
                            <AppIcon name="person-outline" size={20} color={colors.tint} />
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Account</Text>
                        </View>
                        <Button
                            title={t('logout')}
                            onPress={handleLogOut}
                            variant="outline"
                            style={{ borderColor: colors.danger, backgroundColor: colors.dangerSoft, height: 50, borderRadius: Radius.md }}
                            textStyle={{ color: colors.danger }}
                            icon={<AppIcon name="log-out-outline" size={20} color={colors.danger} />}
                        />
                        <AnimatedTouchable onPress={handleDeleteAccount} style={styles.deleteRow}>
                            <AppIcon name="trash-outline" size={16} color={colors.textMuted} />
                            <Text style={[styles.deleteText, { color: colors.textMuted }]}>{deleting ? 'Deleting...' : 'Delete Account'}</Text>
                        </AnimatedTouchable>
                    </View>
                </View>

                {/* ── Footer ── */}
                <View style={styles.footerWrapper}>
                    <Text style={[styles.versionText, { color: colors.textMuted }]}>LocalPill v{appVersion}</Text>
                    <Text style={[styles.footerCopyright, { color: colors.textMuted }]}>Made with ❤️ in India</Text>
                </View>

            </Animated.ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flexGrow: 1, paddingBottom: 120 },

    // Cover
    coverBanner: { paddingBottom: 30, paddingHorizontal: 24, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, overflow: 'hidden', ...Shadows.md, marginBottom: 8 },
    coverGradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    coverCircle1: { position: 'absolute', top: -30, right: -20, width: 140, height: 140, borderRadius: 70 },
    coverCircle2: { position: 'absolute', bottom: -40, left: -20, width: 180, height: 180, borderRadius: 90 },

    avatarNameRow: { flexDirection: 'row', gap: 16, alignItems: 'center' },
    avatarWrapper: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
    avatarImage: { width: '100%', height: '100%', borderRadius: 42 },
    cameraOverlay: { position: 'absolute', bottom: -2, right: -2, width: 30, height: 30, borderRadius: 15, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
    avatarNameInfo: { flex: 1, paddingTop: 6 },
    displayName: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginBottom: 4 },
    phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    phoneDisplay: { fontSize: 13, fontWeight: '600' },

    completionContainer: { marginTop: 28, padding: 16, borderRadius: Radius.lg, borderWidth: 1 },
    completionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    completionLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
    completionPct: { fontSize: 14, fontWeight: '800' },
    progressBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 3 },
    missingHint: { fontSize: 11, marginTop: 8 },

    // Section system
    sectionWrapper: { paddingHorizontal: 20, marginTop: 16 },
    sectionCard: { borderRadius: Radius.lg, borderWidth: 1, padding: 20, ...Shadows.sm },
    sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
    sectionTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },

    // Form fields
    fieldSpacing: { marginBottom: 16 },
    fieldGroup: { marginTop: 4 },
    label: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    chip: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: Radius.md, borderWidth: 1.5 },
    chipText: { fontSize: 14, fontWeight: '600' },

    // Divider
    divider: { height: 1, marginVertical: 18 },

    // Toggle
    toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    toggleInfo: { flex: 1, marginRight: 16 },
    toggleLabel: { fontSize: 14, fontWeight: '600', marginBottom: 3 },
    toggleSub: { fontSize: 12 },
    toggleTrack: { width: 52, height: 30, borderRadius: 15, padding: 2, justifyContent: 'center' },
    toggleThumb: { width: 26, height: 26, borderRadius: 13, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
    toggleThumbActive: { alignSelf: 'flex-end' },

    // Quick links inside cards
    quickLinkInCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: Radius.md, borderWidth: 1, gap: 12 },
    quickLinkIcon: { width: 36, height: 36, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
    quickLinkText: { flex: 1, fontSize: 14, fontWeight: '600' },

    // Delete
    deleteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, marginTop: 4 },
    deleteText: { fontSize: 13, fontWeight: '500' },

    // Footer
    footerWrapper: { alignItems: 'center', paddingVertical: 24, paddingBottom: 40 },
    versionText: { fontSize: 12, fontWeight: '500', textAlign: 'center' },
    footerCopyright: { fontSize: 12, fontWeight: '500', textAlign: 'center', marginTop: 4 },
});
