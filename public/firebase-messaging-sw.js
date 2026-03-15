// LocalPill Service Worker
// Handles FCM background push notifications only.
// No caching — keeps content always fresh.

importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyAu0oK0dDjYzIG9vE1Md6tPrGTDurYq0Wk",
    authDomain: "localpill-upcharmitra.firebaseapp.com",
    projectId: "localpill-upcharmitra",
    storageBucket: "localpill-upcharmitra.firebasestorage.app",
    messagingSenderId: "481146336183",
    appId: "1:481146336183:web:00cd2cb2511ac58569ee32"
});

const messaging = firebase.messaging();

// Handle background push notifications
messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Background message received:', payload);
    const { title, body, icon } = payload.notification || {};
    self.registration.showNotification(title || 'LocalPill', {
        body: body || 'You have a new notification.',
        icon: icon || '/localpill-icon.png',
        badge: '/localpill-icon.png',
        tag: 'localpill-notification',
    });
});
