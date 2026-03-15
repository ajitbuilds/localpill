# LocalPill — System Architecture Overview

> Yeh document LocalPill ka poora system design explain karta hai — components, unke beech ka data flow, aur important design decisions.
> C4-style visual diagrams (Context/Container/Component): `docs/09_c4_style_diagrams.md`

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser/PWA)                       │
│                                                                   │
│   React 18 + Vite    React Router v6    Firebase Web SDK v10     │
│                                                                   │
│   ┌──────────┐  ┌──────────────┐  ┌───────────────────────────┐  │
│   │  Patient  │  │   Pharmacy   │  │       Admin Panel         │  │
│   │  Screens  │  │   Screens    │  │       DashboardAdmin      │  │
│   └──────────┘  └──────────────┘  └───────────────────────────┘  │
└─────────────────────────┬───────────────────────────────────────┘
                          │  Firebase SDK calls
          ┌───────────────┼───────────────────────┐
          │               │                       │
          ▼               ▼                       ▼
┌─────────────┐  ┌─────────────────┐  ┌─────────────────────┐
│  Firestore  │  │ Realtime Database│  │  Firebase Storage   │
│  (Main DB)  │  │  (Chat/Presence) │  │  (Prescriptions)   │
└──────┬──────┘  └────────┬────────┘  └──────────┬──────────┘
       │                  │                       │
       │ triggers         │ triggers              │ signed URL
       ▼                  ▼                       │
┌─────────────────────────────────────────────────┘
│          Google Cloud Functions (Node.js 18)
│
│  processMedicineRequestV2    onPharmacyLocationUpdate
│  processPharmacyResponse     closeExpiredRequests
│  generateSignedPrescriptionUrl  notifyNewChatMessage
│  broadcastToPharmacies       sendTestFCM
└──────────────────────────┬──────────────────────────
                           │
                    ┌──────▼──────┐
                    │     FCM     │
                    │  (Push      │
                    │  Notifications)│
                    └─────────────┘
```

---

## Component Architecture

```
App.jsx (Root)
│
├── Auth State: onAuthStateChanged → role, user, loading
│
├── <ErrorBoundary>          ← Crash fallback
│   └── <HelmetProvider>     ← SEO
│       └── <BrowserRouter>  ← Client routing
│           └── <ToastProvider>  ← Global toasts
│
└── Routes
    ├── / → LandingUser
    ├── /partner → LandingPartner
    ├── /login → Login → Otp
    ├── /dashboard → ProtectedDashboard
    │   ├── role=user → DashboardUser
    │   ├── role=pharmacy → DashboardPharmacy
    │   └── role=admin → DashboardAdmin
    ├── /find → FindMedicine
    ├── /results/:id → ResultsScreen
    ├── /history → RequestHistory
    ├── /chat → ChatScreen
    ├── /profile → PharmacyProfile
    └── [Legal pages]
```

---

## Data Flow: Patient Medicine Search

```
Patient types medicine → FindMedicine.jsx
         │
         │ 1. navigator.geolocation.getCurrentPosition()
         │ 2. addDoc(medicineRequests, { ... })
         ▼
Firestore: medicineRequests/{id} created
         │
         │ onCreate trigger (automatic)
         ▼
Cloud Function: processMedicineRequestV2
         │
         │ 1. geohash bounds → parallel Firestore queries
         │ 2. Filter: isOnline + isVerified + radius
         │ 3. Sort: distance → fastScore → reliability
         │ 4. Top 20 select
         │ 5. FCM multicast → all 20 pharmacies
         │ 6. Update: targetPharmacyIds, notifiedCount
         ▼
Firestore: request updated
         │
         │ onSnapshot in ResultsScreen
         ▼
Patient sees: "X pharmacies notified"
```

---

## Data Flow: Pharmacy Response

```
Pharmacy receives FCM push notification
         │
         │ Opens DashboardPharmacy.jsx
         ▼
RequestList: onSnapshot(medicineRequests WHERE targetPharmacyIds ARRAY_CONTAINS uid)
         │
         │ Pharmacy clicks "Available"
         ▼
setDoc(pharmacyResponses/{requestId}/{pharmacyId}, { responseType: 'available' })
         │
         │ onCreate trigger
         ▼
Cloud Function: processPharmacyResponse
         │
         │ 1. Calculate responseTimeSec
         │ 2. Update responsesCount (transaction)
         │ 3. Update pharmacy scores (transaction)
         │ 4. FCM to patient
         │ 5. In-app notification to patient
         ▼
