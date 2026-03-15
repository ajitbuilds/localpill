import React from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import { Colors } from '../../constants/theme';
import { useColorScheme } from '../../hooks/use-color-scheme';
import { AppIcon } from '../icons/AppIcon';
import { GradientButton } from '../GradientButton';
import { Button } from '../ui/Button';

interface NotificationPrimerProps {
    visible: boolean;
    onAllow: () => void;
    onDeny: () => void;
}

export function NotificationPrimer({ visible, onAllow, onDeny }: NotificationPrimerProps) {
    const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
    const colors = Colors[colorScheme];

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
                        <AppIcon name="notifications-outline" size={40} color={colors.tint} />
                    </View>

                    <Text style={[styles.title, { color: colors.text }]}>
                        Stay Updated
                    </Text>
                    
                    <Text style={[styles.description, { color: colors.textMuted }]}>
                        We need your permission to notify you the moment a pharmacy confirms they have your medicine in stock.
                    </Text>

                    <View style={styles.buttonContainer}>
                        <GradientButton
                            label="Allow Notifications"
                            onPress={onAllow}
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
