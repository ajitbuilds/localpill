import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Animated, StatusBar, Image, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { AppIcon } from '../components/icons/AppIcon';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
    webClientId: '481146336183-pvl2u6vbcvspsloqaogk08gc6gr5ed1h.apps.googleusercontent.com',
});

import { Colors, Shadows, Radius, Gradients } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { TextInput } from '@/components/ui/TextInput';
import { Button } from '@/components/ui/Button';
import { reportError } from '@/utils/crashReporter';
import { logLoginStarted } from '@/utils/analyticsEvents';
import { useScreenTracking } from '@/hooks/useScreenTracking';

const COUNTRY_CODE = '+91';
const COUNTRY_FLAG = '🇮🇳';

export default function LoginScreen() {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError] = useState('');
    const [pendingGoogleIdToken, setPendingGoogleIdToken] = useState<string | null>(null);
    const router = useRouter();

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const logoScale = useRef(new Animated.Value(0.8)).current;

    const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
    const colors = Colors[colorScheme];
    useScreenTracking('LoginScreen');

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }),
            Animated.spring(logoScale, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
        ]).start();
    }, [fadeAnim, logoScale, slideAnim]);

    const handleSendOTP = async () => {
        if (phoneNumber.length !== 10) {
            setError('Please enter a valid 10-digit number');
            return;
        }
        setError('');
        setLoading(true);

        try {
            const fullPhone = `${COUNTRY_CODE}${phoneNumber}`;
            logLoginStarted();
            // Native Firebase Auth Trigger
            const confirmation = await auth().signInWithPhoneNumber(fullPhone);
            setLoading(false);
            router.push({
                pathname: '/otp',
                params: {
                    phoneNumber: `${COUNTRY_CODE} ${phoneNumber}`,
                    verificationId: confirmation.verificationId,
                    ...(pendingGoogleIdToken ? { pendingGoogleIdToken } : {})
                }
            });
        } catch (e: any) {
            setLoading(false);
            reportError(e, 'LoginScreen.handleSendOTP');
            setError(e?.message?.includes('invalid-phone') ? 'Invalid phone number.' : 'Could not send OTP. Try again.');
        }
    };

    const handleGoogleSignIn = async () => {
        try {
            setError('');
            setGoogleLoading(true);
            await GoogleSignin.hasPlayServices();
            const userInfo = await GoogleSignin.signIn();
            const idToken = (userInfo as any).data?.idToken || (userInfo as any).idToken;
            
            if (!idToken) throw new Error('No ID token from Google');

            const googleCredential = auth.GoogleAuthProvider.credential(idToken);
            const userCredential = await auth().signInWithCredential(googleCredential);
            
            if (userCredential.user.phoneNumber) {
                // Successfully logged in via Google and phone exists!
                const doc = await firestore().collection('users').doc(userCredential.user.uid).get();
                if (doc.exists()) {
                    router.replace('/(tabs)');
                } else {
                    router.replace({ pathname: '/setup', params: { phoneNumber: userCredential.user.phoneNumber } });
                }
            } else {
                // No phone number linked yet → delete this temporary Firebase account
                // so the Google credential is free to be linked after phone verification.
                try {
                    await auth().currentUser?.delete();
                } catch (deleteErr: any) {
                    // If delete fails, sign out to clear the session anyway
                    if (__DEV__) console.warn('Could not delete temp Google account:', deleteErr);
                    await auth().signOut();
                }
                setPendingGoogleIdToken(idToken);
            }
        } catch (err: any) {
            // Don't show error if user just cancelled the Google sign-in popup
            const isCancelled = err?.code === 'SIGN_IN_CANCELLED' 
                || err?.code === '12501' 
                || err?.message?.includes('Sign in action cancelled');
            if (!isCancelled) {
                reportError(err, 'LoginScreen.handleGoogleSignIn');
                setError('Google Sign-In failed. Please try again.');
            }
        } finally {
            setGoogleLoading(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.tint }]}>
            <StatusBar barStyle="light-content" />

            {/* Background gradient simulation */}
            <View style={styles.bgGradient}>
                <View style={[styles.bgCircle1, { backgroundColor: colors.white + '1F' }]} />
                <View style={[styles.bgCircle2, { backgroundColor: colors.white + '14' }]} />
                <View style={[styles.bgCircle3, { backgroundColor: colors.white + '0F' }]} />
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">

                    {/* Logo + Brand */}
                    <Animated.View style={[styles.brandContainer, { opacity: fadeAnim, transform: [{ scale: logoScale }] }]}>
                        <Image
                            source={require('../assets/images/localpill_nobg.png')}
                            style={{ width: 160, height: 160, resizeMode: 'contain', marginBottom: -10 }}
                        />
                        <Text style={[styles.brandName, { color: colors.white }]}>LocalPill</Text>
                        <Text style={[styles.tagline, { color: colors.white + 'CC' }]}>Find medicines near you instantly</Text>
                        <Text style={[styles.valuePitch, { color: colors.white + '99' }]}>Search by name or upload prescription — we notify nearby pharmacies in seconds</Text>
                    </Animated.View>

                    {/* Card */}
                    <Animated.View style={[styles.card, { backgroundColor: colors.background, shadowColor: colors.shadow, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                        {/* Top accent line */}
                        <LinearGradient
                            colors={Gradients.primary}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.cardAccentLine}
                        />
                        <Text style={[styles.welcomeText, { color: colors.text }]}>Welcome back</Text>
                        <Text style={[styles.subText, { color: pendingGoogleIdToken ? colors.tint : colors.textMuted, fontWeight: pendingGoogleIdToken ? '600' : '400' }]}>
                            {pendingGoogleIdToken ? 'Please link your mobile number to complete Google sign-in' : 'Enter your mobile number to continue'}
                        </Text>

                        {error ? (
                            <View style={[styles.errorContainer, { backgroundColor: colors.danger + '10', borderColor: colors.danger + '50' }]}>
                                <AppIcon name="alert-circle" size={16} color={colors.danger} />
                                <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
                            </View>
                        ) : null}

                        <TextInput
                            label="MOBILE NUMBER"
                            placeholder="99999 99999"
                            keyboardType="phone-pad"
                            maxLength={10}
                            value={phoneNumber}
                            onChangeText={(text) => {
                                setPhoneNumber(text.replace(/[^0-9]/g, ''));
                                setError('');
                            }}
                            error={error ? ' ' : undefined}
                            leftIcon={
                                <View style={styles.prefixContainer}>
                                    <Text style={{ fontSize: 18 }}>{COUNTRY_FLAG}</Text>
                                    <Text style={[styles.prefixText, { color: colors.text }]}>{COUNTRY_CODE}</Text>
                                    <View style={[styles.prefixDivider, { backgroundColor: colors.border }]} />
                                </View>
                            }
                            rightIcon={
                                phoneNumber.length === 10 ? (
                                    <View style={[styles.checkMark, { backgroundColor: colors.success + '20' }]}>
                                        <AppIcon name="checkmark" size={16} color={colors.success} />
                                    </View>
                                ) : undefined
                            }
                            containerStyle={{ marginBottom: 24 }}
                        />

                        <Button
                            title={loading ? 'Sending OTP...' : 'Continue'}
                            onPress={handleSendOTP}
                            disabled={phoneNumber.length < 10 || loading || googleLoading}
                            loading={loading}
                            icon={!loading ? <AppIcon name="arrow-forward" size={18} color={colors.white} style={{ marginLeft: 6 }} /> : undefined}
                            style={{ marginBottom: 20, height: 56, borderRadius: 16 }}
                            textStyle={{ fontSize: 16, fontFamily: 'Inter_700Bold', letterSpacing: 0.3 }}
                        />

                        {!pendingGoogleIdToken && (
                            <>
                                <View style={styles.dividerRow}>
                                    <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                                    <Text style={[styles.dividerText, { color: colors.textMuted }]}>OR</Text>
                                    <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                                </View>

                                <Button
                                    title="Continue with Google"
                                    onPress={handleGoogleSignIn}
                                    disabled={loading || googleLoading}
                                    loading={googleLoading}
                                    icon={!googleLoading ? <AppIcon name="logo-google" size={20} color={colors.text} style={{ marginRight: 10 }} /> : undefined}
                                    style={[styles.googleBtn, { borderColor: colors.border, backgroundColor: 'transparent' }]}
                                    textStyle={{ fontSize: 16, fontFamily: 'Inter_600SemiBold', color: colors.text }}
                                />
                            </>
                        )}

                        <Text style={[styles.termsText, { color: colors.textMuted }]}>
                            By continuing, you agree to our{' '}
                            <Text style={[styles.linkText, { color: colors.tint }]} onPress={() => router.push('/terms')}>Terms of Service</Text>
                            {' & '}
                            <Text style={[styles.linkText, { color: colors.tint }]} onPress={() => router.push('/privacy-policy')}>Privacy Policy</Text>
                        </Text>
                    </Animated.View>

                    {/* Trust Badges */}
                    <Animated.View style={[styles.trustRow, { opacity: fadeAnim }]}>
                        <View style={styles.trustBadge}>
                            <View style={[styles.trustIconCircle, { backgroundColor: colors.white + '20' }]}>
                                <AppIcon name="lock-closed" size={20} color={colors.white + 'CC'} />
                            </View>
                            <Text style={[styles.trustText, { color: colors.white + 'CC' }]}>Secure</Text>
                        </View>
                        <View style={styles.trustBadge}>
                            <View style={[styles.trustIconCircle, { backgroundColor: colors.white + '20' }]}>
                                <AppIcon name="flash" size={20} color={colors.white + 'CC'} />
                            </View>
                            <Text style={[styles.trustText, { color: colors.white + 'CC' }]}>Instant</Text>
                        </View>
                        <View style={styles.trustBadge}>
                            <View style={[styles.trustIconCircle, { backgroundColor: colors.white + '20' }]}>
                                <AppIcon name="heart" size={20} color={colors.white + 'CC'} />
                            </View>
                            <Text style={[styles.trustText, { color: colors.white + 'CC' }]}>Free</Text>
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
    bgCircle1: { position: 'absolute', top: -80, right: -60, width: 250, height: 250, borderRadius: 125 },
    bgCircle2: { position: 'absolute', bottom: 100, left: -50, width: 200, height: 200, borderRadius: 100 },
    bgCircle3: { position: 'absolute', top: '40%', right: -30, width: 120, height: 120, borderRadius: 60 },
    scrollContainer: { flexGrow: 1, justifyContent: 'center', padding: 24 },

    // Brand
    brandContainer: { alignItems: 'center', marginBottom: 36 },
    brandName: { fontSize: 32, fontFamily: 'Inter_800ExtraBold', letterSpacing: -1 },
    tagline: { fontSize: 15, marginTop: 6, fontFamily: 'Inter_500Medium' },
    valuePitch: { fontSize: 12, marginTop: 8, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 18, paddingHorizontal: 20 },

    // Card
    card: { borderRadius: Radius.lg, padding: 28, ...Shadows.md, borderWidth: 1, overflow: 'hidden' },
    cardAccentLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg },
    welcomeText: { fontSize: 24, fontFamily: 'Inter_800ExtraBold', marginBottom: 4, letterSpacing: -0.5 },
    subText: { fontSize: 14, marginBottom: 20, lineHeight: 20, fontFamily: 'Inter_400Regular' },

    // Error
    errorContainer: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: Radius.md, marginBottom: 20, borderWidth: 1, gap: 8 },
    errorText: { fontSize: 13, fontWeight: '600', flex: 1 },

    // Input Prefix
    prefixContainer: { flexDirection: 'row', alignItems: 'center', paddingRight: 4, gap: 6 },
    prefixText: { fontSize: 16, fontFamily: 'Inter_700Bold' },
    prefixDivider: { width: 1, height: 24, marginLeft: 8 },
    checkMark: { width: 28, height: 28, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },

    // Terms
    termsText: { textAlign: 'center', fontSize: 12, lineHeight: 18, marginTop: 12 },
    linkText: { fontWeight: '600' },

    // Dividers
    dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    dividerLine: { flex: 1, height: 1 },
    dividerText: { marginHorizontal: 12, fontSize: 12, fontFamily: 'Inter_600SemiBold' },

    googleBtn: { marginBottom: 12, height: 56, borderRadius: 16, borderWidth: 1, backgroundColor: 'transparent' },

    // Trust
    trustRow: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginTop: 32 },
    trustBadge: { alignItems: 'center', gap: 6 },
    trustIconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    trustText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
});