Patient ResultsScreen: live update via onSnapshot
```

---

## Real-Time Chat Flow

```
Patient ──────────────────────────────────── Pharmacy
   │                                            │
   │ navigate to /chat?id=reqId&pharmacy=pId    │
   │                                            │
   │ Both: onValue(rtdb, 'messages/reqId_pId')  │
   │                                            │
   │ Message send:                              │
   │ push(rtdb, 'messages/reqId_pId', {...})    │
   │         │                                  │
   │         │ RTDB onWrite trigger             │
   │         ▼                                  │
   │  Cloud Function: notifyNewChatMessage      │
   │         │                                  │
   │         │ FCM notification to              │
   │         └──────────────────────────────────► Pharmacy
   │                                            │
   │ (Same process in reverse for pharmacy      │
   │  messages → patient gets FCM)              │
```

---

## Authentication Flow

```
Login.jsx
   │
   │ signInWithPhoneNumber(auth, '+91' + phone, recaptchaVerifier)
   ▼
SMS OTP sent to user
   │
   │ User enters OTP in Otp.jsx
   │ window.confirmationResult.confirm(otpCode)
   ▼
Firebase Auth: user authenticated
   │
   │ App.jsx: onAuthStateChanged fires
   ▼
fetchUserRole(firebaseUser)
   │
   ├── users/{uid} exists?
   │     YES → setRole(role) → redirect to dashboard
   │     NO  → setNeedsSetup(true) → RoleSelection screen
   │
   └── user.isSuspended?
         YES → signOut() + alert
```

---

## Geospatial Matching Algorithm

```
Patient location: (lat, lng)
Search radius: 5 km

Step 1: geohashQueryBounds([lat, lng], 5000)
        → Returns array of [startHash, endHash] ranges
           e.g., ["t3n0", "t3n4"], ["t3n8", "t3nc"]

Step 2: Parallel Firestore queries
        pharmacies.orderBy('geohash').startAt(b[0]).endAt(b[1])
        → Fetch all pharmacies in each geohash range

Step 3: In-memory exact distance filter
        geofire.distanceBetween([pLat, pLng], [reqLat, reqLng])
        → Keep only pharmacies where distKm <= searchRadiusKm

Step 4: Apply business filters
        isVerified == true AND isOnline == true
        (reliabilityScore >= 0)

Step 5: Sort remaining
        Primary:   distanceKm ASC
        Secondary: fastResponderScore DESC
        Tertiary:  reliabilityScore DESC

Step 6: slice(0, 20) → Top 20 notified
```

**Why Geohash?**
Firestore mein `GeoPoint` par directly range query nahi hoti. Geohash ek string hai jo geographic area represent karta hai — `startAt/endAt` se bounding box efficiently fetch hoti hai.

---

## FCM Push Notification Architecture

```
                    Firebase FCM Server
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
         Browser tab    PWA App      Background
         (foreground)   (installed)  Service Worker
              │            │            │
              ▼            ▼            ▼
     In-App toast     System push   System push
     (custom UI)      notification  notification
```

**Token Storage**:
- Patient token: `users/{uid}.fcmToken`
- Pharmacy token: `users/{uid}.fcmToken` + `pharmacies/{uid}.fcmToken` (both)

---

## Key Design Decisions

### 1. Phone-Only Authentication (No Password)
**Rationale**: India mein phone number identity ka primary proof hai. OTP removes password management complexity aur reduces account takeover risk.

### 2. Enquiry-Based Model (Not Order/Delivery)
**Rationale**: Medicine delivery regulations India mein strict hain. Enquiry model (availability check only) legally safer hai aur patients ko local pharmacies se connect karta hai bina legal risk ke.

### 3. No Auto-Match After Single Response
**Rationale**: Pehle pehli `available` response par auto-match hota tha. Yeh patient ko choice nahi deta tha. Ab patient multiple responses dekh aur best pharmacy choose kar sakta hai.

### 4. Firestore + RTDB Hybrid
**Rationale**:
- Firestore: Structured data, complex queries, security rules → perfect for requests, users, pharmacies
- RTDB: Low-latency realtime sync → perfect for chat messages (sub-second delivery needed)

### 5. Cloud Functions for All Scoring
**Rationale**: `fastResponderScore` aur `reliabilityScore` client-side update nahi hone chahiye (tamper risk). Server-side trusted computation ensures integrity.

### 6. React.lazy() Code Splitting
**Rationale**: Admin dashboard, simulators, aur heavy screens initial bundle mein nahi hone chahiye. Lazy loading ensures fast first load for regular users.

### 7. isMounted Ref Pattern
**Rationale**: React 18 StrictMode double-invokes effects. Firebase listeners async state updates karte hain. `isMounted` ref ensures no state update after unmount → no memory leaks.

---

## Performance Considerations

| Area | Optimization |
|------|-------------|
| Initial load | React.lazy() code splitting |
| Firestore reads | `limit()` on all list queries |
| Chat rendering | `React.memo` on ChatMessage component |
| Map rendering | Leaflet lazy loaded only when map visible |
| Analytics | Recharts lazy loaded (heavy library) |
| Offline support | Firestore IndexedDB persistence enabled |
| Image upload | `browser-image-compression` before Storage upload |
