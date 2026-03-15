# LocalPill — Database Schema Reference

> LocalPill do databases use karta hai: **Firestore** (main structured data) aur **Firebase Realtime Database** (real-time chat aur presence).

---

## Part A: Firestore Collections

### Collection Map

```
firestore/
├── users/                      # All registered users
├── pharmacies/                 # Pharmacy profiles
├── medicineRequests/           # Core request entity
│   └── {requestId}/
│       └── pharmacyResponses/   # Pharmacy responses (sub-collection)
├── notifications/              # In-app notification store
│   └── {uid}/
│       └── userNotifications/
├── settings/                  # Platform configuration
├── matchingLogs/              # Debug: matching algorithm logs
├── functionErrors/            # Debug: Cloud Function error trap
└── admin_stats/               # Admin aggregated stats
```

---

### `users/{uid}`

Har registered user ka document. UID = Firebase Auth UID.

| Field | Type | Required | Set By | Description |
|-------|------|----------|--------|-------------|
| `role` | `string` | ✅ | Frontend / Admin | `'user'` \| `'pharmacy'` \| `'admin'` |
| `name` | `string` | ✅ | Frontend | Full name |
| `phone` | `string` | ✅ | App.jsx | `+91XXXXXXXXXX` format |
| `fcmToken` | `string` | ❌ | App.jsx | FCM push token |
| `isSuspended` | `boolean` | ❌ | Admin | `true` = account locked |
| `createdAt` | `Timestamp` | ❌ | App.jsx | Account creation time |

**Indexes needed**: None (lookups sirf `uid` se hote hain)

---

### `pharmacies/{uid}`

Pharmacy profile. UID = Firebase Auth UID of pharmacy user.

| Field | Type | Required | Set By | Description |
|-------|------|----------|--------|-------------|
| `name` | `string` | ✅ | PharmacySetup | Store name |
| `phone` | `string` | ✅ | PharmacySetup | Contact number |
| `location` | `GeoPoint` | ✅ | PharmacySetup | GPS coordinates |
| `geohash` | `string` | ✅ | Cloud Function | Auto-computed from location |
| `isOnline` | `boolean` | ✅ | Dashboard toggle | `true` = accepting requests |
| `isVerified` | `boolean` | ✅ | Admin Dashboard | `true` = admin-approved |
| `isSuspended` | `boolean` | ❌ | Admin Dashboard | `true` = blocked |
| `fastResponderScore` | `number` | ✅ | Cloud Function | Count of <60s responses |
| `reliabilityScore` | `number` | ✅ | Cloud Function | Count of total responses |
| `searchRadiusKm` | `number` | ❌ | PharmacyProfile | Default: 5 |
| `profilePicUrl` | `string` | ❌ | PharmacyProfile | Firebase Storage URL |
| `fcmToken` | `string` | ❌ | App.jsx | Push notification token |
| `licenseNumber` | `string` | ❌ | PharmacyProfile | Pharmacy license number |
| `licenseDocumentUrl` | `string` | ❌ | PharmacyProfile | License doc storage URL |
| `address` | `string` | ❌ | PharmacyProfile | Text address |
| `createdAt` | `Timestamp` | ❌ | PharmacySetup | Registration time |

**Indexes needed**:
- `geohash ASC` (for geospatial queries)
- `isOnline ASC` + `isVerified ASC` (for admin filters)

---

### `medicineRequests/{requestId}`

Core entity — ek patient ki ek medicine enquiry.

| Field | Type | Required | Set By | Description |
|-------|------|----------|--------|-------------|
| `userId` | `string` | ✅ | FindMedicine | Patient UID |
| `typedMedicines` | `string[]` | ✅ | FindMedicine | Medicine names list |
| `prescriptionUrl` | `string` | ❌ | FindMedicine | Firebase Storage path |
| `location` | `GeoPoint` | ✅ | FindMedicine | Patient GPS coords |
| `searchRadiusKm` | `number` | ✅ | FindMedicine | Search radius |
| `status` | `string` | ✅ | Frontend | `pending\|matched\|closed\|cancelled` |
| `processingStatus` | `string` | ✅ | Cloud Function | `running\|completed\|failed` |
| `createdAt` | `Timestamp` | ✅ | FindMedicine | Request creation time |
| `expiresAt` | `Timestamp` | ✅ | FindMedicine | Auto-close time |
| `targetPharmacyIds` | `string[]` | ❌ | Cloud Function | Top 20 pharmacy IDs |
| `targetPharmacies` | `string[]` | ❌ | Cloud Function | (Legacy — same as above) |
| `notifiedPharmaciesCount` | `number` | ❌ | Cloud Function | FCM sent count |
| `responsesCount` | `number` | ❌ | Cloud Function | Response count |
| `respondedPharmacies` | `string[]` | ❌ | Cloud Function | Pharmacy IDs that responded |
| `matchedPharmacyId` | `string` | ❌ | ChatScreen | Final matched pharmacy |
| `matchedPharmacyName` | `string` | ❌ | ChatScreen | Final pharmacy name |
| `rejectionReason` | `string` | ❌ | Cloud Function | `too_fast_requests\|duplicate_request` |
| `errorMessage` | `string` | ❌ | Cloud Function | Human-readable rejection message |
| `closeReason` | `string` | ❌ | Cloud Function | `timeout` (from scheduled job) |

