# ParkFlow: frontend-only project update guide

This version is intentionally a client-side demonstration. Every button gives
visible feedback, changes the local UI, opens a modal, navigates to the
relevant screen, or downloads a browser-generated PDF. No fetch/API call is
made by the pages.

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

1. Start `start-parkflow.bat`, then open `http://127.0.0.1:5500/`.
2. Show the Guest home page: search and map pins work without sign-in.
3. Log in using the Staff links to demonstrate the Admin and Manager portals.
4. In the Driver portal, change the duration and location, reserve a space, then download a receipt PDF.
5. In the Manager portal, select a space, update its status, then use OTP `8426` for the check-in demo.
6. In the Admin portal, add a manager, approve a driver, and export the monthly report PDF.

## Scope note

The old Python/SQLite files are kept in the project folder as unused source
history. The pages and launcher no longer load or require the backend.
