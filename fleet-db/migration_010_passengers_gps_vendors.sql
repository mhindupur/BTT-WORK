-- Vehicle type passenger capacity + GPS vendor master

SET @db := DATABASE();

-- vehicle_types.passenger_count
SET @c := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='vehicle_types' AND COLUMN_NAME='passenger_count'
);
SET @sql := IF(@c=0,
  'ALTER TABLE vehicle_types ADD COLUMN passenger_count TINYINT UNSIGNED NULL AFTER code',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

UPDATE vehicle_types SET passenger_count = 4 WHERE name = 'Sedan' AND passenger_count IS NULL;
UPDATE vehicle_types SET passenger_count = 7 WHERE name IN ('SUV/MPV', 'SUV', 'MUV / MPV') AND passenger_count IS NULL;
UPDATE vehicle_types SET passenger_count = 12 WHERE name IN ('TT/Mini BUS', 'Tempo Traveller (TT)', 'Mini Bus') AND passenger_count IS NULL;
UPDATE vehicle_types SET passenger_count = 40 WHERE name IN ('BUS', 'Bus') AND passenger_count IS NULL;
UPDATE vehicle_types SET passenger_count = 5 WHERE passenger_count IS NULL;

CREATE TABLE IF NOT EXISTS gps_vendors (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  code VARCHAR(32) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 100,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_gps_vendors_name (name),
  KEY ix_gps_vendors_active (is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO gps_vendors (name, code, sort_order) VALUES
  ('MapMyIndia', 'MMI', 10),
  ('Fleetx', 'FLEETX', 20),
  ('LocoNav', 'LOCONAV', 30),
  ('Wheelseye', 'WHEEL', 40),
  ('TrackoBit', 'TRACKO', 50),
  ('Other', 'OTHER', 900);

-- vehicles.gps_vendor_id
SET @c := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='vehicles' AND COLUMN_NAME='gps_vendor_id'
);
SET @sql := IF(@c=0,
  'ALTER TABLE vehicles ADD COLUMN gps_vendor_id BIGINT UNSIGNED NULL AFTER gps_vendor',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='vehicles' AND CONSTRAINT_NAME='fk_veh_gps_vendor'
);
SET @sql := IF(@c=0,
  'ALTER TABLE vehicles ADD CONSTRAINT fk_veh_gps_vendor FOREIGN KEY (gps_vendor_id) REFERENCES gps_vendors (id) ON DELETE SET NULL',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Backfill vendor id from free-text name where possible
UPDATE vehicles v
JOIN gps_vendors g ON LOWER(TRIM(v.gps_vendor)) = LOWER(g.name)
SET v.gps_vendor_id = g.id
WHERE v.gps_vendor_id IS NULL AND v.gps_vendor IS NOT NULL AND TRIM(v.gps_vendor) <> '';
