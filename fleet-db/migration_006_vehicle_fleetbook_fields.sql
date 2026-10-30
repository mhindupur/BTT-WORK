-- Fleetbook-parity vehicle detail fields (ownership, chassis/engine, GPS, AC, attach date, etc.)
SET @db := DATABASE();

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='vehicles' AND COLUMN_NAME='ownership');
SET @sql := IF(@c=0, 'ALTER TABLE vehicles ADD COLUMN ownership VARCHAR(32) NULL AFTER owner_phone', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='vehicles' AND COLUMN_NAME='manufacture_year');
SET @sql := IF(@c=0, 'ALTER TABLE vehicles ADD COLUMN manufacture_year SMALLINT UNSIGNED NULL AFTER fuel_type', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='vehicles' AND COLUMN_NAME='attach_date');
SET @sql := IF(@c=0, 'ALTER TABLE vehicles ADD COLUMN attach_date DATE NULL AFTER manufacture_year', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='vehicles' AND COLUMN_NAME='sub_vendor');
SET @sql := IF(@c=0, 'ALTER TABLE vehicles ADD COLUMN sub_vendor VARCHAR(255) NULL AFTER attach_date', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='vehicles' AND COLUMN_NAME='engine_number');
SET @sql := IF(@c=0, 'ALTER TABLE vehicles ADD COLUMN engine_number VARCHAR(128) NULL AFTER sub_vendor', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='vehicles' AND COLUMN_NAME='chassis_number');
SET @sql := IF(@c=0, 'ALTER TABLE vehicles ADD COLUMN chassis_number VARCHAR(128) NULL AFTER engine_number', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='vehicles' AND COLUMN_NAME='ac_type');
SET @sql := IF(@c=0, 'ALTER TABLE vehicles ADD COLUMN ac_type VARCHAR(16) NULL AFTER chassis_number', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='vehicles' AND COLUMN_NAME='gps_installed');
SET @sql := IF(@c=0, 'ALTER TABLE vehicles ADD COLUMN gps_installed TINYINT(1) NOT NULL DEFAULT 0 AFTER ac_type', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='vehicles' AND COLUMN_NAME='gps_imei');
SET @sql := IF(@c=0, 'ALTER TABLE vehicles ADD COLUMN gps_imei VARCHAR(64) NULL AFTER gps_installed', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='vehicles' AND COLUMN_NAME='gps_vendor');
SET @sql := IF(@c=0, 'ALTER TABLE vehicles ADD COLUMN gps_vendor VARCHAR(128) NULL AFTER gps_imei', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='vehicles' AND COLUMN_NAME='form_42_47_expiry');
SET @sql := IF(@c=0, 'ALTER TABLE vehicles ADD COLUMN form_42_47_expiry DATE NULL AFTER permit_expiry', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='vehicles' AND COLUMN_NAME='form_49_expiry');
SET @sql := IF(@c=0, 'ALTER TABLE vehicles ADD COLUMN form_49_expiry DATE NULL AFTER form_42_47_expiry', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
