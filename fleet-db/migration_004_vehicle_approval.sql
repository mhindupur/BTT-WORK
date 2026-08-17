-- Additive migration: site manager vehicle induction + document approval (MySQL)

SET @db := DATABASE();

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='vehicles' AND COLUMN_NAME='make_model');
SET @sql := IF(@c=0, 'ALTER TABLE vehicles ADD COLUMN make_model VARCHAR(255) NULL AFTER owner_phone', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='vehicles' AND COLUMN_NAME='fuel_type');
SET @sql := IF(@c=0, 'ALTER TABLE vehicles ADD COLUMN fuel_type VARCHAR(32) NULL AFTER make_model', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='vehicles' AND COLUMN_NAME='insurance_expiry');
SET @sql := IF(@c=0, 'ALTER TABLE vehicles ADD COLUMN insurance_expiry DATE NULL AFTER fuel_type', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='vehicles' AND COLUMN_NAME='fitness_expiry');
SET @sql := IF(@c=0, 'ALTER TABLE vehicles ADD COLUMN fitness_expiry DATE NULL AFTER insurance_expiry', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='vehicles' AND COLUMN_NAME='puc_expiry');
SET @sql := IF(@c=0, 'ALTER TABLE vehicles ADD COLUMN puc_expiry DATE NULL AFTER fitness_expiry', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='vehicles' AND COLUMN_NAME='tax_expiry');
SET @sql := IF(@c=0, 'ALTER TABLE vehicles ADD COLUMN tax_expiry DATE NULL AFTER puc_expiry', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='vehicles' AND COLUMN_NAME='permit_expiry');
SET @sql := IF(@c=0, 'ALTER TABLE vehicles ADD COLUMN permit_expiry DATE NULL AFTER tax_expiry', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='vehicles' AND COLUMN_NAME='is_active');
SET @sql := IF(@c=0, 'ALTER TABLE vehicles ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER permit_expiry', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='vehicles' AND COLUMN_NAME='approval_status');
SET @sql := IF(@c=0, 'ALTER TABLE vehicles ADD COLUMN approval_status ENUM(''draft'',''pending_review'',''approved'',''rejected'') NOT NULL DEFAULT ''approved'' AFTER is_active', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='vehicles' AND COLUMN_NAME='submitted_by_site_manager_id');
SET @sql := IF(@c=0, 'ALTER TABLE vehicles ADD COLUMN submitted_by_site_manager_id BIGINT UNSIGNED NULL AFTER approval_status', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='vehicles' AND COLUMN_NAME='submitted_at');
SET @sql := IF(@c=0, 'ALTER TABLE vehicles ADD COLUMN submitted_at DATETIME NULL AFTER submitted_by_site_manager_id', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='vehicles' AND COLUMN_NAME='reviewed_by_user_id');
SET @sql := IF(@c=0, 'ALTER TABLE vehicles ADD COLUMN reviewed_by_user_id BIGINT UNSIGNED NULL AFTER submitted_at', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='vehicles' AND COLUMN_NAME='reviewed_at');
SET @sql := IF(@c=0, 'ALTER TABLE vehicles ADD COLUMN reviewed_at DATETIME NULL AFTER reviewed_by_user_id', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='vehicles' AND COLUMN_NAME='rejection_note');
SET @sql := IF(@c=0, 'ALTER TABLE vehicles ADD COLUMN rejection_note TEXT NULL AFTER reviewed_at', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

CREATE TABLE IF NOT EXISTS vehicle_documents (
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

CREATE TABLE IF NOT EXISTS admin_notifications (
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
