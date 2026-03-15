# LocalPill Pharmacy App PRD

> Product Requirements Document
> Product: LocalPill Pharmacy App
> Version: v1.0
> Date: March 15, 2026
> Status: Draft

---

## 1. Product Summary

LocalPill Pharmacy App is the dedicated mobile app for pharmacy partners to receive nearby medicine requests, respond quickly, manage availability presence, and convert patient demand into store visits.

The app should be optimized for shop-floor speed. A pharmacist or staff member should be able to unlock the phone, open the app, review a request, and respond in seconds.

This PRD assumes continued use of the current LocalPill Firebase backend and verification-led partner model.

---

## 2. User Problem

Independent pharmacies do not have a simple mobile workflow to capture nearby medicine demand in real time. Web dashboards help, but many stores operate primarily on phones. They need an app that is always-ready, notification-led, and minimal to use during busy store hours.

---

## 3. Product Vision

Become the lightweight demand inbox for local pharmacies: always on, easy to respond from, and designed for real-world store operations.

---

## 4. Goals

- Maximize partner response rate and speed.
- Increase percentage of verified pharmacies that actively go online.
- Make daily pharmacy usage feel operational, not administrative.
- Improve trust and partner retention via profile completeness and visibility.

---

## 5. Non-Goals

- Full POS replacement.
- SKU-level live inventory sync in v1.
- Delivery dispatch or rider management.
- B2B procurement workflows.

---

## 6. Target Users

### Primary

- Pharmacy owner.
- Counter staff.
- Duty pharmacist managing day-to-day customer requests.

### Secondary

- Multi-store managers monitoring multiple outlets in future releases.

---

## 7. Core Jobs To Be Done

"When a nearby patient needs a medicine, alert me instantly and let me respond quickly so I can win the customer before another pharmacy does."

"When my pharmacy is open, let me go online and receive demand without dealing with a heavy admin system."

---

## 8. Core User Journey

1. Pharmacy installs app.
2. Pharmacy logs in with OTP.
3. Pharmacy completes setup with store name and location.
4. Pharmacy uploads profile and verification details.
5. Admin verifies account.
6. Pharmacy goes online.
7. Pharmacy receives request alerts.
8. Pharmacy responds as available, partial, or not available.
9. Pharmacy chats with patient and closes loop offline.

---

## 9. Functional Requirements

### 9.1 Authentication and Setup

- App must support OTP login.
- App must support first-time pharmacy setup.
- App must capture and store pharmacy location.
- App must support profile completion after first login.

### 9.2 Verification Workflow

- App must clearly show verification status.
- Unverified pharmacies should be blocked from request intake.
- App should explain what documents/details are pending.
- App should notify pharmacy when verification is approved.

### 9.3 Online / Offline Presence

- Pharmacy must be able to go online and offline instantly.
- Online state must be visible and persistent.
- App should handle idle/offline reminders and automatic safeguards where needed.

### 9.4 Request Inbox

- App must show all active targeted requests.
- Each request card should show:
  - medicine names,
  - request age,
  - distance,
  - expiry state,
  - prescription availability.
- App should prioritize newest and urgent requests.

### 9.5 Response Actions

- Pharmacy must respond with:
  - available,
  - partial,
  - not available.
- Response action should be one-tap after confirmation.
- App should prevent duplicate responses.
- App should preserve response state after refresh/reopen.

### 9.6 Chat

- App must support real-time patient chat.
- Pharmacy should request prescription from chat.
- Pharmacy should receive chat notifications.
- App should support image viewing and shared contact flow if policy allows.

### 9.7 Profile and Store Management

- Pharmacy must manage:
  - store name,
  - owner name,
  - phone/email,
  - address,
  - location,
  - license number/document,
  - profile and storefront images,
  - delivery capabilities,
  - business hours,
  - discount or promotional attributes if used for discovery.

### 9.8 History and Analytics

- Pharmacy must view response history.
- App must show lightweight stats:
  - requests received,
  - requests responded,
  - pending count,
  - fast responder status.

### 9.9 Notifications

- App must support push notifications for:
  - new request,
  - new chat message,
  - verification update,
  - admin broadcast.
- Tapping a notification must open the correct screen.

---

## 10. UX Requirements

- Designed for noisy, busy store environments.
- Large tap targets and quick actions.
- Clear online/offline state visible on first screen.
- Request response flow should be possible in under 10 seconds.
- Important statuses should use strong color/state cues.

---

## 11. Information Architecture

- `Dashboard`
- `Requests`
- `History`
- `Chat`
- `Notifications`
- `Profile`
- `Verification / Setup`
- `Auth / OTP`

---

## 12. Success Metrics

- Verified-to-active pharmacy conversion rate.
- Weekly active pharmacies.
- Online session frequency.
- Request response rate.
- Median pharmacy response time.
- Percentage of requests responded within 60 seconds.
- Chat continuation rate after available response.

---

## 13. Operational Requirements

- App should remain usable on low-end Android devices.
- Notifications should arrive reliably when app is backgrounded.
- Presence state should recover correctly after app reconnect.
- Request list should remain readable under burst traffic.

---

## 14. Trust and Safety Requirements

- Only verified pharmacies should receive full platform value.
- Suspended pharmacies must be blocked from response flows.
- Prescription and patient data must remain limited to authorized interactions.
- Auditability should exist for verification, suspension, and response actions.

---

## 15. Risks

- Pharmacy staff may deny notifications, reducing utility.
- Location drift can hurt targeting quality.
- Shared devices at stores may create session or privacy issues.
- Slow or unreliable internet may delay response submissions.
- Security rule gaps can allow unintended request visibility or response behavior.

---

## 16. Launch Criteria

- OTP login and pharmacy setup stable.
- Verification status correctly enforced.
- Online/offline, request receipt, response submission, and chat all production-ready.
- Notification deep-links stable for request and chat.
- Profile completion and media uploads work on real devices.

---

## 17. Future Roadmap

- Multi-branch pharmacy support.
- Staff roles and delegated access.
- Inventory shortcuts and saved frequent medicines.
- Response templates and suggested substitutes.
- Peak-hour staffing and queue analytics.
- Partner growth dashboard and lead conversion reporting.

