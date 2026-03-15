import { View, Text, StyleSheet, ViewStyle, TextInputProps as RNTextInputProps, TextInput as RNTextInput } from 'react-native';
import { Colors, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useState } from 'react';

interface TextInputProps extends RNTextInputProps {
    label?: string;
    error?: string;
    containerStyle?: ViewStyle;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

export function TextInput({
    label,
    error,
    containerStyle,
    leftIcon,
    rightIcon,
    style,
    onFocus,
    onBlur,
    ...props
}: TextInputProps) {
    const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
    const colors = Colors[colorScheme];
    const [isFocused, setIsFocused] = useState(false);

    return (
        <View style={[styles.container, containerStyle]}>
            {label && (
                <Text style={[styles.label, { color: colors.text }]}>
                    {label}
                </Text>
            )}

            <View
                style={[
                    styles.inputContainer,
                    {
                        backgroundColor: colors.surface,
                        borderColor: error ? colors.danger : (isFocused ? colors.tint : colors.border),
                        borderWidth: isFocused || error ? 2 : 1,
                    },
                ]}
            >
                {leftIcon && <View style={styles.iconContainer}>{leftIcon}</View>}

                <RNTextInput
                    style={[
                        styles.input,
                        { color: colors.text },
                        style,
                    ]}
                    placeholderTextColor={colors.textMuted}
                    onFocus={(e) => {
                        setIsFocused(true);
                        onFocus && onFocus(e);
                    }}
                    onBlur={(e) => {
                        setIsFocused(false);
                        onBlur && onBlur(e);
                    }}
                    {...props}
                />

                {rightIcon && <View style={styles.iconContainer}>{rightIcon}</View>}
            </View>

            {error && (
                <Text style={[styles.error, { color: colors.danger }]}>
                    {error}
                </Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 8,
        marginLeft: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: Radius.md,
        minHeight: 52,
        paddingHorizontal: 16,
    },
    input: {
        flex: 1,
        fontSize: 16,
        paddingVertical: 12,
    },
    iconContainer: {
        paddingHorizontal: 8,
    },
    error: {
        fontSize: 12,
        marginTop: 6,
        marginLeft: 4,
    },
});
