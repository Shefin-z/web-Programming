# ParkFlow: UI and backend guide

The visible UI remains HTML/CSS/JavaScript, while authentication, profiles,
vehicles, reservations, support, admin configuration, and manager operations
now call the same-origin PHP/MySQL API. Client-side PDF downloads remain a
browser feature.

## Code map for presentation

| Stakeholder | Main page | Source file | Demonstrable functions |
| --- | --- | --- | --- |
| Guest | `index.html` | `frontend/guest-ui.js` | Parking search, location filters, map pins, support request |
| Driver | `driver.html` | `frontend/driver-ui.js` | Live availability search, time-slot reservation summary, reservation confirmation, issue report, vehicle add, receipt/history PDF, manager chat |
| Parking Manager | `manager.html` | `frontend/manager-ui.js` | Reservation search, space selection/status change, OTP check-in/out, violation resolution, area-report PDF, driver chat |
| Administrator | `admin.html` | `frontend/admin-ui.js` | Add/remove manager, add location, driver approval, dynamic-price toggles/rules, violation categories, monthly-revenue PDF |
| Login and registration | `login.html`, `register.html` | `frontend/auth-ui.js` | Role-aware demo routing and driver account registration |

## Shared code

`app.js` is the small shared UI layer used by every role:

- `ParkFlowUI.openModal()` and `ParkFlowUI.closeModal()` control dialogs.
- `ParkFlowUI.openSection()` switches dashboard pages without a reload.
- `ParkFlowUI.toast()` gives confirmation feedback for every action.
- `ParkFlowUI.createPdf()` creates and downloads a basic PDF entirely in the browser.

## Fast demo flow

1. Start Apache and MySQL in XAMPP, import `database/parkflow.sql`, then open
   `http://localhost/web-Programming/` (or use `start-parkflow.bat`).
2. Show the Guest home page: search and map pins work without sign-in.
3. Log in using the Staff links to demonstrate the Admin and Manager portals.
4. In the Driver portal, change the duration and location, reserve a space, then download a receipt PDF.
5. In the Manager portal, select a space, update its status, then use OTP `8426` for the check-in demo.
6. In the Admin portal, add a manager, approve a driver, and export the monthly report PDF.

## Backend note

The API routes are documented in `api/README.md`; the connectors that call
them are in `frontend/backend-*.js`.
