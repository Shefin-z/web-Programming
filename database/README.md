# ParkFlow MySQL database

`parkflow.sql` is an import-ready MySQL/MariaDB database for the ParkFlow project. It contains the schema and representative data for accounts, drivers, managers, locations, zones, spaces, amenities, pricing, vehicles, reservations, payments, OTP access, violations, issues, chat, support, notifications, reviews, and audit logs.

## Import with XAMPP

1. Start **Apache** and **MySQL** in the XAMPP Control Panel.
2. Open [http://localhost/phpmyadmin](http://localhost/phpmyadmin).
3. Select **Import**, choose `database/parkflow.sql`, and click **Import** / **Go**.
4. Confirm that the `parkflow` database appears in the left sidebar.

The script creates the database automatically and can be imported again to restore its demo data. Re-importing recreates only the tables inside `parkflow`.

## Add current live demo activity

After importing the base database, run [`live_demo_data.sql`](live_demo_data.sql) to add current-day reservations, payments, an active manager, a pending manager application, extra spaces, an open violation, and a pricing rule. It is safe to run repeatedly and does not delete existing records:

```powershell
Get-Content -Raw database\live_demo_data.sql | C:\xampp\mysql\bin\mysql.exe -h 127.0.0.1 -u root parkflow
```

The added active manager is `sara.manager@parkflow.local` with password `Manager2026!`. `arif.manager@parkflow.local` uses the same password but remains pending until approved from the Admin portal.

## Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Administrator | `admin@parkflow.local` | `Admin2026!` |
| Manager | `manager@parkflow.local` | `Manager2026!` |
| Driver | `nafis@example.com` | `ParkFlow2026` |

Passwords are stored as bcrypt hashes. The seeded check-in OTP for reservation `PF-84291` is `8426`; its SHA-256 hash is stored, not the raw value.

## Important

The current HTML/JavaScript project is still a frontend demonstration. Importing this SQL file gives you the MySQL database, but the pages do not automatically read or write it yet. A PHP backend (for example, login, reservation, and dashboard API endpoints using PDO) is needed to connect the localhost UI to this database.
