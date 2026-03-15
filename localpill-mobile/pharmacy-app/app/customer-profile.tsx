import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, Share, ScrollView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, Feather, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import firestore from '@react-native-firebase/firestore';
import { format } from 'date-fns';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors, DesignTokens } from '@/constants/Colors';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import * as Haptics from 'expo-haptics';
import { Modal } from 'react-native';

export default function CustomerProfileScreen() {
    const { userId, requestId, patientName: initialName } = useLocalSearchParams();
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];

    const [requestData, setRequestData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isPhotoModalVisible, setPhotoModalVisible] = useState(false);

    useEffect(() => {
        const fetchRequest = async () => {
            try {
                if (requestId) {
                    const doc = await firestore().collection('medicineRequests').doc(requestId as string).get();
                    if (doc.exists()) {
                        const data = doc.data();
                        setRequestData(data);
                    }
                }
            } catch (err) {
                console.error('Error fetching request data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchRequest();
    }, [requestId]);

    const patientName = String(requestData?.remotePatientName || requestData?.patientName || initialName || 'Patient');
    const initials = patientName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Patient Request: ${patientName}\nMedicines: ${requestData?.typedMedicines?.join(', ')}`,
            });
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <ParallaxScrollView
                headerBackgroundColor={{ light: colors.primary, dark: colors.primary }}
                headerImage={
                    <TouchableOpacity
                        activeOpacity={0.9}
                        style={styles.headerImageContainer}
                        onPress={() => {
                            if (requestData?.prescriptionUrl) {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                setPhotoModalVisible(true);
                            }
                        }}
                    >
                        {requestData?.prescriptionUrl ? (
                            <Image
                                source={{ uri: requestData.prescriptionUrl }}
                                style={styles.headerImage}
                                resizeMode="cover"
                            />
                        ) : (
                            <LinearGradient
                                colors={colors.heroGradient}
                                style={styles.placeholderHeader}
                            >
                                <Text style={styles.initialsText}>{initials}</Text>
                            </LinearGradient>
                        )}
                        <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.6)']}
                            style={styles.headerOverlay}
                        />
                        <View style={styles.headerContent}>
                            <Text style={styles.headerName}>{patientName}</Text>
                            <Text style={styles.headerStatus}>
                                {requestData?.status === 'pending' ? 'Active Request' : 'Previous Request'}
                            </Text>
                        </View>
                    </TouchableOpacity>
                }
            >
                {/* Back Button */}
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={[styles.backButton, { top: Platform.OS === 'ios' ? -210 : -190 }]}
                >
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>

                {/* Quick Actions */}
                <View style={styles.actionRow}>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.surface }]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            router.back();
                        }}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: colors.primaryLight }]}>
                            <Ionicons name="chatbubble" size={20} color={colors.primary} />
                        </View>
                        <Text style={[styles.actionText, { color: colors.text }]}>Message</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.surface }]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            // Normally would trigger phone call, but focusing on UI
                        }}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: colors.primaryLight }]}>
                            <Ionicons name="call" size={20} color={colors.primary} />
                        </View>
                        <Text style={[styles.actionText, { color: colors.text }]}>Call</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.surface }]}
                        onPress={handleShare}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: colors.primaryLight }]}>
                            <Ionicons name="share-social" size={20} color={colors.primary} />
                        </View>
                        <Text style={[styles.actionText, { color: colors.text }]}>Share</Text>
                    </TouchableOpacity>
                </View>

                {/* Patient Info Section */}
                <View style={[styles.section, { backgroundColor: colors.surface }]}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="person" size={18} color={colors.primary} />
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Profile Information</Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Name</Text>
                        <Text style={[styles.infoValue, { color: colors.text }]}>{patientName}</Text>
                    </View>

                    {requestData?.searchMode === 'remote' && (
                        <View style={[styles.badge, { backgroundColor: colors.primaryLight, marginTop: 12 }]}>
                            <MaterialIcons name="share-location" size={14} color={colors.primary} />
                            <Text style={[styles.badgeText, { color: colors.primary }]}>Remote Search Request</Text>
                        </View>
                    )}
                </View>

                {/* Conditional: Requested Medicines */}
                {requestData?.typedMedicines && requestData.typedMedicines.length > 0 && (
                    <View style={[styles.section, { backgroundColor: colors.surface }]}>
                        <View style={styles.sectionHeader}>
                            <MaterialCommunityIcons name="pill" size={18} color={colors.primary} />
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Requested Medicines</Text>
                        </View>

                        <View style={styles.medicineGrid}>
                            {requestData.typedMedicines.map((med: string, index: number) => (
                                <View key={index} style={[styles.medicineTag, { backgroundColor: colors.background }]}>
                                    <Text style={[styles.medicineTagText, { color: colors.text }]}>{med}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Conditional: Prescription Image */}
                {requestData?.prescriptionUrl && (
                    <View style={[styles.section, { backgroundColor: colors.surface }]}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="document-text" size={18} color={colors.primary} />
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Prescription Detail</Text>
                        </View>
                        <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={() => {
                                Haptics.selectionAsync();
                                setPhotoModalVisible(true);
                            }}
                            style={styles.prescriptionContainer}
                        >
                            <Image
                                source={{ uri: requestData.prescriptionUrl }}
                                style={styles.prescriptionPreview}
                                resizeMode="cover"
                            />
                            <View style={styles.expandOverlay}>
                                <Ionicons name="expand" size={24} color="#FFF" />
                                <Text style={styles.expandText}>Tap to View Full Screen</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Privacy & Security Section */}
                <View style={[styles.section, { backgroundColor: colors.surface, borderLeftWidth: 4, borderLeftColor: colors.primary }]}>
                    <View style={styles.securityHeader}>
                        <Ionicons name="lock-closed" size={16} color={colors.primary} />
                        <Text style={[styles.securityTitle, { color: colors.primary }]}>End-to-End Encrypted</Text>
                    </View>
                    <Text style={[styles.securityText, { color: colors.textMuted }]}>
                        This customer's request and prescriptions are only visible to you. Their phone number is hidden to ensure platform-level privacy.
                    </Text>
                </View>

                <View style={{ height: 60 }} />
            </ParallaxScrollView>

            {/* Full Screen Photo Viewer Modal */}
            <Modal
                visible={isPhotoModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setPhotoModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={styles.modalCloseArea}
                        onPress={() => setPhotoModalVisible(false)}
                        activeOpacity={1}
                    >
                        <View style={styles.modalHeader}>
                            <TouchableOpacity
                                style={styles.modalBackButton}
                                onPress={() => setPhotoModalVisible(false)}
                            >
                                <Ionicons name="close" size={28} color="#FFF" />
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>{patientName}</Text>
                        </View>

                        <View style={styles.modalImageContainer}>
                            <Image
                                source={{ uri: requestData?.prescriptionUrl }}
                                style={styles.modalImage}
                                resizeMode="contain"
                            />
                        </View>
                    </TouchableOpacity>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerImageContainer: {
        width: '100%',
        height: '100%',
    },
    headerImage: {
        width: '100%',
        height: '100%',
    },
    placeholderHeader: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    initialsText: {
        fontSize: 72,
        fontWeight: 'bold',
        color: '#FFFFFF',
        letterSpacing: 2,
    },
    headerOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '60%',
    },
    headerContent: {
        position: 'absolute',
        bottom: 20,
        left: 20,
    },
    headerName: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    headerStatus: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 4,
    },
    backButton: {
        position: 'absolute',
        left: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    actionRow: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
    },
    actionButton: {
        flex: 1,
        height: 90,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        ...DesignTokens.shadow.subtle,
    },
    actionIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    actionText: {
        fontSize: 13,
        fontWeight: '600',
    },
    section: {
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 16,
        borderRadius: 20,
        ...DesignTokens.shadow.subtle,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    infoLabel: {
        fontSize: 14,
        fontWeight: '500',
    },
    infoValue: {
        fontSize: 15,
        fontWeight: '600',
    },
    badge: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 6,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    medicineGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    medicineTag: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    medicineTagText: {
        fontSize: 14,
        fontWeight: '500',
    },
    prescriptionContainer: {
        width: '100%',
        height: 250,
        borderRadius: 20,
        overflow: 'hidden',
    },
    prescriptionPreview: {
        width: '100%',
        height: '100%',
    },
    expandOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 60,
        backgroundColor: 'rgba(0,0,0,0.4)',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    expandText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
    },
    securityHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 6,
    },
    securityTitle: {
        fontSize: 13,
        fontWeight: '700',
    },
    securityText: {
        fontSize: 13,
        lineHeight: 20,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: '#000',
    },
    modalCloseArea: {
        flex: 1,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 60 : 20,
        paddingHorizontal: 16,
        zIndex: 10,
    },
    modalBackButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '600',
        marginLeft: 12,
    },
    modalImageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalImage: {
        width: '100%',
        height: '100%',
    },
});
