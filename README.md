<div align="center">

# 💊 LocalPill

### *Find medicines near you — instantly.*

[![Firebase](https://img.shields.io/badge/Backend-Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![React](https://img.shields.io/badge/Web-React%2018-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Expo](https://img.shields.io/badge/Mobile-Expo%20%2F%20React%20Native-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![Vite](https://img.shields.io/badge/Bundler-Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-Proprietary-red?style=for-the-badge)](#license)

---

**LocalPill** is a hyperlocal medicine discovery platform that connects patients to nearby pharmacies in real time.  
No ordering. No delivery hassle. Just instant availability checks.

[🌐 Visit Website](https://localpill.com) · [📄 Documentation](docs/) · [🐛 Report Bug](https://github.com/ajitbuilds/localpill/issues)

</div>

---

## 🎯 What Problem Does LocalPill Solve?

> *"Which nearby pharmacy has my medicine in stock right now?"*

Patients waste hours calling multiple pharmacies or visiting stores — only to find the medicine is unavailable. LocalPill eliminates this friction with **one search** that broadcasts to all nearby verified pharmacies simultaneously.

---

## ✨ Key Features

<table>
<tr>
<td width="50%">

### 🔍 For Patients
- Search medicines by name or prescription photo
- Auto-detect location & find nearby pharmacies
- Real-time response tracking
- In-app chat with pharmacies
- Push notification alerts
- Request history & re-search

</td>
<td width="50%">

### 💊 For Pharmacies
- Receive nearby medicine requests instantly
- One-tap response (Available / Partial / Unavailable)
- Online/Offline presence toggle
- Real-time chat with patients
- Performance analytics dashboard
- Verification status & profile management

</td>
</tr>
<tr>
<td colspan="2">

### 🛡️ For Admins
- Pharmacy verification & moderation
- Platform analytics & live map
- User & request management
- Broadcast messaging
- Configurable platform settings (radius, timeout, etc.)

</td>
</tr>
</table>

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      CLIENTS                            │
│                                                         │
│   🌐 Web App (PWA)     📱 Customer App    💊 Pharmacy App │
│   React + Vite         Expo / RN          Expo / RN     │
└──────────────┬──────────────┬──────────────┬────────────┘
               │              │              │
               ▼              ▼              ▼
┌─────────────────────────────────────────────────────────┐
│                   FIREBASE BACKEND                      │
│                                                         │
│   🔐 Auth (OTP)        📦 Firestore       💬 RTDB       │
│   ☁️  Cloud Functions   📁 Storage         📣 FCM        │
│   📊 Analytics         🔒 Security Rules               │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
localpill/
│
├── 🌐 src/                          # Web application (React + Vite)
│   ├── components/                  # Reusable UI components
│   ├── hooks/                       # Custom React hooks
│   ├── styles/                      # Design tokens & CSS
│   ├── App.jsx                      # Main app with routing
│   └── firebase.js                  # Firebase client config
│
├── ☁️  functions/                    # Firebase Cloud Functions (v2)
│   └── index.js                     # All serverless functions
│
├── 📱 localpill-mobile/             # Mobile applications
│   ├── customer-app/                # Patient-facing mobile app
│   │   ├── app/                     # Expo Router screens
│   │   ├── components/              # Shared mobile components
│   │   ├── contexts/                # React contexts (Auth, Location)
│   │   ├── hooks/                   # Custom hooks
│   │   ├── utils/                   # Utility functions
│   │   └── locales/                 # i18n translations (EN, HI)
│   │
│   └── pharmacy-app/                # Pharmacy partner mobile app
│       ├── app/                     # Expo Router screens
│       ├── components/              # Shared mobile components
│       ├── hooks/                   # Custom hooks
│       ├── utils/                   # Utility functions
│       └── locales/                 # i18n translations (EN, HI)
│
├── 📄 docs/                         # Project documentation & PRDs
├── 🔒 firestore.rules               # Firestore security rules
├── 🔒 storage.rules                 # Cloud Storage security rules
├── 🔒 database.rules.json           # Realtime Database rules
├── ⚙️  firebase.json                 # Firebase project configuration
└── 🌍 public/                       # Static assets & PWA files
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Web Frontend** | React 18, Vite, Framer Motion, React Router, Recharts |
| **Mobile Apps** | Expo (SDK 52), React Native, Expo Router |
| **Backend** | Firebase Cloud Functions (Node.js, Gen 2) |
| **Database** | Cloud Firestore + Realtime Database |
| **Auth** | Firebase Auth (Phone OTP) |
| **Storage** | Firebase Cloud Storage |
| **Notifications** | Firebase Cloud Messaging (FCM) |
| **Maps** | Leaflet (Web), React Native Maps (Mobile) |
| **Analytics** | Firebase Analytics, Crashlytics |
| **CI/CD** | GitHub Actions |
| **Localization** | i18next (English + Hindi) |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **Firebase CLI** — `npm install -g firebase-tools`
- **Expo CLI** — `npm install -g expo-cli`

### Web App

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

### Mobile Apps

```bash
# Customer App
cd localpill-mobile/customer-app
npm install
npx expo start

# Pharmacy App
cd localpill-mobile/pharmacy-app
npm install
npx expo start
```

### Cloud Functions

```bash
cd functions
npm install

# Deploy functions
firebase deploy --only functions
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [Setup & Local Dev Guide](docs/01_setup_and_local_dev_guide.md) | How to set up the development environment |
| [Deployment Guide](docs/02_deployment_guide.md) | Production deployment steps |
| [Database Schema](docs/03_database_schema_reference.md) | Firestore & RTDB data models |
| [Security Rules](docs/04_firestore_rules_documentation.md) | Firestore rules documentation |
| [Architecture Overview](docs/05_architecture_overview.md) | System design & C4 diagrams |
| [Patient Manual](docs/06_user_manual_patient.md) | End-user guide for patients |
| [Pharmacy Manual](docs/07_user_manual_pharmacy.md) | End-user guide for pharmacies |
| [Admin Manual](docs/08_admin_manual.md) | Admin dashboard guide |
| [Website PRD](docs/10_prd_website.md) | Product requirements — Web |
| [Customer App PRD](docs/11_prd_customer_app.md) | Product requirements — Customer App |
| [Pharmacy App PRD](docs/12_prd_pharmacy_app.md) | Product requirements — Pharmacy App |

---

## 🔐 Security

- **Phone OTP** authentication for all users
- **Role-based access** — Patient, Pharmacy, Admin
- **Firestore Security Rules** enforce data isolation
- **Prescription access** limited to authorized participants
- **No public data exposure** of sensitive user information

---

## 🌍 Supported Languages

- 🇬🇧 English
- 🇮🇳 Hindi (हिन्दी)

---

## 🤝 Contributing

This is a private project. If you'd like to contribute, please reach out to the team.

---

## 📄 License

This project is proprietary software. All rights reserved.  
© 2026 LocalPill. Unauthorized use, distribution, or modification is prohibited.

---

<div align="center">

**Built with ❤️ in India 🇮🇳**

*Making medicine discovery simple, fast, and local.*

</div>
