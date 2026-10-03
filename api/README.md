# ParkFlow PHP API

The PHP API is available through `api/index.php?route=...` and uses PHP sessions, PDO prepared statements, bcrypt passwords, CSRF tokens for signed-in write operations, role checks, database transactions for reservations and gate access, and audit logs.

## Start locally

1. In XAMPP, start **Apache** and **MySQL**.
2. Import [`../database/parkflow.sql`](../database/parkflow.sql) in phpMyAdmin.
3. Open [http://localhost/web-Programming/](http://localhost/web-Programming/).

The standard XAMPP setup uses MySQL user `root` with an empty password. If yours differs, set the `PARKFLOW_DB_HOST`, `PARKFLOW_DB_NAME`, `PARKFLOW_DB_USER`, and `PARKFLOW_DB_PASS` environment variables, or update the local constants at the top of [`bootstrap.php`](bootstrap.php).

## Main routes

| Area           | Routes                                                                                                                                           |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Authentication | `auth/me`, `auth/login`, `auth/register`, `auth/logout`                                                                                          |
| Public         | `public/locations`, `public/support`                                                                                                             |
| Administrator  | `admin/dashboard`, `admin/managers`, `admin/locations`, `admin/pricing-rules`, `admin/violation-categories`                                      |
| Manager        | `manager/dashboard`, `manager/reservations`, `manager/spaces`, `manager/check-in`, `manager/check-out`, `manager/violations`, `manager/messages` |
| Driver         | `driver/profile`, `driver/vehicles`, `driver/locations`, `driver/spaces`, `driver/reservations`, `driver/issues`, `driver/messages`              |

The frontend adapters in `frontend/backend-*.js` call these routes and redirect unauthenticated or unauthorized roles back to the appropriate sign-in page.
