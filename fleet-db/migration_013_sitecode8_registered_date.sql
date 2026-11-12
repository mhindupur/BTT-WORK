-- Site codes: allow 8+ alphanumeric characters (was CHAR(5))
-- Optional registered_date on vehicles (RC registration date)

SET @db := DATABASE();

-- Widen site_code
SET @sql := (
  SELECT IF(
    (SELECT DATA_TYPE FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA=@db AND TABLE_NAME='clients' AND COLUMN_NAME='site_code') = 'char',
    'ALTER TABLE clients MODIFY COLUMN site_code VARCHAR(32) NOT NULL',
    'SELECT 1'
  )
);
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='vehicles' AND COLUMN_NAME='registered_date');
SET @sql := IF(@c=0,
  'ALTER TABLE vehicles ADD COLUMN registered_date DATE NULL AFTER registration_date',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Soften users.email to allow placeholder when SM logs in with site code and email is optional
-- (email remains UNIQUE; nullable contact email for notifications)
SET @sql := 'ALTER TABLE users MODIFY COLUMN email VARCHAR(255) NULL';
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Optional notification email for site managers (login remains site_code in users.email)
SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='site_managers' AND COLUMN_NAME='notification_email');
SET @sql := IF(@c=0,
  'ALTER TABLE site_managers ADD COLUMN notification_email VARCHAR(255) NULL AFTER location_label',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
