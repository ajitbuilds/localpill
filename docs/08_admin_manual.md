# LocalPill — Admin Panel Manual

> **Kiske liye**: LocalPill platform administrators
> **Access**: Sirf `role: 'admin'` wale users

---

## Admin Dashboard Access

**URL**: `https://localpill-upcharmitra.web.app/dashboard`

Sirf `admin` role wale accounts Admin Dashboard dekhte hain. Admin account banane ke liye existing Admin ko Firestore mein manually `role: 'admin'` set karna hota hai.

---

## Navigation — 8 Tabs

| Tab | Icon | Purpose |
|-----|------|---------|
| Analytics | 📈 | Platform stats aur charts |
| Pharmacies | 🏥 | Pharmacy management |
| Requests | 📋 | All medicine requests |
| Users | 👥 | All registered users |
| Live Map | 🗺️ | Real-time map view |
| Broadcast | 📣 | Push notifications bhejna |
| Settings | ⚙️ | Platform configuration |
| Activity Log | 📝 | Admin action history |

---

## Tab 1: Analytics 📈

### Stats Cards (Top row)
| Card | Description |
|------|-------------|
| Total Users | Platform par registered patients |
| Total Pharmacies | Registered pharmacy accounts |
| Online Now | Currently active pharmacies |
| Active Requests | Pending (live) requests |
| Today's Requests | Aaj bhayi requests |
| Verified | Admin-approved pharmacies |

### Request Volume Chart
- Line chart: Last 7 days ka daily request count
- Trend identify karne ke liye

### Top 5 Medicines Chart
- Bar chart: Sabse zyada requested medicines (case-insensitive)
- Common demand patterns identify karo

### Export Buttons
- **Export Pharmacies CSV** → `pharmacy_data.csv`
- **Export Requests CSV** → `request_data.csv`
- **Export Users CSV** → `user_data.csv`

---

## Tab 2: Pharmacies 🏥

### Search aur Filter
- 🔍 Search bar: Name ya phone number se search
- Filter pills:
  - **All** | **Online** | **Verified** | **Unverified** | **Suspended**

### Pharmacy List Table
Har row mein:
- Pharmacy name
- Phone number
- Online/Offline status (green/grey dot)
- Verified badge (✅)
- Fast Responder Score
- Reliability Score

### Actions per Pharmacy

**Verify Karna** (Verification pending pharmacies ke liye):
1. Pharmacy row par click karein ya expand karein
2. **"✅ Verify"** button dabayein
3. Confirm prompt → "Confirm" karein
4. `isVerified: true` set ho jaata hai → Pharmacy active ho jaati hai

**Suspend Karna**:
1. Suspicious ya violating pharmacy → **"🚫 Suspend"** button
2. Confirm prompt
3. Pharmacy instantly offline ho jaati hai, requests nahi milte

**Unsuspend Karna**:
1. Suspended pharmacy → **"✅ Unsuspend"** button
2. Access restore ho jaata hai

**Expanded Details Panel** (Row expand karne par):
- Full GPS coordinates + Google Maps link
- License number
- License document link
- Profile picture preview
- Registration date

---

## Tab 3: Requests 📋

### Filter Options
- **All** | **Pending** | **Matched** | **Closed** | **Cancelled**

### Request List
Har row mein:
- Date/time
- Medicine names
- Status badge (color-coded)
- Responses count / Notified count

### Actions

**Force Close** (Pending requests ke liye):
- Koi stuck/spam request → **"Force Close"** button
- `status: 'closed'` set ho jaata hai

**Chat Viewer**:
- **"📖 View Chat"** button → Modal khulta hai
- Admin read-only mode mein chat history dekh sakta hai
- Patient aur pharmacy ke beech ki conversation

---

## Tab 4: Users 👥

### Search aur Filter
- 🔍 Search bar: Name ya phone se
- Role filter: **All** | **User** | **Pharmacy** | **Admin**

### User List
- Name, Phone
- Role badge
- Suspended badge (agar applicable)

### Actions

**Role Change**:
- User ki row mein dropdown → New role select karo
- Confirm prompt → Role update

> ⚠️ **Khayal rahe**: Pharmacy ko Admin banana dangerous hai. Soch samajh ke karo.

**Suspend / Unsuspend User**:
- Patient account suspicious lag raha hai → **"🚫 Suspend"** button
- User login nahi kar sakta, requests nahi bhej sakta

---

## Tab 5: Live Map 🗺️

### Map View
- Full-screen Google Maps
- 🟢 **Green markers**: Online pharmacies
- 🔴 **Red markers**: Active pending requests

### Interactions
- Kisi bhi marker par click karein → Popup:
  - Pharmacy: Name, phone, score
  - Request: Medicines list, time, status

Real-time updates — jaise data change hota hai, map update hota hai.

---

## Tab 6: Broadcast 📣

Sabhi verified pharmacies ko ek saath push notification bhejna.

### Kaise Use Karein

1. **Target select karo**:
   - **Online Pharmacies** → Sirf abhi online hain unhe
   - **All Verified** → Sab verified pharmacies ko

2. **Title** likhein (e.g., "System Update")

3. **Message** likhein (e.g., "Kal 2 PM se 4 PM maintenance ho gi")

4. **"Send Broadcast"** dabayein

5. Result dikhega: "✅ Sent to X devices, Y failed"

> 💡 **Use cases**: System maintenance alerts, new feature announcements, holiday reminders

---

## Tab 7: Settings ⚙️

Platform-wide settings jo real-time mein effect karte hain (no redeploy needed).

| Setting | Default | Effect |
|---------|---------|--------|
| **Default Search Radius** | 5 km | Naye patients ke liye search radius |
| **Request Timeout** | 10 minutes | Kitne der baad pending request expire ho |

**Save karne ke baad**:
- Firestore `settings/platformSettings` update hota hai
- `FindMedicine.jsx` real-time mein naya value use karne lagta hai

---

## Tab 8: Activity Log 📝

### Kya Record Hota Hai
- Har Admin action session mein track hoti hai:
  - "Verified pharmacy XYZ Pharma"
  - "Suspended user +91XXXXXXXXXX"
  - "Force closed request abc123"
  - "Broadcast sent to 45 devices"

### Details
- Timestamp (exact time)
- Admin phone number (kaun ne kiya)

### Clear Log
- **"Clear Log"** button → Session ka log clear ho jaata hai (sirf UI level)

> ℹ️ Yeh log sirf current session ka hai. Permanent audit trail ke liye Firebase Console → Logs use karein.

---

## Admin Best Practices

| Action | Recommendation |
|--------|---------------|
| Pharmacy verify karna | License document aur number pehle check karo |
| User suspend karna | Complaint ya spam report ke baad hi karein |
| Broadcast bhejna | Off-peak hours mein (subah ya shaam) |
| Settings change karna | Testing ke baad hi production mein lagao |
| Role admin dena | Sirf trusted people ko, confirm karein |

---

## Emergency Actions

| Emergency | Action |
|-----------|--------|
| Spam pharmacy requests bhej rahi hai | Pharmacies tab → Suspend |
| Patient abuse kar raha hai | Users tab → Suspend |
| Galti se request stuck hai | Requests tab → Force Close |
| System overload | Settings → Timeout kam karo (e.g., 5 min) |
