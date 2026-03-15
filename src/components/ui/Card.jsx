import React from 'react';

export const Card = ({ children, className = '', padding = '1.5rem', style = {}, onClick, ...props }) => {
    return (
        <div
            className={`ui-card ${className}`}
            style={{
                background: 'var(--color-bg-surface)',
                borderRadius: '16px',
                border: '1px solid var(--color-border-subtle)',
                boxShadow: 'var(--shadow-sm)',
                padding,
                color: 'var(--color-text-primary)',
                transition: 'all 0.2s',
                cursor: onClick ? 'pointer' : 'default',
                ...style
            }}
            onClick={onClick}
            {...props}
        >
            {children}
        </div>
    );
};
