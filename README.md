# ParkFlow frontend demonstration

ParkFlow is a browser-only Smart Parking Reservation & Vehicle Management
System demo. The existing visual design is preserved; all interactions are
implemented with HTML, CSS, and JavaScript only. No API, Python service, or
database is required to run the demo.

## Start

Double-click `start-parkflow.bat`, or run:

```powershell
python -m http.server 5500
```

Then open <http://127.0.0.1:5500/>.

## Demo portal routing

| Role | Email | Password |
| --- | --- | --- |
| Driver | `nafis@example.com` | `ParkFlow2026` |
| Manager | `manager@parkflow.local` | `Manager2026!` |
| Administrator | `admin@parkflow.local` | `Admin2026!` |

The login screen routes to a portal from the email address. The Staff access
links prefill the manager and administrator demo accounts. New driver account
registration is also fully clickable and opens the Driver portal.

## Frontend code structure

| Stakeholder | Page | Interaction file |
| --- | --- | --- |
| Guest | `index.html` | `frontend/guest-ui.js` |
| Driver | `driver.html` | `frontend/driver-ui.js` |
| Parking Manager | `manager.html` | `frontend/manager-ui.js` |
| Administrator | `admin.html` | `frontend/admin-ui.js` |
| Login / registration | `login.html`, `register.html` | `frontend/auth-ui.js` |

`app.js` contains shared modal, toast, navigation, chat, and client-side PDF
download helpers. See `FRONTEND_DEMO_GUIDE.md` for the feature-to-code map to
use during the project update.

## Scope note

This repository contains the frontend demonstration only. It has no Python
service, database, API, or backend dependency.
