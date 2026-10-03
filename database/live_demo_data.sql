-- ParkFlow live administrator demo data
-- Run with: C:\xampp\mysql\bin\mysql.exe -h 127.0.0.1 -u root parkflow < database\live_demo_data.sql
-- Safe to re-run: records use unique emails, space codes, reservation codes, and payment references.
USE `parkflow`;

START TRANSACTION;

SET
  @today := CURDATE();

SET
  @admin_id := (
    SELECT
      id
    FROM
      users
    WHERE
      email = 'admin@parkflow.local'
    LIMIT
      1
  );

SET
  @manager_role := (
    SELECT
      id
    FROM
      roles
    WHERE
      name = 'manager'
    LIMIT
      1
  );

-- A second active manager and a pending application give the Managers and
-- Manager approvals screens meaningful records to work with.
INSERT INTO
  users (
    role_id,
    full_name,
    email,
    phone,
    password_hash,
    account_status,
    email_verified_at,
    created_at
  )
VALUES
  (
    @manager_role,
    'Sara Islam',
    'sara.manager@parkflow.local',
    '+8801700000108',
    '$2y$10$xleIneoKVVaFNHlLVH.vUeUcEOFaR2RY/YDDGkadG/.T8iZI/Ley6',
    'active',
    NOW(),
    NOW()
  ),
  (
    @manager_role,
    'Arif Hossain',
    'arif.manager@parkflow.local',
    '+8801700000109',
    '$2y$10$xleIneoKVVaFNHlLVH.vUeUcEOFaR2RY/YDDGkadG/.T8iZI/Ley6',
    'pending',
    NULL,
    NOW()
  )
ON DUPLICATE KEY UPDATE
  full_name = VALUES(full_name),
  phone = VALUES(phone),
  account_status = VALUES(account_status);

SET
  @sara_id := (
    SELECT
      id
    FROM
      users
    WHERE
      email = 'sara.manager@parkflow.local'
    LIMIT
      1
  );

SET
  @arif_id := (
    SELECT
      id
    FROM
      users
    WHERE
      email = 'arif.manager@parkflow.local'
    LIMIT
      1
  );

SET
  @police_plaza_id := (
    SELECT
      id
    FROM
      parking_locations
    WHERE
      name = 'Police Plaza Parking'
    LIMIT
      1
  );

SET
  @navana_id := (
    SELECT
      id
    FROM
      parking_locations
    WHERE
      name = 'Navana Tower Parking'
    LIMIT
      1
  );

INSERT INTO
  manager_profiles (
    user_id,
    employee_code,
    shift_name,
    approved_by_user_id,
    approved_at
  )
VALUES
  (
    @sara_id,
    'PF-MGR-100',
    'Afternoon shift',
    @admin_id,
    NOW()
  ),
  (
    @arif_id,
    'PF-MGR-101',
    'Morning shift',
    NULL,
    NULL
  )
ON DUPLICATE KEY UPDATE
  employee_code = VALUES(employee_code),
  shift_name = VALUES(shift_name),
  approved_by_user_id = VALUES(approved_by_user_id),
  approved_at = VALUES(approved_at);

INSERT INTO
  manager_location_assignments (
    manager_user_id,
    location_id,
    shift_start,
    shift_end,
    is_primary
  )
VALUES
  (
    @sara_id,
    @police_plaza_id,
    '12:00:00',
    '20:00:00',
    1
  ),
  (@arif_id, @navana_id, '08:00:00', '16:00:00', 1)
ON DUPLICATE KEY UPDATE
  shift_start = VALUES(shift_start),
  shift_end = VALUES(shift_end),
  is_primary = VALUES(is_primary);

-- Extra real spaces make the location utilization and current reservation
-- states visible without changing any user-created location.
INSERT INTO
  parking_spaces (
    zone_id,
    space_code,
    space_type,
    status,
    has_ev_charger,
    sensor_identifier,
    last_sensor_sync_at
  )
VALUES
  (
    1,
    'A-21',
    'standard',
    'reserved',
    0,
    'GCC-A-21',
    NOW()
  ),
  (
    4,
    'C-14',
    'standard',
    'occupied',
    0,
    'PP-C-14',
    NOW()
  ),
  (
    5,
    'M-14',
    'standard',
    'available',
    0,
    'NAV-M-14',
    NOW()
  ),
  (
    6,
    'L-09',
    'standard',
    'available',
    0,
    'GL-L-09',
    NOW()
  ),
  (
    7,
    'BN-22',
    'compact',
    'reserved',
    0,
    'BAN-BN-22',
    NOW()
  )
