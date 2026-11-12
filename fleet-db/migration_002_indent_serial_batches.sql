-- Run on existing btt_fleet DB (additive migration)
-- mysql ... btt_fleet < fleet-db/migration_002_indent_serial_batches.sql

CREATE TABLE IF NOT EXISTS indent_serial_batches (
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

CREATE TABLE IF NOT EXISTS indent_serial_pool (
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
