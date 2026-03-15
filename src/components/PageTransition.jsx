import React from 'react';
import { useLocation } from 'react-router-dom';

/**
 * PageTransition — Wrap any view/screen change to add smooth animations.
 * Issue #38: Global page transition animations
 *
 * direction: 'forward' (slide right) | 'back' (slide left) | 'tab' (fade)
 *
 * Uses `useLocation().pathname` as a key so the animation re-fires
 * on every route change automatically.
 */
export default function PageTransition({ children, direction = 'forward' }) {
    const { pathname } = useLocation();

    const cls =
        direction === 'back' ? 'page-slide-back' :
            direction === 'tab' ? 'page-fade' :
                'page-transition';

    return (
        <div key={pathname} className={cls} style={{ width: '100%' }}>
            {children}
        </div>
    );
}

