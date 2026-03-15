import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Linking } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { AppIcon } from '../components/icons/AppIcon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AnimatedTouchable } from '../components/ui/AnimatedTouchable';

const FAQ_DATA = [
    { q: 'How does LocalPill work?', a: 'Search for medicines or upload a prescription. Nearby pharmacies are notified instantly and respond with availability. You get matched with the first pharmacy that has your medicine.' },
    { q: 'Is it free to use?', a: 'Yes — LocalPill is completely free for customers. There are no hidden or delivery charges from our side.' },
    { q: 'How long does a search take?', a: 'Searches timeout after 5 minutes. Most pharmacies respond within 1-2 minutes.' },
    { q: 'Can I search for multiple medicines?', a: 'Yes, you can add up to 10 medicines in a single search request.' },
    { q: 'What if no pharmacy responds?', a: 'You can expand your search radius to 10km and retry, or start a new search at a different time.' },
    { q: 'Is my data safe?', a: 'Yes. We use Firebase security rules and only share your location with pharmacies during an active search. Your phone number is never shared.' },
];

export default function HelpScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
    const colors = Colors[colorScheme];
    const [expanded, setExpanded] = useState<number | null>(null);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: Math.max(insets.top + 12, 44), backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <AnimatedTouchable style={[styles.backBtn, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={() => router.back()}>
                    <AppIcon name="arrow-back" size={20} color={colors.text} />
                </AnimatedTouchable>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Help & Support</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={[styles.list, { paddingBottom: Math.max(insets.bottom + 20, 32) }]} showsVerticalScrollIndicator={false}>
                {/* FAQ Section */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Frequently Asked Questions</Text>

                {FAQ_DATA.map((item, idx) => (
                    <AnimatedTouchable key={idx} style={[styles.faqCard, { backgroundColor: colors.surface, borderColor: expanded === idx ? colors.tintLight : colors.border }]} onPress={() => setExpanded(expanded === idx ? null : idx)} activeOpacity={0.8}>
                        <View style={styles.faqHeader}>
                            <Text style={[styles.faqQ, { color: colors.text }]}>{item.q}</Text>
                            <AppIcon name={expanded === idx ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
                        </View>
                        {expanded === idx && (
                            <Text style={[styles.faqA, { color: colors.textMuted, borderTopColor: colors.border }]}>{item.a}</Text>
                        )}
                    </AnimatedTouchable>
                ))}

                {/* Contact Section */}
                <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 28 }]}>Contact Us</Text>

                <AnimatedTouchable style={[styles.contactCard, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => Linking.openURL('mailto:support@localpill.in')} activeOpacity={0.8}>
                    <View style={[styles.contactIcon, { backgroundColor: colors.accentSoft }]}>
                        <AppIcon name="mail" size={20} color={colors.tint} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.contactLabel, { color: colors.text }]}>Email Support</Text>
                        <Text style={[styles.contactValue, { color: colors.textMuted }]}>support@localpill.in</Text>
                    </View>
                    <AppIcon name="open-outline" size={16} color={colors.textMuted} />
                </AnimatedTouchable>

                <AnimatedTouchable style={[styles.contactCard, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => Linking.openURL('https://wa.me/918340428708')} activeOpacity={0.8}>
                    <View style={[styles.contactIcon, { backgroundColor: colors.successSoft }]}>
                        <AppIcon name="logo-whatsapp" size={20} color={colors.success} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.contactLabel, { color: colors.text }]}>WhatsApp</Text>
                        <Text style={[styles.contactValue, { color: colors.textMuted }]}>Chat with us on WhatsApp</Text>
                    </View>
                    <AppIcon name="open-outline" size={16} color={colors.textMuted} />
                </AnimatedTouchable>
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
    sectionTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', marginBottom: 14, letterSpacing: -0.3 },
    faqCard: { borderRadius: Radius.lg, borderWidth: 1, padding: 16, marginBottom: 10, ...Shadows.sm },
    faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    faqQ: { fontSize: 14, fontFamily: 'Inter_700Bold', flex: 1, marginRight: 12 },
    faqA: { fontSize: 13, fontFamily: 'Inter_500Medium', lineHeight: 20, marginTop: 10, paddingTop: 10, borderTopWidth: 1 },
    contactCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: Radius.lg, borderWidth: 1, padding: 16, marginBottom: 10, ...Shadows.sm },
    contactIcon: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
    contactLabel: { fontSize: 15, fontFamily: 'Inter_700Bold', marginBottom: 2 },
    contactValue: { fontSize: 13, fontFamily: 'Inter_500Medium' },
});
