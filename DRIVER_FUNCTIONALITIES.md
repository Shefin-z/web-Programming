# Driver Portal Functionality Map

এই ফাইলটি Sir-কে দেখানোর জন্য driver portal-এর functionality এবং code location এক জায়গায় mark করে রাখা হয়েছে। Source code-এ একই নম্বরের `DRIVER FEATURE` comment দিয়ে section করা আছে।

## Main files

| File | কাজ |
| --- | --- |
| `driver.html` | Driver portal-এর page layout, form, modal এবং navigation |
| `frontend/backend-driver.js` | Driver UI, API call, rendering এবং user action |
| `frontend/driver-ui.js` | Driver page section/route navigation |
| `frontend/api.js` | Common fetch client, session এবং CSRF handling |
| `api/index.php` | Driver API এবং database operation |
| `api/bootstrap.php` | Login/session, database এবং shared pricing helper |

## Feature sections

### 01. Login, authentication এবং profile

- Driver session verify করে portal-এ ঢুকতে দেয়।
- Driver name, email, phone, city, emergency contact এবং preferences load/update হয়।
- Frontend source: `frontend/backend-driver.js:94-124` — `guard()`, `setProfile()`
- API source: `api/index.php:1737-1795` — `driver/profile` GET/PUT

### 02. Vehicle management

- Driver-এর vehicle list দেখায়।
- New vehicle add, vehicle edit এবং primary vehicle select করা যায়।
- Reservation form-এ vehicle select করা যায়।
- Frontend source: `frontend/backend-driver.js:127-190` — `renderVehicles()` এবং vehicle action handlers
- API source: `api/index.php:1796-1919` — `driver/vehicles` GET/POST, `driver/vehicles/{id}` PUT

### 03. Parking location এবং zone selection

- Operational parking locations load হয়।
- Location অনুযায়ী Zone A, Zone B, EV Deck ইত্যাদি load হয়।
- Zone select করলে শুধু ওই zone-এর available spaces দেখায়।
- Frontend source: `frontend/backend-driver.js:191-283, 309-357` — `renderLocations()`, `renderZones()`, `loadZones()`
- API source: `api/index.php:1920-1939` — `driver/locations`, `driver/zones`

### 04. Parking space availability

- Available space driver select করতে পারে।
- Booked, occupied, blocked space driver select করতে পারে না।
- Space list live refresh হয়।
- Frontend source: `frontend/backend-driver.js:284-308, 752-767` — `renderSpaces()`, `loadSpaces()`
- API source: `api/index.php:1940-1958` — `driver/spaces`

### 05. Price quote এবং reservation

- Location, arrival time এবং duration অনুযায়ী final quote নেয়।
- Parking subtotal, service fee, discount এবং total আলাদা দেখায়।
- Reservation create হলে payment record, reserved space এবং check-in/check-out OTP তৈরি হয়।
- Frontend source: `frontend/backend-driver.js:768-873, 1080-1125` — `updateReservationSummary()` এবং reservation submit handler
- API source: `api/index.php:1959-2149` — `driver/quote`, `driver/reservations` GET/POST

### 06. Active booking, OTP এবং cancellation

- Active/upcoming booking card দেখায়।
- Check-in OTP এবং check-out OTP refresh করা যায়।
- Upcoming booking cancel করলে reservation cancelled হয় এবং space আবার free হয়।
- Manager OTP verify করলে driver portal-এ একই status update হয়।
- Frontend source: `frontend/backend-driver.js:359-421, 1220-1270` — `renderActiveBooking()`, `refresh-otp`, `cancel-booking`
- API source: `api/index.php:2150-2289` — cancellation এবং check-in/check-out OTP routes

### 07. Parking history এবং receipt

- Completed/cancelled/upcoming reservation history filter করা যায়।
- Reservation details এবং receipt modal দেখায়।
- Receipt PDF download করা যায়।
- Frontend source: `frontend/backend-driver.js:423-571, 875-932` — `historyRows()`, `renderHistory()`, `showReceipt()`, history export handler
- API source: `api/index.php:1990-1998` — `driver/reservations` GET

### 08. Issue report এবং support

- Driver parking issue report করতে পারে।
- Issue status এবং manager/admin response দেখা যায়।
- Frontend source: `frontend/backend-driver.js:573-650, 1460-1510` — `renderIssues()` এবং issue submit handler
- API source: `api/index.php:2291-2408` — `driver/issues` GET/POST

### 09. Manager chat এবং notifications

- Assigned manager list load হয়।
- Driver manager-কে message পাঠাতে পারে এবং reply দেখতে পারে।
- Notifications read/mark-all-read করা যায়।
- Frontend source: `frontend/backend-driver.js:652-750` — `renderConversations()`, `loadMessages()`
- API source: `api/index.php:2409-2505` — `driver/managers`, `driver/conversations`, `driver/messages`, `notifications`

## End-to-end booking flow

```text
Driver selects location
        ↓
Driver selects zone
        ↓
Driver selects free space
        ↓
Backend returns final price quote
        ↓
Reservation + payment + OTP created
        ↓
Space becomes reserved/booked
        ↓
Manager verifies check-in OTP
        ↓
Space becomes occupied
        ↓
Manager verifies check-out OTP
        ↓
Space becomes free and reservation becomes completed
```

## Sir-কে সংক্ষেপে বলার মতো summary

> Driver portal-এ authentication/profile, vehicle management, location-zone-space selection, dynamic price calculation, reservation/payment, OTP-based check-in/check-out, booking cancellation, history/receipt, issue reporting এবং manager communication implement করা হয়েছে। Driver booking বা manager status update হলে একই database/API-এর মাধ্যমে driver ও manager—দুই portal-এই status synchronize হয়।
