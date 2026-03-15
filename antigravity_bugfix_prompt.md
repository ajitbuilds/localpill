# Antigravity Prompt: Fix All 14 Bugs in LocalPill Codebase

You are fixing bugs in a React + Firebase application (LocalPill). Fix ALL issues listed below. Make the minimal changes needed - don't refactor unrelated code.

---

## BUG 1 [CRITICAL]: Consolidate VAPID Keys (#41)

**Problem:** Three different VAPID keys exist causing push notification failures.

**Files to modify:**
- `src/firebase.js` (Line 67)
- `src/App.jsx` (Line 213)  
- `src/DashboardPharmacy.jsx` (Line 212)

**Fix:** Use the SAME VAPID key everywhere. The correct key is:
```
BHnLEK_oes9RUvb78ulals2raz_m6xjoEflx2p3ZvnNsOPlcQ4DaF4R0NnaJXkipP5vRltPple3FS4cTn8m5-GY
```
Update all three files to use this exact key.

---

## BUG 2 [HIGH]: recipientId Scope Error (#42)

**File:** `functions/index.js`

**Problem:** `recipientId` is declared inside `try` block (Line ~704) but used in `catch` block (Line ~774), causing ReferenceError.

**Fix:** Move the declaration BEFORE the try block:
```javascript
// BEFORE (wrong):
try {
  let recipientId;
  // ...
} catch (error) {
  if (recipientId) { // ReferenceError!

// AFTER (correct):
let recipientId;
try {
  // ...
} catch (error) {
  if (recipientId) { // Now works
```

---

## BUG 3 [HIGH]: sendTestFCM Token Parameter Mismatch (#43)

**File:** `functions/index.js` (Lines 548-563)

**Problem:** Validates `data.token` but uses `data.fcmToken`.

**Fix:** Remove the first check for `token` since it's never used. Keep only the `fcmToken` validation:
```javascript
// Remove these lines:
const { token, title, body } = data;
if (!token) {
  throw new functions.https.HttpsError("invalid-argument", "FCM token is required.");
}

// Keep only:
const fcmToken = data.fcmToken;
if (!fcmToken) {
  throw new functions.https.HttpsError("invalid-argument", "Missing FCM token.");
}
```

---

## BUG 4 [HIGH]: forEach with async - Fire and Forget (#44)

**File:** `functions/index.js` (Lines 271-276)

**Problem:** `forEach` doesn't await async callbacks.

**Fix:** Replace with `Promise.all` + `map`:
```javascript
// BEFORE (wrong):
failedTokens.forEach(async (deadToken) => {
  try {
    const pRefs = await db.collection('pharmacies').where('fcmToken', '==', deadToken).get();
    pRefs.forEach(doc => doc.ref.update({ fcmToken: null }));
  } catch (e) { /* ignore */ }
});

// AFTER (correct):
await Promise.all(failedTokens.map(async (deadToken) => {
  try {
    const pRefs = await db.collection('pharmacies').where('fcmToken', '==', deadToken).get();
    await Promise.all(pRefs.docs.map(doc => doc.ref.update({ fcmToken: null })));
  } catch (e) { /* ignore cleanup errors */ }
}));
```

---

## BUG 5 [HIGH]: Storage Rules - chat_images Privacy Leak (#54)

**File:** `storage.rules`

**Problem:** Any authenticated user can read any chat image.

**Fix:** Update the chat_images rule to require the user ID in the path:
```
// BEFORE (wrong):
match /chat_images/{fileName} {
  allow read: if request.auth != null;
  allow write: if request.auth != null;
}

// AFTER (correct):
match /chat_images/{chatId}/{fileName} {
  allow read: if request.auth != null && (chatId.matches('.*_' + request.auth.uid + '.*') || chatId.matches(request.auth.uid + '_.*'));
  allow write: if request.auth != null;
}
```

---

## BUG 6 [MEDIUM]: ResponseCard Wrong Field Name (#45)

**File:** `src/ResultsScreen.jsx` (Line ~700)

**Problem:** Reads `timeToRespondMs` but backend stores `responseTimeSec`.