**Indexes needed**:
- `userId ASC` + `createdAt DESC` (patient's own requests)
- `status ASC` + `expiresAt ASC` (closeExpiredRequests job)
- `targetPharmacyIds ARRAY_CONTAINS` (pharmacy incoming requests)

---

### `medicineRequests/{requestId}/pharmacyResponses/{pharmacyId}`

Sub-collection — ek pharmacy ka response to ek request. Document ID = pharmacyId.

| Field | Type | Set By | Description |
|-------|------|--------|-------------|
| `pharmacyId` | `string` | Frontend | Pharmacy UID |
| `responseType` | `string` | Frontend | `available` \| `not_available` |
| `respondedAt` | `Timestamp` | Frontend | Response timestamp |
| `responseTimeSec` | `number` | Cloud Function | Seconds from request to response |
| `fastResponder` | `boolean` | Cloud Function | `responseTimeSec < 60` |

---

### `notifications/{uid}/userNotifications/{notifId}`

In-app notification store. Top-level doc per user, sub-collection per notification.

| Field | Type | Set By | Description |
|-------|------|--------|-------------|
| `title` | `string` | Cloud Function | Notification title |
| `body` | `string` | Cloud Function | Notification body |
| `type` | `string` | Cloud Function | `PHARMACY_RESPONSE` \| `CHAT_MESSAGE` |
| `relatedId` | `string` | Cloud Function | `requestId` ya `chatId` |
| `isRead` | `boolean` | Frontend | False on create, true after click |
| `createdAt` | `Timestamp` | Cloud Function | Creation time |

---

### `settings/platformSettings`

Single document — admin-configurable platform settings.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `defaultSearchRadiusKm` | `number` | 5 | New patients ke liye default radius |
| `requestTimeoutMinutes` | `number` | 10 | Request expire time |

---

### `matchingLogs/{requestId}` *(Debug — Admin SDK only)*

One document per request — matching algorithm ka debug log.

| Field | Type | Description |
|-------|------|-------------|
| `requestId` | `string` | Parent request ID |
| `scanned` | `object[]` | All pharmacies scanned (see below) |
| `top20` | `object[]` | Final selected pharmacies |
| `executionTimeMs` | `number` | Wall-clock execution time |
| `timestamp` | `Timestamp` | Log creation time |

**`scanned` object**:
```json
{
  "pharmacyId": "uid",
  "name": "ABC Pharmacy",
  "distanceKm": 2.4,
  "fastResponderScore": 5,
  "reliabilityScore": 12,
  "isOnline": true,
  "isVerified": true,
  "status": "valid",
  "filterReason": null
}
```

**`top20` object**:
```json
{
  "id": "pharmacyUid",
  "name": "ABC Pharmacy",
  "distanceKm": 2.4,
  "fastResponderScore": 5,
  "reliabilityScore": 12,
  "fcmToken": "token..."
}
```

---

### `functionErrors/{auto}` *(Debug — Admin SDK only)*

Cloud Function permanent failure log.

| Field | Type | Description |
|-------|------|-------------|
| `requestId` | `string` | Affected request |
| `context` | `string` | Function name |
| `errorMessage` | `string` | Error description |
| `timestamp` | `Timestamp` | Failure time |

---

## Part B: Firebase Realtime Database

### Chat Messages

**Path**: `/chats/{chatId}/{messageId}`
**chatId format**: `{requestId}_{pharmacyId}`

```json
{
  "senderId": "uid",
  "senderName": "Patient Name",
  "senderRole": "user",
  "text": "Kya yeh medicine available hai?",
  "timestamp": 1709050000000,
  "reaction": "👍",
  "hasPrescriptionReq": false,
  "isPrescriptionShare": false,
  "prescriptionUrl": null
}
```

| Field | Type | Description |
|-------|------|-------------|
| `senderId` | string | Sender UID |
| `senderName` | string | Display name |
| `senderRole` | `user\|pharmacy` | Role indicator |
| `text` | string | Message text |
| `timestamp` | number | Unix milliseconds |
| `reaction` | string | Emoji reaction (optional) |
| `hasPrescriptionReq` | boolean | Pharmacy ne prescription maanga |
| `isPrescriptionShare` | boolean | Patient ne prescription share kiya |

**Special keys** (sirf RTDB mein, yeh messages nahi hain):
- `typing` — typing indicator
- `lastRead` — read receipt timestamp

---

### User Presence

**Path**: `/presence/{uid}`

```json
{
  "online": true,
  "lastSeen": { ".sv": "timestamp" }
}
```

- `onDisconnect()` automatically `online: false` set karta hai jab user disconnect ho

---

## Part C: Firebase Storage Structure

```
storage/
├── prescriptions/
│   └── {userId}/
│       └── {timestamp}.jpg        # Patient prescriptions
├── profilePics/
│   └── {userId}/
│       └── {timestamp}.jpg        # Pharmacy profile pictures
└── licenses/
    └── {userId}/
        └── {filename}.pdf         # Pharmacy license documents
```

**Access Control**:
- `prescriptions/` — Direct access BLOCKED. Sirf Cloud Function se signed URL milti hai.
- `profilePics/` — Read: authenticated users, Write: owner only
- `licenses/` — Read: authenticated users, Write: owner only

---

## Entity Relationships

```
users/{uid} ─────────────────────────────────┐
     │                                        │
     │ (role: 'pharmacy')                     │
     ▼                                        │ (role: 'user')
pharmacies/{uid}                              │
     │                                        │
     │ receives notifications in              │ creates
     ▼                                        ▼
medicineRequests/{requestId} ──────── userId ─┘
     │
     │
     ├── pharmacyResponses/{pharmacyId}
     │
     └── (chatId = requestId_pharmacyId)
              │
              ▼
         RTDB: /chats/{chatId}/  (messages)

notifications/{uid}/userNotifications/{id}
     └── created by Cloud Functions
     └── read by NotificationCenter component
```
