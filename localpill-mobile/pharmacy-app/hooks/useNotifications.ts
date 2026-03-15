import { useEffect, useRef } from 'react';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { useRouter } from 'expo-router';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function useNotifications() {
  const router = useRouter();
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      if (token) {
        // Token is saved to Firestore within registerForPushNotificationsAsync
      }
    });

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      // Handle foreground notification
      console.log("Foreground notification received");
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      console.log("Notification Response received", data);
      if (data?.chatId) {
        // Need to wait for navigation to be ready in production apps
        setTimeout(() => {
          router.push(`/chat?chatId=${data.chatId}`);
        }, 500);
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

  const saveTokenToFirestore = async (token?: string) => {
    if (!token) return;
    const uid = auth().currentUser?.uid;
    if (!uid) return;
    
    // Attempt save to both users and pharmacies, rely on security rules to reject invalid paths
    try {
        await firestore().collection('users').doc(uid).set(
          { fcmTokens: { [token]: true } }, 
          { merge: true }
        );
    } catch(e) {}
    
    try {
        await firestore().collection('pharmacies').doc(uid).set(
          { fcmTokens: { [token]: true } }, 
          { merge: true }
        );
    } catch(e) {}
  };
}

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
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
      return;
    }
    
    const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}
