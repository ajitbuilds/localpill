import { useState, useEffect, useRef } from 'react';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PushNotificationState {
    expoPushToken?: Notifications.ExpoPushToken;
    notification?: Notifications.Notification;
    devicePushToken?: string;
}

export const usePushNotifications = (): PushNotificationState => {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
        }),
    });

    const [expoPushToken, setExpoPushToken] = useState<Notifications.ExpoPushToken | undefined>(undefined);
    const [devicePushToken, setDevicePushToken] = useState<string | undefined>(undefined);
    const [notification, setNotification] = useState<Notifications.Notification | undefined>(undefined);

    const notificationListener = useRef<Notifications.EventSubscription | null>(null);
    const responseListener = useRef<Notifications.EventSubscription | null>(null);

    async function registerForPushNotificationsAsync() {
        let pushObj = { expoToken: undefined as any, deviceToken: undefined as any };
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#22C55E',
            });
        }

        if (Device.isDevice) {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }
            if (finalStatus !== 'granted') {
                console.log('Failed to get push token for push notification!');
                return pushObj;
            }

            try {
                // To get an Expo Push Token, we need an EAS Project ID.
                // If it's not present, we just skip it to avoid dev errors.
                const projectId = Constants?.expoConfig?.extra?.eas?.projectId
                    ?? Constants?.easConfig?.projectId;

                if (projectId) {
                    pushObj.expoToken = await Notifications.getExpoPushTokenAsync({ projectId });
                }
                const deviceTokenData = await Notifications.getDevicePushTokenAsync();
                pushObj.deviceToken = deviceTokenData?.data;
            } catch (e) {
                console.log("Error getting push token. Note: Expo Go does not support Push in SDK 53+.");
            }
        } else {
            console.log('Must use physical device for Push Notifications');
        }

        return pushObj;
    }

    useEffect(() => {
        registerForPushNotificationsAsync().then((tokens: any) => {
            if (tokens.expoToken) setExpoPushToken(tokens.expoToken);
            if (tokens.deviceToken) setDevicePushToken(tokens.deviceToken);
        });

        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            setNotification(notification);
        });

        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            const data = response.notification.request.content.data;
            if (data) {
                // Navigate based on notification type
                const notificationType = data.type as string;
                const requestId = data.requestId as string;
                const chatId = data.chatId as string;

                if (notificationType === 'NEW_REQUEST' && requestId) {
                    // Navigate to orders/requests tab
                    // Using a global event or AsyncStorage to signal the app
                    AsyncStorage.setItem('pendingNavigation', JSON.stringify({ type: 'request', id: requestId }));
                } else if (notificationType === 'CHAT_MESSAGE' && chatId) {
                    AsyncStorage.setItem('pendingNavigation', JSON.stringify({ type: 'chat', chatId, ...data }));
                }
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

    return { expoPushToken, notification, devicePushToken };
};
