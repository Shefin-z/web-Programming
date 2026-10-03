# ParkFlow smart parking system

ParkFlow is a Smart Parking Reservation & Vehicle Management System. The
existing HTML/CSS design is paired with a PHP, JavaScript, and MySQL backend
for XAMPP.

## Start

Start **Apache** and **MySQL** in the XAMPP Control Panel, import
[`database/parkflow.sql`](database/parkflow.sql) through phpMyAdmin, then open:

```powershell
http://localhost/web-Programming/
```

## Demo portal routing

| Role | Email | Password |
| --- | --- | --- |
| Driver | `nafis@example.com` | `ParkFlow2026` |
| Manager | `manager@parkflow.local` | `Manager2026!` |
| Administrator | `admin@parkflow.local` | `Admin2026!` |

The login screen authenticates against MySQL and routes from the account role.
The Staff access links prefill the manager and administrator demo accounts.
New driver account registration creates the user and primary vehicle in MySQL.

## Application structure

| Stakeholder | Page | Interaction file |
| --- | --- | --- |
| Guest | `index.html` | `frontend/guest-ui.js` |
| Driver | `driver.html` | `frontend/driver-ui.js` |
| Parking Manager | `manager.html` | `frontend/manager-ui.js` |
| Administrator | `admin.html` | `frontend/admin-ui.js` |
| Login / registration | `login.html`, `register.html` | `frontend/auth-ui.js` |

The PHP API lives in [`api/`](api/README.md). `frontend/backend-*.js` connects
each portal to the API using the same-origin PHP session.

`app.js` contains shared modal, toast, navigation, chat, and client-side PDF
download helpers. See `FRONTEND_DEMO_GUIDE.md` for the feature-to-code map to
use during the project update.

## Database for XAMPP

An import-ready MySQL/MariaDB database is now available at
[`database/parkflow.sql`](database/parkflow.sql). See
[`database/README.md`](database/README.md) for the phpMyAdmin import steps and
the seeded demo credentials.

## Security note

Demo credentials are seeded for local development only. Change the database
password and all demo passwords before deploying beyond localhost.
