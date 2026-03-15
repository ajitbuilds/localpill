import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Animated, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppIcon } from '../components/icons/AppIcon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import database from '@react-native-firebase/database';
import { showToast } from '../components/Toast';

import { Colors, Shadows, Radius, Gradients } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Button } from '@/components/ui/Button';
import { AnimatedTouchable } from '@/components/ui/AnimatedTouchable';
import { reportError } from '@/utils/crashReporter';
import { logLoginCompleted, logAccountDeleted } from '@/utils/analyticsEvents';
import { useScreenTracking } from '@/hooks/useScreenTracking';

const OTP_LENGTH = 6;

export default function OtpScreen() {
    const { phoneNumber, verificationId: initialVerificationId, pendingGoogleIdToken } = useLocalSearchParams<{ phoneNumber: string, verificationId: string, pendingGoogleIdToken?: string }>();
    const [verificationId, setVerificationId] = useState(initialVerificationId);
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
    const colors = Colors[colorScheme];
    useScreenTracking('OTPScreen');

    const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
    const [loading, setLoading] = useState(false);
    const isVerifying = useRef(false);
    const [error, setError] = useState('');
    const [resendTimer, setResendTimer] = useState(30);
    const [canResend, setCanResend] = useState(false);

    const inputRefs = useRef<(TextInput | null)[]>([]);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(25)).current;
    const shakeAnim = useRef(new Animated.Value(0)).current;
    const boxAnims = useRef(Array(OTP_LENGTH).fill(null).map(() => new Animated.Value(0))).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }),
        ]).start();

        // Stagger box animations
        boxAnims.forEach((anim, i) => {
            Animated.spring(anim, { toValue: 1, tension: 80, friction: 8, delay: i * 60, useNativeDriver: true }).start();
        });

        inputRefs.current[0]?.focus();
    }, [boxAnims, fadeAnim, slideAnim]);

    // Resend timer countdown 
    useEffect(() => {
        if (resendTimer <= 0) { setCanResend(true); return; }
        const tm = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
        return () => clearTimeout(tm);
    }, [resendTimer]);

    const triggerShake = () => {
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
        ]).start();
    };

    const handleOtpChange = (text: string, index: number) => {
        if (text.length > 1) text = text.slice(-1);
        const newOtp = [...otp];
        newOtp[index] = text;
        setOtp(newOtp);
        setError('');

        if (text && index < OTP_LENGTH - 1) {
            inputRefs.current[index + 1]?.focus();
        }

        // Auto-verify when all digits filled
        if (newOtp.every(d => d !== '') && newOtp.join('').length === OTP_LENGTH) {
            handleVerify(newOtp.join(''));
        }
    };

    const handleKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
            const newOtp = [...otp];
            newOtp[index - 1] = '';
            setOtp(newOtp);
        }
    };

    const handleResend = async () => {
        if (!canResend) return;
        setResendTimer(30);
        setCanResend(false);
        setOtp(Array(OTP_LENGTH).fill(''));
        inputRefs.current[0]?.focus();
        try {
            const phone = typeof phoneNumber === 'string' ? phoneNumber.replace(/\s/g, '') : '';
            // Use Native Firebase Auth
            const confirmation = await auth().signInWithPhoneNumber(phone);
            if (confirmation.verificationId) {
                setVerificationId(confirmation.verificationId);
            }
        } catch (e) {
            reportError(e, 'OTPScreen.handleResend');
            setError('Could not resend OTP. Try again.');
        }
    };

    const handleVerify = async (code: string) => {
        if (isVerifying.current) return;
        isVerifying.current = true;
        setLoading(true);
        try {
            if (!verificationId) throw new Error('Session expired. Please try logging in again.');

            // Native Firebase OTP verify
            const credential = auth.PhoneAuthProvider.credential(verificationId, code);
            const userCredential = await auth().signInWithCredential(credential);

            if (pendingGoogleIdToken) {
                try {
                    const googleCredential = auth.GoogleAuthProvider.credential(pendingGoogleIdToken);
                    await userCredential.user.linkWithCredential(googleCredential);
                } catch (linkError: any) {
                    if (__DEV__) console.warn('Failed to link google credential:', linkError);
                    // It shouldn't block login if linking fails, but it's good to log.
                }
            }

            const phone = typeof phoneNumber === 'string' ? phoneNumber : '';
            const user = userCredential?.user || userCredential;

            if (!user?.uid) throw new Error("No UID returned");
            const uid = user.uid;

            // Check if user doc exists → existing user or new user
            let isNewUser = false;
            try {
                const userDoc = await firestore().collection('users').doc(uid).get();
                if (!userDoc.exists()) {
                    isNewUser = true;
                } else {
                    // Existing user — save to AsyncStorage
                    const data = userDoc.data();
                    await AsyncStorage.setItem('user_phone', phone);
                    await AsyncStorage.setItem('user_name', data?.name || 'User');
                    await AsyncStorage.setItem('user_uid', uid);
                }
            } catch (e) {
                if (__DEV__) console.log('User doc check skipped:', e);
            }

            logLoginCompleted({ isNewUser });

            setLoading(false);

            // Check if this verification is for account deletion re-auth
            const pendingDelete = await AsyncStorage.getItem('pending_account_delete');
            if (pendingDelete === 'true') {
                await AsyncStorage.removeItem('pending_account_delete');
                setLoading(true);
                try {
                    // Clean up user data
                    try {
                        const notifsSnap = await firestore().collection('notifications').doc(uid).collection('userNotifications').get();
                        const batch1 = firestore().batch();
                        notifsSnap.docs.forEach(d => batch1.delete(d.ref));
                        await batch1.commit();
                    } catch (_e) { /* skip */ }

                    try {
                        const requestsSnap = await firestore().collection('requests').where('userId', '==', uid).get();
                        const rdocs = requestsSnap.docs;
                        for (let j = 0; j < rdocs.length; j += 450) {
                            const chunk = rdocs.slice(j, j + 450);
                            const batch = firestore().batch();
                            chunk.forEach(d => batch.delete(d.ref));
                            await batch.commit();
                        }
                    } catch (_e) { /* skip */ }

                    try { await firestore().collection('users').doc(uid).delete(); } catch (_e) { /* skip */ }
                    try { await database().ref(`/status/${uid}`).remove(); } catch (_e) { /* skip */ }

                    await AsyncStorage.multiRemove(['user_auth', 'user_uid', 'user_name', 'user_phone', 'biometric_enabled', 'onboarding_done']);

                    const freshUser = auth().currentUser;
                    if (freshUser) await freshUser.delete();

                    showToast('Account deleted successfully', 'success');
                    logAccountDeleted();
                    router.replace('/login');
                } catch (delErr) {
                    if (__DEV__) console.error('Post-reauth delete error:', delErr);
                    reportError(delErr, 'OTPScreen.accountDeletion');
                    showToast('Failed to delete account. Please try again.', 'error');
                    router.replace('/(tabs)');
                } finally {
                    setLoading(false);
                }
                return;
            }

            if (isNewUser) {
                // New user → go to setup screen to collect name + age
                router.replace({ pathname: '/setup', params: { phoneNumber: phone } });
            } else {
                // Existing user → go directly to home
                router.replace('/(tabs)');
            }
        } catch {
            setError('Invalid OTP. Please try again.');
            triggerShake();
            setLoading(false);
        } finally {
            isVerifying.current = false;
        }
    };

    const otpCode = otp.join('');

    return (
        <View style={[styles.container, { backgroundColor: colors.tint }]}>
            <StatusBar barStyle="light-content" />
            <View style={styles.bgGradient}>
                <View style={[styles.bgCircle1, { backgroundColor: colors.white + '1F' }]} />
                <View style={[styles.bgCircle2, { backgroundColor: colors.white + '14' }]} />
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView contentContainerStyle={[styles.scrollContainer, { paddingTop: Math.max(insets.top + 20, 56) }]} keyboardShouldPersistTaps="handled">

                    {/* Header */}
                    <Animated.View style={[styles.headerSection, { opacity: fadeAnim }]}>
                        <AnimatedTouchable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.white + '1A' }]}>
                            <AppIcon name="arrow-back" size={16} color={colors.white + 'CC'} />
                            <Text style={[styles.backText, { color: colors.white + 'E6' }]}>Back</Text>
                        </AnimatedTouchable>
                        <View style={[styles.iconCircle, { backgroundColor: colors.white + '33', borderColor: colors.white + '4D' }]}>
                            <AppIcon name="lock-closed" size={26} color={colors.white} />
                        </View>
                        <Text style={[styles.title, { color: colors.white }]}>Verify your number</Text>
                        <Text style={[styles.subtitle, { color: colors.white + 'B3' }]}>
                            Enter the 6-digit code sent to{'\n'}
                            <Text style={[styles.phoneHighlight, { color: colors.white }]}>{phoneNumber || ''}</Text>
                        </Text>
                    </Animated.View>

                    {/* OTP Card */}
                    <Animated.View style={[styles.card, { backgroundColor: colors.background, opacity: fadeAnim, transform: [{ translateY: slideAnim }, { translateX: shakeAnim }], shadowColor: colors.shadow }]}>
                        {/* Top accent line */}
                        <LinearGradient
                            colors={Gradients.primary}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.cardAccentLine}
                        />

                        {error ? (
                            <View style={[styles.errorContainer, { backgroundColor: colors.dangerSoft, borderColor: colors.danger }]}>
                                <AppIcon name="alert-circle" size={16} color={colors.danger} />
                                <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
                            </View>
                        ) : null}

                        {/* OTP Boxes */}
                        <View style={styles.otpRow}>
                            {otp.map((digit, i) => (
                                <Animated.View
                                    key={i}
                                    style={[
                                        styles.otpBoxWrapper,
                                        { opacity: boxAnims[i], transform: [{ scale: boxAnims[i] }] }
                                    ]}
                                >
                                    <TextInput
                                        ref={(ref) => { inputRefs.current[i] = ref; }}
                                        style={[
                                            styles.otpBox,
                                            { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
                                            digit ? { borderColor: colors.tint, backgroundColor: colors.tintSurface } : {},
                                            inputRefs.current[i]?.isFocused?.() ? [styles.otpBoxFocused, { borderColor: colors.tint, shadowColor: colors.tint }] : {},
                                        ]}
                                        value={digit}
                                        onChangeText={(text) => handleOtpChange(text, i)}
                                        onKeyPress={(e) => handleKeyPress(e, i)}
                                        keyboardType="number-pad"
                                        maxLength={1}
                                        selectTextOnFocus
                                    />
                                </Animated.View>
                            ))}
                        </View>

                        {/* Verify Button */}
                        <Button
                            title={loading ? 'Verifying...' : 'Verify & Continue'}
                            onPress={() => handleVerify(otpCode)}
                            disabled={otpCode.length < OTP_LENGTH || loading}
                            loading={loading}
                            icon={!loading ? <AppIcon name="checkmark-circle" size={18} color={colors.white} style={{ marginLeft: 6 }} /> : undefined}
                            style={{ marginBottom: 20, height: 56, borderRadius: 16 }}
                            textStyle={{ fontSize: 16, fontFamily: 'Inter_700Bold' }}
                        />

                        {/* Resend */}
                        <View style={styles.resendRow}>
                            <Text style={[styles.resendLabel, { color: colors.textMuted }]}>Didn&apos;t receive code?</Text>
                            {canResend ? (
                                <AnimatedTouchable onPress={handleResend}>
                                    <Text style={[styles.resendBtnActive, { color: colors.tint }]}>Resend OTP</Text>
                                </AnimatedTouchable>
                            ) : (
                                <Text style={[styles.resendTimer, { color: colors.textMuted }]}>Resend in {resendTimer}s</Text>
                            )}
                        </View>
                    </Animated.View>

                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    bgGradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    bgCircle1: { position: 'absolute', top: -60, right: -40, width: 200, height: 200, borderRadius: 100 },
    bgCircle2: { position: 'absolute', bottom: 60, left: -50, width: 180, height: 180, borderRadius: 90 },
    scrollContainer: { flexGrow: 1, justifyContent: 'center', padding: 24 },

    // Header
    headerSection: { alignItems: 'center', marginBottom: 28 },
    backButton: { alignSelf: 'flex-start', marginBottom: 24, paddingVertical: 8, paddingHorizontal: 14, borderRadius: Radius.sm, flexDirection: 'row', alignItems: 'center', gap: 6 },
    backText: { fontWeight: '700', fontSize: 14 },
    iconCircle: { width: 64, height: 64, borderRadius: Radius.lg, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginBottom: 8 },
    subtitle: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
    phoneHighlight: { fontWeight: '800' },

    card: { borderRadius: Radius.lg, padding: 28, ...Shadows.md, borderWidth: 1, overflow: 'hidden' },
    cardAccentLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg },

    // Error
    errorContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: Radius.md, padding: 12, marginBottom: 20 },
    errorText: { fontSize: 13, fontWeight: '600', flex: 1 },

    // OTP
    otpRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 28 },
    otpBoxWrapper: {},
    otpBox: { width: 48, height: 58, borderRadius: Radius.md, borderWidth: 2, textAlign: 'center', fontSize: 22, fontFamily: 'Inter_800ExtraBold' },
    otpBoxFocused: { ...Shadows.sm },

    // Resend
    resendRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
    resendLabel: { fontSize: 13, fontFamily: 'Inter_500Medium' },
    resendTimer: { fontSize: 13, fontFamily: 'Inter_700Bold' },
    resendBtnActive: { fontSize: 13, fontFamily: 'Inter_800ExtraBold' },
});
