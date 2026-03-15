import { View, StyleSheet, ViewStyle, ViewProps } from 'react-native';
import { Colors, Shadows, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

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
                    shadowColor: colors.shadow,
                    ...Shadows.sm,
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
        borderRadius: Radius.lg,
        padding: 16,
        marginVertical: 8,
        overflow: 'hidden',
    },
});
