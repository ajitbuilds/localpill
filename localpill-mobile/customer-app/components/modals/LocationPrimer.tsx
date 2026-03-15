import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, AppState, AppStateStatus, Linking } from 'react-native';
import { Colors } from '../../constants/theme';
import { useColorScheme } from '../../hooks/use-color-scheme';
import { AppIcon } from '../icons/AppIcon';
import { GradientButton } from '../GradientButton';
import { Button } from '../ui/Button';
import * as Location from 'expo-location';

interface LocationPrimerProps {
    visible: boolean;
    onAllow: () => void;
    onDeny: () => void;
    subtitle?: string;
}

export function LocationPrimer({ visible, onAllow, onDeny, subtitle = "We need your location to show pharmacies and available medicines near you." }: LocationPrimerProps) {
    const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
    const colors = Colors[colorScheme];
    
    // Check if permission is permanently denied
    const [isPermanentlyDenied, setIsPermanentlyDenied] = useState(false);
    
    React.useEffect(() => {
        if (visible) {
            checkStatus();
        }
    }, [visible]);

    const checkStatus = async () => {
        const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted' && !canAskAgain) {
            setIsPermanentlyDenied(true);
        } else {
            setIsPermanentlyDenied(false);
        }
    };

    const handleAction = async () => {
        if (isPermanentlyDenied) {
            Linking.openSettings();
            onDeny(); // Close modal while they go to settings
        } else {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                onAllow();
            } else {
                onDeny();
            }
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onDeny}
        >
            <View style={styles.overlay}>
                <View style={[styles.container, { backgroundColor: colors.background }]}>
                    <View style={[styles.iconContainer, { backgroundColor: colors.tint + '15' }]}>
                        <AppIcon name="location-outline" size={40} color={colors.tint} />
                    </View>

                    <Text style={[styles.title, { color: colors.text }]}>
                        {isPermanentlyDenied ? "Location Disabled" : "Find Nearby Pharmacies"}
                    </Text>
                    
                    <Text style={[styles.description, { color: colors.textMuted }]}>
                        {isPermanentlyDenied 
                            ? "You have previously denied location access. Please enable it in your device settings to continue."
                            : subtitle}
                    </Text>

                    <View style={styles.buttonContainer}>
                        <GradientButton
                            label={isPermanentlyDenied ? "Open Settings" : "Allow Location"}
                            onPress={handleAction}
                        />
                        <Button
                            title="Not Now"
                            variant="ghost"
                            onPress={onDeny}
                            textStyle={{ color: colors.textMuted }}
                            style={{ marginTop: 12 }}
                        />
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    container: {
        width: '100%',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 10,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontFamily: 'Inter_700Bold',
        marginBottom: 12,
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    description: {
        fontSize: 16,
        fontFamily: 'Inter_400Regular',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
    },
    buttonContainer: {
        width: '100%',
    }
});
