import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Animated, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppIcon } from '../components/icons/AppIcon';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Shadows, Radius, Gradients } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { TextInput } from '@/components/ui/TextInput';
import { Button } from '@/components/ui/Button';

export default function SetupScreen() {
    const { phoneNumber } = useLocalSearchParams<{ phoneNumber: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
    const colors = Colors[colorScheme];

    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }),
        ]).start();

        const user = auth().currentUser;
        if (user?.displayName && !name) {
            setName(user.displayName);
        }
    }, [fadeAnim, slideAnim]);

    const handleSubmit = async () => {
        const trimmedName = name.trim();
        if (!trimmedName) {
            setError('Please enter your name');
            return;
        }
        if (trimmedName.length < 2) {
            setError('Name must be at least 2 characters');
            return;
        }

        const ageNum = parseInt(age, 10);
        if (!age || isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
            setError('Please enter a valid age (1–120)');
            return;
        }

        setError('');
        setLoading(true);

        try {
            const user = auth().currentUser;
            if (!user) throw new Error('Not authenticated');

            const phone = typeof phoneNumber === 'string' ? phoneNumber : (user.phoneNumber || '');

            // Create or update user doc in Firestore
            const userDocRef = firestore().collection('users').doc(user.uid);
            const existingDoc = await userDocRef.get();

            if (existingDoc.exists()) {
                // Doc exists (e.g. stale from previous account) — update only safe fields
                // Avoids triggering security rule restrictions on 'isSuspended' and 'role'
                await userDocRef.update({
                    name: trimmedName,
                    age: ageNum,
                    phone: phone,
                    ...(user.email ? { email: user.email } : {}),
                    updatedAt: firestore.FieldValue.serverTimestamp(),
                });
            } else {
                // Fresh new user — create with all fields
                await userDocRef.set({
                    name: trimmedName,
                    age: ageNum,
                    phone: phone,
                    ...(user.email ? { email: user.email } : {}),
                    createdAt: firestore.FieldValue.serverTimestamp(),
                    source: 'mobile',
                    isSuspended: false,
                    role: 'user',
                });
            }

            // Save to AsyncStorage for quick access
            await AsyncStorage.setItem('user_name', trimmedName);
            await AsyncStorage.setItem('user_phone', phone);
            await AsyncStorage.setItem('user_uid', user.uid);

            setLoading(false);
            router.replace('/(tabs)');
        } catch (e: any) {
            if (__DEV__) console.error('Setup error:', e);
            setError('Something went wrong. Please try again.');
            setLoading(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.tint }]}>
            <StatusBar barStyle="light-content" />

            {/* Background decorations */}
            <View style={styles.bgGradient}>
                <View style={[styles.bgCircle1, { backgroundColor: colors.white + '1F' }]} />
                <View style={[styles.bgCircle2, { backgroundColor: colors.white + '14' }]} />
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView contentContainerStyle={[styles.scrollContainer, { paddingTop: Math.max(insets.top + 20, 56) }]} keyboardShouldPersistTaps="handled">

                    {/* Header */}
                    <Animated.View style={[styles.headerSection, { opacity: fadeAnim }]}>
                        <View style={[styles.iconCircle, { backgroundColor: colors.white + '33', borderColor: colors.white + '4D' }]}>
                            <AppIcon name="person-add" size={28} color={colors.white} />
                        </View>
                        <Text style={[styles.title, { color: colors.white }]}>Almost there!</Text>
                        <Text style={[styles.subtitle, { color: colors.white + 'B3' }]}>
                            Just a couple of details to get you started
                        </Text>
                    </Animated.View>

                    {/* Setup Card */}
                    <Animated.View style={[styles.card, { backgroundColor: colors.background, opacity: fadeAnim, transform: [{ translateY: slideAnim }], shadowColor: colors.shadow }]}>
                        {/* Top accent line */}
                        <LinearGradient
                            colors={Gradients.primary}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.cardAccentLine}
                        />

                        {/* One-time setup badge */}
                        <View style={[styles.badge, { backgroundColor: colors.tintSurface, borderColor: colors.tintLight }]}>
                            <View style={[styles.badgeDot, { backgroundColor: colors.tint }]} />
                            <Text style={[styles.badgeText, { color: colors.tint }]}>ONE-TIME SETUP</Text>
                        </View>

                        {error ? (
                            <View style={[styles.errorContainer, { backgroundColor: colors.dangerSoft, borderColor: colors.danger }]}>
                                <AppIcon name="alert-circle" size={16} color={colors.danger} />
                                <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
                            </View>
                        ) : null}

                        {/* Name Input */}
                        <View style={styles.fieldGroup}>
                            <Text style={[styles.label, { color: colors.text }]}>Full Name</Text>
                            <TextInput
                                value={name}
                                onChangeText={(text: string) => { setName(text); setError(''); }}
                                placeholder="e.g. Rahul Sharma"
                                autoCapitalize="words"
                                autoFocus
                                style={{ borderRadius: 14 }}
                            />
                        </View>

                        {/* Age Input */}
                        <View style={styles.fieldGroup}>
                            <Text style={[styles.label, { color: colors.text }]}>Age</Text>
                            <TextInput
                                value={age}
                                onChangeText={(text: string) => { setAge(text.replace(/[^0-9]/g, '')); setError(''); }}
                                placeholder="e.g. 28"
                                keyboardType="number-pad"
                                maxLength={3}
                                style={{ borderRadius: 14 }}
                            />
                        </View>

                        {/* Submit Button */}
                        <Button
                            title={loading ? 'Setting up...' : 'Continue to LocalPill'}
                            onPress={handleSubmit}
                            disabled={!name.trim() || !age || loading}
                            loading={loading}
                            icon={!loading ? <AppIcon name="arrow-forward-circle" size={18} color={colors.white} style={{ marginLeft: 6 }} /> : undefined}
                            style={{ marginTop: 8, height: 56, borderRadius: 16 }}
                            textStyle={{ fontSize: 16, fontFamily: 'Inter_700Bold' }}
                        />

                        {/* Privacy note */}
                        <View style={styles.privacyRow}>
                            <AppIcon name="shield-checkmark" size={14} color={colors.tint} />
                            <Text style={[styles.privacyText, { color: colors.textMuted }]}>
                                Your info is secure and only used to personalise your experience.
                            </Text>
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
    iconCircle: { width: 64, height: 64, borderRadius: Radius.lg, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginBottom: 8 },
    subtitle: { fontSize: 14, textAlign: 'center', lineHeight: 22 },

    // Card
    card: { borderRadius: Radius.lg, padding: 28, ...Shadows.md, borderWidth: 1, overflow: 'hidden' },
    cardAccentLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg },

    // Badge
    badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, marginBottom: 20 },
    badgeDot: { width: 6, height: 6, borderRadius: 3 },
    badgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },

    // Error
    errorContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: Radius.md, padding: 12, marginBottom: 16 },
    errorText: { fontSize: 13, fontWeight: '600', flex: 1 },

    // Fields
    fieldGroup: { marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '700', marginBottom: 8, paddingLeft: 4 },

    // Privacy
    privacyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 16, justifyContent: 'center' },
    privacyText: { fontSize: 12, lineHeight: 18, flex: 1, textAlign: 'center' },
});
