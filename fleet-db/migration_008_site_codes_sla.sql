-- Site codes, vehicle serials, seating, registration date, SLA, geo, vendor type, compact unique regs
SET @db := DATABASE();

-- clients: site code + geo + start date + vendor type + SLA
SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='clients' AND COLUMN_NAME='site_code');
SET @sql := IF(@c=0, 'ALTER TABLE clients ADD COLUMN site_code CHAR(5) NULL AFTER name', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='clients' AND COLUMN_NAME='latitude');
SET @sql := IF(@c=0, 'ALTER TABLE clients ADD COLUMN latitude DECIMAL(10,7) NULL AFTER address', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='clients' AND COLUMN_NAME='longitude');
SET @sql := IF(@c=0, 'ALTER TABLE clients ADD COLUMN longitude DECIMAL(10,7) NULL AFTER latitude', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='clients' AND COLUMN_NAME='start_date');
SET @sql := IF(@c=0, 'ALTER TABLE clients ADD COLUMN start_date DATE NULL AFTER longitude', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='clients' AND COLUMN_NAME='vendor_type');
SET @sql := IF(@c=0, 'ALTER TABLE clients ADD COLUMN vendor_type ENUM(''SINGLE'',''MULTIPLE'') NULL AFTER start_date', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='clients' AND COLUMN_NAME='sla_max_age_years');
SET @sql := IF(@c=0, 'ALTER TABLE clients ADD COLUMN sla_max_age_years SMALLINT UNSIGNED NULL AFTER vendor_type', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

UPDATE clients
SET site_code = CONCAT('S', LPAD(id, 4, '0'))
WHERE site_code IS NULL OR TRIM(site_code) = '';

SET @c := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='clients' AND INDEX_NAME='uq_clients_site_code');
SET @sql := IF(@c=0, 'ALTER TABLE clients ADD UNIQUE KEY uq_clients_site_code (site_code)', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- vehicles: compact unique reg, serial, seating, registration date
UPDATE vehicles SET registration_number = REPLACE(REPLACE(UPPER(registration_number), '-', ''), ' ', '')
WHERE registration_number LIKE '%-%' OR registration_number LIKE '% %';

UPDATE vehicles SET ownership = 'OWN' WHERE ownership IN ('OWNED', 'OWN');
UPDATE vehicles SET ownership = 'ATTACHED' WHERE ownership IN ('HIRED', 'LEASED', 'ATTACHED');
UPDATE vehicles SET ownership = 'DCO' WHERE ownership = 'DCO';

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='vehicles' AND COLUMN_NAME='vehicle_serial');
SET @sql := IF(@c=0, 'ALTER TABLE vehicles ADD COLUMN vehicle_serial VARCHAR(32) NULL AFTER registration_number', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='vehicles' AND COLUMN_NAME='seating_capacity');
SET @sql := IF(@c=0, 'ALTER TABLE vehicles ADD COLUMN seating_capacity TINYINT UNSIGNED NULL AFTER fuel_type', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='vehicles' AND COLUMN_NAME='registration_date');
SET @sql := IF(@c=0, 'ALTER TABLE vehicles ADD COLUMN registration_date DATE NULL AFTER seating_capacity', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Drop old per-client unique (client_id, registration_number).
-- InnoDB often uses that composite unique as the supporting index for
-- fk_veh_client, so DROP INDEX fails with:
--   ERROR 1553: Cannot drop index 'uq_client_vehicle': needed in a foreign key constraint
-- Give the FK its own client_id index, drop the FK, drop the unique, restore the FK.
SET @c := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='vehicles' AND COLUMN_NAME='client_id'
    AND SEQ_IN_INDEX=1 AND INDEX_NAME <> 'uq_client_vehicle'
);
SET @sql := IF(@c=0, 'ALTER TABLE vehicles ADD KEY ix_vehicles_client (client_id)', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='vehicles' AND CONSTRAINT_NAME='fk_veh_client'
    AND CONSTRAINT_TYPE='FOREIGN KEY'
);
SET @sql := IF(@c>0, 'ALTER TABLE vehicles DROP FOREIGN KEY fk_veh_client', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='vehicles' AND INDEX_NAME='uq_client_vehicle');
SET @sql := IF(@c>0, 'ALTER TABLE vehicles DROP INDEX uq_client_vehicle', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='vehicles' AND CONSTRAINT_NAME='fk_veh_client'
    AND CONSTRAINT_TYPE='FOREIGN KEY'
);
SET @sql := IF(@c=0,
  'ALTER TABLE vehicles ADD CONSTRAINT fk_veh_client FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='vehicles' AND INDEX_NAME='uq_vehicles_reg');
SET @sql := IF(@c=0, 'ALTER TABLE vehicles ADD UNIQUE KEY uq_vehicles_reg (registration_number)', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Backfill vehicle serials per site code
UPDATE vehicles v
JOIN clients c ON c.id = v.client_id
SET v.vehicle_serial = CONCAT(c.site_code, LPAD(v.id, 4, '0'))
WHERE v.vehicle_serial IS NULL OR v.vehicle_serial = '';

SET @c := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='vehicles' AND INDEX_NAME='uq_vehicles_serial');
SET @sql := IF(@c=0, 'ALTER TABLE vehicles ADD UNIQUE KEY uq_vehicles_serial (vehicle_serial)', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Vehicle types: keep Sedan, SUV/MPV, TT/Mini BUS, BUS
INSERT IGNORE INTO vehicle_types (name, code, sort_order, is_active) VALUES
  ('Sedan', 'SEDAN', 10, 1),
  ('SUV/MPV', 'SUVMPV', 20, 1),
  ('TT/Mini BUS', 'TTMINIBUS', 30, 1),
  ('BUS', 'BUS', 40, 1);

UPDATE vehicle_types SET is_active=1, sort_order=10, code='SEDAN' WHERE name='Sedan';
UPDATE vehicle_types SET is_active=1, sort_order=20, code='SUVMPV' WHERE name='SUV/MPV';
UPDATE vehicle_types SET is_active=1, sort_order=30, code='TTMINIBUS' WHERE name='TT/Mini BUS';
UPDATE vehicle_types SET is_active=1, sort_order=40, code='BUS' WHERE name IN ('BUS', 'Bus');
UPDATE vehicle_types SET name='BUS' WHERE name='Bus';

UPDATE vehicles v
JOIN vehicle_types oldt ON oldt.id = v.vehicle_type_id
JOIN vehicle_types newt ON newt.name = 'SUV/MPV'
SET v.vehicle_type_id = newt.id, v.make_model = 'SUV/MPV'
WHERE oldt.name IN ('SUV', 'MUV / MPV');

UPDATE vehicles v
JOIN vehicle_types oldt ON oldt.id = v.vehicle_type_id
JOIN vehicle_types newt ON newt.name = 'TT/Mini BUS'
SET v.vehicle_type_id = newt.id, v.make_model = 'TT/Mini BUS'
WHERE oldt.name IN ('Tempo Traveller (TT)', 'Mini Bus');

UPDATE vehicles v
JOIN vehicle_types oldt ON oldt.id = v.vehicle_type_id
JOIN vehicle_types newt ON newt.name = 'BUS'
SET v.vehicle_type_id = newt.id, v.make_model = 'BUS'
WHERE oldt.name IN ('Bus', 'BUS') AND newt.name = 'BUS' AND oldt.id <> newt.id;

UPDATE vehicle_types SET is_active = 0
WHERE name NOT IN ('Sedan', 'SUV/MPV', 'TT/Mini BUS', 'BUS');
