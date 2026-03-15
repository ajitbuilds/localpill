# LocalPill — Setup & Local Development Guide

> Is guide mein bataya gaya hai ki LocalPill project ko apne machine par kaise set up aur run karein.

---

## Prerequisites

| Tool | Required Version | Install Link |
|------|-----------------|-------------|
| Node.js | v18 or higher | https://nodejs.org |
| npm | v9 or higher | (Node ke saath aata hai) |
| Git | Any | https://git-scm.com |
| Firebase CLI | Latest | `npm install -g firebase-tools` |
| VS Code (Recommended) | Any | https://code.visualstudio.com |

---

## Step 1: Repository Clone Karo

```bash
git clone <your-repo-url>
cd localpill
```

---

## Step 2: Frontend Dependencies Install Karo

```bash
npm install
```

**Yeh packages install honge** (`package.json` se):

| Package | Purpose |
|---------|---------|
| `firebase` | Firebase Web SDK |
| `react`, `react-dom` | UI framework |
| `react-router-dom` | Client-side routing |
| `react-helmet-async` | Dynamic SEO meta tags |
| `react-leaflet`, `leaflet` | Map component |
| `react-easy-crop` | Image cropper |
| `recharts` | Analytics charts |
| `framer-motion` | Animations |
| `browser-image-compression` | Image compression before upload |
| `canvas-confetti` | Celebration animation |

---

## Step 3: Firebase Project Configure Karo

### 3a. Firebase Console par Project Dekho
Project already live hai: `localpill-upcharmitra`

Agar **nayi environment** chahiye (staging/dev):
1. [Firebase Console](https://console.firebase.google.com) par jayein
2. "Add Project" → Name: `localpill-dev`
3. Google Analytics enable karo

### 3b. Firebase Config Update Karo

`src/firebase.js` file mein config update karo:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com"
};
```

> **Kahaan milega?** Firebase Console → Project Settings → Your apps → Web app

### 3c. App Check Configure Karo

`src/firebase.js` mein reCAPTCHA v3 site key update karo:
```javascript
new ReCaptchaV3Provider('YOUR_RECAPTCHA_V3_SITE_KEY')
```
Site key milega: Google reCAPTCHA admin console → Your site → Keys

---

## Step 4: VAPID Key for Push Notifications

`src/App.jsx` mein, `setupNotifications()` function mein:
```javascript
const token = await getToken(messaging, {
  vapidKey: 'YOUR_VAPID_KEY',
  serviceWorkerRegistration: registration
});
```

VAPID key milegi: Firebase Console → Project Settings → Cloud Messaging → Web Push certificates

---

## Step 5: Firebase CLI Login Karo

```bash
firebase login
firebase use localpill-upcharmitra   # ya apna project ID
```

---

## Step 6: Functions Dependencies Install Karo

```bash
cd functions
npm install
cd ..
```

---

## Step 7: Local Development Server Start Karo

### Option A: Sirf Frontend (recommended for UI work)

```bash
npm run dev
```

App khulega: `http://localhost:5173`

> **Note**: Yeh live Firebase project se connect karega (real data). Alag test environment ke liye emulators use karo.

### Option B: Firebase Emulators (full local environment)

```bash
firebase emulators:start
```

Yeh start karta hai:
| Service | Port |
|---------|------|
| Firestore | 8080 |
| Auth | 9099 |
| Functions | 5001 |
| Storage | 9199 |
| Realtime DB | 9000 |
| Emulator UI | 4000 |

**Emulator ke saath frontend connect karne ke liye**, `src/firebase.js` mein:
```javascript
// Development only — comment out in production
import { connectFirestoreEmulator } from 'firebase/firestore'
import { connectAuthEmulator } from 'firebase/auth'
connectFirestoreEmulator(db, 'localhost', 8080)
connectAuthEmulator(auth, 'http://localhost:9099')
```

---

## Step 8: Build Verification

```bash
npm run build
```

Agar build successful → `dist/` folder create hoga.

---

## Available npm Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| Dev Server | `npm run dev` | Local development |
| Production Build | `npm run build` | Optimized build |
| Preview Build | `npm run preview` | Preview production build locally |
| Generate Sitemap | `npm run sitemap` | `sitemap.xml` auto-generate |
| Lint | `npm run lint` | ESLint check |

---

## VS Code Recommended Extensions

- **ES7+ React/Redux/React-Native snippets**
- **Prettier - Code formatter**
- **Firebase Explorer**
- **GitLens**

---

## Common Issues & Solutions

| Problem | Solution |
|---------|---------|
| `firebase: command not found` | Run `npm install -g firebase-tools` |
| App Check error on localhost | Temporarily disable App Check in dev: set `self.FIREBASE_APPCHECK_DEBUG_TOKEN = true` in browser console |
| OTP not receiving | Phone Auth is production-only — use Firebase test phone numbers in Auth console |
| Map not loading | Check browser console for Leaflet CSS import errors |
| Push notifications not working | Must be on HTTPS or localhost; check VAPID key |
