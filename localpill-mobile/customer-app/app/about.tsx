import React from 'react';
import { View, Text, StyleSheet, ScrollView, Linking, Share } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { AppIcon } from '../components/icons/AppIcon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import { Colors, Shadows, Radius, Gradients } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AnimatedTouchable } from '../components/ui/AnimatedTouchable';

export default function AboutScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
    const colors = Colors[colorScheme];
    const appVersion = Constants.expoConfig?.version ?? '1.0.0';

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

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: Math.max(insets.top + 12, 44), backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <AnimatedTouchable style={[styles.backBtn, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={() => router.back()}>
                    <AppIcon name="arrow-back" size={20} color={colors.text} />
                </AnimatedTouchable>
                <Text style={[styles.headerTitle, { color: colors.text }]}>About</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={[styles.list, { paddingBottom: Math.max(insets.bottom + 40, 60) }]} showsVerticalScrollIndicator={false}>
                {/* Logo + Mission */}
                <View style={[styles.missionCard, { overflow: 'hidden' }]}>
                    <LinearGradient colors={colorScheme === 'dark' ? Gradients.heroDark : Gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                    <View style={{ position: 'relative', zIndex: 1, alignItems: 'center' }}>
                        <View style={[styles.logoCircle, { backgroundColor: colors.white + '25' }]}>
                            <AppIcon name="medkit" size={36} color={colors.white} />
                        </View>
                        <Text style={styles.appName}>LocalPill</Text>
                        <Text style={styles.version}>Version {appVersion}</Text>
                        <Text style={styles.mission}>
                            LocalPill reduces your uncertainty in finding essential medicines by giving you real-time visibility into local pharmacy stocks. DPIIT Recognised startup by UpcharMitra Healthtech Pvt. Ltd.
                        </Text>
                    </View>
                </View>

                {/* ── Support & Feedback ── */}
                <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.sectionHeaderRow}>
                        <AppIcon name="headset-outline" size={20} color={colors.tint} />
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Support & Feedback</Text>
                    </View>
                    {[
                        { icon: 'help-circle-outline' as any, label: 'Help & Support', onPress: () => router.push('/help'), iconBg: colors.accentSoft, iconColor: colors.accent },
                        { icon: 'star-outline' as any, label: 'Rate Us on Play Store', onPress: () => Linking.openURL('https://play.google.com/store/apps/details?id=com.localpill.customerapp'), iconBg: colors.warningSoft ?? '#FFF3E0', iconColor: colors.warning ?? '#FF9800' },
                    ].map((link, idx) => (
                        <AnimatedTouchable key={link.label} style={[styles.linkItem, { borderColor: colors.border, backgroundColor: colors.background }, idx > 0 && { marginTop: 10 }]} onPress={link.onPress}>
                            <View style={[styles.linkIcon, { backgroundColor: link.iconBg }]}>
                                <AppIcon name={link.icon} size={20} color={link.iconColor} />
                            </View>
                            <Text style={[styles.linkLabel, { color: colors.text }]}>{link.label}</Text>
                            <AppIcon name="chevron-forward" size={16} color={colors.textMuted} />
                        </AnimatedTouchable>
                    ))}
                </View>

                {/* ── Legal ── */}
                <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.sectionHeaderRow}>
                        <AppIcon name="shield-checkmark-outline" size={20} color={colors.tint} />
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Legal</Text>
                    </View>
                    {[
                        { icon: 'shield-checkmark-outline' as any, label: 'Privacy Policy', onPress: () => router.push('/privacy-policy'), iconBg: colors.accentSoft, iconColor: colors.accent },
                        { icon: 'document-text-outline' as any, label: 'Terms of Service', onPress: () => router.push('/terms'), iconBg: colors.accentSoft, iconColor: colors.accent },
                        { icon: 'alert-circle-outline' as any, label: 'Disclaimer', onPress: () => router.push('/disclaimer'), iconBg: colors.warningSoft ?? '#FFF3E0', iconColor: colors.warning ?? '#FF9800' },
                        { icon: 'document-outline' as any, label: 'Open Source Licenses', onPress: () => Linking.openURL('https://localpill.com/licenses'), iconBg: colors.accentSoft, iconColor: colors.accent },
                    ].map((link, idx) => (
                        <AnimatedTouchable key={link.label} style={[styles.linkItem, { borderColor: colors.border, backgroundColor: colors.background }, idx > 0 && { marginTop: 10 }]} onPress={link.onPress}>
                            <View style={[styles.linkIcon, { backgroundColor: link.iconBg }]}>
                                <AppIcon name={link.icon} size={20} color={link.iconColor} />
                            </View>
                            <Text style={[styles.linkLabel, { color: colors.text }]}>{link.label}</Text>
                            <AppIcon name="chevron-forward" size={16} color={colors.textMuted} />
                        </AnimatedTouchable>
                    ))}
                </View>

                {/* ── Connect & Share ── */}
                <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.sectionHeaderRow}>
                        <AppIcon name="globe-outline" size={20} color={colors.tint} />
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Connect & Share</Text>
                    </View>

                    {/* Social Links */}
                    <View style={styles.chipRow}>
                        {[
                            { icon: 'logo-linkedin' as any, label: 'LinkedIn', url: 'https://www.linkedin.com/company/localpillofficial', color: '#0A66C2' },
                            { icon: 'logo-instagram' as any, label: 'Instagram', url: 'https://www.instagram.com/localpillofficial', color: '#E1306C' },
                            { icon: 'logo-facebook' as any, label: 'Facebook', url: 'https://www.facebook.com/localpillofficial', color: '#1877F2' },
                            { icon: 'logo-twitter' as any, label: 'X', url: 'https://x.com/localpillreal', color: colors.text },
                        ].map((social) => (
                            <AnimatedTouchable key={social.label} style={[styles.socialChip, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={() => Linking.openURL(social.url)}>
                                <AppIcon name={social.icon} size={18} color={social.color} />
                                <Text style={[styles.socialChipText, { color: colors.textMuted }]}>{social.label}</Text>
                            </AnimatedTouchable>
                        ))}
                    </View>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    {/* Contact & Invite */}
                    {[
                        { icon: 'mail-outline' as any, label: 'Contact Us', onPress: () => Linking.openURL('mailto:hello@localpill.com'), iconBg: colors.accentSoft, iconColor: colors.accent },
                        { icon: 'globe-outline' as any, label: 'Website', onPress: () => Linking.openURL('https://localpill.com'), iconBg: colors.accentSoft, iconColor: colors.accent },
                        { icon: 'gift-outline' as any, label: 'Invite Friends', onPress: handleInviteFriend, iconBg: colors.successSoft, iconColor: colors.success },
                    ].map((link, idx) => (
                        <AnimatedTouchable key={link.label} style={[styles.linkItem, { borderColor: colors.border, backgroundColor: colors.background }, idx > 0 && { marginTop: 10 }]} onPress={link.onPress}>
                            <View style={[styles.linkIcon, { backgroundColor: link.iconBg }]}>
                                <AppIcon name={link.icon} size={20} color={link.iconColor} />
                            </View>
                            <Text style={[styles.linkLabel, { color: colors.text }]}>{link.label}</Text>
                            <AppIcon name="chevron-forward" size={16} color={colors.textMuted} />
                        </AnimatedTouchable>
                    ))}
                </View>

                {/* Footer */}
                <View style={styles.footerWrapper}>
                    <Text style={[styles.footer, { color: colors.textMuted }]}>Made with ❤️ in India</Text>
                    <Text style={[styles.footerVersion, { color: colors.textMuted }]}>LocalPill v{appVersion}</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
    backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    headerTitle: { fontSize: 18, fontFamily: 'Inter_800ExtraBold' },
    list: { paddingHorizontal: 20, paddingTop: 20 },

    // Mission Card
    missionCard: { borderRadius: Radius.lg, padding: 28, alignItems: 'center', marginBottom: 16, ...Shadows.md },
    logoCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
    appName: { fontSize: 28, fontFamily: 'Inter_800ExtraBold', color: '#FFFFFF', letterSpacing: -0.8, marginBottom: 4 },
    version: { fontSize: 13, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.7)', marginBottom: 14 },
    mission: { fontSize: 14, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.9)', textAlign: 'center', lineHeight: 22 },

    // Section Cards
    sectionCard: { borderRadius: Radius.lg, borderWidth: 1, padding: 20, marginBottom: 16, ...Shadows.sm },
    sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    sectionTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', letterSpacing: -0.3 },

    // Link Items
    linkItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: Radius.md, borderWidth: 1, gap: 12 },
    linkIcon: { width: 36, height: 36, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
    linkLabel: { fontSize: 14, fontFamily: 'Inter_600SemiBold', flex: 1 },

    // Social Chips
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    socialChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: Radius.md, borderWidth: 1 },
    socialChipText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },

    // Divider
    divider: { height: 1, marginVertical: 16 },

    // Footer
    footerWrapper: { alignItems: 'center', paddingTop: 8 },
    footer: { textAlign: 'center', fontSize: 13, fontFamily: 'Inter_500Medium' },
    footerVersion: { textAlign: 'center', fontSize: 12, fontFamily: 'Inter_500Medium', marginTop: 4 },
});
