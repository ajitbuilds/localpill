import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Alert,
    TouchableOpacity,
    Platform,
    KeyboardAvoidingView,
    Animated,
    Dimensions,
    Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { AnimatedTouchable } from '@/components/ui/AnimatedTouchable';
import { useRouter } from 'expo-router';
import { Pill, ChevronDown, ArrowRight } from 'lucide-react-native';
import { Colors, DesignTokens } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { TextInput } from '@/components/ui/TextInput';

const { width } = Dimensions.get('window');

export default function Login() {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
    const colors = Colors[colorScheme];

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const handleSendOTP = async () => {
        const numericPhone = phoneNumber.replace(/\D/g, '');
        if (numericPhone.length !== 10) {
            Alert.alert('Invalid Number', 'Please enter a valid 10-digit mobile number.');
            return;
        }

        setLoading(true);
        try {
            const confirmation = await auth().signInWithPhoneNumber(`+91${phoneNumber}`);
            router.push({
                pathname: '/otp',
                params: { verificationId: confirmation.verificationId, phone: `+91 ${phoneNumber}` }
            });
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to send OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.inner}
            >
                {/* Hero Section with Gradient */}
                <View style={styles.heroSection}>
                    <LinearGradient
                        colors={colors.heroGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.heroGradient}
                    >
                        {/* Decorative elements */}
                        <View style={styles.decorCircle1} />
                        <View style={styles.decorCircle2} />

                        <View style={styles.heroContent}>
                            <View style={styles.iconBadge}>
                                <Pill size={32} color="#FFFFFF" strokeWidth={2.5} />
                            </View>
                            <Text style={styles.heroTitle}>LocalPill</Text>
                            <Text style={styles.heroSubtitle}>Pharmacy Partner</Text>
                        </View>
                    </LinearGradient>

                    {/* Curved bottom */}
                    <View style={[styles.curvedBottom, { backgroundColor: colors.background }]} />
                </View>

                {/* Form Section */}
                <Animated.View
                    style={[
                        styles.formContainer,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }],
                        },
                    ]}
                >
                    <Text style={[styles.welcomeTitle, { color: colors.text }]}>
                        Welcome Back 👋
                    </Text>
                    <Text style={[styles.welcomeSubtitle, { color: colors.textSecondary }]}>
                        Enter your mobile number to get started{'\n'}with managing your pharmacy requests.
                    </Text>

                    {/* Phone Input */}
                    <View style={[styles.phoneCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <View style={[styles.countryCode, { borderRightColor: colors.borderLight }]}>
                            <Text style={styles.flag}>🇮🇳</Text>
                            <Text style={[styles.countryText, { color: colors.text }]}>+91</Text>
                        </View>
                        <TextInput
                            placeholder="Enter mobile number"
                            keyboardType="phone-pad"
                            value={phoneNumber}
                            onChangeText={(text) => setPhoneNumber(text.replace(/[^0-9]/g, ''))}
                            maxLength={10}
                            style={styles.phoneInput}
                            containerStyle={styles.phoneInputContainer}
                        />
                    </View>

                    {/* CTA Button */}
                    <AnimatedTouchable
                        style={[styles.ctaButton, loading && styles.ctaButtonDisabled]}
                        onPress={handleSendOTP}
                        disabled={loading}
                        activeOpacity={0.85}
                    >
                        <LinearGradient
                            colors={loading ? ['#9CA3AF', '#9CA3AF'] : colors.buttonGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.ctaGradient}
                        >
                            <Text style={styles.ctaText}>
                                {loading ? 'Sending OTP...' : 'Get OTP'}
                            </Text>
                            {!loading && (
                                <ArrowRight size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
                            )}
                        </LinearGradient>
                    </AnimatedTouchable>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={[styles.footerText, { color: colors.textMuted }]}>
                            By continuing, you agree to our{' '}
                        </Text>
                        <AnimatedTouchable hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} onPress={() => Linking.openURL('https://localpill.com/terms')}>
                            <Text style={[styles.footerLink, { color: colors.primary }]}>Terms & Privacy</Text>
                        </AnimatedTouchable>
                    </View>
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
    },
    // Hero
    heroSection: {
        position: 'relative',
    },
    heroGradient: {
        paddingTop: 50,
        paddingBottom: 60,
        alignItems: 'center',
        overflow: 'hidden',
    },
    decorCircle1: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        top: -40,
        right: -40,
    },
    decorCircle2: {
        position: 'absolute',
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        bottom: -20,
        left: -30,
    },
    heroContent: {
        alignItems: 'center',
    },
    iconBadge: {
        width: 72,
        height: 72,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        marginBottom: 16,
    },
    heroTitle: {
        fontFamily: DesignTokens.font.extrabold,
        fontSize: 30,
        color: '#FFFFFF',
        letterSpacing: -0.5,
    },
    heroSubtitle: {
        fontFamily: DesignTokens.font.medium,
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.6)',
        marginTop: 4,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    curvedBottom: {
        position: 'absolute',
        bottom: -1,
        left: 0,
        right: 0,
        height: 30,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
    },
    // Form
    formContainer: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 8,
    },
    welcomeTitle: {
        fontFamily: DesignTokens.font.bold,
        fontSize: DesignTokens.fontSize.heading,
        marginBottom: 8,
    },
    welcomeSubtitle: {
        fontFamily: DesignTokens.font.regular,
        fontSize: DesignTokens.fontSize.body,
        lineHeight: 22,
        marginBottom: 32,
    },
    phoneCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: DesignTokens.radius.lg,
        borderWidth: 1.5,
        overflow: 'hidden',
        marginBottom: 20,
        ...DesignTokens.shadow.card,
    },
    countryCode: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderRightWidth: 1,
        gap: 6,
    },
    flag: {
        fontSize: 20,
    },
    countryText: {
        fontFamily: DesignTokens.font.semibold,
        fontSize: 16,
    },
    phoneInput: {
        flex: 1,
        fontSize: 17,
        fontFamily: DesignTokens.font.medium,
        paddingVertical: 0,
        borderWidth: 0,
    },
    phoneInputContainer: {
        flex: 1,
        borderWidth: 0,
        backgroundColor: 'transparent',
        marginBottom: 0,
        paddingHorizontal: 12,
    },
    // CTA
    ctaButton: {
        borderRadius: DesignTokens.radius.md,
        overflow: 'hidden',
        ...DesignTokens.shadow.elevated,
    },
    ctaButtonDisabled: {
        opacity: 0.7,
    },
    ctaGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 17,
        borderRadius: DesignTokens.radius.md,
    },
    ctaText: {
        fontFamily: DesignTokens.font.bold,
        fontSize: 16,
        color: '#FFFFFF',
        letterSpacing: 0.3,
    },
    // Footer
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 24,
        flexWrap: 'wrap',
    },
    footerText: {
        fontFamily: DesignTokens.font.regular,
        fontSize: 12,
    },
    footerLink: {
        fontFamily: DesignTokens.font.semibold,
        fontSize: 12,
    },
});
