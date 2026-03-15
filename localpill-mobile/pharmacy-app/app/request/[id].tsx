import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Alert, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Pill, MapPin, Clock, CheckCircle2, AlertCircle, XCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { format } from 'date-fns';

import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors, DesignTokens } from '@/constants/Colors';
import { AnimatedTouchable } from '@/components/ui/AnimatedTouchable';

export default function PharmacyRequestDetailsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];

    const [requestData, setRequestData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [hasResponded, setHasResponded] = useState(false);
    const [timeLeft, setTimeLeft] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;
        const requestId = typeof id === 'string' ? id : id[0];

        const unsubReq = firestore()
            .collection('medicineRequests')
            .doc(requestId)
            .onSnapshot((snap) => {
                if (!snap.exists) {
                    setLoading(false);
                    return;
                }
                const data = { id: snap.id, ...snap.data() } as any;
                setRequestData(data);

                // Check if we already responded
                const uid = auth().currentUser?.uid;
                if (uid && data.respondedPharmacies && data.respondedPharmacies.includes(uid)) {
                    setHasResponded(true);
                } else {
                    setHasResponded(false);
                }

                setLoading(false);
            }, (err) => {
                console.error("Error fetching request details:", err);
                setLoading(false);
            });

        return () => unsubReq();
    }, [id]);

    useEffect(() => {
        if (!requestData || !requestData.expiresAt || requestData.status !== 'pending') {
            setTimeLeft(null);
            return;
        }

        const updateTimer = () => {
            const now = Date.now();
            const expires = requestData.expiresAt.toMillis();
            const diff = expires - now;

            if (diff <= 0) {
                setTimeLeft('Expired');
                return;
            }

            const mins = Math.floor(diff / 60000);
            const secs = Math.floor((diff % 60000) / 1000);
            setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [requestData]);

    const handleRespond = async (status: 'available' | 'partial' | 'not_available') => {
        if (!requestData) return;
        const uid = auth().currentUser?.uid;
        if (!uid) {
            Alert.alert('Error', 'You must be logged in to respond.');
            return;
        }

        try {

            // Fetch pharmacy display data for the response
            const pharmacyDoc = await firestore().collection('pharmacies').doc(uid).get();
            const pharmacyInfo = pharmacyDoc.data();
            const pharmacyDisplayName = pharmacyInfo?.pharmacyName || pharmacyInfo?.name || 'Pharmacy';

            const reqRef = firestore().collection('medicineRequests').doc(requestData.id);
            const batch = firestore().batch();

            // 1) Add response to the subcollection with display metadata
            const responseRef = reqRef.collection('pharmacyResponses').doc(uid);
            batch.set(responseRef, {
                pharmacyId: uid,
                pharmacyName: pharmacyDisplayName,
                responseType: status,
                respondedAt: firestore.FieldValue.serverTimestamp(),
            });

            // 2) Update the main request doc so we know this pharmacy responded
            batch.update(reqRef, {
                respondedPharmacies: firestore.FieldValue.arrayUnion(uid)
            });

            await batch.commit();

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Success', status === 'available' ? 'Marked Available' : status === 'partial' ? 'Marked Partial' : 'Declined');
            setHasResponded(true);
            setTimeout(() => router.back(), 500);
        } catch (error) {
            console.error('Error responding to request:', error);
            Alert.alert('Error', 'Failed to submit response. Check your connection.');
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading request details...</Text>
            </View>
        );
    }

    if (!requestData) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <Text style={{ color: colors.textSecondary }}>Request not found.</Text>
                <AnimatedTouchable style={styles.backButtonEmpty} onPress={() => router.back()}>
                    <Text style={styles.backButtonEmptyText}>Go Back</Text>
                </AnimatedTouchable>
            </View>
        );
    }

    const timeAgo = requestData.createdAt
        ? format(new Date(requestData.createdAt.toMillis()), 'MMM d, yyyy - h:mm a')
        : 'Recently';

    const patientInitial = (requestData.patientName || 'P').charAt(0).toUpperCase();

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* HEADER */}
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
                <AnimatedTouchable
                    style={[styles.backButton, { backgroundColor: '#F1F5F9' }]}
                    onPress={() => router.back()}
                >
                    {/* We dont have Ionicons imported from vector-icons, Lucide doesn't have arrow-back by that name. Assuming we just use Text for arrow for now or we update to Lucide ArrowLeft */}
                    <Text style={{ fontSize: 20, color: colors.text }}>←</Text>
                </AnimatedTouchable>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Request Details</Text>
                <View style={{ width: 40 }} /> {/* Placeholder for balance */}
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Status Banner */}
                {hasResponded ? (
                    <View style={[styles.statusBanner, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                        <CheckCircle2 size={20} color={colors.primary} />
                        <Text style={[styles.statusText, { color: colors.primary }]}>You have responded to this request</Text>
                    </View>
                ) : requestData.status === 'pending' ? (
                    <View style={[styles.statusBanner, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                        <Clock size={20} color="#F59E0B" />
                        <Text style={[styles.statusText, { color: '#F59E0B' }]}>Awaiting your response. Expires in {timeLeft || '--:--'}</Text>
                    </View>
                ) : (
                    <View style={[styles.statusBanner, { backgroundColor: 'rgba(156, 163, 175, 0.1)' }]}>
                        <AlertCircle size={20} color="#9CA3AF" />
                        <Text style={[styles.statusText, { color: '#9CA3AF' }]}>This request is no longer active</Text>
                    </View>
                )}

                {/* Patient Info Card */}
                <View style={[styles.card, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Patient Information</Text>
                    <View style={styles.patientRow}>
                        <View style={[styles.avatar, { backgroundColor: '#E0F2FE' }]}>
                            <Text style={styles.avatarText}>{patientInitial}</Text>
                        </View>
                        <View style={styles.patientDetails}>
                            <Text style={[styles.patientName, { color: colors.text }]}>{requestData.patientName || 'Anonymous Patient'}</Text>
                            <View style={styles.infoRow}>
                                <MapPin size={14} color={colors.textSecondary} />
                                <Text style={[styles.infoText, { color: colors.textSecondary }]}>{requestData.distanceKm ? `${requestData.distanceKm} km away` : 'Location verified'}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Clock size={14} color={colors.textSecondary} />
                                <Text style={[styles.infoText, { color: colors.textSecondary }]}>{timeAgo}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Requested Medicines Card */}
                <View style={[styles.card, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Requested Medicines</Text>
                    {requestData.typedMedicines && requestData.typedMedicines.length > 0 ? (
                        <View style={styles.medicinesList}>
                            {requestData.typedMedicines.map((med: string, index: number) => (
                                <View key={index} style={[styles.medicineItem, { borderBottomColor: colors.border, borderBottomWidth: index === requestData.typedMedicines.length - 1 ? 0 : 1 }]}>
                                    <View style={[styles.pillIconContainer, { backgroundColor: '#EFF6FF' }]}>
                                        <Pill size={16} color={colors.primary} />
                                    </View>
                                    <Text style={[styles.medicineName, { color: colors.text }]}>{med}</Text>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <Text style={[styles.noMedicinesText, { color: colors.textSecondary }]}>No specific medicines typed.</Text>
                    )}

                    {!!requestData.dosageForm && (
                        <View style={[styles.extraInfoBox, { backgroundColor: '#F8FAFC' }]}>
                            <Text style={[styles.extraInfoLabel, { color: colors.textSecondary }]}>Preferred Form:</Text>
                            <Text style={[styles.extraInfoValue, { color: colors.text }]}>{requestData.dosageForm}</Text>
                        </View>
                    )}

                    {!!(requestData.prescription || requestData.prescriptionUrl) && (
                        <View style={[styles.extraInfoBox, { backgroundColor: '#ECFDF5', marginTop: 8 }]}>
                            <Text style={[styles.extraInfoLabel, { color: '#10B981', fontWeight: 'bold' }]}>Prescription Attached</Text>
                        </View>
                    )}
                </View>

                {/* Additional Instructions */}
                {requestData.patientNotes ? (
                    <View style={[styles.card, { backgroundColor: colors.surface }]}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Special Instructions</Text>
                        <Text style={[styles.notesText, { color: colors.textSecondary }]}>{requestData.patientNotes}</Text>
                    </View>
                ) : null}
            </ScrollView>

            {/* FIXED BOTTOM ACTIONS */}
            {!hasResponded && requestData.status === 'pending' && timeLeft !== 'Expired' && (
                <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
                    <Text style={[styles.actionHeader, { color: colors.textSecondary }]}>Can you fulfill this request?</Text>
                    <View style={styles.actionButtonsRow}>
                        <AnimatedTouchable
                            style={[styles.actionBtn, styles.actionBtnAvailable]}
                            onPress={() => handleRespond('available')}
                        >
                            <CheckCircle2 size={18} color="#FFFFFF" />
                            <Text style={styles.actionBtnTextLight}>Available</Text>
                        </AnimatedTouchable>

                        <AnimatedTouchable
                            style={[styles.actionBtn, styles.actionBtnPartial]}
                            onPress={() => handleRespond('partial')}
                        >
                            <AlertCircle size={18} color="#FFFFFF" />
                            <Text style={styles.actionBtnTextLight}>Partial</Text>
                        </AnimatedTouchable>

                        <AnimatedTouchable
                            style={[styles.actionBtn, styles.actionBtnDecline]}
                            onPress={() => handleRespond('not_available')}
                        >
                            <XCircle size={18} color="#64748B" />
                            <Text style={[styles.actionBtnTextDark, { color: '#64748B' }]}>Decline</Text>
                        </AnimatedTouchable>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingText: {
        fontFamily: DesignTokens.font.medium,
        fontSize: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backButtonEmpty: {
        marginTop: 20,
        paddingVertical: 10,
        paddingHorizontal: 20,
        backgroundColor: '#3B82F6',
        borderRadius: 8,
    },
    backButtonEmptyText: {
        color: '#FFF',
        fontFamily: DesignTokens.font.bold,
    },
    headerTitle: {
        fontFamily: DesignTokens.font.bold,
        fontSize: 18,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 120, // space for bottom bar
    },
    statusBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 20,
        gap: 10,
    },
    statusText: {
        fontFamily: DesignTokens.font.medium,
        fontSize: 14,
        flex: 1,
    },
    card: {
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    sectionTitle: {
        fontFamily: DesignTokens.font.bold,
        fontSize: 16,
        marginBottom: 16,
    },
    patientRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    avatarText: {
        color: '#3B82F6',
        fontFamily: DesignTokens.font.bold,
        fontSize: 20,
    },
    patientDetails: {
        flex: 1,
    },
    patientName: {
        fontFamily: DesignTokens.font.bold,
        fontSize: 16,
        marginBottom: 4,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 6,
    },
    infoText: {
        fontFamily: DesignTokens.font.regular,
        fontSize: 13,
    },
    medicinesList: {
        marginTop: 5,
    },
    medicineItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
    },
    pillIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    medicineName: {
        fontFamily: DesignTokens.font.semibold,
        fontSize: 15,
        flex: 1,
    },
    noMedicinesText: {
        fontFamily: DesignTokens.font.regular,
        fontSize: 14,
        fontStyle: 'italic',
    },
    extraInfoBox: {
        flexDirection: 'row',
        padding: 12,
        borderRadius: 10,
        marginTop: 16,
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    extraInfoLabel: {
        fontFamily: DesignTokens.font.medium,
        fontSize: 13,
    },
    extraInfoValue: {
        fontFamily: DesignTokens.font.semibold,
        fontSize: 14,
    },
    notesText: {
        fontFamily: DesignTokens.font.regular,
        fontSize: 14,
        lineHeight: 22,
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
        borderTopWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 8,
    },
    actionHeader: {
        fontFamily: DesignTokens.font.medium,
        fontSize: 13,
        marginBottom: 12,
        textAlign: 'center',
    },
    actionButtonsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 14,
        gap: 6,
    },
    actionBtnAvailable: {
        backgroundColor: '#3B82F6', // Sapphire Blue
    },
    actionBtnPartial: {
        backgroundColor: '#F59E0B',
    },
    actionBtnDecline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    actionBtnTextLight: {
        color: '#FFF',
        fontFamily: DesignTokens.font.bold,
        fontSize: 14,
    },
    actionBtnTextDark: {
        fontFamily: DesignTokens.font.bold,
        fontSize: 14,
    }
});