ON DUPLICATE KEY UPDATE
  status = VALUES(status),
  sensor_identifier = VALUES(sensor_identifier),
  last_sensor_sync_at = VALUES(last_sensor_sync_at);

SET
  @nafis_id := (
    SELECT
      id
    FROM
      users
    WHERE
      email = 'nafis@example.com'
    LIMIT
      1
  );

SET
  @shafiq_id := (
    SELECT
      id
    FROM
      users
    WHERE
      email = 'shafiq@example.com'
    LIMIT
      1
  );

SET
  @farhana_id := (
    SELECT
      id
    FROM
      users
    WHERE
      email = 'farhana@example.com'
    LIMIT
      1
  );

SET
  @sadia_id := (
    SELECT
      id
    FROM
      users
    WHERE
      email = 'sadia@example.com'
    LIMIT
      1
  );

SET
  @nafis_vehicle := (
    SELECT
      id
    FROM
      vehicles
    WHERE
      driver_user_id = @nafis_id
      AND is_primary = 1
    LIMIT
      1
  );

SET
  @shafiq_vehicle := (
    SELECT
      id
    FROM
      vehicles
    WHERE
      driver_user_id = @shafiq_id
      AND is_primary = 1
    LIMIT
      1
  );

SET
  @farhana_vehicle := (
    SELECT
      id
    FROM
      vehicles
    WHERE
      driver_user_id = @farhana_id
      AND is_primary = 1
    LIMIT
      1
  );

SET
  @sadia_vehicle := (
    SELECT
      id
    FROM
      vehicles
    WHERE
      driver_user_id = @sadia_id
      AND is_primary = 1
    LIMIT
      1
  );

SET
  @gulshan_id := (
    SELECT
      id
    FROM
      parking_locations
    WHERE
      name = 'Gulshan City Center'
    LIMIT
      1
  );

SET
  @lake_id := (
    SELECT
      id
    FROM
      parking_locations
    WHERE
      name = 'Gulshan Lake Parking'
    LIMIT
      1
  );

SET
  @banani_id := (
    SELECT
      id
    FROM
      parking_locations
    WHERE
      name = 'Banani Plaza Parking'
    LIMIT
      1
  );

SET
  @a21_id := (
    SELECT
      id
    FROM
      parking_spaces
    WHERE
      zone_id = 1
      AND space_code = 'A-21'
    LIMIT
      1
  );

SET
  @c14_id := (
    SELECT
      id
    FROM
      parking_spaces
    WHERE
      zone_id = 4
      AND space_code = 'C-14'
    LIMIT
      1
  );

SET
  @m14_id := (
    SELECT
      id
    FROM
      parking_spaces
    WHERE
      zone_id = 5
      AND space_code = 'M-14'
    LIMIT
      1
  );

SET
  @l09_id := (
    SELECT
      id
    FROM
      parking_spaces
    WHERE
      zone_id = 6
      AND space_code = 'L-09'
    LIMIT
      1
  );

SET
  @bn22_id := (
    SELECT
      id
    FROM
      parking_spaces
    WHERE
      zone_id = 7
      AND space_code = 'BN-22'
    LIMIT
      1
  );

SET
  @a01_id := (
    SELECT
      id
    FROM
      parking_spaces
    WHERE
      zone_id = 1
      AND space_code = 'A-01'
    LIMIT
      1
  );

SET
  @a02_id := (
    SELECT
      id
    FROM
      parking_spaces
    WHERE
      zone_id = 1
      AND space_code = 'A-02'
    LIMIT
      1
  );

-- Keep the primary manager focused on the seeded Gulshan location.  This
-- avoids an accidentally assigned empty location obscuring the live portal.
SET
  @primary_manager_id := (
    SELECT
      id
    FROM
      users
    WHERE
      email = 'manager@parkflow.local'
    LIMIT
      1
  );

UPDATE manager_location_assignments
SET
  is_primary = 0
WHERE
  manager_user_id = @primary_manager_id;

UPDATE manager_location_assignments
SET
  is_primary = 1
WHERE
  manager_user_id = @primary_manager_id
  AND location_id = @gulshan_id;

-- Today's reservations and paid payments power the Dashboard, Analytics, and
-- Revenue report with current data across all five seeded locations.
INSERT INTO
  reservations (
    reservation_code,
    driver_user_id,
    vehicle_id,
    location_id,
    space_id,
    starts_at,
    ends_at,
    actual_check_in_at,
    actual_check_out_at,
    hourly_rate,
    service_fee,
    discount_amount,
    total_amount,
    status,
    notes,
    created_at
  )
