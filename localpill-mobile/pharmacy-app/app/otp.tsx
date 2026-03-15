import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Alert,
    TouchableOpacity,
    Platform,
    KeyboardAvoidingView,
    TextInput as RNTextInput,
    Pressable,
    Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AnimatedTouchable } from '@/components/ui/AnimatedTouchable';
import { LinearGradient } from 'expo-linear-gradient';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, ShieldCheck, CheckCircle2 } from 'lucide-react-native';
import { Colors, DesignTokens } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function OTPScreen() {
    const { verificationId: initialVerificationId, phone } = useLocalSearchParams<{ verificationId: string; phone: string }>();
    const [verificationId, setVerificationId] = useState(initialVerificationId);
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [timer, setTimer] = useState(30);
    const inputRef = useRef<RNTextInput>(null);
    const isVerifying = useRef(false);
    const router = useRouter();
    const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
    const colors = Colors[colorScheme];

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]).start();

        // Auto-focus
        setTimeout(() => inputRef.current?.focus(), 300);
    }, []);

    useEffect(() => {
        if (timer <= 0) return;
        const interval = setInterval(() => setTimer((t) => t - 1), 1000);
        return () => clearInterval(interval);
    }, [timer]);

    const handleVerify = async () => {
        if (code.length < 6 || isVerifying.current) return;
        isVerifying.current = true;
        setLoading(true);
        try {
            const credential = auth.PhoneAuthProvider.credential(verificationId!, code);
            const userCredential = await auth().signInWithCredential(credential);
            const uid = userCredential.user.uid;

            // Check if pharmacy doc exists
            const pharmacyDoc = await firestore().collection('pharmacies').doc(uid).get();

            // Ensure users/{uid} doc exists for web app compatibility
            const usersDoc = await firestore().collection('users').doc(uid).get();
            if (!usersDoc.exists()) {
                await firestore().collection('users').doc(uid).set({
                    name: '',
                    phone: userCredential.user.phoneNumber,
                    role: pharmacyDoc.exists() ? 'pharmacy' : '',
                    createdAt: firestore.FieldValue.serverTimestamp(),
                });
            }

            if (!pharmacyDoc.exists) {
                await firestore().collection('pharmacies').doc(uid).set({
                    phone: userCredential.user.phoneNumber,
                    createdAt: firestore.FieldValue.serverTimestamp(),
                    status: 'pending',
                    isOnline: false,
                });
                router.replace('/setup');
            } else {
                router.replace('/(tabs)');
            }
        } catch (error: any) {
            Alert.alert('Verification Failed', 'The code you entered is incorrect. Please try again.');
            isVerifying.current = false;
        } finally {
            setLoading(false);
        }
    };

    // Auto-verify on 6 digits
    useEffect(() => {
        if (code.length === 6 && !isVerifying.current) {
            handleVerify();
        }
    }, [code]);

    const handleResend = async () => {
        setTimer(30);
        try {
            const confirmation = await auth().signInWithPhoneNumber(phone!);
            if (confirmation.verificationId) {
                setVerificationId(confirmation.verificationId);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to resend code.');
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.inner}
            >
                {/* Back Button */}
                <AnimatedTouchable
                    style={[styles.backButton, { backgroundColor: colors.surface }]}
                    onPress={() => router.back()}
                    activeOpacity={0.7}
                >
                    <ArrowLeft size={22} color={colors.text} />
                </AnimatedTouchable>

                <Animated.View
                    style={[
                        styles.content,
                        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
                    ]}
                >
                    {/* Shield Icon */}
                    <View style={[styles.shieldBadge, { backgroundColor: colors.primaryGlow }]}>
                        <ShieldCheck size={28} color={colors.primary} />
                    </View>

                    {/* Header */}
                    <Text style={[styles.title, { color: colors.text }]}>Verification Code</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        Enter the 6-digit code sent to{'\n'}
                        <Text style={[styles.phoneHighlight, { color: colors.text }]}>{phone}</Text>
                    </Text>

                    {/* OTP Input Area */}
                    <Pressable
                        style={styles.otpRow}
                        onPress={() => inputRef.current?.focus()}
                    >
                        {[0, 1, 2, 3, 4, 5].map((index) => {
                            const digit = code[index] || '';
                            const isActive = code.length === index;
                            const isFilled = digit !== '';

                            return (
                                <View
                                    key={index}
                                    style={[
                                        styles.otpBox,
                                        {
                                            backgroundColor: isFilled ? colors.primaryGlow : colors.surface,
                                            borderColor: isActive ? colors.primary : isFilled ? colors.primary : colors.border,
                                            borderWidth: isActive ? 2 : 1.5,
                                        },
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.otpDigit,
                                            { color: isFilled ? colors.primary : colors.textMuted },
                                        ]}
                                    >
                                        {digit || (isActive ? '|' : '')}
                                    </Text>
                                </View>
                            );
                        })}

                        <RNTextInput
                            ref={inputRef}
                            value={code}
                            onChangeText={(text) => setCode(text.replace(/[^0-9]/g, ''))}
                            maxLength={6}
                            keyboardType="number-pad"
                            textContentType="oneTimeCode"
                            contextMenuHidden
                            autoFocus
                            style={styles.hiddenInput}
                        />
                    </Pressable>

                    {/* Timer & Resend */}
                    <View style={styles.timerContainer}>
                        {timer > 0 ? (
                            <Text style={[styles.timerText, { color: colors.textSecondary }]}>
                                Resend code in{' '}
                                <Text style={[styles.timerNumber, { color: colors.primary }]}>
                                    0:{timer < 10 ? `0${timer}` : timer}
                                </Text>
                            </Text>
                        ) : (
                            <AnimatedTouchable onPress={handleResend}>
                                <Text style={[styles.resendButton, { color: colors.primary }]}>
                                    Resend Code
                                </Text>
                            </AnimatedTouchable>
                        )}
                    </View>

                    {/* Verify Button */}
                    <AnimatedTouchable
                        style={[styles.verifyButton, (code.length < 6 || loading) && styles.verifyDisabled]}
                        onPress={handleVerify}
                        disabled={code.length < 6 || loading}
                        activeOpacity={0.85}
                    >
                        <LinearGradient
                            colors={code.length < 6 ? ['#D1D5DB', '#D1D5DB'] : colors.buttonGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.verifyGradient}
                        >
                            <Text style={styles.verifyText}>
                                {loading ? 'Verifying...' : 'Verify & Proceed'}
                            </Text>
                            {!loading && code.length === 6 && (
                                <CheckCircle2 size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
                            )}
                        </LinearGradient>
                    </AnimatedTouchable>
                </Animated.View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    inner: {
        flex: 1,
        paddingHorizontal: 24,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
        ...DesignTokens.shadow.subtle,
    },
    content: {
        flex: 1,
        paddingTop: 32,
    },
    shieldBadge: {
        width: 56,
        height: 56,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontFamily: DesignTokens.font.bold,
        fontSize: DesignTokens.fontSize.heading,
        marginBottom: 8,
    },
    subtitle: {
        fontFamily: DesignTokens.font.regular,
        fontSize: DesignTokens.fontSize.body,
        lineHeight: 22,
        marginBottom: 36,
    },
    phoneHighlight: {
        fontFamily: DesignTokens.font.semibold,
    },
    // OTP
    otpRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
        marginBottom: 28,
    },
    otpBox: {
        flex: 1,
        aspectRatio: 0.85,
        maxWidth: 52,
        borderRadius: DesignTokens.radius.md,
        justifyContent: 'center',
        alignItems: 'center',
        ...DesignTokens.shadow.subtle,
    },
    otpDigit: {
        fontFamily: DesignTokens.font.bold,
        fontSize: 24,
    },
    hiddenInput: {
        position: 'absolute',
        opacity: 0,
        width: '100%',
        height: '100%',
    },
    // Timer
    timerContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    timerText: {
        fontFamily: DesignTokens.font.regular,
        fontSize: 14,
    },
    timerNumber: {
        fontFamily: DesignTokens.font.bold,
    },
    resendButton: {
        fontFamily: DesignTokens.font.semibold,
        fontSize: 15,
    },
    // Verify
    verifyButton: {
        borderRadius: DesignTokens.radius.md,
        overflow: 'hidden',
        ...DesignTokens.shadow.elevated,
    },
    verifyDisabled: {
        opacity: 0.6,
    },
    verifyGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 17,
        borderRadius: DesignTokens.radius.md,
    },
    verifyText: {
        fontFamily: DesignTokens.font.bold,
        fontSize: 16,
        color: '#FFFFFF',
        letterSpacing: 0.3,
    },
});
