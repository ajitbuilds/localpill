# LocalPill Customer App PRD

> Product Requirements Document
> Product: LocalPill Customer App
> Version: v1.0
> Date: March 15, 2026
> Status: Draft

---

## 1. Product Summary

LocalPill Customer App is the dedicated mobile experience for patients who want a faster, more reliable, notification-first medicine discovery workflow than mobile web alone.

The app should make urgent and repeat medicine search feel effortless: open app, search medicine, track responses, chat, and close the request.

This PRD assumes the app will continue to use the current shared Firebase backend, request model, chat layer, and notification system.

---

## 2. User Problem

Mobile web is useful for first access, but repeat patients need:

- faster app open time,
- better notifications,
- persistent auth,
- smoother media upload,
- cleaner history and chat experience.

Patients also need confidence that they can act quickly in urgent situations without re-learning the UI every time.

---

## 3. Product Vision

Become the default on-phone medicine search utility for patients who need quick local availability checks.

---

## 4. Goals

- Reduce time from app open to request submission.
- Increase repeat usage for returning patients.
- Improve notification open-to-action rate.
- Improve chat completion and successful pharmacy connection rate.

---

## 5. Non-Goals

- In-app medicine purchase and payment.
- Doctor consultation and telemedicine.
- Full prescription records management.
- Delivery routing and logistics.

---

## 6. Target Users

### Primary

- Urban and semi-urban patients searching for medicines locally.
- Caregivers searching on behalf of family members.
- Returning users who value speed and notifications.

### Secondary

- Patients with repeat or chronic medication needs.
- Patients who prefer app-based rather than browser-based usage.

---

## 7. Key Use Cases

- Search urgently for an unavailable medicine nearby.
- Upload prescription and let pharmacies respond.
- Continue chat from a prior request.
- Re-run a previous medicine search from history.
- Receive alerts when a pharmacy replies.

---

## 8. Core User Journey

1. User installs app.
2. User logs in with phone OTP.
3. User completes lightweight onboarding/profile.
4. User enters one or more medicine names or uploads prescription.
5. App captures location.
6. Request is submitted to backend.
7. User watches request progress and responses.
8. User opens chat with a pharmacy.
9. User completes request and returns later via history if needed.

---

## 9. Functional Requirements

### 9.1 Onboarding and Auth

- App must support phone OTP login.
- App must preserve session across launches.
- App must support first-time profile setup.
- App should support customer-only onboarding copy and visuals.

### 9.2 Home Screen

- Show primary CTA to search medicine.
- Show recent requests or quick actions.
- Surface notification and profile entry points.
- Show clear state for active live request if one exists.

### 9.3 Search and Request Creation

- User must add one or more medicine names.
- User should get basic medicine suggestions and typo support.
- User must be able to upload prescription image/PDF.
- App must capture current location with permission prompt.
- App must show progress and upload status.
- App must respect platform-configured default radius and timeout.

### 9.4 Live Results

- App must show request processing state.
- App must show notified pharmacy count and responses count.
- App must display pharmacy responses with status grouping.
- App must support direct transition into chat.
- App should support map/list response views in later iterations.

### 9.5 Chat

- Real-time text chat between patient and pharmacy.
- Typing indicators and read-state where available.
- Pharmacy can request prescription in chat.
- Patient can share prescription in chat.
- Patient can share images where policy allows.

### 9.6 Notifications

- App must support push notifications for:
  - pharmacy responses,
  - chat messages,
  - account/system alerts.
- Tapping a notification should deep-link to the relevant request or chat.

### 9.7 History

- App must show past and current requests.
- User must be able to reopen results or chat from history.
- User should be able to re-run a prior medicine search with minimal effort.

### 9.8 Profile

- User must update basic profile fields.
- User must view linked phone number.
- User must upload profile picture.
- User must be able to log out and request account deletion in future versions.

---

## 10. UX Requirements

- One-thumb usage on common Android device sizes.
- Fastest path to request creation should be under 4 taps after app open for returning users.
- Copy should be plain-language and supportive.
- Critical state changes should use snackbars/toasts and persistent UI indicators.
- Error states must clearly explain OTP, location, upload, and notification failures.

---

## 11. Information Architecture

- `Home`
- `Search`
- `Results`
- `Chat`
- `History`
- `Notifications`
- `Profile`
- `Auth / OTP`

---

## 12. Success Metrics

- D1 and D7 patient retention.
- Request submission rate per active user.
- Percentage of requests with at least one response.
- Median time to first patient-visible response.
- Notification tap-through rate.
- Chat start rate.
- Repeat search rate from history.

---

## 13. Platform Requirements

- Android must be the first-class platform.
- iOS support should follow shared scope where feasible.
- App should work well on low-memory and unstable-network conditions.
- App should gracefully recover from background/foreground transitions.

---

## 14. Security and Privacy Requirements

- Prescription visibility must be limited to authorized participants.
- Sensitive user data must not be publicly readable.
- Session tokens and auth bridge flows must be handled safely.
- Chat media access must follow participant-based authorization.

---

## 15. Risks

- OTP delivery friction.
- Notification token refresh failures.
- Media upload failures on weak networks.
- Backend rule mismatches between web and mobile paths.
- Location denial reducing request quality.

---

## 16. Launch Criteria

- Install, login, search, results, chat, history, notifications, and profile all stable.
- Push notifications deep-link correctly.
- Request creation and chat attachment flows are production-safe.
- No P1 privacy or authorization gaps on patient data.

---

## 17. Future Roadmap

- Saved medicines and favorites.
- Refill reminders.
- Better search with branded/generic mapping.
- Multiple family member profiles.
- Voice-assisted search.
- Low-stock pharmacy indicators and availability confidence.

