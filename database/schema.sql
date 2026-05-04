-- BTT — MySQL 8+ recommended
-- Charset utf8mb4 for names/emails

CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'client') NOT NULL,
  email_verified_at DATETIME NULL,
  password_must_change TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE clients (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  phone VARCHAR(32) NULL,
  office_phone VARCHAR(32) NULL,
  contracting_first_name VARCHAR(128) NOT NULL,
  contracting_last_name VARCHAR(128) NOT NULL,
  extra JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_clients_user (user_id),
  CONSTRAINT fk_clients_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE email_verification_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  consumed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_evt_user (user_id),
  UNIQUE KEY uq_evt_token (token_hash),
  CONSTRAINT fk_evt_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE payment_batches (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  uploaded_by BIGINT UNSIGNED NOT NULL,
  original_filename VARCHAR(512) NOT NULL,
  period_label VARCHAR(128) NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'parsed',
  row_count INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_pb_uploaded_by (uploaded_by),
  CONSTRAINT fk_pb_user FOREIGN KEY (uploaded_by) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE payment_lines (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  batch_id BIGINT UNSIGNED NOT NULL,
  vehicle_number VARCHAR(64) NULL,
  driver_name VARCHAR(255) NULL,
  driver_phone VARCHAR(32) NULL,
  trip_count INT UNSIGNED NULL,
  fuel_advance DECIMAL(12,2) NULL,
  emi DECIMAL(12,2) NULL,
  other_advance DECIMAL(12,2) NULL,
  net_payable DECIMAL(12,2) NULL,
  raw_row JSON NULL,
  public_token CHAR(36) NOT NULL,
  whatsapp_sent_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_pl_token (public_token),
  KEY ix_pl_batch (batch_id),
  CONSTRAINT fk_pl_batch FOREIGN KEY (batch_id) REFERENCES payment_batches (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE payment_queries (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  line_id BIGINT UNSIGNED NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'open',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_pq_line (line_id),
  CONSTRAINT fk_pq_line FOREIGN KEY (line_id) REFERENCES payment_lines (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE mis_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  client_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  duty_start_date DATE NOT NULL,
  trip_end_date DATE NOT NULL,
  trip_type VARCHAR(64) NOT NULL,
  vehicle_type VARCHAR(64) NOT NULL,
  reporting_time_place VARCHAR(512) NOT NULL,
  destination_drop VARCHAR(512) NOT NULL,
  passenger_name VARCHAR(255) NULL,
  passenger_email VARCHAR(255) NULL,
  reporting_at DATETIME NULL,
  status ENUM('pending', 'assigned', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
  assigned_vehicle VARCHAR(255) NULL,
  assigned_driver VARCHAR(255) NULL,
  assigned_driver_phone VARCHAR(32) NULL,
  passenger_details_sent_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY ix_mis_client (client_id),
  KEY ix_mis_status_reporting (status, reporting_at),
  CONSTRAINT fk_mis_client FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