VALUES
  (
    'PF-DEMO-1001',
    @nafis_id,
    @nafis_vehicle,
    @navana_id,
    @m14_id,
    DATE_SUB(NOW(), INTERVAL 6 HOUR),
    DATE_SUB(NOW(), INTERVAL 4 HOUR),
    DATE_SUB(NOW(), INTERVAL '5:55' HOUR_MINUTE),
    DATE_SUB(NOW(), INTERVAL '4:06' HOUR_MINUTE),
    100.00,
    8.00,
    0.00,
    208.00,
    'completed',
    'Completed morning reservation.',
    DATE_SUB(NOW(), INTERVAL '6:20' HOUR_MINUTE)
  ),
  (
    'PF-DEMO-1002',
    @shafiq_id,
    @shafiq_vehicle,
    @lake_id,
    @l09_id,
    DATE_SUB(NOW(), INTERVAL '5:30' HOUR_MINUTE),
    DATE_SUB(NOW(), INTERVAL '2:30' HOUR_MINUTE),
    DATE_SUB(NOW(), INTERVAL '5:26' HOUR_MINUTE),
    DATE_SUB(NOW(), INTERVAL '2:39' HOUR_MINUTE),
    70.00,
    8.00,
    0.00,
    218.00,
    'completed',
    'Completed lake-side reservation.',
    DATE_SUB(NOW(), INTERVAL '5:50' HOUR_MINUTE)
  ),
  (
    'PF-DEMO-1003',
    @farhana_id,
    @farhana_vehicle,
    @police_plaza_id,
    @c14_id,
    DATE_SUB(NOW(), INTERVAL 1 HOUR),
    DATE_ADD(NOW(), INTERVAL 2 HOUR),
    DATE_SUB(NOW(), INTERVAL 55 MINUTE),
    NULL,
    90.00,
    8.00,
    0.00,
    278.00,
    'active',
    'Currently parked in the afternoon shift.',
    DATE_SUB(NOW(), INTERVAL '1:25' HOUR_MINUTE)
  ),
  (
    'PF-DEMO-1004',
    @sadia_id,
    @sadia_vehicle,
    @banani_id,
    @bn22_id,
    DATE_ADD(NOW(), INTERVAL '1:30' HOUR_MINUTE),
    DATE_ADD(NOW(), INTERVAL '3:30' HOUR_MINUTE),
    NULL,
    NULL,
    120.00,
    8.00,
    0.00,
    248.00,
    'waiting_check_in',
    'Driver is expected at the Banani entrance.',
    DATE_SUB(NOW(), INTERVAL 20 MINUTE)
  ),
  (
    'PF-DEMO-1005',
    @nafis_id,
    @nafis_vehicle,
    @gulshan_id,
    @a21_id,
    DATE_ADD(NOW(), INTERVAL 3 HOUR),
    DATE_ADD(NOW(), INTERVAL 5 HOUR),
    NULL,
    NULL,
    80.00,
    8.00,
    0.00,
    168.00,
    'confirmed',
    'Evening reservation at Gulshan City Center.',
    DATE_SUB(NOW(), INTERVAL 1 HOUR)
  ),
  (
    'PF-DEMO-1006',
    @nafis_id,
    @nafis_vehicle,
    @gulshan_id,
    @a01_id,
    DATE_SUB(NOW(), INTERVAL 10 MINUTE),
    DATE_ADD(NOW(), INTERVAL 110 MINUTE),
    NULL,
    NULL,
    80.00,
    8.00,
    0.00,
    168.00,
    'waiting_check_in',
    'Manager demo: arrival waiting at Gate 1. OTP 1357.',
    DATE_SUB(NOW(), INTERVAL 20 MINUTE)
  ),
  (
    'PF-DEMO-1007',
    @sadia_id,
    @sadia_vehicle,
    @gulshan_id,
    @a02_id,
    DATE_SUB(NOW(), INTERVAL 1 HOUR),
    DATE_ADD(NOW(), INTERVAL 1 HOUR),
    DATE_SUB(NOW(), INTERVAL 55 MINUTE),
    NULL,
    80.00,
    8.00,
    0.00,
    168.00,
    'active',
    'Manager demo: vehicle ready for check-out. OTP 2468.',
    DATE_SUB(NOW(), INTERVAL '1:10' HOUR_MINUTE)
  )
