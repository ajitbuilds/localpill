# LocalPill — Deployment Guide

> Is guide mein LocalPill ko live deploy karne ke liye poori process step-by-step batai gayi hai.

---

## Pre-Deployment Checklist

Deploy karne se pehle yeh confirm karo:

- [ ] `npm run build` error-free complete hota hai
- [ ] `src/firebase.js` mein production Firebase config hai
- [ ] VAPID key correct set hai (`src/App.jsx`)
- [ ] App Check production key set hai (`src/firebase.js`)
- [ ] Firebase CLI installed: `firebase --version`
- [ ] Firebase project select kiya hai: `firebase use localpill-upcharmitra`

---

## Part 1: Frontend Deploy (Firebase Hosting)

### Step 1: Production Build Banao

```bash
npm run build
```

Output: `dist/` folder mein optimized files

### Step 2: Firebase Hosting Deploy Karo

```bash
firebase deploy --only hosting
```

**Verify**: Terminal mein hosting URL milega:
```
✔  Deploy complete!
Hosting URL: https://localpill-upcharmitra.web.app
```

### firebase.json Configuration

```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

> `"source": "**"` → Sab routes React Router handle karta hai (SPA setup)

---

## Part 2: Cloud Functions Deploy

```bash
firebase deploy --only functions
```

**Individual function deploy** (faster):
```bash
firebase deploy --only functions:processMedicineRequestV2
firebase deploy --only functions:closeExpiredRequests
```

**Verify**: Firebase Console → Functions → Dashboard mein sab functions green hone chahiye

### Functions Build Errors Fix Karo

```bash
cd functions
npm install
npm run lint  # agar lint script ho
cd ..
firebase deploy --only functions
```

---

## Part 3: Firestore Rules Deploy

```bash
firebase deploy --only firestore:rules
```

**Verify**: Firebase Console → Firestore → Rules mein latest version dikhna chahiye

### Firestore Indexes Deploy

```bash
firebase deploy --only firestore:indexes
```

> **Note**: `firestore.indexes.json` mein indexes defined hain. Wrong indexes = slow queries or errors.

---

## Part 4: Storage Rules Deploy

```bash
firebase deploy --only storage
```

`storage.rules` file se rules deploy honge.

---

## Part 5: Realtime Database Rules Deploy

```bash
firebase deploy --only database
```

`database.rules.json` se rules deploy honge.

---

## Full Deploy (Sab Ek Saath)

```bash
firebase deploy
```

Yeh sab deploy karta hai: Hosting + Functions + Firestore Rules + Storage + Database

---

## Sitemap Update

Deployment ke baad sitemap regenerate karo:

```bash
npm run sitemap
firebase deploy --only hosting
```

---

## Environment-Specific Deployment

### Staging Environment

```bash
firebase use localpill-staging   # staging project select
npm run build
firebase deploy
```

### Production Environment

```bash
firebase use localpill-upcharmitra   # production project select
npm run build
firebase deploy
```

---

## Rollback Kaise Karein

**Hosting Rollback**:
1. Firebase Console → Hosting → Release History
2. Purani release ke "..." menu → "Rollback"

**Functions Rollback**:
```bash
# Purana code checkout karo
git checkout <previous-commit>
firebase deploy --only functions
```

---

## Post-Deployment Verification

Deploy karne ke baad yeh check karo:

| Check | How |
|-------|-----|
| Site live hai | `https://localpill-upcharmitra.web.app` open karo |
| Login kaam kar raha hai | Phone OTP se login try karo |
| Functions chal rahe hain | Firebase Console → Functions → Logs |
| Firestore data aa raha hai | Dashboard open karo, data load hota hai |
| Push notifications | FCM Debug Tool use karo (`/debug`) |
| Map load ho rahi hai | Patient dashboard → Map toggle |

---

## Common Deployment Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Error: Failed to get Firebase project` | Wrong project selected | `firebase use <project-id>` |
| `Build failed` | JSX/import error | `npm run build` locally check karo |
| `Functions deploy failed - billing` | Free plan mein external network calls blocked | Blaze plan required for Functions |
| `CORS error` | Functions region mismatch | `getFunctions(app, 'us-central1')` region match karo |
| `Permission denied on rules` | Rules update nahi hui | `firebase deploy --only firestore:rules` |
