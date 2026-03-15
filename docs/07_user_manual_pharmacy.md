# LocalPill — Pharmacy Partner Manual

> **Kiske liye**: LocalPill par registered pharmacies
> **Kya milega**: Patients ki real-time medicine enquiries, seedha chat, aur digital presence

---

## Part 1: Registration & Setup

### Step 1: Account Banao

1. `https://localpill-upcharmitra.web.app/partner` par jayein
2. **"Register as Pharmacy"** button dabayein
3. Apna **10-digit mobile number** enter karein
4. **OTP verify** karein
5. "**I am a Pharmacy**" select karein

### Step 2: Store Details Bharein

- **Store Name**: Apni pharmacy ka naam
- **Location**: "Detect My Location" button dabao
  - Browser GPS permission allow karein
  - Location automatically detect hogi
- **Submit** dabao

> ⚡ **Note**: Account submit hone ke baad Admin verification ka wait karna hoga. Tab tak dashboard locked rahega.

---

## Part 2: Admin Verification

Naya account automatically **"Unverified"** hota hai.

**Admin verify karega jab**:
- License number provide karoge (Profile section mein)
- Admin aapka account manually approve karega

**Notification**: Verification hone par aapko notification milegi.

**Verify hone ke baad**:
- Online/Offline toggle unlock ho jaata hai
- Patient requests receive hone lag jaati hain

---

## Part 3: Online/Offline Toggle

Yeh sabse important feature hai.

### Online Kaise Hoyein
1. Dashboard open karein
2. Bada **"Go Online"** button dabayein
3. Status: 🟢 **Online — Accepting Requests**

### Offline Kaise Hoyein
1. Dashboard par **"Go Offline"** button dabayein
2. Status: ⚫ **Offline**

> 🔑 **Important**: Sirf Online pharmacies patient requests mein dikhti hain. Band rehne par aur dukaan khuli hone par "Go Online" zaroor karein!

---

## Part 4: Requests Aana aur Respond Karna

### Request Notification
Jab koi patient aapke area mein medicine search karta hai:
- **Push notification** milti hai (agar allowed)
- Dashboard mein **nayi request card** dikhti hai

### Request Card mein Kya Hota Hai
- Patient ne kya medicines maangi hain
- Request kab aayi
- Kitni door patient hai
- Prescription upload ki hai ya nahi

### Respond Karna (Zaruri — Jaldi karein!)

Har request card par **do buttons** hain:

| Button | Matlab |
|--------|--------|
| ✅ **Available** | "Haan, aapki medicines mere paas hain" |
| ❌ **Not Available** | "Maaf karna, yeh medicines available nahi hain" |

> ⏱️ **60 Second Rule**: Agar aap 60 second ke andar respond karte hain → **Fast Responder** badge milta hai! Yeh score future mein aapko pehle dikhata hai.

---

## Part 5: Chat Karna

**Available** response dene ke baad patient chat khol sakta hai.

### Chat Screen Features

**Messages bhejna**:
- Text box mein likhein → Send button dabayein

**Prescription Approve Karna**:
- Chat mein **"Request Prescription"** button → Patient ko request jaayegi
- Patient share kare → Prescription image chat mein dikhegi (secure 10-min link)

**Request Complete Karna**:
- Patient aaya, medicines li → **"Mark as Complete"** button dabayein
- Chat officially close ho jaayega

---

## Part 6: Fast Responder Badge 🏆

**Kaise milta hai**:
- 60 second ke andar respond karo → `fastResponderScore + 1`
- Har response pe → `reliabilityScore + 1`

**Kya faayda hai**:
- Higher score wali pharmacies matching algorithm mein **pehle** dikhti hain
- Zyada patients milte hain

---

## Part 7: Profile Update Karna

Dashboard → **"My Profile"** (ya Profile icon)

**Jo update kar sakte hain**:
| Field | Description |
|-------|-------------|
| **Store Name** | Pharmacy ka naam |
| **Profile Picture** | Store photo (crop karke upload) |
| **Search Radius** | Kitne km mein requests receive karein (default 5 km) |
| **License Number** | Verification ke liye |
| **License Document** | PDF ya image upload |
| **Location** | "Detect New Location" se GPS update |

---

## Part 8: Stats aur Performance

Dashboard par **Stats Cards** dikhti hain:

| Stat | Matlab |
|------|--------|
| **Received** | Total kitni requests aayi |
| **Responded** | Jinpar jawab diya |
| **Pending** | Abhi active requests |
| **Fast Responder** | Agar 60s ke andar respond karte ho regularly |

---

## Part 9: Notifications

**Push Notifications Allow Karein** (Browser pop-up aane par):
- Nayi patient request aane par alert
- Chat message aane par alert

**Bell Icon (🔔)**:
- Unread notifications count
- Notification click → Direct us screen par jaayein

---

## Troubleshooting

| Problem | Solution |
|---------|---------|
| Toggle disabled hai | Admin verification pending hai — license upload karein |
| Account suspended | Admin se sampark karein |
| Requests nahi aa rahe | Check karein "Online" ho ya nahi |
| Notification nahi aa rahi | Browser mein notification permission allow karein |
| Location galat detect ho rahi | Profile mein "Detect New Location" use karein |
| Chat nahin khul raha | Patient ne chat abhi start nahi kiya — wait karein |