ON DUPLICATE KEY UPDATE
  starts_at = VALUES(starts_at),
  ends_at = VALUES(ends_at),
  actual_check_in_at = VALUES(actual_check_in_at),
  actual_check_out_at = VALUES(actual_check_out_at),
  hourly_rate = VALUES(hourly_rate),
  service_fee = VALUES(service_fee),
  discount_amount = VALUES(discount_amount),
  total_amount = VALUES(total_amount),
  status = VALUES(status),
  notes = VALUES(notes),
  created_at = VALUES(created_at);

SET
  @demo_navana := (
    SELECT
      id
    FROM
      reservations
    WHERE
      reservation_code = 'PF-DEMO-1001'
    LIMIT
      1
  );

SET
  @demo_lake := (
    SELECT
      id
    FROM
      reservations
    WHERE
      reservation_code = 'PF-DEMO-1002'
    LIMIT
      1
  );

SET
  @demo_police := (
    SELECT
      id
    FROM
      reservations
    WHERE
      reservation_code = 'PF-DEMO-1003'
    LIMIT
      1
  );

SET
  @demo_banani := (
    SELECT
      id
    FROM
      reservations
    WHERE
      reservation_code = 'PF-DEMO-1004'
    LIMIT
      1
  );

SET
  @demo_gulshan := (
    SELECT
      id
    FROM
      reservations
    WHERE
      reservation_code = 'PF-DEMO-1005'
    LIMIT
      1
  );

SET
  @demo_gulshan_checkin := (
    SELECT
      id
    FROM
      reservations
    WHERE
      reservation_code = 'PF-DEMO-1006'
    LIMIT
      1
  );

SET
  @demo_gulshan_checkout := (
    SELECT
      id
    FROM
      reservations
    WHERE
      reservation_code = 'PF-DEMO-1007'
    LIMIT
      1
  );

UPDATE parking_spaces
SET
  status = 'reserved',
  last_sensor_sync_at = NOW()
WHERE
  id = @a01_id;

UPDATE parking_spaces
SET
  status = 'occupied',
  last_sensor_sync_at = NOW()
WHERE
  id = @a02_id;

INSERT INTO
  payments (
    reservation_id,
    payment_reference,
    amount,
    currency,
    method,
    status,
    paid_at,
    created_at
  )
VALUES
  (
    @demo_navana,
    'PAY-PF-DEMO-1001',
    208.00,
    'BDT',
    'card',
    'paid',
    DATE_SUB(NOW(), INTERVAL '6:20' HOUR_MINUTE),
    DATE_SUB(NOW(), INTERVAL '6:20' HOUR_MINUTE)
  ),
  (
    @demo_lake,
    'PAY-PF-DEMO-1002',
    218.00,
    'BDT',
    'mobile_banking',
    'paid',
    DATE_SUB(NOW(), INTERVAL '5:50' HOUR_MINUTE),
    DATE_SUB(NOW(), INTERVAL '5:50' HOUR_MINUTE)
  ),
  (
    @demo_police,
    'PAY-PF-DEMO-1003',
    278.00,
    'BDT',
    'wallet',
    'paid',
    DATE_SUB(NOW(), INTERVAL '1:25' HOUR_MINUTE),
    DATE_SUB(NOW(), INTERVAL '1:25' HOUR_MINUTE)
  ),
  (
    @demo_banani,
    'PAY-PF-DEMO-1004',
    248.00,
    'BDT',
    'card',
    'paid',
    DATE_SUB(NOW(), INTERVAL 20 MINUTE),
    DATE_SUB(NOW(), INTERVAL 20 MINUTE)
  ),
  (
    @demo_gulshan,
    'PAY-PF-DEMO-1005',
    168.00,
    'BDT',
    'mobile_banking',
    'paid',
    DATE_SUB(NOW(), INTERVAL 1 HOUR),
    DATE_SUB(NOW(), INTERVAL 1 HOUR)
  ),
  (
    @demo_gulshan_checkin,
    'PAY-PF-DEMO-1006',
    168.00,
    'BDT',
    'card',
    'paid',
    DATE_SUB(NOW(), INTERVAL 20 MINUTE),
    DATE_SUB(NOW(), INTERVAL 20 MINUTE)
  ),
  (
    @demo_gulshan_checkout,
    'PAY-PF-DEMO-1007',
    168.00,
    'BDT',
    'wallet',
    'paid',
    DATE_SUB(NOW(), INTERVAL '1:10' HOUR_MINUTE),
    DATE_SUB(NOW(), INTERVAL '1:10' HOUR_MINUTE)
  )
ON DUPLICATE KEY UPDATE
  reservation_id = VALUES(reservation_id),
  amount = VALUES(amount),
  method = VALUES(method),
  status = VALUES(status),
  paid_at = VALUES(paid_at),
  created_at = VALUES(created_at);

