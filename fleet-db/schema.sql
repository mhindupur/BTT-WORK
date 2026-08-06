-- BTT Fleet & Fuel Management System — MySQL 8+
-- Matches proposal: Admin, Site Manager, vehicles, indents, fuel recon, payments, owner view tracking

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS payment_line_queries;
DROP TABLE IF EXISTS payment_lines;
DROP TABLE IF EXISTS payment_batches;
DROP TABLE IF EXISTS fuel_recon_lines;
DROP TABLE IF EXISTS fuel_recon_uploads;
DROP TABLE IF EXISTS indent_serial_pool;
DROP TABLE IF EXISTS indent_serial_batches;
DROP TABLE IF EXISTS indents;
DROP TABLE IF EXISTS password_reset_otps;
DROP TABLE IF EXISTS admin_notifications;
DROP TABLE IF EXISTS vehicle_documents;
DROP TABLE IF EXISTS vehicle_site_managers;
DROP TABLE IF EXISTS vehicles;
DROP TABLE IF EXISTS vehicle_types;
DROP TABLE IF EXISTS site_managers;
DROP TABLE IF EXISTS clients;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE clients (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NULL,
  phone VARCHAR(64) NULL,
  address TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY ix_clients_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'site_manager') NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(64) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email),
  KEY ix_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Site manager profile: one row per SM user, tied to a client org
