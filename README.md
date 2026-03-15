<div align="center">

# 💊 LocalPill

### *Find medicines near you — instantly.*

[![Firebase](https://img.shields.io/badge/Backend-Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![React](https://img.shields.io/badge/Web-React%2018-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Expo](https://img.shields.io/badge/Mobile-Expo%20%2F%20React%20Native-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![Vite](https://img.shields.io/badge/Bundler-Vite%205-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Runtime-Node.js%2018-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-Proprietary-red?style=for-the-badge)](#-license)

---

**LocalPill** is a hyperlocal medicine discovery platform that connects patients to nearby pharmacies in real time.  
No ordering. No delivery. Just instant availability checks — the fastest way to find your medicine.

[🌐 Visit Website](https://localpill.com) · [📄 Documentation](docs/) · [🐛 Report Bug](https://github.com/ajitbuilds/localpill/issues)

</div>

---

## 📋 Table of Contents

- [Problem Statement](#-problem-statement)
- [How It Works](#-how-it-works)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Data Flow](#-data-flow)
- [Tech Stack](#️-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Cloud Functions](#️-cloud-functions)
- [Database Schema](#-database-schema)
- [Security](#-security)
- [Documentation](#-documentation)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Problem Statement

> *"Which nearby pharmacy has my medicine in stock right now?"*

Patients across India waste hours calling multiple pharmacies or visiting stores physically — only to find the medicine is out of stock. Independent pharmacies on the other hand, don't have a digital channel to capture this local demand at the moment of need.

**LocalPill bridges this gap** by broadcasting a single patient search to all nearby verified pharmacies simultaneously and delivering real-time responses.

---

## 🔄 How It Works

```
 ┌──────────────────────────────────────────────────────────────────────────┐
 │                                                                         │
 │   👤 Patient                    ☁️ Cloud                    💊 Pharmacy   │
 │                                                                         │
 │   1. Opens app/website          │                                       │
 │   2. Types medicine name        │                                       │
 │   3. Shares location   ───────► 4. Backend finds nearby     5. Gets     │
 │                                    verified & online    ──► notification│
 │                                    pharmacies (geohash)                 │
 │                                                                         │
 │   8. Views all responses ◄───── 7. Updates request     ◄── 6. Responds │
 │      from pharmacies               in real-time             "Available" │
 │                                                                         │
 │   9. Opens chat with     ═══════════════════════════════  10. Chats     │
 │      chosen pharmacy        (Real-time RTDB chat)          with patient │
 │                                                                         │
 │   11. Visits pharmacy 🚶                                                │
 │                                                                         │
 └──────────────────────────────────────────────────────────────────────────┘
```

**Key principle**: LocalPill is an **enquiry-based** platform, not an e-commerce or delivery service. Patients check medicine availability and then visit the pharmacy themselves. This keeps the platform lightweight and legally compliant with Indian pharmaceutical regulations.

---

## ✨ Key Features

<table>
<tr>
<td width="50%" valign="top">

### 🔍 For Patients (Customer App + Web)
- **Medicine Search** — Type medicine names or upload prescription photo
- **Auto Location** — GPS-based nearby pharmacy discovery
- **Real-time Tracking** — Watch as pharmacies respond live
- **Smart Results** — Responses grouped by availability (Available / Partial / Not Available)
- **In-app Chat** — Direct real-time messaging with pharmacies
- **Request History** — Re-run previous searches with one tap
- **Push Notifications** — Instant alerts when a pharmacy responds
- **Bilingual** — English + Hindi (हिन्दी) support
- **Offline Resilient** — Graceful offline state handling

</td>
<td width="50%" valign="top">

### 💊 For Pharmacies (Pharmacy App + Web)
- **Request Inbox** — See nearby patient requests in real-time
- **One-tap Response** — Available / Partial / Not Available
- **Online/Offline Toggle** — Control when to receive requests
- **Performance Scores** — Fast responder & reliability tracking
- **Chat with Patients** — Real-time messaging with prescription sharing
- **Verification System** — Admin-verified badge builds trust
- **Profile Management** — Store info, license, photos, hours
- **Push Notifications** — Instant alerts for new nearby requests
- **Bilingual** — English + Hindi support

</td>
</tr>
<tr>
<td colspan="2">

### 🛡️ For Platform Admins (Web Dashboard)
- **Pharmacy Verification** — Review and approve/suspend pharmacy accounts
- **Live Analytics** — Request volume, response rates, active pharmacies
- **User Management** — Suspend abusive users, force-close requests
- **Live Map** — See all pharmacies and activity geographically
- **Broadcast Messaging** — Send platform-wide announcements via FCM
- **Configurable Settings** — Adjust search radius, request timeout without redeploy
- **Matching Logs** — Debug the geospatial matching algorithm per request

</td>
</tr>
</table>

---

## 🏗️ System Architecture

```
                            ┌─────────────────────────────────────────┐
                            │              CLIENT LAYER               │
                            │                                         │
                            │  🌐 Web App        📱 Customer App      │
                            │  React + Vite      Expo / React Native  │
                            │  (PWA)                                  │
                            │                    💊 Pharmacy App       │
                            │                    Expo / React Native  │
                            └──────────────┬──────────────────────────┘
                                           │
                                    Firebase SDKs
                                           │
               ┌───────────────────────────┼───────────────────────────┐
               │                           │                           │
               ▼                           ▼                           ▼
    ┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
    │  Cloud Firestore │         │ Realtime Database│         │ Cloud Storage   │
    │  ───────────────│         │  ───────────────│         │  ──────────────│
    │  Users           │         │  Chat messages  │         │  Prescriptions │
    │  Pharmacies      │         │  Typing status  │         │  Profile pics  │
    │  Requests        │         │  Read receipts  │         │  License docs  │
    │  Responses       │         │  User presence  │         │                │
    │  Notifications   │         │                 │         │                │
    │  Settings        │         │                 │         │                │
    └────────┬────────┘         └────────┬────────┘         └────────┬───────┘
             │                           │                           │
             │  onCreate / onWrite       │  onWrite triggers         │  Signed URLs
             │  triggers                 │                           │
             ▼                           ▼                           ▼
    ┌─────────────────────────────────────────────────────────────────────────┐
    │                    CLOUD FUNCTIONS (Node.js 18, Gen 2)                  │
    │                                                                         │
    │  ┌─────────────────────┐  ┌────────────────────┐  ┌─────────────────┐  │
    │  │  Request Matching   │  │  Response Scoring  │  │  Chat Notifier  │  │
    │  │  Engine             │  │  & Counter Updates │  │                 │  │
    │  └─────────────────────┘  └────────────────────┘  └─────────────────┘  │
    │  ┌─────────────────────┐  ┌────────────────────┐  ┌─────────────────┐  │
    │  │  Expired Request    │  │  Geohash Updater   │  │  Admin Broadcast│  │
    │  │  Auto-Closer        │  │  (Location Sync)   │  │  & Notifications│  │
    │  └─────────────────────┘  └────────────────────┘  └─────────────────┘  │
    └──────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   ▼
                          ┌─────────────────┐
                          │       FCM        │
                          │  Push Notifs     │
                          │  ─────────────── │
                          │  Browser / PWA   │
                          │  Android / iOS   │
                          └─────────────────┘
```

---

## 🔀 Data Flow

### Medicine Search → Pharmacy Response → Chat

```
Patient searches medicine
        │
        ├─ 1. Captures GPS location
        ├─ 2. Creates Firestore document in `medicineRequests`
        │
        ▼
Cloud Function: processMedicineRequestV2  (auto-triggered)
        │
        ├─ 3. Computes geohash bounding boxes from patient location
        ├─ 4. Parallel Firestore queries across geohash ranges
        ├─ 5. Filters: isOnline=true, isVerified=true, within radius
        ├─ 6. Sorts by: distance → fast responder score → reliability
        ├─ 7. Selects top 20 pharmacies
        ├─ 8. Sends FCM push notification to all 20
        └─ 9. Updates request with targetPharmacyIds, notifiedCount
                │
                ▼
Pharmacy receives push notification → Opens request
        │
        ├─ 10. Reviews medicine names + prescription
        ├─ 11. Responds: "Available" / "Partial" / "Not Available"
        │
        ▼
Cloud Function: processPharmacyResponse  (auto-triggered)
        │
        ├─ 12. Calculates responseTimeSec
        ├─ 13. Updates pharmacy fast responder + reliability scores
        ├─ 14. Increments request responsesCount (atomic transaction)
        ├─ 15. Sends FCM notification to patient
        └─ 16. Creates in-app notification for patient
                │
                ▼
Patient sees live pharmacy responses via Firestore onSnapshot
        │
        ├─ 17. Patient selects a pharmacy → Opens chat
        │
        ▼
Real-time Chat  (Firebase Realtime Database)
        │
        ├─ 18. Messages sync in < 1 second
        ├─ 19. Typing indicators + read receipts
        ├─ 20. Prescription sharing via chat
        └─ 21. Cloud Function sends FCM for each new message
```

### Geospatial Matching (How Nearby Pharmacies Are Found)

LocalPill uses **geohash-based proximity search** because Firestore doesn't support native geospatial range queries. Here's how it works:

```
Patient location: (lat: 25.5941, lng: 85.1376)    // Patna, Bihar
Search radius: 5 km

Step 1: geohashQueryBounds([25.5941, 85.1376], 5000)
        → Returns bounding hash ranges: [["tun0", "tun4"], ["tun8", "tunc"]]

Step 2: Parallel Firestore queries per range
        pharmacies.orderBy('geohash').startAt("tun0").endAt("tun4")
        → Fetches all pharmacies in each geohash bounding box

Step 3: Exact distance filter (in-memory)
        distanceBetween(pharmacyLocation, patientLocation) <= 5 km
        → Removes pharmacies outside the actual circle

Step 4: Business rules filter
        isVerified == true && isOnline == true && !isSuspended

Step 5: Sort
        Primary:   distance ASC       (closest first)
        Secondary: fastResponderScore DESC  (fast responders preferred)
        Tertiary:  reliabilityScore DESC    (consistent responders preferred)

Step 6: Top 20 selected → FCM notifications sent
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Web Frontend** | React 18, Vite 5, React Router v7 | Single-page PWA with client routing |
| **Web UI** | Framer Motion, Leaflet, Recharts | Animations, maps, analytics charts |
| **Web SEO** | React Helmet Async, Sitemap Generator | Dynamic meta tags, search indexing |
| **Mobile Apps** | Expo SDK 52, React Native, Expo Router | Cross-platform iOS/Android apps |
| **Mobile Maps** | React Native Maps | Native map experience |
| **Backend** | Firebase Cloud Functions v2 (Node.js 18) | Serverless business logic |
| **Primary Database** | Cloud Firestore | Users, pharmacies, requests, responses |
| **Real-time Database** | Firebase RTDB | Chat messages, typing, presence |
| **Authentication** | Firebase Auth (Phone OTP) | Passwordless phone-based login |
| **File Storage** | Firebase Cloud Storage | Prescriptions, profile pics, licenses |
| **Push Notifications** | Firebase Cloud Messaging (FCM) | Web push, Android, iOS notifications |
| **Analytics** | Firebase Analytics, Crashlytics | Usage tracking, crash reporting |
| **Geolocation** | Geofire Common | Geohash-based proximity search |
| **Image Processing** | Browser Image Compression | Client-side image optimization |
| **i18n** | i18next | Multi-language (English + Hindi) |
| **CI/CD** | GitHub Actions | Automated checks |

---

## 📁 Project Structure

```
localpill/
│
├── 🌐 Web Application
│   ├── src/                                 # React source code
│   │   ├── App.jsx                          # Root component, routing, auth state
│   │   ├── firebase.js                      # Firebase client initialization
│   │   │
│   │   ├── FindMedicine.jsx                 # Medicine search & request creation
│   │   ├── ResultsScreen.jsx                # Live pharmacy responses view
│   │   ├── ChatScreen.jsx                   # Real-time patient ↔ pharmacy chat
│   │   │
│   │   ├── DashboardUser.jsx                # Patient home dashboard
│   │   ├── DashboardPharmacy.jsx            # Pharmacy partner dashboard
│   │   ├── DashboardAdmin.jsx               # Admin control panel
│   │   │
│   │   ├── LandingUser.jsx                  # Patient marketing landing page
│   │   ├── LandingPartner.jsx               # Pharmacy partner landing page
│   │   │
│   │   ├── Login.jsx / Otp.jsx              # Phone OTP authentication
│   │   ├── PatientSetup.jsx                 # First-time patient onboarding
│   │   ├── PharmacySetup.jsx                # First-time pharmacy setup
│   │   ├── PharmacyProfile.jsx              # Pharmacy profile management
│   │   │
│   │   ├── RequestHistory.jsx               # Past requests & re-search
│   │   ├── PatientHistory.jsx               # Patient request timeline
│   │   │
│   │   ├── components/                      # Shared UI components
│   │   │   ├── ui/                          # Button, Card, Badge primitives
│   │   │   ├── admin/                       # Admin analytics, pharmacies, requests
│   │   │   ├── chat/                        # Chat message, input bar, header
│   │   │   ├── Toast.jsx                    # Toast notification system
│   │   │   ├── Skeleton.jsx                 # Loading skeleton states
│   │   │   ├── PharmacyMap.jsx              # Leaflet map component
│   │   │   └── ErrorBoundary.jsx            # React error boundary
│   │   │
│   │   ├── hooks/                           # Custom React hooks
│   │   └── styles/                          # Design tokens & global CSS
│   │
│   ├── public/                              # Static assets & PWA files
│   ├── index.html                           # HTML entry point
│   ├── vite.config.js                       # Vite bundler configuration
│   └── package.json                         # Web dependencies
│
├── ☁️  Cloud Functions
│   ├── functions/
│   │   └── index.js                         # All serverless functions (Gen 2)
│   │       ├── processMedicineRequestV2     # Geospatial matching engine
│   │       ├── processPharmacyResponse      # Response scoring & notifications
│   │       ├── notifyNewChatMessage         # Chat push notification bridge
│   │       ├── closeExpiredRequests         # Scheduled request cleanup
│   │       ├── onPharmacyLocationUpdate     # Auto geohash computation
│   │       ├── generateSignedPrescriptionUrl # Secure file access
│   │       └── broadcastToPharmacies        # Admin mass notifications
│   │
│   ├── firestore.rules                      # Firestore security rules
│   ├── storage.rules                        # Storage security rules
│   ├── database.rules.json                  # RTDB security rules
│   ├── firestore.indexes.json               # Composite index definitions
│   └── firebase.json                        # Firebase project config
│
├── 📱 Mobile Applications
│   └── localpill-mobile/
│       ├── customer-app/                    # Patient mobile app (Expo)
│       │   ├── app/                         # Expo Router screens
│       │   │   ├── (tabs)/                  # Tab navigation (Home, Search, History, Map, Profile)
│       │   │   ├── login.tsx / otp.tsx       # Authentication flow
│       │   │   ├── setup.tsx                 # Patient onboarding
│       │   │   ├── request/[id].tsx          # Live request tracking
│       │   │   ├── chat.tsx                  # Patient chat
│       │   │   └── pharmacy/[id].tsx         # Pharmacy detail view
│       │   ├── components/                  # Mobile UI components
│       │   ├── contexts/                    # Auth & Location contexts
│       │   ├── hooks/                       # Push notifications, analytics
│       │   ├── utils/                       # Geocoding, validation, retry logic
│       │   └── locales/                     # EN + HI translations
│       │
│       ├── pharmacy-app/                    # Pharmacy partner mobile app (Expo)
│       │   ├── app/                         # Expo Router screens
│       │   │   ├── (tabs)/                  # Tab navigation (Dashboard, Explore, Profile)
│       │   │   ├── login.tsx / otp.tsx       # Authentication flow
│       │   │   ├── setup.tsx                 # Pharmacy onboarding
│       │   │   ├── request/[id].tsx          # Request detail & response
│       │   │   └── chat.tsx                  # Pharmacy chat
│       │   ├── components/                  # Mobile UI components
│       │   ├── hooks/                       # Push notifications, presence
│       │   └── locales/                     # EN + HI translations
│       │
│       └── assets/                          # Shared map marker images
│
└── 📄 Documentation
    └── docs/                                # Full project documentation
        ├── 01_setup_and_local_dev_guide.md   # Developer setup
        ├── 02_deployment_guide.md            # Production deployment
        ├── 03_database_schema_reference.md   # Data models
        ├── 04_firestore_rules_documentation.md
        ├── 05_architecture_overview.md       # System design deep dive
        ├── 06_user_manual_patient.md         # Patient user guide
        ├── 07_user_manual_pharmacy.md        # Pharmacy user guide
        ├── 08_admin_manual.md                # Admin operations guide
        ├── 09_c4_style_diagrams.md           # C4 architecture diagrams
        ├── 10_prd_website.md                 # Website PRD
        ├── 11_prd_customer_app.md            # Customer App PRD
        └── 12_prd_pharmacy_app.md            # Pharmacy App PRD
```

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | ≥ 18 | [nodejs.org](https://nodejs.org) |
| npm | ≥ 9 | Comes with Node.js |
| Git | Any | [git-scm.com](https://git-scm.com) |
| Firebase CLI | Latest | `npm install -g firebase-tools` |
| Expo CLI | Latest | `npx expo` (no global install needed) |

### 1. Clone & Install

```bash
git clone https://github.com/ajitbuilds/localpill.git
cd localpill
```

### 2. Web App (React + Vite)

```bash
# Install dependencies
npm install

# Start development server (localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### 3. Customer Mobile App

```bash
cd localpill-mobile/customer-app
npm install

# Start Expo development server
npx expo start

# Run on Android device/emulator
npx expo run:android

# Run on iOS simulator
npx expo run:ios
```

### 4. Pharmacy Mobile App

```bash
cd localpill-mobile/pharmacy-app
npm install

# Start Expo development server
npx expo start

# Run on Android device/emulator
npx expo run:android
```

### 5. Cloud Functions

```bash
cd functions
npm install

# Deploy all functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:processMedicineRequestV2
```

### 6. Firebase Emulators (Local Development)

```bash
firebase emulators:start
```

| Service | Port |
|---------|------|
| Firestore | 8080 |
| Auth | 9099 |
| Functions | 5001 |
| Storage | 9199 |
| Realtime DB | 9000 |
| Emulator UI | 4000 |

> 📖 For detailed setup, see [Setup & Local Dev Guide](docs/01_setup_and_local_dev_guide.md)

---

## ☁️ Cloud Functions

All serverless functions are in `functions/index.js`, running on **Cloud Functions v2 (Gen 2)**.

| Function | Trigger | Description |
|----------|---------|-------------|
| `processMedicineRequestV2` | Firestore `onCreate` | Core matching engine — finds nearby pharmacies, sends FCM notifications |
| `processPharmacyResponse` | Firestore `onCreate` | Processes response, updates scores, notifies patient |
| `notifyNewChatMessage` | RTDB `onWrite` | Sends push notification for new chat messages |
| `closeExpiredRequests` | Scheduled (cron) | Auto-closes requests past their timeout |
| `onPharmacyLocationUpdate` | Firestore `onUpdate` | Recomputes geohash when pharmacy location changes |
| `generateSignedPrescriptionUrl` | HTTPS callable | Creates secure time-limited URLs for prescription access |
| `broadcastToPharmacies` | HTTPS callable | Admin sends mass FCM notifications to pharmacy network |
| `sendTestFCM` | HTTPS callable | Admin FCM diagnostic tool |
| `getPublicStats` | HTTPS callable | Returns public platform statistics |
| `exchangeCustomToken` | HTTPS callable | Auth bridge for mobile ↔ web session sharing |
| `syncAdminRoleToRTDB` | Firestore `onUpdate` | Syncs admin role to RTDB for chat authorization |
| `remindProfileCompletion` | Scheduled | Nudges users to complete their profiles |
| `remindPharmacyStatus` | Scheduled | Reminds inactive pharmacies to go online |

---

## 🗄️ Database Schema

### Firestore Collections

```
firestore/
├── users/{uid}                        # All registered users (role, name, phone, fcmToken)
├── pharmacies/{uid}                   # Pharmacy profiles (location, geohash, scores, verification)
├── medicineRequests/{requestId}       # Core request entity (medicines, location, status, responses)
│   └── pharmacyResponses/{pharmacyId} # Individual pharmacy responses (sub-collection)
├── notifications/{uid}
│   └── userNotifications/{notifId}    # In-app notification store
├── settings/platformSettings          # Admin-configurable platform settings
├── matchingLogs/{requestId}           # Debug: matching algorithm audit trail
└── functionErrors/{autoId}            # Debug: Cloud Function error log
```

### Realtime Database

```
rtdb/
├── chats/{requestId}_{pharmacyId}/    # Chat messages (text, timestamps, prescription sharing)
└── presence/{uid}                     # Online/offline presence tracking
```

### Cloud Storage

```
storage/
├── prescriptions/{userId}/{timestamp}.jpg    # Patient prescriptions (signed-URL access only)
├── profilePics/{userId}/{timestamp}.jpg      # Pharmacy profile pictures
└── licenses/{userId}/{filename}.pdf          # Pharmacy license documents
```

> 📖 For full schema with field types and indexes, see [Database Schema Reference](docs/03_database_schema_reference.md)

---

## 🔐 Security

| Layer | Implementation |
|-------|---------------|
| **Authentication** | Phone OTP via Firebase Auth — no passwords, no email required |
| **Access Control** | Role-based (Patient / Pharmacy / Admin) enforced in Firestore Security Rules |
| **Prescription Privacy** | Direct Storage access blocked; only accessible via time-limited signed URLs generated by Cloud Functions |
| **Data Isolation** | Patients can only read their own requests; pharmacies can only see requests they're targeted for |
| **Score Integrity** | `fastResponderScore` and `reliabilityScore` are computed server-side only (Cloud Functions) to prevent tampering |
| **Suspension System** | Admin can suspend users/pharmacies; suspended accounts are blocked at Auth level and Security Rules level |
| **App Check** | reCAPTCHA v3 integration on web to prevent automated abuse |
| **Chat Security** | RTDB rules ensure only request participants can read/write chat messages |

---

## 📚 Documentation

LocalPill has comprehensive documentation covering setup, architecture, user guides, and product requirements:

| # | Document | Description |
|---|----------|-------------|
| 01 | [Setup & Local Dev Guide](docs/01_setup_and_local_dev_guide.md) | Complete developer environment setup |
| 02 | [Deployment Guide](docs/02_deployment_guide.md) | Production deployment procedures |
| 03 | [Database Schema Reference](docs/03_database_schema_reference.md) | Complete Firestore, RTDB, and Storage data models |
| 04 | [Firestore Rules Documentation](docs/04_firestore_rules_documentation.md) | Security rules breakdown and testing |
| 05 | [Architecture Overview](docs/05_architecture_overview.md) | System design, data flows, and design decisions |
| 06 | [Patient User Manual](docs/06_user_manual_patient.md) | End-user guide for patients |
| 07 | [Pharmacy User Manual](docs/07_user_manual_pharmacy.md) | End-user guide for pharmacy partners |
| 08 | [Admin Manual](docs/08_admin_manual.md) | Admin dashboard operations guide |
| 09 | [C4 Architecture Diagrams](docs/09_c4_style_diagrams.md) | Mermaid-based system context, container, and component diagrams |
| 10 | [Website PRD](docs/10_prd_website.md) | Product requirements for web application |
| 11 | [Customer App PRD](docs/11_prd_customer_app.md) | Product requirements for patient mobile app |
| 12 | [Pharmacy App PRD](docs/12_prd_pharmacy_app.md) | Product requirements for pharmacy partner app |

---

## ⚡ Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Phone-only Auth (No passwords)** | Phone number is the primary identity in India. OTP eliminates password management and reduces account takeover risk. |
| **Enquiry Model (Not ordering/delivery)** | Medicine delivery regulations in India are strict. Enquiry-only model (availability check) is legally safer and connects patients to local pharmacies without legal risk. |
| **Firestore + RTDB Hybrid** | Firestore for structured data (queries, security rules). RTDB for chat (sub-second message delivery needed). Best of both worlds. |
| **Geohash-based Search** | Firestore doesn't support native geo-queries. Geohash strings enable efficient `startAt/endAt` range queries for proximity search. |
| **Server-side Scoring** | Pharmacy scores (`fastResponder`, `reliability`) computed in Cloud Functions only — prevents client-side tampering. |
| **React.lazy() Code Splitting** | Admin dashboard, debug tools, and heavy screens are lazy-loaded. Keeps initial bundle small for regular patient usage. |
| **Top 20 Pharmacy Limit** | Balances notification reach with FCM costs and pharmacy notification fatigue. Sorted by distance + score ensures quality. |

---

## 🌍 Supported Languages

| Language | Code | Coverage |
|----------|------|----------|
| 🇬🇧 English | `en` | Full |
| 🇮🇳 Hindi (हिन्दी) | `hi` | Full |

Both mobile apps and web app support real-time language switching.

---

## 🤝 Contributing

This is currently a private project. If you're interested in contributing or have suggestions, please [open an issue](https://github.com/ajitbuilds/localpill/issues) or reach out to the team.

---

## 📄 License

This project is proprietary software. All rights reserved.  
© 2026 LocalPill. Unauthorized use, distribution, or modification is prohibited.

---

<div align="center">

**Built with ❤️ in India 🇮🇳**

*Making local medicine discovery simple, fast, and reliable — one search at a time.*

[![Startup India](https://img.shields.io/badge/Recognized%20by-Startup%20India-blue?style=flat-square)](https://www.startupindia.gov.in/)
[![Startup Bihar](https://img.shields.io/badge/Supported%20by-Startup%20Bihar-orange?style=flat-square)](https://startup.bihar.gov.in/)

</div>
