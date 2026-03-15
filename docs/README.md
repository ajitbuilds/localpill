# LocalPill — Documentation Index

> **Project**: LocalPill — Medicine Availability Enquiry Platform
> **Version**: v2.0 Pro
> **Last Updated**: February 2026

---

## 📚 Document List

| # | File | Description | Audience |
|---|------|-------------|----------|
| 01 | [Setup & Local Dev Guide](./01_setup_and_local_dev_guide.md) | Project setup, prerequisites, local run, emulators | Developers |
| 02 | [Deployment Guide](./02_deployment_guide.md) | Frontend + Functions + Rules deploy, rollback | Developers / DevOps |
| 03 | [Database Schema Reference](./03_database_schema_reference.md) | Firestore + RTDB + Storage complete schema | Developers |
| 04 | [Firestore Rules Documentation](./04_firestore_rules_documentation.md) | Security rules — every rule explained | Developers / Security |
| 05 | [Architecture Overview](./05_architecture_overview.md) | System design, data flows, design decisions | Developers / Investors |
| 06 | [Patient User Manual](./06_user_manual_patient.md) | How to use the app as a patient | End Users |
| 07 | [Pharmacy Partner Manual](./07_user_manual_pharmacy.md) | How to register & use as a pharmacy | Pharmacy Partners |
| 08 | [Admin Panel Manual](./08_admin_manual.md) | How to manage the platform as admin | Administrators |
| 09 | [C4 Style Diagrams](./09_c4_style_diagrams.md) | Context, container, and component diagrams | Developers / Architects |
| 10 | [Website PRD](./10_prd_website.md) | Product requirements for LocalPill web platform and PWA | Product / Founders / Developers |
| 11 | [Customer App PRD](./11_prd_customer_app.md) | Product requirements for patient-facing mobile app | Product / Founders / Mobile Team |
| 12 | [Pharmacy App PRD](./12_prd_pharmacy_app.md) | Product requirements for pharmacy partner mobile app | Product / Founders / Mobile Team |

---

## 📂 Aur Documents (Brain Folder mein)

| File | Description |
|------|-------------|
| [localpill_complete_feature_guide.md](../../../.gemini/antigravity/brain/3d9070ce-621e-4cf8-a508-33183ad4a507/localpill_complete_feature_guide.md) | Full product feature documentation |
| [localpill_frontend_code_documentation.md](../../../.gemini/antigravity/brain/3d9070ce-621e-4cf8-a508-33183ad4a507/localpill_frontend_code_documentation.md) | Frontend code reference (every component) |
| [localpill_backend_code_documentation.md](../../../.gemini/antigravity/brain/3d9070ce-621e-4cf8-a508-33183ad4a507/localpill_backend_code_documentation.md) | Backend Cloud Functions reference |

---

## 🛠 Quick Reference

### Start local development
```bash
npm install
npm run dev
```

### Deploy everything
```bash
npm run build
firebase deploy
```

### Deploy only frontend
```bash
npm run build
firebase deploy --only hosting
```

### Deploy only functions
```bash
firebase deploy --only functions
```

### Deploy only security rules
```bash
firebase deploy --only firestore:rules
```

---

## 🏗 Tech Stack Summary

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, Vanilla CSS |
| Routing | React Router v6 |
| Database | Firebase Firestore |
| Realtime | Firebase RTDB |
| Auth | Firebase Phone Auth (OTP) |
| Storage | Firebase Cloud Storage |
| Push | Firebase FCM |
| Backend | Firebase Cloud Functions (Node.js 18) |
| Maps | Leaflet.js (frontend), Google Maps (admin) |
| Charts | Recharts |
| PWA | Custom Service Worker + Web Manifest |
| Security | Firebase App Check (reCAPTCHA v3) |
