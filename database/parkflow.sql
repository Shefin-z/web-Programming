-- ParkFlow database for XAMPP (MySQL/MariaDB)
-- Import this file in phpMyAdmin. It is safe to re-import: ParkFlow tables
-- are recreated, but no database outside `parkflow` is changed.
CREATE DATABASE IF NOT EXISTS `parkflow` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE `parkflow`;

SET
  FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `audit_logs`;

DROP TABLE IF EXISTS `reviews`;

DROP TABLE IF EXISTS `notifications`;

DROP TABLE IF EXISTS `support_tickets`;

DROP TABLE IF EXISTS `messages`;

DROP TABLE IF EXISTS `issue_reports`;

DROP TABLE IF EXISTS `violations`;

DROP TABLE IF EXISTS `violation_categories`;

DROP TABLE IF EXISTS `payments`;

DROP TABLE IF EXISTS `access_otps`;

DROP TABLE IF EXISTS `reservation_status_history`;

DROP TABLE IF EXISTS `reservations`;

DROP TABLE IF EXISTS `vehicles`;

DROP TABLE IF EXISTS `dynamic_pricing_rules`;

DROP TABLE IF EXISTS `parking_location_amenities`;

DROP TABLE IF EXISTS `amenities`;

DROP TABLE IF EXISTS `parking_space_status_history`;

DROP TABLE IF EXISTS `parking_spaces`;

DROP TABLE IF EXISTS `manager_location_assignments`;

DROP TABLE IF EXISTS `parking_zones`;

DROP TABLE IF EXISTS `parking_locations`;

DROP TABLE IF EXISTS `manager_profiles`;

DROP TABLE IF EXISTS `driver_profiles`;

DROP TABLE IF EXISTS `users`;

DROP TABLE IF EXISTS `roles`;

SET
  FOREIGN_KEY_CHECKS = 1;

CREATE TABLE `roles` (
  `id` TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(30) NOT NULL,
  `description` VARCHAR(150) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_roles_name` (`name`)
) ENGINE = InnoDB;

CREATE TABLE `users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `role_id` TINYINT UNSIGNED NOT NULL,
  `full_name` VARCHAR(120) NOT NULL,
  `email` VARCHAR(190) NOT NULL,
  `phone` VARCHAR(30) DEFAULT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `account_status` ENUM('pending', 'active', 'suspended', 'rejected') NOT NULL DEFAULT 'pending',
  `email_verified_at` DATETIME DEFAULT NULL,
  `last_login_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `idx_users_role_status` (`role_id`, `account_status`),
  CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`)
) ENGINE = InnoDB;

