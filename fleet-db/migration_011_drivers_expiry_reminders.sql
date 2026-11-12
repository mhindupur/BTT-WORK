-- Drivers master (DL expiry) + document expiry reminder log / scheduler state

SET @db := DATABASE();

CREATE TABLE IF NOT EXISTS drivers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  client_id BIGINT UNSIGNED NOT NULL,
  vehicle_id BIGINT UNSIGNED NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(64) NULL,
  license_number VARCHAR(64) NULL,
  license_expiry DATE NULL,
  -- When SM uploads renewed DL awaiting admin check
  license_doc_status ENUM('none','pending','approved','rejected') NOT NULL DEFAULT 'none',
  license_expiry_pending DATE NULL,
  license_doc_path VARCHAR(512) NULL,
  license_doc_original_filename VARCHAR(512) NULL,
  license_rejection_note TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY ix_drivers_client (client_id),
  KEY ix_drivers_vehicle (vehicle_id),
  KEY ix_drivers_license_expiry (license_expiry),
  KEY ix_drivers_active (is_active),
  CONSTRAINT fk_drivers_client FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE,
  CONSTRAINT fk_drivers_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS document_expiry_reminders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  entity_type ENUM('vehicle','driver') NOT NULL,
  entity_id BIGINT UNSIGNED NOT NULL,
  doc_type VARCHAR(32) NOT NULL,
  doc_label VARCHAR(128) NOT NULL,
  expiry_date DATE NOT NULL,
  days_before INT NOT NULL,
  milestone VARCHAR(32) NOT NULL,
  recipient_role ENUM('driver','owner','site_manager','admin') NOT NULL,
  recipient_name VARCHAR(255) NULL,
  recipient_phone VARCHAR(64) NULL,
  channel ENUM('whatsapp','in_app','stub') NOT NULL DEFAULT 'whatsapp',
  status ENUM('sent','skipped','failed') NOT NULL DEFAULT 'sent',
  error_message VARCHAR(512) NULL,
  message_preview VARCHAR(512) NULL,
  sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_reminder_once (
    entity_type, entity_id, doc_type, expiry_date, days_before, recipient_role
  ),
  KEY ix_der_sent (sent_at),
  KEY ix_der_entity (entity_type, entity_id),
  KEY ix_der_expiry (expiry_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS document_reminder_runs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  run_date DATE NOT NULL,
  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at DATETIME NULL,
  candidates INT NOT NULL DEFAULT 0,
  sent INT NOT NULL DEFAULT 0,
  failed INT NOT NULL DEFAULT 0,
  skipped INT NOT NULL DEFAULT 0,
  trigger_source VARCHAR(32) NOT NULL DEFAULT 'cron',
  notes TEXT NULL,
  UNIQUE KEY uq_reminder_run_date_source (run_date, trigger_source)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
