import { View, StyleSheet, ViewStyle, ViewProps } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

interface CardProps extends ViewProps {
    style?: ViewStyle;
    children: React.ReactNode;
    variant?: 'elevated' | 'outlined' | 'flat';
}

export function Card({ style, children, variant = 'elevated', ...props }: CardProps) {
    const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
    const colors = Colors[colorScheme];

    const getVariantStyles = (): ViewStyle => {
        switch (variant) {
            case 'elevated':
                return {
                    backgroundColor: colors.surface,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.05,
                    shadowRadius: 8,
                    elevation: 2,
                };
            case 'outlined':
                return {
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.border,
                };
            case 'flat':
                return {
                    backgroundColor: colors.background, // subtly different from surface
                };
            default:
                return {};
        }
    };

    return (
        <View
            style={[
                styles.card,
                getVariantStyles(),
                style,
            ]}
            {...props}
        >
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 16,
        padding: 16,
        marginVertical: 8,
        overflow: 'hidden',
    },
});