CREATE TABLE `driver_profiles` (
  `user_id` BIGINT UNSIGNED NOT NULL,
  `city` VARCHAR(100) DEFAULT 'Dhaka',
  `emergency_contact` VARCHAR(120) DEFAULT NULL,
  `preferred_language` VARCHAR(20) NOT NULL DEFAULT 'English',
  `receive_updates` TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_driver_profiles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE `manager_profiles` (
  `user_id` BIGINT UNSIGNED NOT NULL,
  `employee_code` VARCHAR(30) NOT NULL,
  `shift_name` VARCHAR(60) DEFAULT NULL,
  `approved_by_user_id` BIGINT UNSIGNED DEFAULT NULL,
  `approved_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uq_manager_employee_code` (`employee_code`),
  CONSTRAINT `fk_manager_profiles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_manager_profiles_approver` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE = InnoDB;

CREATE TABLE `parking_locations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(150) NOT NULL,
  `address` VARCHAR(255) NOT NULL,
  `area` VARCHAR(100) NOT NULL,
  `city` VARCHAR(100) NOT NULL DEFAULT 'Dhaka',
  `latitude` DECIMAL(10, 7) DEFAULT NULL,
  `longitude` DECIMAL(10, 7) DEFAULT NULL,
  `base_hourly_rate` DECIMAL(10, 2) NOT NULL,
  `total_capacity` SMALLINT UNSIGNED NOT NULL,
  `opening_time` TIME NOT NULL DEFAULT '00:00:00',
  `closing_time` TIME NOT NULL DEFAULT '23:59:59',
  `status` ENUM('draft', 'operational', 'paused', 'closed') NOT NULL DEFAULT 'operational',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_locations_area_status` (`area`, `status`)
) ENGINE = InnoDB;

CREATE TABLE `parking_zones` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `location_id` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `code` VARCHAR(20) NOT NULL,
  `floor_label` VARCHAR(50) DEFAULT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_zone_code_per_location` (`location_id`, `code`),
  CONSTRAINT `fk_zones_location` FOREIGN KEY (`location_id`) REFERENCES `parking_locations` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE `manager_location_assignments` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `manager_user_id` BIGINT UNSIGNED NOT NULL,
  `location_id` BIGINT UNSIGNED NOT NULL,
  `shift_start` TIME DEFAULT NULL,
  `shift_end` TIME DEFAULT NULL,
  `is_primary` TINYINT(1) NOT NULL DEFAULT 0,
  `assigned_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_manager_location` (`manager_user_id`, `location_id`),
  CONSTRAINT `fk_assignments_manager` FOREIGN KEY (`manager_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_assignments_location` FOREIGN KEY (`location_id`) REFERENCES `parking_locations` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE `parking_spaces` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `zone_id` BIGINT UNSIGNED NOT NULL,
  `space_code` VARCHAR(20) NOT NULL,
  `space_type` ENUM(
    'standard',
    'compact',
    'ev',
    'accessible',
    'motorcycle'
  ) NOT NULL DEFAULT 'standard',
  `status` ENUM(
    'available',
    'reserved',
    'occupied',
    'maintenance',
    'blocked'
  ) NOT NULL DEFAULT 'available',
  `has_ev_charger` TINYINT(1) NOT NULL DEFAULT 0,
  `sensor_identifier` VARCHAR(80) DEFAULT NULL,
  `last_sensor_sync_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_space_code_per_zone` (`zone_id`, `space_code`),
  KEY `idx_spaces_status` (`status`),
  CONSTRAINT `fk_spaces_zone` FOREIGN KEY (`zone_id`) REFERENCES `parking_zones` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE `parking_space_status_history` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `space_id` BIGINT UNSIGNED NOT NULL,
  `status` ENUM(
    'available',
    'reserved',
    'occupied',
    'maintenance',
    'blocked'
  ) NOT NULL,
  `changed_by_user_id` BIGINT UNSIGNED DEFAULT NULL,
  `note` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_space_status_history` (`space_id`, `created_at`),
  CONSTRAINT `fk_space_history_space` FOREIGN KEY (`space_id`) REFERENCES `parking_spaces` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_space_history_user` FOREIGN KEY (`changed_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE = InnoDB;

CREATE TABLE `amenities` (
  `id` SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(80) NOT NULL,
  `icon_key` VARCHAR(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_amenities_name` (`name`)
) ENGINE = InnoDB;

CREATE TABLE `parking_location_amenities` (
  `location_id` BIGINT UNSIGNED NOT NULL,
  `amenity_id` SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (`location_id`, `amenity_id`),
  CONSTRAINT `fk_location_amenities_location` FOREIGN KEY (`location_id`) REFERENCES `parking_locations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_location_amenities_amenity` FOREIGN KEY (`amenity_id`) REFERENCES `amenities` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE `dynamic_pricing_rules` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `location_id` BIGINT UNSIGNED DEFAULT NULL,
  `name` VARCHAR(120) NOT NULL,
  `day_of_week` TINYINT UNSIGNED DEFAULT NULL COMMENT '1=Monday through 7=Sunday; NULL means every day',
  `start_time` TIME NOT NULL,
  `end_time` TIME NOT NULL,
  `adjustment_type` ENUM('percentage', 'fixed_amount') NOT NULL,
  `adjustment_value` DECIMAL(10, 2) NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_by_user_id` BIGINT UNSIGNED DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pricing_rules_location_active` (`location_id`, `is_active`),
  CONSTRAINT `fk_pricing_location` FOREIGN KEY (`location_id`) REFERENCES `parking_locations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pricing_creator` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE = InnoDB;

CREATE TABLE `vehicles` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `driver_user_id` BIGINT UNSIGNED NOT NULL,
  `registration_number` VARCHAR(40) NOT NULL,
  `make_model` VARCHAR(100) NOT NULL,
  `vehicle_year` SMALLINT UNSIGNED DEFAULT NULL,
  `vehicle_type` ENUM(
    'sedan',
    'suv',
    'hatchback',
    'motorcycle',
    'electric_vehicle',
    'other'
  ) NOT NULL DEFAULT 'sedan',
  `color` VARCHAR(50) DEFAULT NULL,
  `powertrain` ENUM('petrol', 'diesel', 'hybrid', 'electric', 'other') NOT NULL DEFAULT 'petrol',
  `is_primary` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_vehicles_registration_number` (`registration_number`),
  KEY `idx_vehicles_driver` (`driver_user_id`),
  CONSTRAINT `fk_vehicles_driver` FOREIGN KEY (`driver_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE `reservations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `reservation_code` VARCHAR(30) NOT NULL,
  `driver_user_id` BIGINT UNSIGNED NOT NULL,
  `vehicle_id` BIGINT UNSIGNED NOT NULL,
  `location_id` BIGINT UNSIGNED NOT NULL,
  `space_id` BIGINT UNSIGNED DEFAULT NULL,
  `starts_at` DATETIME NOT NULL,
  `ends_at` DATETIME NOT NULL,
  `actual_check_in_at` DATETIME DEFAULT NULL,
  `actual_check_out_at` DATETIME DEFAULT NULL,
  `hourly_rate` DECIMAL(10, 2) NOT NULL,
  `service_fee` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `discount_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `total_amount` DECIMAL(10, 2) NOT NULL,
  `status` ENUM(
    'pending_payment',
    'confirmed',
    'waiting_check_in',
    'active',
    'completed',
    'cancelled',
    'expired',
    'overstayed'
  ) NOT NULL DEFAULT 'pending_payment',
  `otp_attempts` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `notes` VARCHAR(500) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_reservations_code` (`reservation_code`),
  KEY `idx_reservations_driver_date` (`driver_user_id`, `starts_at`),
  KEY `idx_reservations_location_status_date` (`location_id`, `status`, `starts_at`),
  KEY `idx_reservations_space_dates` (`space_id`, `starts_at`, `ends_at`),
  CONSTRAINT `fk_reservations_driver` FOREIGN KEY (`driver_user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_reservations_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`),
  CONSTRAINT `fk_reservations_location` FOREIGN KEY (`location_id`) REFERENCES `parking_locations` (`id`),
  CONSTRAINT `fk_reservations_space` FOREIGN KEY (`space_id`) REFERENCES `parking_spaces` (`id`) ON DELETE SET NULL
) ENGINE = InnoDB;

CREATE TABLE `reservation_status_history` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `reservation_id` BIGINT UNSIGNED NOT NULL,
  `status` ENUM(
    'pending_payment',
    'confirmed',
    'waiting_check_in',
    'active',
    'completed',
    'cancelled',
    'expired',
    'overstayed'
  ) NOT NULL,
  `changed_by_user_id` BIGINT UNSIGNED DEFAULT NULL,
  `note` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_reservation_status_history` (`reservation_id`, `created_at`),
  CONSTRAINT `fk_reservation_history_reservation` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reservation_history_user` FOREIGN KEY (`changed_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE = InnoDB;

CREATE TABLE `access_otps` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `reservation_id` BIGINT UNSIGNED NOT NULL,
  `purpose` ENUM('check_in', 'check_out') NOT NULL,
  `otp_hash` CHAR(64) NOT NULL COMMENT 'SHA-256 hash; never store the raw OTP',
  `expires_at` DATETIME NOT NULL,
  `used_at` DATETIME DEFAULT NULL,
  `verified_by_user_id` BIGINT UNSIGNED DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_otps_reservation_purpose` (`reservation_id`, `purpose`, `expires_at`),
  CONSTRAINT `fk_otps_reservation` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_otps_verified_by` FOREIGN KEY (`verified_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE = InnoDB;

CREATE TABLE `payments` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `reservation_id` BIGINT UNSIGNED NOT NULL,
  `payment_reference` VARCHAR(80) NOT NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `currency` CHAR(3) NOT NULL DEFAULT 'BDT',
  `method` ENUM(
    'card',
    'mobile_banking',
    'cash',
    'wallet',
    'bank_transfer'
  ) NOT NULL,
  `status` ENUM(
    'pending',
    'paid',
    'failed',
    'refunded',
    'partially_refunded'
  ) NOT NULL DEFAULT 'pending',
  `paid_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_payments_reference` (`payment_reference`),
  KEY `idx_payments_reservation` (`reservation_id`, `status`),
  CONSTRAINT `fk_payments_reservation` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE `violation_categories` (
  `id` SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(120) NOT NULL,
  `description` VARCHAR(500) DEFAULT NULL,
  `default_severity` ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium',
  `default_penalty` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_violation_categories_name` (`name`)
) ENGINE = InnoDB;

CREATE TABLE `violations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `violation_code` VARCHAR(30) NOT NULL,
  `category_id` SMALLINT UNSIGNED NOT NULL,
  `reservation_id` BIGINT UNSIGNED DEFAULT NULL,
  `vehicle_id` BIGINT UNSIGNED DEFAULT NULL,
  `space_id` BIGINT UNSIGNED DEFAULT NULL,
  `reported_by_user_id` BIGINT UNSIGNED DEFAULT NULL,
  `assigned_manager_user_id` BIGINT UNSIGNED DEFAULT NULL,
  `source` ENUM('sensor', 'driver', 'manager', 'system') NOT NULL,
  `severity` ENUM('low', 'medium', 'high', 'critical') NOT NULL,
  `description` VARCHAR(1000) NOT NULL,
  `penalty_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `status` ENUM('open', 'under_review', 'resolved', 'dismissed') NOT NULL DEFAULT 'open',
  `reported_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `resolved_at` DATETIME DEFAULT NULL,
  `resolution_note` VARCHAR(1000) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_violations_code` (`violation_code`),
  KEY `idx_violations_status_reported` (`status`, `reported_at`),
  CONSTRAINT `fk_violations_category` FOREIGN KEY (`category_id`) REFERENCES `violation_categories` (`id`),
  CONSTRAINT `fk_violations_reservation` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_violations_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_violations_space` FOREIGN KEY (`space_id`) REFERENCES `parking_spaces` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_violations_reporter` FOREIGN KEY (`reported_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_violations_manager` FOREIGN KEY (`assigned_manager_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE = InnoDB;

CREATE TABLE `issue_reports` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ticket_code` VARCHAR(30) NOT NULL,
  `driver_user_id` BIGINT UNSIGNED NOT NULL,
  `reservation_id` BIGINT UNSIGNED DEFAULT NULL,
  `location_id` BIGINT UNSIGNED DEFAULT NULL,
  `category` ENUM(
    'space_access',
    'safety',
    'payment',
    'vehicle_damage',
    'facility',
    'other'
  ) NOT NULL,
  `description` VARCHAR(1500) NOT NULL,
  `status` ENUM('open', 'in_progress', 'resolved', 'closed') NOT NULL DEFAULT 'open',
  `assigned_to_user_id` BIGINT UNSIGNED DEFAULT NULL,
  `reported_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `resolved_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_issue_reports_ticket` (`ticket_code`),
  KEY `idx_issues_driver_status` (`driver_user_id`, `status`),
  CONSTRAINT `fk_issues_driver` FOREIGN KEY (`driver_user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_issues_reservation` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_issues_location` FOREIGN KEY (`location_id`) REFERENCES `parking_locations` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_issues_assignee` FOREIGN KEY (`assigned_to_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE = InnoDB;

CREATE TABLE `messages` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `reservation_id` BIGINT UNSIGNED DEFAULT NULL,
  `sender_user_id` BIGINT UNSIGNED NOT NULL,
  `recipient_user_id` BIGINT UNSIGNED NOT NULL,
  `body` VARCHAR(2000) NOT NULL,
  `read_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_messages_conversation` (
    `sender_user_id`,
    `recipient_user_id`,
    `created_at`
  ),
  CONSTRAINT `fk_messages_reservation` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_messages_sender` FOREIGN KEY (`sender_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_messages_recipient` FOREIGN KEY (`recipient_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE `support_tickets` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ticket_code` VARCHAR(30) NOT NULL,
  `user_id` BIGINT UNSIGNED DEFAULT NULL,
  `name` VARCHAR(120) NOT NULL,
  `email` VARCHAR(190) NOT NULL,
  `subject` VARCHAR(150) NOT NULL,
  `message` VARCHAR(2000) NOT NULL,
  `status` ENUM('open', 'in_progress', 'resolved', 'closed') NOT NULL DEFAULT 'open',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_support_tickets_code` (`ticket_code`),
  KEY `idx_support_status_created` (`status`, `created_at`),
  CONSTRAINT `fk_support_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE = InnoDB;

CREATE TABLE `notifications` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `type` VARCHAR(50) NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `body` VARCHAR(500) NOT NULL,
  `link` VARCHAR(255) DEFAULT NULL,
  `read_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notifications_user_read_created` (`user_id`, `read_at`, `created_at`),
  CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE `reviews` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `location_id` BIGINT UNSIGNED NOT NULL,
  `driver_user_id` BIGINT UNSIGNED NOT NULL,
  `reservation_id` BIGINT UNSIGNED DEFAULT NULL,
  `rating` TINYINT UNSIGNED NOT NULL,
  `comment` VARCHAR(1000) DEFAULT NULL,
  `is_published` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_review_reservation` (`reservation_id`),
  KEY `idx_reviews_location_published` (`location_id`, `is_published`, `created_at`),
  CONSTRAINT `fk_reviews_location` FOREIGN KEY (`location_id`) REFERENCES `parking_locations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reviews_driver` FOREIGN KEY (`driver_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reviews_reservation` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`id`) ON DELETE SET NULL
) ENGINE = InnoDB;

CREATE TABLE `audit_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED DEFAULT NULL,
  `action` VARCHAR(100) NOT NULL,
  `entity_type` VARCHAR(80) NOT NULL,
  `entity_id` BIGINT UNSIGNED DEFAULT NULL,
  `details` VARCHAR(1000) DEFAULT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_entity` (`entity_type`, `entity_id`, `created_at`),
  CONSTRAINT `fk_audit_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE = InnoDB;

-- Seed data mirrors the accounts, places, reservations, and operations shown in the UI.
INSERT INTO
  `roles` (`id`, `name`, `description`)
VALUES
  (1, 'admin', 'Platform administrator'),
  (2, 'manager', 'Parking location manager'),
  (3, 'driver', 'Parking customer and vehicle owner');

-- Passwords are bcrypt hashes. Demo credentials: Admin2026!, Manager2026!, ParkFlow2026.
INSERT INTO
  `users` (
    `id`,
    `role_id`,
    `full_name`,
    `email`,
    `phone`,
    `password_hash`,
    `account_status`,
    `email_verified_at`,
    `last_login_at`,
    `created_at`
  )
VALUES
  (
    1,
    1,
    'Amina Rahman',
    'admin@parkflow.local',
    '+8801700000001',
    '$2y$10$go2UTcV2BaoejvUnGcQhmORWM5y7LwnsiEqb0Zaq.OlsF3b7S79SK',
    'active',
    '2026-01-05 09:00:00',
    '2026-07-26 09:30:00',
    '2026-01-01 09:00:00'
  ),
  (
    2,
    2,
    'Mahmudul Hasan',
    'manager@parkflow.local',
    '+8801700000002',
    '$2y$10$xleIneoKVVaFNHlLVH.vUeUcEOFaR2RY/YDDGkadG/.T8iZI/Ley6',
    'active',
    '2026-01-05 09:00:00',
    '2026-07-26 10:00:00',
    '2026-01-02 09:00:00'
  ),
  (
    3,
    3,
    'Nafis Mahmud',
    'nafis@example.com',
    '+8801700000003',
    '$2y$10$0Zd4FBW7t7Q.vQioPy0cRumABq3SKhmItKQmQH2P/rX0h37T9FNm6',
    'active',
    '2026-01-06 09:00:00',
    '2026-07-26 09:42:00',
    '2026-01-03 09:00:00'
  ),
  (
    4,
    3,
    'Shafiq Alam',
    'shafiq@example.com',
    '+8801700000004',
    '$2y$10$0Zd4FBW7t7Q.vQioPy0cRumABq3SKhmItKQmQH2P/rX0h37T9FNm6',
    'active',
    '2026-01-06 09:00:00',
    NULL,
    '2026-01-04 09:00:00'
  ),
  (
    5,
    3,
    'Farhana Akter',
    'farhana@example.com',
    '+8801700000005',
    '$2y$10$0Zd4FBW7t7Q.vQioPy0cRumABq3SKhmItKQmQH2P/rX0h37T9FNm6',
    'active',
    '2026-01-06 09:00:00',
    NULL,
    '2026-01-05 09:00:00'
  ),
  (
    6,
    3,
    'Sadia Haque',
    'sadia@example.com',
    '+8801700000006',
    '$2y$10$0Zd4FBW7t7Q.vQioPy0cRumABq3SKhmItKQmQH2P/rX0h37T9FNm6',
    'active',
    '2026-01-06 09:00:00',
    NULL,
    '2026-01-06 09:00:00'
  ),
  (
    7,
    3,
    'Rasel Ahmed',
    'rasel@example.com',
    '+8801700000007',
    '$2y$10$0Zd4FBW7t7Q.vQioPy0cRumABq3SKhmItKQmQH2P/rX0h37T9FNm6',
    'active',
    '2026-01-06 09:00:00',
    NULL,
    '2026-01-07 09:00:00'
  );

INSERT INTO
  `driver_profiles` (
    `user_id`,
    `city`,
    `emergency_contact`,
    `preferred_language`,
    `receive_updates`
  )
VALUES
  (
    3,
    'Dhaka',
    'Nusrat Mahmud · +8801700000103',
    'English',
    1
  ),
  (4, 'Dhaka', NULL, 'English', 1),
  (5, 'Dhaka', NULL, 'Bangla', 1),
  (6, 'Dhaka', NULL, 'English', 1),
  (7, 'Dhaka', NULL, 'Bangla', 0);

INSERT INTO
  `manager_profiles` (
    `user_id`,
    `employee_code`,
    `shift_name`,
    `approved_by_user_id`,
    `approved_at`
  )
VALUES
  (
    2,
    'PF-MGR-001',
    'Morning shift',
    1,
    '2026-01-02 10:00:00'
  );

INSERT INTO
  `parking_locations` (
    `id`,
    `name`,
    `address`,
    `area`,
    `city`,
    `latitude`,
    `longitude`,
    `base_hourly_rate`,
    `total_capacity`,
    `opening_time`,
    `closing_time`,
    `status`
  )
VALUES
  (
    1,
    'Gulshan City Center',
    'Gulshan Avenue, Circle 1',
    'Gulshan',
    'Dhaka',
    23.7925000,
    90.4078000,
    80.00,
    180,
    '06:00:00',
    '23:59:00',
    'operational'
  ),
  (
    2,
    'Navana Tower Parking',
    'Gulshan Avenue, Circle 2',
    'Gulshan',
    'Dhaka',
    23.7933000,
    90.4141000,
    100.00,
    120,
    '06:00:00',
    '23:00:00',
    'operational'
  ),
  (
    3,
    'Gulshan Lake Parking',
    'Gulshan Lake Drive',
    'Gulshan',
    'Dhaka',
    23.7878000,
    90.4149000,
    70.00,
    90,
    '05:30:00',
    '23:30:00',
    'operational'
  ),
  (
    4,
    'Police Plaza Parking',
    'Police Plaza Concord, Gulshan 1',
    'Gulshan',
    'Dhaka',
    23.7804000,
    90.4068000,
    90.00,
    110,
    '07:00:00',
    '22:30:00',
    'operational'
  ),
  (
    5,
    'Banani Plaza Parking',
    'Road 11, Banani',
    'Banani',
    'Dhaka',
    23.7939000,
    90.4049000,
    120.00,
    140,
    '06:00:00',
    '23:59:00',
    'operational'
  );

INSERT INTO
  `parking_zones` (
    `id`,
    `location_id`,
    `name`,
    `code`,
    `floor_label`,
    `description`
  )
VALUES
  (
    1,
    1,
    'Zone A',
    'A',
    'Level 1',
    'Covered standard parking'
  ),
  (
    2,
    1,
    'Zone B',
    'B',
    'Level 1',
    'Covered standard parking'
  ),
  (
    3,
    1,
    'EV Deck',
    'EV',
    'Level 2',
    'Electric vehicle charging deck'
  ),
  (
    4,
    4,
    'Zone C',
    'C',
    'Basement 1',
    'Police Plaza parking level'
  ),
  (
    5,
    2,
    'Main Deck',
    'M',
    'Basement 1',
    'Navana Tower underground parking'
  ),
  (
    6,
    3,
    'Lake Deck',
    'L',
    'Ground',
    'Open-air parking by Gulshan Lake'
  ),
  (
    7,
    5,
    'Banani Deck',
    'BN',
    'Level 1',
    'Banani Plaza covered parking'
  );

INSERT INTO
  `manager_location_assignments` (
    `manager_user_id`,
    `location_id`,
    `shift_start`,
    `shift_end`,
    `is_primary`
  )
VALUES
  (2, 1, '06:00:00', '14:00:00', 1);

INSERT INTO
  `parking_spaces` (
    `id`,
    `zone_id`,
    `space_code`,
    `space_type`,
    `status`,
    `has_ev_charger`,
    `sensor_identifier`,
    `last_sensor_sync_at`
  )
VALUES
  (
    1,
    1,
    'A-18',
    'standard',
    'reserved',
    0,
    'GCC-A-18',
    '2026-07-26 10:41:28'
  ),
  (
    2,
    1,
    'A-01',
    'standard',
    'available',
    0,
    'GCC-A-01',
    '2026-07-26 10:41:28'
  ),
  (
    3,
    1,
    'A-02',
    'accessible',
    'available',
    0,
    'GCC-A-02',
    '2026-07-26 10:41:28'
  ),
  (
    4,
    1,
    'A-07',
    'standard',
    'occupied',
    0,
    'GCC-A-07',
    '2026-07-26 10:41:28'
  ),
  (
    5,
    2,
    'B-02',
    'standard',
    'available',
    0,
    'GCC-B-02',
    '2026-07-26 10:41:28'
  ),
  (
    6,
    2,
    'B-04',
    'standard',
    'occupied',
    0,
    'GCC-B-04',
    '2026-07-26 10:41:28'
  ),
  (
    7,
    2,
    'B-14',
    'standard',
    'blocked',
    0,
    'GCC-B-14',
    '2026-07-26 10:41:28'
  ),
  (
    8,
    2,
    'B-18',
    'standard',
    'reserved',
    0,
    'GCC-B-18',
    '2026-07-26 10:41:28'
  ),
  (
    9,
    3,
    'EV-01',
    'ev',
    'available',
    1,
    'GCC-EV-01',
    '2026-07-26 10:41:28'
  ),
  (
    10,
    3,
    'EV-03',
    'ev',
    'occupied',
    1,
    'GCC-EV-03',
    '2026-07-26 10:41:28'
  ),
  (
    11,
    4,
    'C-12',
    'standard',
    'available',
    0,
    'PP-C-12',
    '2026-07-25 18:15:00'
  ),
  (
    12,
    5,
    'M-12',
    'standard',
    'available',
    0,
    'NAV-M-12',
    '2026-07-26 10:41:28'
  ),
  (
    13,
    6,
    'L-07',
    'standard',
    'available',
    0,
    'GL-L-07',
    '2026-07-26 10:41:28'
  ),
  (
    14,
    7,
    'BN-20',
    'compact',
    'available',
    0,
    'BAN-20',
    '2026-07-26 10:41:28'
  );

INSERT INTO
  `parking_space_status_history` (
    `space_id`,
    `status`,
    `changed_by_user_id`,
    `note`,
    `created_at`
  )
VALUES
  (
    1,
    'reserved',
    3,
    'Reservation PF-84291 assigned.',
    '2026-07-26 09:42:00'
  ),
  (
    6,
    'occupied',
    2,
    'Check-in pending checkout verification.',
    '2026-07-26 07:03:00'
  ),
  (
    7,
    'blocked',
    2,
    'Access lane obstruction reported.',
    '2026-07-26 10:17:00'
  ),
  (
    10,
    'occupied',
    2,
    'Vehicle has exceeded its reservation end time.',
    '2026-07-26 07:02:00'
  );

INSERT INTO
  `amenities` (`id`, `name`, `icon_key`)
VALUES
  (1, '24/7 security', 'shield'),
  (2, 'CCTV monitoring', 'camera'),
  (3, 'EV charging', 'bolt'),
  (4, 'Covered parking', 'roof'),
  (5, 'Accessible spaces', 'accessibility'),
  (6, 'Mobile payment', 'wallet');

INSERT INTO
  `parking_location_amenities` (`location_id`, `amenity_id`)
VALUES
  (1, 1),
  (1, 2),
  (1, 3),
  (1, 4),
  (1, 5),
  (1, 6),
  (2, 1),
  (2, 2),
  (2, 4),
  (2, 6),
  (3, 1),
  (3, 2),
  (3, 6),
  (4, 1),
  (4, 2),
  (4, 4),
  (4, 6),
  (5, 1),
  (5, 2),
  (5, 4),
  (5, 6);

INSERT INTO
  `dynamic_pricing_rules` (
    `location_id`,
    `name`,
    `day_of_week`,
    `start_time`,
    `end_time`,
    `adjustment_type`,
    `adjustment_value`,
    `is_active`,
    `created_by_user_id`
  )
VALUES
  (
    1,
    'Evening peak demand',
    NULL,
    '17:00:00',
    '21:00:00',
    'percentage',
    25.00,
    1,
    1
  ),
  (
    1,
    'Friday midday discount',
    5,
    '12:00:00',
    '15:00:00',
    'percentage',
    -10.00,
    1,
    1
  ),
  (
    5,
    'Banani business peak',
    NULL,
    '08:00:00',
    '11:00:00',
    'percentage',
    20.00,
    1,
    1
  );

INSERT INTO
  `vehicles` (
    `id`,
    `driver_user_id`,
    `registration_number`,
    `make_model`,
    `vehicle_year`,
    `vehicle_type`,
    `color`,
    `powertrain`,
    `is_primary`
  )
VALUES
  (
    1,
    3,
    'DHA-METRO-GA-18-7264',
    'Toyota Premio',
    2022,
    'sedan',
    'White',
    'petrol',
    1
  ),
  (
    2,
    4,
    'DHA-METRO-GHA-11-2480',
    'Nissan Leaf',
    2021,
    'electric_vehicle',
    'Blue',
    'electric',
    1
  ),
  (
    3,
    5,
    'DHA-METRO-KA-16-7352',
    'Honda Vezel',
    2023,
    'suv',
    'Black',
    'hybrid',
    1
  ),
  (
    4,
    6,
    'DHA-METRO-CHA-24-6702',
    'Toyota Axio',
    2020,
    'sedan',
    'Silver',
    'petrol',
    1
  ),
  (
    5,
    7,
    'DHA-METRO-KA-12-8890',
    'Mitsubishi Lancer',
    2018,
    'sedan',
    'Grey',
    'petrol',
    1
  ),
  (
    6,
    3,
    'DHA-METRO-GA-22-1845',
    'Honda Grace',
    2021,
    'sedan',
    'Red',
    'hybrid',
    0
  ),
  (
    7,
    7,
    'DHA-METRO-TA-09-5521',
    'Unknown vehicle',
    2015,
    'other',
    'White',
    'other',
    0
  );

INSERT INTO
  `reservations` (
    `id`,
    `reservation_code`,
    `driver_user_id`,
    `vehicle_id`,
    `location_id`,
    `space_id`,
    `starts_at`,
    `ends_at`,
    `actual_check_in_at`,
    `actual_check_out_at`,
    `hourly_rate`,
    `service_fee`,
    `discount_amount`,
    `total_amount`,
    `status`,
    `notes`,
    `created_at`
  )
VALUES
  (
    1,
    'PF-84291',
    3,
    1,
    1,
    1,
    '2026-07-26 10:30:00',
    '2026-07-26 12:30:00',
    NULL,
    NULL,
    80.00,
    0.00,
    0.00,
    160.00,
    'waiting_check_in',
    'Driver is waiting at Gate 1.',
    '2026-07-26 09:42:00'
  ),
  (
    2,
    'PF-84288',
    5,
    3,
    1,
    6,
    '2026-07-26 07:00:00',
    '2026-07-26 10:00:00',
    '2026-07-26 07:03:00',
    NULL,
    80.00,
    0.00,
    0.00,
    240.00,
    'active',
    'Checkout OTP requested.',
    '2026-07-26 06:16:00'
  ),
  (
    3,
    'PF-84274',
    4,
    2,
    1,
    10,
    '2026-07-26 07:00:00',
    '2026-07-26 10:00:00',
    '2026-07-26 07:02:00',
    NULL,
    80.00,
    0.00,
    0.00,
    240.00,
    'overstayed',
    'Overstayed by 28 minutes.',
    '2026-07-25 18:15:00'
  ),
  (
    4,
    'PF-84299',
    6,
    4,
    1,
    8,
    '2026-07-26 10:45:00',
    '2026-07-26 12:45:00',
    NULL,
    NULL,
    80.00,
    0.00,
    0.00,
    160.00,
    'waiting_check_in',
    NULL,
    '2026-07-26 10:05:00'
  ),
  (
    5,
    'PF-83902',
    3,
    1,
    4,
    11,
    '2026-07-25 16:15:00',
    '2026-07-25 18:15:00',
    '2026-07-25 16:15:00',
    '2026-07-25 18:13:00',
    90.00,
    8.00,
    0.00,
    188.00,
    'completed',
    NULL,
    '2026-07-25 15:52:00'
  );

INSERT INTO
  `reservation_status_history` (
    `reservation_id`,
    `status`,
    `changed_by_user_id`,
    `note`,
    `created_at`
  )
VALUES
  (
    1,
    'confirmed',
    3,
    'Payment received.',
    '2026-07-26 09:42:00'
  ),
  (
    1,
    'waiting_check_in',
    3,
    'Driver arrived at Gate 1.',
    '2026-07-26 10:26:00'
  ),
  (
    2,
    'confirmed',
    5,
    'Payment received.',
    '2026-07-26 06:16:00'
  ),
  (
    2,
    'active',
    2,
    'OTP check-in verified.',
    '2026-07-26 07:03:00'
  ),
  (
    3,
    'active',
    2,
    'OTP check-in verified.',
    '2026-07-26 07:02:00'
  ),
  (
    3,
    'overstayed',
    NULL,
    'Reservation ended without checkout.',
    '2026-07-26 10:00:00'
  ),
  (
    4,
    'waiting_check_in',
    6,
    'Driver arrived at gate.',
    '2026-07-26 10:44:00'
  ),
  (
    5,
    'completed',
    2,
    'Checkout complete.',
    '2026-07-25 18:13:00'
  );

INSERT INTO
  `access_otps` (
    `reservation_id`,
    `purpose`,
    `otp_hash`,
    `expires_at`,
    `used_at`,
    `verified_by_user_id`,
    `created_at`
  )
VALUES
  (
    1,
    'check_in',
    SHA2('8426', 256),
    '2026-07-26 10:50:00',
    NULL,
    NULL,
    '2026-07-26 10:25:00'
  ),
  (
    2,
    'check_out',
    SHA2('7714', 256),
    '2026-07-26 10:50:00',
    NULL,
    NULL,
    '2026-07-26 10:28:00'
  ),
  (
    5,
    'check_in',
    SHA2('4381', 256),
    '2026-07-25 16:30:00',
    '2026-07-25 16:15:00',
    2,
    '2026-07-25 15:52:00'
  );

INSERT INTO
  `payments` (
    `reservation_id`,
    `payment_reference`,
    `amount`,
    `currency`,
    `method`,
    `status`,
    `paid_at`,
    `created_at`
  )
VALUES
  (
    1,
    'PAY-PF-84291',
    160.00,
    'BDT',
    'mobile_banking',
    'paid',
    '2026-07-26 09:42:00',
    '2026-07-26 09:42:00'
  ),
  (
    2,
    'PAY-PF-84288',
    240.00,
    'BDT',
    'card',
    'paid',
    '2026-07-26 06:16:00',
    '2026-07-26 06:16:00'
  ),
  (
    3,
    'PAY-PF-84274',
    240.00,
    'BDT',
    'wallet',
    'paid',
    '2026-07-25 18:15:00',
    '2026-07-25 18:15:00'
  ),
  (
    4,
    'PAY-PF-84299',
    160.00,
    'BDT',
    'mobile_banking',
    'paid',
    '2026-07-26 10:05:00',
    '2026-07-26 10:05:00'
  ),
  (
    5,
    'PAY-PF-83902',
    188.00,
    'BDT',
    'card',
    'paid',
    '2026-07-25 15:52:00',
    '2026-07-25 15:52:00'
  );

INSERT INTO
  `violation_categories` (
    `id`,
    `name`,
    `description`,
    `default_severity`,
    `default_penalty`,
    `is_active`
  )
VALUES
  (
    1,
    'Overstayed reservation',
    'Vehicle remains after the reservation end time.',
    'high',
    80.00,
    1
  ),
  (
    2,
    'Obstructed access',
    'Vehicle blocks a marked aisle, gate, or access lane.',
    'medium',
    100.00,
    1
  ),
  (
    3,
    'Wrong space usage',
    'Vehicle is parked in a space other than its assignment.',
    'medium',
    60.00,
    1
  ),
  (
    4,
    'Unauthorized parking',
    'Vehicle has no valid reservation or access approval.',
    'high',
    150.00,
    1
  );

INSERT INTO
  `violations` (
    `id`,
    `violation_code`,
    `category_id`,
    `reservation_id`,
    `vehicle_id`,
    `space_id`,
    `reported_by_user_id`,
    `assigned_manager_user_id`,
    `source`,
    `severity`,
    `description`,
    `penalty_amount`,
    `status`,
    `reported_at`
  )
VALUES
  (
    1,
    'VL-1084',
    1,
    3,
    2,
    10,
    NULL,
    2,
    'sensor',
    'high',
    '28 minutes beyond the reserved parking slot.',
    80.00,
    'open',
    '2026-07-26 10:28:00'
  ),
  (
    2,
    'VL-1083',
    2,
    NULL,
    7,
    7,
    NULL,
    2,
    'driver',
    'medium',
    'Vehicle blocks the B-14 access aisle.',
    100.00,
    'open',
    '2026-07-26 10:17:00'
  ),
  (
    3,
    'VL-1081',
    3,
    2,
    5,
    6,
    2,
    2,
    'manager',
    'medium',
    'Assigned B-02, but vehicle is parked in B-04.',
    60.00,
    'under_review',
    '2026-07-26 09:44:00'
  );

INSERT INTO
  `issue_reports` (
    `ticket_code`,
    `driver_user_id`,
    `reservation_id`,
    `location_id`,
    `category`,
    `description`,
    `status`,
    `assigned_to_user_id`,
    `reported_at`
  )
VALUES
  (
    'IS-2401',
    3,
    1,
    1,
    'space_access',
    'Gate 1 barrier did not open on first scan.',
    'in_progress',
    2,
    '2026-07-26 10:27:00'
  );

INSERT INTO
  `messages` (
    `reservation_id`,
    `sender_user_id`,
    `recipient_user_id`,
    `body`,
    `read_at`,
    `created_at`
  )
VALUES
  (
    1,
    3,
    2,
    'Hi, I am waiting at Gate 1. Could you help with check-in?',
    NULL,
    '2026-07-26 10:27:00'
  ),
  (
    1,
    2,
    3,
    'I can see your reservation. Please enter the four-digit OTP at the gate.',
    NULL,
    '2026-07-26 10:28:00'
  ),
  (
    2,
    5,
    2,
    'I am ready to leave. I requested my checkout OTP.',
    NULL,
    '2026-07-26 10:28:00'
  );

INSERT INTO
  `support_tickets` (
    `ticket_code`,
    `user_id`,
    `name`,
    `email`,
    `subject`,
    `message`,
    `status`,
    `created_at`
  )
VALUES
  (
    'SUP-1001',
    NULL,
    'Nabila S.',
    'nabila@example.com',
    'Finding a parking location',
    'Please suggest covered parking near Gulshan Circle 1.',
    'open',
    '2026-07-26 09:15:00'
  );

INSERT INTO
  `notifications` (
    `user_id`,
    `type`,
    `title`,
    `body`,
    `link`,
    `read_at`,
    `created_at`
  )
VALUES
  (
    2,
    'check_in',
    'Driver waiting at Gate 1',
    'Reservation PF-84291 requires check-in.',
    '#verification',
    NULL,
    '2026-07-26 10:26:00'
  ),
  (
    2,
    'violation',
    'New obstruction reported',
    'Space B-14 access lane is blocked.',
    '#violations',
    NULL,
    '2026-07-26 10:17:00'
  ),
  (
    3,
    'reservation',
    'Reservation confirmed',
    'Your slot A-18 at Gulshan City Center is confirmed.',
    '#active-booking',
    NULL,
    '2026-07-26 09:42:00'
  );

INSERT INTO
  `reviews` (
    `location_id`,
    `driver_user_id`,
    `reservation_id`,
    `rating`,
    `comment`,
    `is_published`,
    `created_at`
  )
VALUES
  (
    4,
    3,
    5,
    5,
    'Clear pricing, easy receipt, and helpful manager support.',
    1,
    '2026-07-25 19:00:00'
  );

INSERT INTO
  `audit_logs` (
    `user_id`,
    `action`,
    `entity_type`,
    `entity_id`,
    `details`,
    `created_at`
  )
VALUES
  (
    1,
    'created',
    'dynamic_pricing_rule',
    1,
    'Enabled Gulshan evening peak demand rule.',
    '2026-07-01 09:00:00'
  ),
  (
    2,
    'reported',
    'violation',
    1,
    'Sensor-generated overstay case created.',
    '2026-07-26 10:28:00'
  );

-- Keep live workflow examples usable whenever this file is imported. Historical
-- rows remain historical, while current check-in/check-out queue rows use today.
UPDATE `reservations`
SET
  `starts_at` = CASE `id`
    WHEN 1 THEN TIMESTAMP(CURDATE(), '10:30:00')
    WHEN 2 THEN TIMESTAMP(CURDATE(), '07:00:00')
    WHEN 3 THEN TIMESTAMP(CURDATE(), '07:00:00')
    WHEN 4 THEN TIMESTAMP(CURDATE(), '10:45:00')
    WHEN 5 THEN TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 1 DAY), '16:15:00')
  END,
  `ends_at` = CASE `id`
    WHEN 1 THEN TIMESTAMP(CURDATE(), '12:30:00')
    WHEN 2 THEN TIMESTAMP(CURDATE(), '10:00:00')
    WHEN 3 THEN TIMESTAMP(CURDATE(), '10:00:00')
    WHEN 4 THEN TIMESTAMP(CURDATE(), '12:45:00')
    WHEN 5 THEN TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 1 DAY), '18:15:00')
  END,
  `actual_check_in_at` = CASE `id`
    WHEN 2 THEN TIMESTAMP(CURDATE(), '07:03:00')
    WHEN 3 THEN TIMESTAMP(CURDATE(), '07:02:00')
    WHEN 5 THEN TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 1 DAY), '16:15:00')
    ELSE NULL
  END,
  `actual_check_out_at` = CASE `id`
    WHEN 5 THEN TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 1 DAY), '18:13:00')
    ELSE NULL
  END;

UPDATE `access_otps`
SET
  `expires_at` = CASE
    WHEN `used_at` IS NULL THEN DATE_ADD(NOW(), INTERVAL 2 HOUR)
    ELSE DATE_SUB(NOW(), INTERVAL 1 HOUR)
  END;

-- Helpful queries for your PHP pages:
-- Free spaces: SELECT ps.* FROM parking_spaces ps JOIN parking_zones z ON z.id=ps.zone_id WHERE z.location_id=1 AND ps.status='available';
-- Driver history: SELECT r.* FROM reservations r WHERE r.driver_user_id=3 ORDER BY r.starts_at DESC;
