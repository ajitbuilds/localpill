import React from 'react';
import { useHaptic } from '../../hooks/useHaptic';

export const Button = ({
    children,
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    onClick,
    style = {},
    disabled = false,
    ...props
}) => {
    const haptic = useHaptic();

    const baseStyle = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        borderRadius: '8px',
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
        width: fullWidth ? '100%' : 'auto',
        border: 'none',
        opacity: disabled ? 0.6 : 1,
        ...style
    };

    const sizeStyles = {
        sm: { padding: '0.5rem 0.75rem', fontSize: 'var(--text-sm)' },
        md: { padding: '0.75rem 1rem', fontSize: 'var(--text-base)' },
        lg: { padding: '1rem 1.5rem', fontSize: 'var(--text-lg)' }
    };

    const variantStyles = {
        primary: {
            backgroundColor: 'var(--color-primary-main)',
            color: 'var(--color-text-inverse)',
            boxShadow: 'var(--shadow-sm)',
        },
        secondary: {
            backgroundColor: 'var(--color-bg-elevated)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border)',
        },
        danger: {
            backgroundColor: 'var(--color-error-bg)',
            color: 'var(--color-error)',
            border: `1px solid var(--color-error)`,
        },
        ghost: {
            backgroundColor: 'transparent',
            color: 'var(--color-text-primary)',
        }
    };

    const handleInteraction = (e) => {
        if (disabled) return;
        if (variant === 'primary' || variant === 'danger') {
            haptic.medium();
        } else {
            haptic.light();
        }
        if (onClick) onClick(e);
    };

    return (
        <button className="btn-dynamic"
            style={{ ...baseStyle, ...sizeStyles[size], ...variantStyles[variant], ...style }}
            onClick={handleInteraction}
            disabled={disabled}
            {...props}
        >
            {children}
        </button>
    );
};
