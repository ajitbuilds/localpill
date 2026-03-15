# LocalPill — Firestore Security Rules Documentation

> **File**: `firestore.rules`
> **Version**: `rules_version = '2'`
> **Purpose**: Har user ko sirf wahi data access ho jo unka hona chahiye.

---

## Global Helper Functions

Yeh functions pure rules file mein reuse hote hain.

### `isAuthenticated()`
```javascript
function isAuthenticated() {
  return request.auth != null;
}
```
Check: Kya request kisi logged-in user se aa rahi hai?

---

### `isOwner(userId)`
```javascript
function isOwner(userId) {
  return isAuthenticated() && request.auth.uid == userId;
}
```
Check: Kya logged-in user wahi user hai jiska data maanga ja raha hai?

---

### `getUserRole()`
```javascript
function getUserRole() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
}
```
Firestore se current user ka `role` field fetch karta hai. Har rule call mein ek extra read hoti hai — `isPharmacy()` ya `isAdmin()` use karne par.

---

### `isPharmacy()`
```javascript
function isPharmacy() {
  return isAuthenticated() && getUserRole() == 'pharmacy';
}
```

---

### `isAdmin()`
```javascript
function isAdmin() {
  return isAuthenticated() && getUserRole() == 'admin';
}
```

---

### `isUserSuspended(uid)`
```javascript
function isUserSuspended(uid) {
  let userDoc = get(/databases/$(database)/documents/users/$(uid));
  return userDoc != null && userDoc.data.get('isSuspended', false) == true;
}
```
Safe check — agar `isSuspended` field nahi hai document mein toh `false` return karta hai (`.get('field', default)`).

---

### `isPharmacySuspended(uid)`
```javascript
function isPharmacySuspended(uid) {
  let pharmDoc = get(/databases/$(database)/documents/pharmacies/$(uid));
  return pharmDoc != null && pharmDoc.data.get('isSuspended', false) == true;
}
```

---

## Collection-by-Collection Rules

### `/users/{userId}`

| Operation | Allowed When | Reason |
|-----------|-------------|--------|
| **read** | Any authenticated user | Public profile needed across app |
| **create** | Owner only (`isOwner(userId)`) | Sirf apna account seedha banao |
| **update** | Admin OR (Owner + conditions) | Self-edit with restrictions (below) |
| **delete** | Never | Accounts hard-delete nahi hote |

**Update Conditions for Owner**:
```
Owner can update IF:
  1. NOT changing 'isSuspended' field (admin-only field)
  AND
  2. Either NOT changing 'role' field
     OR current role is empty/null (first-time setup only)
```

**Why role lock?** Role pehli baar empty hoti hai. PatientSetup/PharmacySetup set karta hai. Ek baar set hone ke baad sirf Admin change kar sakta hai. Yeh privilege escalation prevent karta hai.

---

### `/patients/{patientId}`

| Operation | Allowed When |
|-----------|-------------|
| read, write | Owner only |

Legacy collection — direct owner-only access.

---

### `/pharmacies/{pharmacyId}`

| Operation | Allowed When | Reason |
|-----------|-------------|--------|
| **read** | Any authenticated user | Patient ko pharmacy details chahiye |
| **create** | Owner only | Sirf wo pharmacy apna doc banaye |
| **update** | Admin OR (Owner + conditions) | Pharmacy apna profile edit kare, but not verification/suspension |
| **delete** | Never | |

**Update Conditions for Owner**:
```
Owner can update IF:
  NOT changing 'isVerified' or 'isSuspended'
```
Pharmacy khud `isVerified: true` nahi kar sakti — sirf Admin kar sakta hai.

---

### `/settings/{docId}`

| Operation | Allowed When |
|-----------|-------------|
| **read** | Any authenticated user |
| **write** | Admin only |

Platform settings (radius, timeout) sirf Admin set kare.

---

### `/admin_stats/{docId}`

| Operation | Allowed When |
|-----------|-------------|
| read, write | Admin only |

---

### `/medicineRequests/{requestId}`

Sabse complex rules — multiple roles ke liye different access.

#### Read Rule
```javascript
allow read: if isAdmin()
             || (request.auth != null && resource.data.userId == request.auth.uid)
             || isTargetPharmacy()
             || isAssignedPharmacy()
             || isPendingRequest();
```

| Who | Condition | Why |
|-----|-----------|-----|
| Admin | Always | Full oversight |
| Patient | `resource.data.userId == request.auth.uid` | Apni request dekhe |
| Target Pharmacy | `request.auth.uid in resource.data.targetPharmacyIds` | Matched pharmacy request dekhe |
| Assigned Pharmacy | `resource.data.assignedTo == request.auth.uid` | Legacy assigned field |
| Anyone (pending) | `resource.data.status == "pending"` | Live marketplace visibility |

#### Create Rule
```javascript
allow create: if request.auth != null && !isUserSuspended(request.auth.uid)
```
Koi bhi authenticated user request banye — **lekin suspended users nahi**.

#### Update Rule
```javascript
allow update: if isPatient()
// isPatient() = resource.data.userId == request.auth.uid
```
Sirf patient apni request update kare (cancel karna, etc.)

#### Delete: Never allowed.

---

### `/medicineRequests/{requestId}/pharmacyResponses/{pharmacyId}`

| Operation | Allowed When | Reason |
|-----------|-------------|--------|
| **read** | Patient (parent request owner) OR pharmacy owner OR Admin | Response sirf related parties dekhe |
| **create** | `isOwner(pharmacyId) && isPharmacy() && !isPharmacySuspended` | Sirf verified, un-suspended pharmacy respond kare |
| **update** | Never | Response immutable — cheating prevent karne ke liye |
| **delete** | Never | Audit trail preserve |

**Create ka triple check**:
1. `isOwner(pharmacyId)` — pharmacyId document ke naam se match ho
2. `isPharmacy()` — role == 'pharmacy' hona chahiye
3. `!isPharmacySuspended(...)` — suspended pharmacy respond nahi kar sakti

---

### `/matchingLogs/{logId}` & `/functionErrors/{errorId}`

```javascript
allow read, write: if false;
```
**Full lockdown**. Sirf Firebase Admin SDK (Cloud Functions) access kar sakta hai. Frontend se koi access nahi — bilkul nahi.

---

### `/notifications/{userId}/{document=**}`

```javascript
allow read, write: if isOwner(userId) || isAdmin();
```
`{document=**}` → wildcard jo sub-collection (`userNotifications`) bhi cover karta hai.

---

### Collection Group Rule — `pharmacyResponses`

```javascript
match /{path=**}/pharmacyResponses/{pharmacyId} {
  allow read: if request.auth != null && (
    isAdmin() || resource.data.pharmacyId == request.auth.uid
  );
}
```

**Why needed?** `DashboardPharmacy.jsx` mein pharmacy apni saari responses ek collectionGroup query se fetch karti hai (saare requests ke across). Yeh rule collection group read enable karta hai tabhi jab pharmacy apna hi data dekh rahi ho.

---

## Security Summary

| Threat | Mitigation |
|--------|-----------|
| User dusre ka data dekhe | `isOwner()` checks |
| Pharmacy khud ko verify kare | `isVerified` update blocked for non-admin |
| Suspended user request bheje | `isUserSuspended()` check on create |
| Suspended pharmacy respond kare | `isPharmacySuspended()` check on create |
| Pharmacy role escalate to admin | `role` field locked after first set |
| Debug logs leak | `matchingLogs` + `functionErrors` = false read/write |
| Prescription unauthorized access | Storage rules + signed URL via Cloud Function |
