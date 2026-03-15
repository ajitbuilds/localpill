import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { AppIcon } from '../components/icons/AppIcon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AnimatedTouchable } from '../components/ui/AnimatedTouchable';

export default function TermsScreen() {
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

            <View style={[styles.header, { paddingTop: Math.max(insets.top + 12, 44), backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <AnimatedTouchable style={[styles.backBtn, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={() => router.back()}>
                    <AppIcon name="arrow-back" size={20} color={colors.text} />
                </AnimatedTouchable>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Terms of Service</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 20, 32) }]} showsVerticalScrollIndicator={false}>
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={[styles.iconBadge, { backgroundColor: colors.accentSoft }]}>
                        <AppIcon name="document-text" size={24} color={colors.tint} />
                    </View>
                    <Text style={[styles.lastUpdated, { color: colors.textMuted }]}>Last updated: March 13, 2026</Text>

                    <Paragraph>
                        By using the LocalPill application, you agree to these Terms of Service. LocalPill is operated by UpcharMitra Healthtech Pvt. Ltd.
                    </Paragraph>

                    <Section title="1. Eligibility">
                        <Paragraph>
                            You must be at least 18 years of age to use LocalPill. By using this app, you represent that you meet this age requirement and have the legal capacity to enter into a binding agreement.
                        </Paragraph>
                    </Section>

                    <Section title="2. Nature of Service">
                        <Paragraph>
                            LocalPill is a technology platform that connects patients with nearby licensed pharmacies for medicine availability enquiries. We act strictly as an intermediary and do not sell, stock, dispense, or deliver medicines.
                        </Paragraph>
                    </Section>

                    <Section title="3. User Responsibilities">
                        <Bullet>Provide accurate and complete information during registration.</Bullet>
                        <Bullet>Upload valid prescriptions where required by law.</Bullet>
                        <Bullet>Use the platform only for lawful purposes.</Bullet>
                        <Bullet>Maintain the confidentiality of your account credentials.</Bullet>
                    </Section>

                    <Section title="4. Prohibited Activities">
                        <Bullet>Uploading false or forged prescriptions.</Bullet>
                        <Bullet>Engaging in fraud, impersonation, or misrepresentation.</Bullet>
                        <Bullet>Automated scraping, data mining, or reverse engineering of the app.</Bullet>
                        <Bullet>Using the platform to harass or spam pharmacies.</Bullet>
                    </Section>

                    <Section title="5. Pharmacy Transactions">
                        <Paragraph>
                            All transactions, including pricing, payment, and medicine quality, are solely between you and the pharmacy. LocalPill is not a party to any purchase transaction and bears no liability for disputes arising from such transactions.
                        </Paragraph>
                    </Section>

                    <Section title="6. Intellectual Property">
                        <Paragraph>
                            All content, design, logos, and technology of LocalPill are the intellectual property of UpcharMitra Healthtech Pvt. Ltd. Unauthorized reproduction or distribution is prohibited.
                        </Paragraph>
                    </Section>

                    <Section title="7. Limitation of Liability">
                        <Paragraph>
                            LocalPill shall not be liable for any direct, indirect, incidental, or consequential damages arising from your use of the platform, including but not limited to medicine availability, pricing, or quality.
                        </Paragraph>
                    </Section>

                    <Section title="8. Governing Law">
                        <Paragraph>
                            These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in Patna, Bihar.
                        </Paragraph>
                    </Section>

                    <Section title="9. Contact">
                        <Paragraph>
                            For questions or grievances regarding these terms, contact us at hello@localpill.com
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
    paragraph: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 22 },
    bulletRow: { flexDirection: 'row', marginBottom: 6, paddingRight: 12 },
    bulletDot: { fontSize: 16, lineHeight: 22, marginRight: 8, fontFamily: 'Inter_700Bold' },
    bulletText: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 22, flex: 1 },
    footer: { textAlign: 'center', fontSize: 12, fontFamily: 'Inter_500Medium', marginTop: 20 },
});