INSERT INTO
  reservation_status_history (
    reservation_id,
    status,
    changed_by_user_id,
    note,
    created_at
  )
SELECT
  @demo_navana,
  'completed',
  @sara_id,
  'Live demo reservation completed.',
  DATE_SUB(NOW(), INTERVAL '4:06' HOUR_MINUTE)
WHERE
  NOT EXISTS (
    SELECT
      1
    FROM
      reservation_status_history
    WHERE
      reservation_id = @demo_navana
      AND note = 'Live demo reservation completed.'
  );

INSERT INTO
  reservation_status_history (
    reservation_id,
    status,
    changed_by_user_id,
    note,
    created_at
  )
SELECT
  @demo_police,
  'active',
  @sara_id,
  'Live demo vehicle checked in.',
  DATE_SUB(NOW(), INTERVAL 55 MINUTE)
WHERE
  NOT EXISTS (
    SELECT
      1
    FROM
      reservation_status_history
    WHERE
      reservation_id = @demo_police
      AND note = 'Live demo vehicle checked in.'
  );

INSERT INTO
  access_otps (
    reservation_id,
    purpose,
    otp_hash,
    expires_at,
    used_at,
    verified_by_user_id,
    created_at
  )
SELECT
  @demo_banani,
  'check_in',
  SHA2('2468', 256),
  DATE_ADD(NOW(), INTERVAL 4 HOUR),
  NULL,
  NULL,
  DATE_SUB(NOW(), INTERVAL 20 MINUTE)
WHERE
  NOT EXISTS (
    SELECT
      1
    FROM
      access_otps
    WHERE
      reservation_id = @demo_banani
      AND purpose = 'check_in'
      AND otp_hash = SHA2('2468', 256)
  );

INSERT INTO
  access_otps (
    reservation_id,
    purpose,
    otp_hash,
    expires_at,
    used_at,
    verified_by_user_id,
    created_at
  )
SELECT
  @demo_gulshan_checkin,
  'check_in',
  SHA2('1357', 256),
  DATE_ADD(NOW(), INTERVAL 4 HOUR),
  NULL,
  NULL,
  NOW()
WHERE
  NOT EXISTS (
    SELECT
      1
    FROM
      access_otps
    WHERE
      reservation_id = @demo_gulshan_checkin
      AND purpose = 'check_in'
      AND otp_hash = SHA2('1357', 256)
      AND used_at IS NULL
  );

INSERT INTO
  access_otps (
    reservation_id,
    purpose,
    otp_hash,
    expires_at,
    used_at,
    verified_by_user_id,
    created_at
  )
SELECT
  @demo_gulshan_checkout,
  'check_out',
  SHA2('2468', 256),
  DATE_ADD(NOW(), INTERVAL 4 HOUR),
  NULL,
  NULL,
  NOW()
WHERE
  NOT EXISTS (
    SELECT
      1
    FROM
      access_otps
    WHERE
      reservation_id = @demo_gulshan_checkout
      AND purpose = 'check_out'
      AND otp_hash = SHA2('2468', 256)
      AND used_at IS NULL
  );

INSERT INTO
  violations (
    violation_code,
    category_id,
    reservation_id,
    vehicle_id,
    space_id,
    reported_by_user_id,
    assigned_manager_user_id,
    source,
    severity,
    description,
    penalty_amount,
    status,
    reported_at
  )
SELECT
  'VL-DEMO-1001',
  1,
  @demo_police,
  @farhana_vehicle,
  @c14_id,
  @sara_id,
  @sara_id,
  'sensor',
  'high',
  'Demo overstay alert for the active Police Plaza reservation.',
  80.00,
  'open',
  NOW()
WHERE
  NOT EXISTS (
    SELECT
      1
    FROM
      violations
    WHERE
      violation_code = 'VL-DEMO-1001'
  );

INSERT INTO
  dynamic_pricing_rules (
    location_id,
    name,
    day_of_week,
    start_time,
    end_time,
    adjustment_type,
    adjustment_value,
    is_active,
    created_by_user_id
  )
SELECT
  @police_plaza_id,
  'Police Plaza afternoon demand',
  NULL,
  '14:00:00',
  '18:00:00',
  'percentage',
  15.00,
  1,
  @admin_id
WHERE
  NOT EXISTS (
    SELECT
      1
    FROM
      dynamic_pricing_rules
    WHERE
      name = 'Police Plaza afternoon demand'
      AND location_id = @police_plaza_id
  );

COMMIT;
