# LocalPill — C4 Style Architecture Diagrams

Last updated: 2026-03-10

Yeh document LocalPill system ka C4-style visual view deta hai:
- Level 1: System Context
- Level 2: Container
- Level 3: Component (Cloud Functions)

---

## C4 Level 1 — System Context

```mermaid
flowchart LR
    patient[Patient]
    pharmacy[Pharmacy Partner]
    admin[Platform Admin]

    system[LocalPill Platform<br/>(Medicine discovery, matching, chat, notifications)]

    auth[Firebase Auth]
    fs[Cloud Firestore]
    rtdb[Realtime Database]
    storage[Firebase Storage]
    fcm[Firebase Cloud Messaging]

    patient -->|Search medicine, track responses, chat| system
    pharmacy -->|Go online, respond, chat with patient| system
    admin -->|Verify pharmacies, monitor ops, broadcast alerts| system

    system -->|Phone OTP auth, sessions| auth
    system -->|Users, pharmacies, requests, responses, notifications| fs
    system -->|Chat messages, typing, read receipts, presence| rtdb
    system -->|Prescriptions and media files| storage
    system -->|Push notifications to web/mobile| fcm
```

---

## C4 Level 2 — Container Diagram

```mermaid
flowchart TB
    subgraph clients[Client Applications]
        web[Web App (React + Vite + PWA)]
        cust[Customer App (Expo React Native)]
        pharm[Pharmacy App (Expo React Native)]
    end

    subgraph backend[LocalPill Backend on Firebase]
        cf[Cloud Functions (Node.js)]
        fs[Cloud Firestore]
        rtdb[Realtime Database]
        storage[Firebase Storage]
    end

    auth[Firebase Auth]
    fcm[Firebase Cloud Messaging]

    web -->|OTP login + token refresh| auth
    cust -->|OTP login| auth
    pharm -->|OTP login| auth

    web -->|Read/write core business data| fs
    cust -->|Read/write core business data| fs
    pharm -->|Read/write core business data| fs

    web -->|Chat + presence| rtdb
    cust -->|Chat + presence| rtdb
    pharm -->|Chat + presence| rtdb

    web -->|Upload/view prescriptions| storage
    cust -->|Upload/view prescriptions| storage
    pharm -->|Upload/view prescriptions| storage

    fs -->|onCreate/onWrite triggers| cf
    rtdb -->|onCreate chat trigger| cf

    cf -->|Update counters/scores, notifications, matching logs| fs
    cf -->|Register chat members / admin sync| rtdb
    cf -->|Generate signed prescription URLs| storage
    cf -->|Send push notifications| fcm

    web -->|Foreground + SW push| fcm
    cust -->|Device push| fcm
    pharm -->|Device push| fcm
```

---

## C4 Level 3 — Component Diagram (Cloud Functions Container)

```mermaid
flowchart LR
    subgraph functions[Cloud Functions (functions/index.js)]
        c1[processMedicineRequestV2<br/>Request Matching Engine]
        c2[processPharmacyResponse<br/>Response Processor + Scoring]
        c3[notifyNewChatMessage<br/>Chat Notification Bridge]
        c4[closeExpiredRequests<br/>Timeout Scheduler]
        c5[onPharmacyLocationUpdate<br/>Geohash Maintainer]
        c6[generateSignedPrescriptionUrl<br/>Secure File Access]
        c7[broadcastToPharmacies / broadcastToUsers / sendTestFCM<br/>Admin Notification APIs]
        c8[getPublicStats / exchangeCustomToken<br/>Public + Auth Bridge APIs]
        c9[syncAdminRoleToRTDB<br/>Role Sync Adapter]
        c10[remindProfileCompletion / remindPharmacyStatus / remindUnansweredRequests<br/>Engagement Schedulers]
    end

    fs[Cloud Firestore]
    rtdb[Realtime Database]
    storage[Firebase Storage]
    fcm[Firebase Cloud Messaging]
    auth[Firebase Auth]

    c1 --> fs
    c1 --> fcm

    c2 --> fs
    c2 --> fcm

    c3 --> fs
    c3 --> rtdb
    c3 --> fcm

    c4 --> fs
    c5 --> fs

    c6 --> fs
    c6 --> storage

    c7 --> fs
    c7 --> fcm

    c8 --> fs
    c8 --> auth

    c9 --> fs
    c9 --> rtdb

    c10 --> fs
    c10 --> fcm
```

---

## Notes

- Primary web/backend request collection: `medicineRequests`.
- Rules and indexes also include compatibility paths like `medicine_requests`; legacy artifacts like `requests` still exist in some mobile code paths.
- Chat source of truth is RTDB path: `chats/{chatId}/messages`.
