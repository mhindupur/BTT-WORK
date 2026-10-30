-- Vehicle types master (admin-managed dropdown for make/model category)
CREATE TABLE IF NOT EXISTS vehicle_types (
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

INSERT IGNORE INTO vehicle_types (name, code, sort_order) VALUES
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

SET @db := DATABASE();
SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='vehicles' AND COLUMN_NAME='vehicle_type_id');
SET @sql := IF(@c=0, 'ALTER TABLE vehicles ADD COLUMN vehicle_type_id BIGINT UNSIGNED NULL AFTER make_model', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='vehicles' AND CONSTRAINT_NAME='fk_veh_type');
SET @sql := IF(@c=0,
  'ALTER TABLE vehicles ADD CONSTRAINT fk_veh_type FOREIGN KEY (vehicle_type_id) REFERENCES vehicle_types (id) ON DELETE SET NULL',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Backfill type from existing free-text make_model where possible
UPDATE vehicles v
JOIN vehicle_types t ON LOWER(TRIM(v.make_model)) = LOWER(t.name)
SET v.vehicle_type_id = t.id
WHERE v.vehicle_type_id IS NULL AND v.make_model IS NOT NULL;

UPDATE vehicles v
JOIN vehicle_types t ON LOWER(TRIM(v.make_model)) IN ('tt', 'tempo', 'tempo traveller') AND t.code = 'TT'
SET v.vehicle_type_id = t.id
WHERE v.vehicle_type_id IS NULL;

UPDATE vehicles v
JOIN vehicle_types t ON LOWER(TRIM(v.make_model)) IN ('suv') AND t.code = 'SUV'
SET v.vehicle_type_id = t.id
WHERE v.vehicle_type_id IS NULL;
