-- Vehicle ownership modes: Driver/Owner, Owner, Sub-Vendor, Contractual + party/account fields

SET @db := DATABASE();

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='vehicles' AND COLUMN_NAME='driver_name');
SET @sql := IF(@c=0, 'ALTER TABLE vehicles ADD COLUMN driver_name VARCHAR(255) NULL AFTER owner_phone', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='vehicles' AND COLUMN_NAME='driver_phone');
SET @sql := IF(@c=0, 'ALTER TABLE vehicles ADD COLUMN driver_phone VARCHAR(64) NULL AFTER driver_name', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='vehicles' AND COLUMN_NAME='sub_vendor_phone');
SET @sql := IF(@c=0, 'ALTER TABLE vehicles ADD COLUMN sub_vendor_phone VARCHAR(64) NULL AFTER sub_vendor', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='vehicles' AND COLUMN_NAME='contractual_name');
SET @sql := IF(@c=0, 'ALTER TABLE vehicles ADD COLUMN contractual_name VARCHAR(255) NULL AFTER sub_vendor_phone', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='vehicles' AND COLUMN_NAME='contractual_phone');
SET @sql := IF(@c=0, 'ALTER TABLE vehicles ADD COLUMN contractual_phone VARCHAR(64) NULL AFTER contractual_name', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='vehicles' AND COLUMN_NAME='account_holder_name');
SET @sql := IF(@c=0, 'ALTER TABLE vehicles ADD COLUMN account_holder_name VARCHAR(255) NULL AFTER contractual_phone', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='vehicles' AND COLUMN_NAME='account_number');
SET @sql := IF(@c=0, 'ALTER TABLE vehicles ADD COLUMN account_number VARCHAR(64) NULL AFTER account_holder_name', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='vehicles' AND COLUMN_NAME='account_ifsc');
SET @sql := IF(@c=0, 'ALTER TABLE vehicles ADD COLUMN account_ifsc VARCHAR(32) NULL AFTER account_number', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='vehicles' AND COLUMN_NAME='account_bank_name');
SET @sql := IF(@c=0, 'ALTER TABLE vehicles ADD COLUMN account_bank_name VARCHAR(128) NULL AFTER account_ifsc', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Map legacy ownership codes to the new mode names where possible
UPDATE vehicles SET ownership = 'OWNER' WHERE ownership IN ('OWN', 'Own', 'own');
UPDATE vehicles SET ownership = 'SUB_VENDOR' WHERE ownership IN ('DCO', 'ATTACHED', 'Attached');
UPDATE vehicles SET driver_name = owner_name
WHERE ownership = 'DRIVER_OWNER' AND (driver_name IS NULL OR TRIM(driver_name) = '') AND owner_name IS NOT NULL;
UPDATE vehicles SET driver_phone = owner_phone
WHERE ownership = 'DRIVER_OWNER' AND (driver_phone IS NULL OR TRIM(driver_phone) = '') AND owner_phone IS NOT NULL;
