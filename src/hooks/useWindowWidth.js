import { useState, useEffect } from 'react';

/**
 * Returns the current window inner width, updating on resize.
 * Use this instead of bare window.innerWidth checks in JSX.
 *
 * Usage:
 *   const width = useWindowWidth();
 *   const isMobile = width < 768;
 *   const isTablet = width >= 768 && width < 1024;
 */
export default function useWindowWidth() {
    const [width, setWidth] = useState(
        typeof window !== 'undefined' ? window.innerWidth : 1024
    );

    useEffect(() => {
        const handler = () => setWidth(window.innerWidth);
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, []);

    return width;
}
