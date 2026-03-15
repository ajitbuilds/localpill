import { useState, useEffect, useRef } from 'react';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

export interface PushNotificationState {
    expoPushToken?: Notifications.ExpoPushToken;
    notification?: Notifications.Notification;
    devicePushToken?: string;
    requestPushPermissions: () => Promise<boolean>;
}

// Set notification handler at module scope (not per-render)
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export const usePushNotifications = (): PushNotificationState => {
    const [expoPushToken, setExpoPushToken] = useState<Notifications.ExpoPushToken | undefined>(undefined);
    const [devicePushToken, setDevicePushToken] = useState<string | undefined>(undefined);
    const [notification, setNotification] = useState<Notifications.Notification | undefined>(undefined);

    const notificationListener = useRef<Notifications.EventSubscription | null>(null);
    const responseListener = useRef<Notifications.EventSubscription | null>(null);
    const router = useRouter();

    async function registerForPushNotificationsAsync(forcePrompt: boolean = false) {
        let pushObj = { expoToken: undefined as any, deviceToken: undefined as any, granted: false };
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#22C55E',
            });
        }

        if (Device.isDevice) {
            const { status: existingStatus, canAskAgain } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            
            // Only prompt if forced (e.g., user tapped "Allow" on our custom primer)
            if (existingStatus !== 'granted') {
                if (forcePrompt && canAskAgain) {
                    const { status } = await Notifications.requestPermissionsAsync();
                    finalStatus = status;
                } else if (forcePrompt && !canAskAgain) {
                    // They previously denied and checked "Don't ask again", so we can't prompt.
                    // The primer should probably direct them to settings in this case, 
                    // but for now we just return false.
                    return pushObj;
                } else {
                    // Not forced, just checking
                    return pushObj;
                }
            }
            
            if (finalStatus !== 'granted') {
                if (__DEV__) console.log('Failed to get push token for push notification!');
                return pushObj;
            }

            pushObj.granted = true;

            try {
                // To get an Expo Push Token, we need an EAS Project ID.
                const projectId = Constants?.expoConfig?.extra?.eas?.projectId
                    ?? Constants?.easConfig?.projectId;

                if (projectId) {
                    pushObj.expoToken = await Notifications.getExpoPushTokenAsync({ projectId });
                }
                const deviceTokenData = await Notifications.getDevicePushTokenAsync();
                pushObj.deviceToken = deviceTokenData?.data;
            } catch (e) {
                if (__DEV__) console.log("Error getting push token. Note: Expo Go does not support Push in SDK 53+.");
            }
        } else {
            if (__DEV__) console.log('Must use physical device for Push Notifications');
        }

        return pushObj;
    }

    const requestPushPermissions = async () => {
        const tokens = await registerForPushNotificationsAsync(true);
        if (tokens.granted) {
            if (tokens.expoToken) setExpoPushToken(tokens.expoToken);
            if (tokens.deviceToken) setDevicePushToken(tokens.deviceToken);
            
            // Save to AsyncStorage globally just like layout did
            if (tokens.deviceToken) AsyncStorage.setItem('devicePushToken', tokens.deviceToken);
            if (tokens.expoToken?.data) AsyncStorage.setItem('expoPushToken', tokens.expoToken.data);
            return true;
        }
        return false;
    };

    useEffect(() => {
        // On mount, just check if we ALREADY have permissions, don't prompt
        registerForPushNotificationsAsync(false).then((tokens: any) => {
            if (tokens.granted) {
                if (tokens.expoToken) setExpoPushToken(tokens.expoToken);
                if (tokens.deviceToken) setDevicePushToken(tokens.deviceToken);
            }
        });

        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            setNotification(notification);
        });

        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            const data = response.notification.request.content.data;
            if (data?.requestId) {
                // Use router directly if the app is already in memory
                router.push(`/request/${data.requestId}`);

                // Save pending route so it handles both cold starts and background open
                AsyncStorage.setItem('pendingNavigation', JSON.stringify({
                    pathname: `/request/${data.requestId}`
                }));
            }
        });

        return () => {
            if (notificationListener.current) {
                notificationListener.current.remove();
            }
            if (responseListener.current) {
                responseListener.current.remove();
            }
        };
    }, []);

    return { expoPushToken, notification, devicePushToken, requestPushPermissions };
};