CREATE TABLE site_managers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  client_id BIGINT UNSIGNED NOT NULL,
  location_label VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_sm_user (user_id),
  KEY ix_sm_client (client_id),
  CONSTRAINT fk_sm_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_sm_client FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE vehicle_types (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  code VARCHAR(32) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 100,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_vehicle_types_name (name),
  KEY ix_vehicle_types_active (is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO vehicle_types (name, code, sort_order) VALUES
  ('Sedan', 'SEDAN', 10),
  ('SUV', 'SUV', 20),
  ('Hatchback', 'HATCH', 30),
  ('MUV / MPV', 'MUV', 40),
  ('Tempo Traveller (TT)', 'TT', 50),
  ('Mini Bus', 'MINIBUS', 60),
  ('Bus', 'BUS', 70),
  ('Van', 'VAN', 80),
  ('Truck / LCV', 'TRUCK', 90),
  ('Electric Cab', 'EV', 100),
  ('Other', 'OTHER', 900);

CREATE TABLE vehicles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  client_id BIGINT UNSIGNED NOT NULL,
  registration_number VARCHAR(32) NOT NULL,
  owner_name VARCHAR(255) NULL,
  owner_phone VARCHAR(64) NULL,
  make_model VARCHAR(255) NULL,
  vehicle_type_id BIGINT UNSIGNED NULL,
  fuel_type VARCHAR(32) NULL,
  insurance_expiry DATE NULL,
  fitness_expiry DATE NULL,
  puc_expiry DATE NULL,
  tax_expiry DATE NULL,
  permit_expiry DATE NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  -- Admin/seed default approved; SM submit flow uses draft → pending_review → approved|rejected
  approval_status ENUM('draft','pending_review','approved','rejected') NOT NULL DEFAULT 'approved',
  submitted_by_site_manager_id BIGINT UNSIGNED NULL,
  submitted_at DATETIME NULL,
  reviewed_by_user_id BIGINT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  rejection_note TEXT NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_client_vehicle (client_id, registration_number),
  KEY ix_vehicles_reg (registration_number),
  KEY ix_vehicles_approval (approval_status),
  KEY ix_vehicles_type (vehicle_type_id),
  CONSTRAINT fk_veh_client FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE,
  CONSTRAINT fk_veh_type FOREIGN KEY (vehicle_type_id) REFERENCES vehicle_types (id) ON DELETE SET NULL,
  CONSTRAINT fk_veh_submitted_sm FOREIGN KEY (submitted_by_site_manager_id) REFERENCES site_managers (id) ON DELETE SET NULL,
  CONSTRAINT fk_veh_reviewed_user FOREIGN KEY (reviewed_by_user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE vehicle_documents (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  vehicle_id BIGINT UNSIGNED NOT NULL,
  doc_type ENUM('RC','INS','FC','PUC','TAX','PERMIT','VP','OTHER') NOT NULL,
  file_path VARCHAR(512) NOT NULL,
  original_filename VARCHAR(512) NOT NULL,
  expiry_date DATE NULL,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  rejection_note TEXT NULL,
  uploaded_by_user_id BIGINT UNSIGNED NULL,
  reviewed_by_user_id BIGINT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_vd_vehicle (vehicle_id),
  KEY ix_vd_status (status),
  KEY ix_vd_type (doc_type),
  CONSTRAINT fk_vd_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles (id) ON DELETE CASCADE,
  CONSTRAINT fk_vd_uploader FOREIGN KEY (uploaded_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_vd_reviewer FOREIGN KEY (reviewed_by_user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE admin_notifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NULL,
  entity_type VARCHAR(64) NULL,
  entity_id BIGINT UNSIGNED NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_an_unread (is_read, created_at),
  KEY ix_an_entity (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE vehicle_site_managers (
  vehicle_id BIGINT UNSIGNED NOT NULL,
  site_manager_id BIGINT UNSIGNED NOT NULL,
  assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (vehicle_id, site_manager_id),
  KEY ix_vsm_sm (site_manager_id),
  CONSTRAINT fk_vsm_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles (id) ON DELETE CASCADE,
  CONSTRAINT fk_vsm_sm FOREIGN KEY (site_manager_id) REFERENCES site_managers (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE indents (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  serial_number VARCHAR(64) NOT NULL,
  vehicle_id BIGINT UNSIGNED NOT NULL,
  site_manager_id BIGINT UNSIGNED NOT NULL,
  amount_rs DECIMAL(12,2) NOT NULL,
  status ENUM('pending', 'utilized', 'cancelled') NOT NULL DEFAULT 'pending',
  image_path VARCHAR(512) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_indent_serial (serial_number),
  KEY ix_indent_vehicle_created (vehicle_id, created_at),
  KEY ix_indent_sm (site_manager_id),
  KEY ix_indent_status (status),
  CONSTRAINT fk_ind_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles (id) ON DELETE RESTRICT,
  CONSTRAINT fk_ind_sm FOREIGN KEY (site_manager_id) REFERENCES site_managers (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- OTP-based password reset for site managers (WhatsApp Authentication template)
CREATE TABLE password_reset_otps (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  phone_e164 VARCHAR(32) NOT NULL,
  otp_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  consumed_at DATETIME NULL,
  attempts INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_pro_user (user_id),
  KEY ix_pro_phone (phone_e164),
  KEY ix_pro_exp (expires_at),
  CONSTRAINT fk_pro_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Admin-issued serial ranges (e.g. CBL0001–CBL0100) assigned to one site manager
CREATE TABLE indent_serial_batches (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  site_manager_id BIGINT UNSIGNED NOT NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  prefix VARCHAR(32) NOT NULL,
  start_number INT UNSIGNED NOT NULL,
  end_number INT UNSIGNED NOT NULL,
  digit_width TINYINT UNSIGNED NOT NULL DEFAULT 4,
  description VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_isb_sm (site_manager_id),
  CONSTRAINT fk_isb_sm FOREIGN KEY (site_manager_id) REFERENCES site_managers (id) ON DELETE CASCADE,
  CONSTRAINT fk_isb_user FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE indent_serial_pool (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  batch_id BIGINT UNSIGNED NOT NULL,
  site_manager_id BIGINT UNSIGNED NOT NULL,
  serial_number VARCHAR(64) NOT NULL,
  status ENUM('available', 'consumed', 'cancelled') NOT NULL DEFAULT 'available',
  indent_id BIGINT UNSIGNED NULL,
  consumed_at DATETIME NULL,
  UNIQUE KEY uq_isp_serial (serial_number),
  KEY ix_isp_sm_st (site_manager_id, status),
  KEY ix_isp_batch (batch_id),
  CONSTRAINT fk_isp_batch FOREIGN KEY (batch_id) REFERENCES indent_serial_batches (id) ON DELETE CASCADE,
  CONSTRAINT fk_isp_sm FOREIGN KEY (site_manager_id) REFERENCES site_managers (id) ON DELETE CASCADE,
  CONSTRAINT fk_isp_indent FOREIGN KEY (indent_id) REFERENCES indents (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE fuel_recon_uploads (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  uploaded_by BIGINT UNSIGNED NOT NULL,
  original_filename VARCHAR(512) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_fuel_up_user (uploaded_by),
  CONSTRAINT fk_fuel_up_user FOREIGN KEY (uploaded_by) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE fuel_recon_lines (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  upload_id BIGINT UNSIGNED NOT NULL,
  vehicle_registration VARCHAR(32) NOT NULL,
  filled_amount_rs DECIMAL(12,2) NOT NULL,
  transaction_date DATE NULL,
  matched_indent_id BIGINT UNSIGNED NULL,
  variance_rs DECIMAL(12,2) NULL,
  alert_message VARCHAR(512) NULL,
  raw_row JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_frl_upload (upload_id),
  KEY ix_frl_reg (vehicle_registration),
  CONSTRAINT fk_frl_upload FOREIGN KEY (upload_id) REFERENCES fuel_recon_uploads (id) ON DELETE CASCADE,
  CONSTRAINT fk_frl_indent FOREIGN KEY (matched_indent_id) REFERENCES indents (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE payment_batches (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  uploaded_by BIGINT UNSIGNED NOT NULL,
  period_label VARCHAR(128) NULL,
  original_filename VARCHAR(512) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_pay_batch_user (uploaded_by),
  CONSTRAINT fk_pay_batch_user FOREIGN KEY (uploaded_by) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE payment_lines (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  batch_id BIGINT UNSIGNED NOT NULL,
  vehicle_registration VARCHAR(32) NOT NULL,
  owner_name VARCHAR(255) NULL,
  owner_mobile VARCHAR(64) NULL,
  trip_count INT UNSIGNED NULL,
  fuel_advance_rs DECIMAL(12,2) NULL,
  other_deductions_rs DECIMAL(12,2) NULL,
  total_paid_rs DECIMAL(12,2) NULL,
  public_token CHAR(36) NOT NULL,
  owner_viewed_at DATETIME NULL,
  whatsapp_sent_at DATETIME NULL,
  raw_row JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_pay_token (public_token),
  KEY ix_pay_line_batch (batch_id),
  CONSTRAINT fk_pay_line_batch FOREIGN KEY (batch_id) REFERENCES payment_batches (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE payment_line_queries (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  line_id BIGINT UNSIGNED NOT NULL,
  message TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_plq_line (line_id),
  CONSTRAINT fk_plq_line FOREIGN KEY (line_id) REFERENCES payment_lines (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