**Fix:**
```javascript
// BEFORE (wrong):
const responseTimeMs = response.timeToRespondMs ? Math.round(response.timeToRespondMs / 1000) : null;

// AFTER (correct):
const responseTimeSec = response.responseTimeSec || null;
```
Also update the display code to use `responseTimeSec` directly (it's already in seconds).

---

## BUG 7 [MEDIUM]: Client-Server Status Inconsistency (#46)

**File:** `src/ResultsScreen.jsx` (Lines 64-68)

**Problem:** Client writes `status: 'timeout'` but server writes `status: 'closed', closeReason: 'timeout'`.

**Fix:** Remove the client-side timeout status update entirely (let server handle it):
```javascript
// DELETE these lines:
if (data.status === 'pending' && data.expiresAt) {
  if (expMs < Date.now()) {
    updateDoc(doc(db, 'medicineRequests', requestId), { status: 'timeout' }).catch(() => {});
  }
}
```

---

## BUG 8 [MEDIUM]: Double HelmetProvider (#47)

**File:** `src/App.jsx` (Around Line 332)

**Problem:** HelmetProvider wraps content in both main.jsx and App.jsx.

**Fix:** Remove HelmetProvider from App.jsx (keep it only in main.jsx):
```javascript
// BEFORE:
return (
  <HelmetProvider>
    <ThemeProvider>
      {/* ... */}
    </ThemeProvider>
  </HelmetProvider>
);

// AFTER:
return (
  <ThemeProvider>
    {/* ... */}
  </ThemeProvider>
);
```
Also remove the HelmetProvider import if no longer used.

---

## BUG 9 [MEDIUM]: messaging Export Permanently Null (#48)

**File:** `src/firebase.js` (Line ~83)

**Problem:** `export const messaging = null;` never changes.

**Fix:** Remove the dead export entirely since `getMessagingInstance()` is the correct way to get messaging:
```javascript
// DELETE this line:
export const messaging = null;
```
Then search codebase for any `import { messaging }` and replace with `import { getMessagingInstance }`.

---

## BUG 10 [MEDIUM]: ChatScreen Listens to Entire Chat Node (#49)

**File:** `src/ChatScreen.jsx` (Lines 224-225)

**Problem:** Subscribes to entire chat node including typing indicators.

**Fix:**
```javascript
// BEFORE (wrong):
const chatRoomRef = ref(rtdb, `chats/${chatId}`);

// AFTER (correct):
const messagesRef = ref(rtdb, `chats/${chatId}/messages`);
```
Update the snapshot handler to handle the messages node structure instead of the full chat node.

---

## BUG 11 [MEDIUM]: RecaptchaVerifier Cleanup Missing (#50)

**File:** `src/Login.jsx` (Lines 18-22)

**Problem:** RecaptchaVerifier never cleaned up on unmount.

**Fix:**
```javascript
// BEFORE:
useEffect(() => {
  if (!window.recaptchaVerifier) {
    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
  }
}, []);

// AFTER:
useEffect(() => {
  if (!window.recaptchaVerifier) {
    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
  }
  return () => {
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = null;
    }
  };
}, []);
```

---

## BUG 12 [MEDIUM]: RecaptchaVerifier Missing .catch() (#51)

**File:** `src/Login.jsx` (Lines 40-43)

**Problem:** No error handling on render() promise.

**Fix:**
```javascript
// BEFORE:
if (window.recaptchaVerifier) {
  window.recaptchaVerifier.render().then(widgetId => {
    window.grecaptcha.reset(widgetId);
  });
}

// AFTER:
if (window.recaptchaVerifier) {
  window.recaptchaVerifier.render()
    .then(widgetId => {
      if (window.grecaptcha) window.grecaptcha.reset(widgetId);
    })
    .catch(err => console.warn('Recaptcha reset failed:', err));
}
```

---

## BUG 13 [LOW]: OTP Auto-Verify Race Condition (#52)

**File:** `src/Otp.jsx` (Lines 42-50)

**Problem:** Double submission possible when typing 6th digit + tapping verify.

**Fix:** Add a guard using existing loading state:
```javascript
// Find where verifyCode is called on 6th digit and add guard:
if (newOtp.length === 6 && !loading) {
  verifyCode(newOtp);
}
```

---

## BUG 14 [LOW]: ChatScreen Missing authReady Dependency (#53)

**File:** `src/ChatScreen.jsx` (Line ~220)

**Problem:** `authReady` used as guard but not in dependency array.

**Fix:**
```javascript
// BEFORE:
}, [chatId, requestId, pharmacyId]);

// AFTER:
}, [chatId, requestId, pharmacyId, authReady]);
```

---

## Instructions

1. Fix bugs in order of severity (CRITICAL → HIGH → MEDIUM → LOW)
2. After each fix, ensure no new errors are introduced
3. Test that imports are correct after changes
4. For Cloud Functions changes, ensure the function still exports correctly
5. Don't modify any code unrelated to these bugs
