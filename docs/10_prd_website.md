# LocalPill Website PRD

> Product Requirements Document
> Product: LocalPill Website / PWA
> Version: v1.0
> Date: March 15, 2026
> Status: Draft

---

## 1. Product Summary

LocalPill Website is the primary web experience for patients, pharmacy partners, and administrators. It combines a public marketing site, a patient medicine discovery flow, a pharmacy partner dashboard, and an admin console on a shared Firebase backend.

The website must do 3 jobs well:

1. Help patients quickly discover nearby medicine availability.
2. Help pharmacy partners receive and respond to requests in real time.
3. Give the operations team control over verification, quality, and platform safety.

The website should behave like a lightweight PWA so users can install it, receive notifications, and return quickly without app-store friction.

---

## 2. Problem Statement

Patients often do not know which nearby pharmacy currently has a required medicine in stock. They waste time calling multiple stores, physically visiting shops, or abandoning the search altogether.

Pharmacies, especially local and independent ones, do not have a real-time digital channel to capture this intent at the moment of need.

Administrators need a way to verify pharmacies, reduce abuse, monitor platform health, and manage operational quality.

---

## 3. Vision

Make LocalPill the fastest way to check medicine availability nearby, without turning the platform into a delivery-first or e-commerce-heavy product.

---

## 4. Goals

### Business Goals

- Increase successful patient-to-pharmacy connections.
- Build a trusted verified pharmacy network.
- Create a defensible hyperlocal medicine discovery platform.
- Reduce support and operational overhead with self-serve flows.

### User Goals

- Patient can create a medicine request in under 2 minutes.
- Pharmacy can respond to a request in under 30 seconds.
- Admin can verify or suspend accounts in under 1 minute.

### Product Goals

- Real-time matching based on radius and pharmacy status.
- Live request tracking and chat.
- Web-first onboarding with PWA installability.
- Notification-led re-engagement.

---

## 5. Non-Goals

- Full medicine ordering and checkout.
- Online prescription validation by doctors.
- Delivery fleet management.
- Digital payments or invoice handling in v1.
- Complex pharmacy inventory sync from POS/ERP systems.

---

## 6. Primary Users

### Patient

- Needs urgent or routine medicine nearby.
- Usually mobile web first.
- Wants speed, trust, and minimal typing.

### Pharmacy Partner

- Wants more walk-in or lead-driven demand.
- Needs simple request intake and quick response tools.
- Wants verified status and better ranking over time.

### Platform Admin

- Verifies pharmacies.
- Monitors abuse and quality.
- Sends broadcast alerts and tunes platform settings.

---

## 7. Jobs To Be Done

### Patient JTBD

"When I need a medicine quickly, help me find a nearby pharmacy that has it available so I do not waste time calling multiple shops."

### Pharmacy JTBD

"When a nearby patient needs a medicine, alert me instantly so I can respond fast and convert that need into a store visit."

### Admin JTBD

"When the network grows, give me enough control to maintain trust, visibility, and operational quality."

---

## 8. Product Scope

### 8.1 Public Marketing Website

- Landing page for patients.
- Partner landing page for pharmacies.
- SEO pages for medicine and city/pharmacy discovery.
- Legal and trust pages.
- PWA install prompts.

### 8.2 Auth and Onboarding

- OTP login via phone number.
- First-time setup for patient and pharmacy role selection.
- Role-aware redirects and domain-aware experiences.

### 8.3 Patient Experience

- Create medicine request by text and optional prescription upload.
- Auto-detect location.
- Track request processing and responses.
- View results and start chat.
- Maintain request history and notifications.

### 8.4 Pharmacy Experience

- Complete pharmacy setup.
- Manage profile and verification artifacts.
- Toggle online/offline.
- Receive nearby requests.
- Respond as available, partial, or not available.
- Chat with patients.
- View response history and performance stats.

### 8.5 Admin Experience

- Review pharmacies, users, and requests.
- Verify or suspend entities.
- View analytics and live map.
- Broadcast platform messages.
- Adjust platform settings.

---

## 9. Core User Flows

### Patient Primary Flow

1. User lands on website.
2. User logs in with OTP.
3. User completes patient setup.
4. User enters medicines and optional prescription.
5. User allows location access.
6. System creates request and notifies nearby pharmacies.
7. User tracks progress in real time.
8. User views pharmacy responses.
9. User opens chat with selected pharmacy.
10. User marks request complete.

### Pharmacy Primary Flow

1. Pharmacy lands on partner website.
2. Pharmacy logs in with OTP.
3. Pharmacy completes setup and location capture.
4. Admin verifies account.
5. Pharmacy goes online.
6. Pharmacy receives request alert.
7. Pharmacy responds quickly.
8. Pharmacy chats with patient.
9. Pharmacy monitors performance/history.

