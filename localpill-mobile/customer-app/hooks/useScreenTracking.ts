import { useEffect } from 'react';
import analytics from '@react-native-firebase/analytics';

/**
 * Log a screen view to Firebase Analytics on mount.
 * Usage: useScreenTracking('ChatScreen');
 */
export const useScreenTracking = (screenName: string, screenClass?: string) => {
    useEffect(() => {
        analytics().logScreenView({
            screen_name: screenName,
            screen_class: screenClass || screenName,
        });
    }, [screenName, screenClass]);
};
