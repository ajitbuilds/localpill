import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { isSupported, getMessaging, getToken } from "firebase/messaging";
import { getFunctions } from "firebase/functions";
import { getDatabase } from "firebase/database";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

const firebaseConfig = {
  apiKey: "AIzaSyAu0oK0dDjYzIG9vE1Md6tPrGTDurYq0Wk",
  authDomain: "localpill-upcharmitra.firebaseapp.com",
  projectId: "localpill-upcharmitra",
  storageBucket: "localpill-upcharmitra.firebasestorage.app",
  messagingSenderId: "481146336183",
  appId: "1:481146336183:web:00cd2cb2511ac58569ee32",
  measurementId: "G-4DKWT1CMK9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase App Check
export const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider('6Lc5VXMsAAAAAD9L2doozdoaimRsiNCln8UECN7Y'),
  isTokenAutoRefreshEnabled: true
});
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

export const storage = getStorage(app);
export const functions = getFunctions(app);
export const rtdb = getDatabase(app);
export const analytics = getAnalytics(app);

// Lazy messaging — only initialize when notifications are explicitly requested.
// This prevents automatic 401 errors from Firebase SDK on every page load.
let _messaging = null;
export const getMessagingInstance = async () => {
  if (_messaging) return _messaging;
  try {
    const supported = await isSupported();
    if (!supported) return null;
    _messaging = getMessaging(app);
    return _messaging;
  } catch {
    return null;
  }
};

// Function to request notification permission and get token
export const requestNotificationPermission = async () => {
  if (!await isSupported()) return null;

  try {
    const messaging = getMessaging(app);
    const permission = await Notification.requestPermission();

    if (permission === 'granted') {
      // Firebase will automatically find and register /firebase-messaging-sw.js
      // if it's placed in your public directory. Manual registration causes Issue #11 conflicts.

      const currentToken = await getToken(messaging, {
        vapidKey: "BHnLEK_oes9RUvb78ulals2raz_m6xjoEflx2p3ZvnNsOPlcQ4DaF4R0NnaJXkipP5vRltPple3FS4cTn8m5-GY"
      });
      return currentToken; // Return the token
    } else {
      console.log('Notification permission denied.');
      return null;
    }
  } catch (error) {
    console.error('Error requesting notification permission or getting token:', error);
    return null;
  }
};

// Keep backward-compat export (resolves to null initially, real instance loaded lazily)
export let messaging = null;
