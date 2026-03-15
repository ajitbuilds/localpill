import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { AppIcon } from '../components/icons/AppIcon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AnimatedTouchable } from '../components/ui/AnimatedTouchable';

export default function DisclaimerScreen() {
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
            <Text style={[styles.bulletDot, { color: colors.warning ?? '#FF9800' }]}>•</Text>
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
                <Text style={[styles.headerTitle, { color: colors.text }]}>Disclaimer</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 20, 32) }]} showsVerticalScrollIndicator={false}>
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={[styles.iconBadge, { backgroundColor: colors.warningSoft ?? '#FFF3E0' }]}>
                        <AppIcon name="alert-circle-outline" size={24} color={colors.warning ?? '#FF9800'} />
                    </View>

                    {/* Important notice banner */}
                    <View style={[styles.noticeBanner, { backgroundColor: colors.warningSoft ?? '#FFF3E0', borderColor: (colors.warning ?? '#FF9800') + '30' }]}>
                        <AppIcon name="information-circle-outline" size={18} color={colors.warning ?? '#FF9800'} />
                        <Text style={[styles.noticeText, { color: colors.text }]}>
                            LocalPill is a technology intermediary only. We do not sell, stock, dispense, or deliver medicines.
                        </Text>
                    </View>

                    <Section title="1. Technology Intermediary">
                        <Paragraph>
                            LocalPill, operated by UpcharMitra Healthtech Pvt. Ltd., acts strictly as a technology intermediary that connects patients with nearby licensed pharmacies for medicine availability enquiries. We are not a pharmacy, chemist, or drug seller.
                        </Paragraph>
                    </Section>

                    <Section title="2. Pharmacy Responsibility">
                        <Paragraph>
                            All independent licensed pharmacies listed on LocalPill are solely responsible for:
                        </Paragraph>
                        <Bullet>Medicine pricing and billing.</Bullet>
                        <Bullet>Medicine quality and authenticity.</Bullet>
                        <Bullet>Verification of prescriptions as required by law.</Bullet>
                        <Bullet>Compliance with applicable drug regulations.</Bullet>
                        <Bullet>Customer service and dispute resolution.</Bullet>
                    </Section>

                    <Section title="3. No Medical Advice">
                        <Paragraph>
                            LocalPill does not provide any medical advice, diagnosis, or treatment recommendations. The platform is solely for checking medicine availability at nearby pharmacies. Always consult a qualified healthcare professional for medical advice.
                        </Paragraph>
                    </Section>

                    <Section title="4. No Guarantee of Availability">
                        <Paragraph>
                            Medicine availability shown on LocalPill is based on real-time responses from pharmacies. We do not guarantee that any medicine will be in stock at the time of your visit to the pharmacy.
                        </Paragraph>
                    </Section>

                    <Section title="5. Limitation of Liability">
                        <Paragraph>
                            LocalPill shall not be liable for any transaction disputes, medicine quality issues, adverse health outcomes, or any other damages arising from interactions between patients and pharmacies facilitated through the platform.
                        </Paragraph>
                    </Section>

                    <Section title="6. User Discretion">
                        <Paragraph>
                            Users are advised to exercise their own judgement and discretion when purchasing medicines from any pharmacy. Verify the pharmacy's license, check medicine expiry dates, and ensure proper prescription compliance.
                        </Paragraph>
                    </Section>

                    <Section title="7. Contact">
                        <Paragraph>
                            For any concerns or grievances, contact us at hello@localpill.com
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
    noticeBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: Radius.md, borderWidth: 1, marginBottom: 8 },
    noticeText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', lineHeight: 20, flex: 1 },
    section: { marginTop: 20 },
    sectionTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', marginBottom: 8 },
    paragraph: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 22 },
    bulletRow: { flexDirection: 'row', marginBottom: 6, paddingRight: 12 },
    bulletDot: { fontSize: 16, lineHeight: 22, marginRight: 8, fontFamily: 'Inter_700Bold' },
    bulletText: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 22, flex: 1 },
    footer: { textAlign: 'center', fontSize: 12, fontFamily: 'Inter_500Medium', marginTop: 20 },
});
