# 📱 LocalPill Mobile Apps

This directory contains the mobile applications for LocalPill, built with **Expo** and **React Native**.

## Apps

| App | Directory | Description |
|-----|-----------|-------------|
| 🔍 **Customer App** | `customer-app/` | Patient-facing app for medicine search, request tracking, chat, and notifications |
| 💊 **Pharmacy App** | `pharmacy-app/` | Pharmacy partner app for receiving requests, responding, and managing presence |

## Quick Start

```bash
# Customer App
cd customer-app && npm install && npx expo start

# Pharmacy App
cd pharmacy-app && npm install && npx expo start
```

## Shared Assets

The `assets/` directory contains shared map marker images used by both apps.

## Tech Stack

- **Framework**: Expo SDK 52 / React Native
- **Navigation**: Expo Router
- **Backend**: Firebase (Auth, Firestore, RTDB, FCM, Storage)
- **Analytics**: Firebase Analytics + Crashlytics
- **Localization**: i18next (English + Hindi)
- **Auth**: Phone OTP via Firebase
