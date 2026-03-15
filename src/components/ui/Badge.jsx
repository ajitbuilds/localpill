import React from 'react';

export const Badge = ({ children, variant = 'info', style = {}, ...props }) => {

    // Default styling map falling back to our design-tokens
    const variantStyles = {
        info: { bg: 'var(--color-info-bg)', color: 'var(--color-info)' },
        success: { bg: 'var(--color-primary-subtle)', color: 'var(--color-primary-main)' },
        warning: { bg: 'var(--color-warning-bg)', color: 'var(--color-warning)' },
        error: { bg: 'var(--color-error-bg)', color: 'var(--color-error)' },
        neutral: { bg: 'var(--color-bg-elevated)', color: 'var(--color-text-secondary)' }
    };

    const currentStyle = variantStyles[variant] || variantStyles.info;

    return (
        <span
            className="ui-badge"
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.25rem 0.6rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 600,
                backgroundColor: currentStyle.bg,
                color: currentStyle.color,
                whiteSpace: 'nowrap',
                ...style
            }}
            {...props}
        >
            {children}
        </span>
    );
};