### Admin Primary Flow

1. Admin logs in.
2. Admin reviews incoming pharmacies.
3. Admin verifies or suspends accounts.
4. Admin monitors request volume and live map.
5. Admin adjusts radius/timeout defaults.
6. Admin broadcasts maintenance or policy updates.

---

## 10. Functional Requirements

### 10.1 Public Site

- Website must load on mobile and desktop browsers.
- Website must present separate patient and pharmacy partner entry points.
- Website must include legal pages, FAQs, and trust messaging.
- Website should support SEO landing pages for medicines and locality discovery.

### 10.2 Authentication

- Users must authenticate via phone OTP.
- System must create or hydrate a `users/{uid}` record after login.
- System must support patient, pharmacy, and admin roles.
- Suspended users should be blocked from normal product access.

### 10.3 Patient Request Creation

- User must be able to add multiple medicine names.
- User must be able to upload a prescription image or PDF.
- System must capture user location with permission.
- System must create a request with timeout and search radius.
- System must block spammy duplicate or too-fast submissions.

### 10.4 Matching and Results

- System must find nearby verified and online pharmacies.
- System must sort pharmacies by distance, response speed, and reliability.
- System must notify matching pharmacies.
- User must see request status and live progress.
- User must see responses grouped by availability status.

### 10.5 Chat

- User and pharmacy must be able to exchange messages in real time.
- System must support text, prescription-sharing prompts, and image sharing.
- System should support typing indicators and read receipts.
- System should support notification on new chat messages.

### 10.6 Pharmacy Dashboard

- Pharmacy must be able to go online/offline.
- Pharmacy must receive requests only when online and eligible.
- Pharmacy must respond to requests with structured response types.
- Pharmacy must view pending requests, request history, and profile.
- Pharmacy must view simple performance stats.

### 10.7 Admin

- Admin must view analytics, pharmacies, users, and requests.
- Admin must verify and suspend pharmacies.
- Admin must suspend users.
- Admin must force-close problematic requests.
- Admin must broadcast messages to partner network.
- Admin must update platform settings without redeploy.

### 10.8 Notifications

- Website should request browser notification permission at the right moment.
- System must store and refresh FCM tokens.
- System must deliver push notifications for request matches and chat messages.

### 10.9 PWA

- Website should be installable.
- Website should provide offline-state signaling.
- Website should work as a quick-return utility on mobile home screens.

---

## 11. Experience Requirements

- Fast, low-friction mobile-first flow.
- Clear request states at every step.
- High trust through verification, legal context, and secure prescription messaging.
- Minimal navigation complexity for patients.
- Task-first dashboard for pharmacies.
- Dense but readable control surface for admins.

---

## 12. Success Metrics

### North Star

- Request-to-response success rate.

### Patient Metrics

- OTP completion rate.
- Request creation completion rate.
- Percentage of requests receiving at least 1 response.
- Median time to first response.
- Chat initiation rate after first response.
- Request completion rate.

### Pharmacy Metrics

- Verification completion rate.
- Online activation rate.
- Response rate on received requests.
- Median response time.
- Repeat weekly active pharmacies.

### Platform Metrics

- Verified pharmacy count.
- Daily active requests.
- Push notification delivery success.
- Support issue rate per 100 requests.
- Abuse/spam rejection rate.

---

## 13. Operational Requirements

- Matching should complete within a few seconds in normal load.
- Core flows should survive page refresh without losing critical state.
- System should support realtime updates via Firestore and RTDB.
- Platform settings should be configurable from admin without code deploy.
- Logs and failure records should be available for debugging.

---

## 14. Dependencies

- Firebase Auth for OTP.
- Firestore for structured business data.
- RTDB for chat and presence.
- Firebase Storage for prescription/media uploads.
- FCM for push notifications.
- Geolocation APIs for proximity search.
- Maps for visual discovery and admin map.

---

## 15. Risks

- Browser notification permissions may be denied.
- Location access friction may reduce request completion.
- Security rules and storage path mismatches can break critical flows.
- Public read exposure can create privacy concerns if data is not carefully split.
- Large frontend bundles can hurt low-end device performance.

---

## 16. Launch Criteria

- OTP login stable on major mobile browsers.
- Patient can create request, receive response, and open chat.
- Pharmacy can receive, respond, and manage online status.
- Admin can verify pharmacy and manage abuse cases.
- Notification flow works for request and chat events.
- Security rules validated for patient, pharmacy, and admin access.

---

## 17. Future Enhancements

- Better medicine autocomplete and normalized catalog.
- Estimated pharmacy open status and service hours.
- Smarter duplicate request prevention.
- Richer analytics for admin and pharmacy growth.
- Inventory sync APIs for pharmacies.
- Booking, reservation, or pickup confirmation layer.

