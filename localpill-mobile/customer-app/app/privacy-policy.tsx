import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { AppIcon } from '../components/icons/AppIcon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AnimatedTouchable } from '../components/ui/AnimatedTouchable';

export default function PrivacyPolicyScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
    const colors = Colors[colorScheme];

    const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
            {children}
        </View>
    );

    const Paragraph = ({ children }: { children: React.ReactNode }) => (
        <Text style={[styles.paragraph, { color: colors.textMuted }]}>{children}</Text>
    );

    const Bullet = ({ children }: { children: React.ReactNode }) => (
        <View style={styles.bulletRow}>
            <Text style={[styles.bulletDot, { color: colors.tint }]}>•</Text>
            <Text style={[styles.bulletText, { color: colors.textMuted }]}>{children}</Text>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: Math.max(insets.top + 12, 44), backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <AnimatedTouchable style={[styles.backBtn, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={() => router.back()}>
                    <AppIcon name="arrow-back" size={20} color={colors.text} />
                </AnimatedTouchable>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Privacy Policy</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 20, 32) }]} showsVerticalScrollIndicator={false}>
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={[styles.iconBadge, { backgroundColor: colors.accentSoft }]}>
                        <AppIcon name="shield-checkmark" size={24} color={colors.tint} />
                    </View>
                    <Text style={[styles.lastUpdated, { color: colors.textMuted }]}>Last updated: March 13, 2026</Text>

                    <Paragraph>
                        This Privacy Policy is published in accordance with the Information Technology Act, 2000 and the rules made thereunder. LocalPill is operated by UpcharMitra Healthtech Pvt. Ltd.
                    </Paragraph>

                    <Section title="1. Information We Collect">
                        <Text style={[styles.subTitle, { color: colors.text }]}>Personal Information:</Text>
                        <Bullet>Name and Age — collected during account setup for personalization.</Bullet>
                        <Bullet>Phone Number — used for OTP-based authentication.</Bullet>
                        <Bullet>Location Data — used to find nearby pharmacies. Accessed only with your permission.</Bullet>
                        <Text style={[styles.subTitle, { color: colors.text, marginTop: 12 }]}>Sensitive Personal Data:</Text>
                        <Bullet>Prescription Images — uploaded voluntarily when submitting medicine enquiries.</Bullet>
                        <Bullet>Health-related Data — medicine names and enquiry details shared for availability checks.</Bullet>
                    </Section>

                    <Section title="2. Purpose of Data Collection">
                        <Bullet>Account creation and OTP-based authentication.</Bullet>
                        <Bullet>Routing medicine enquiries to nearby pharmacies.</Bullet>
                        <Bullet>Displaying nearby pharmacies on a map with real-time availability.</Bullet>
                        <Bullet>Facilitating communication between patients and pharmacies.</Bullet>
                        <Bullet>Service improvement, analytics, and crash reporting.</Bullet>
                        <Bullet>Legal compliance under applicable Indian laws.</Bullet>
                    </Section>

                    <Section title="3. Data Storage & Security">
                        <Paragraph>
                            We implement Reasonable Security Practices and Procedures as required under the IT Act, 2000. Your data is stored using Google Firebase services with encrypted connections (HTTPS/TLS).
                        </Paragraph>
                    </Section>

                    <Section title="4. Third-Party Services">
                        <Bullet>Google Firebase — authentication, database, storage, analytics, crash reporting.</Bullet>
                        <Bullet>Google Maps — map display, geocoding, and directions.</Bullet>
                        <Bullet>Expo — application framework and OTA updates.</Bullet>
                    </Section>

                    <Section title="5. Data Sharing">
                        <Paragraph>
                            We do not sell, trade, or rent your personal data to third parties. Your prescription images and enquiry details are shared only with the pharmacies you choose to interact with.
                        </Paragraph>
                    </Section>

                    <Section title="6. Data Retention">
                        <Paragraph>
                            Your account data is retained as long as your account is active. You may request access, correction, or deletion of your personal data by contacting us.
                        </Paragraph>
                    </Section>

                    <Section title="7. Your Rights">
                        <Bullet>Access, correct, or delete your personal data.</Bullet>
                        <Bullet>Withdraw consent for location access via device settings.</Bullet>
                        <Bullet>Request information about how your data is being processed.</Bullet>
                    </Section>

                    <Section title="8. Contact">
                        <Paragraph>
                            For any concerns regarding your personal data, contact our Grievance Officer at hello@localpill.com
                        </Paragraph>
                    </Section>
                </View>

                <Text style={[styles.footer, { color: colors.textMuted }]}>© 2026 UpcharMitra Healthtech Pvt. Ltd.</Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
    backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    headerTitle: { fontSize: 18, fontFamily: 'Inter_800ExtraBold' },
    content: { paddingHorizontal: 20, paddingTop: 20 },
    card: { borderRadius: Radius.lg, borderWidth: 1, padding: 20, ...Shadows.sm },
    iconBadge: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    lastUpdated: { fontSize: 12, fontFamily: 'Inter_500Medium', marginBottom: 16 },
    section: { marginTop: 20 },
    sectionTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', marginBottom: 8 },
    subTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold', marginBottom: 6 },
    paragraph: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 22 },
    bulletRow: { flexDirection: 'row', marginBottom: 6, paddingRight: 12 },
    bulletDot: { fontSize: 16, lineHeight: 22, marginRight: 8, fontFamily: 'Inter_700Bold' },
    bulletText: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 22, flex: 1 },
    footer: { textAlign: 'center', fontSize: 12, fontFamily: 'Inter_500Medium', marginTop: 20 },
});
