-- Store indent/serial number on fuel recon lines for display
SET @db := DATABASE();

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='fuel_recon_lines' AND COLUMN_NAME='indent_serial');
SET @sql := IF(@c=0, 'ALTER TABLE fuel_recon_lines ADD COLUMN indent_serial VARCHAR(64) NULL AFTER vehicle_registration', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Backfill from matched indents for older uploads
UPDATE fuel_recon_lines l
JOIN indents i ON i.id = l.matched_indent_id
SET l.indent_serial = i.serial_number
WHERE (l.indent_serial IS NULL OR l.indent_serial = '')
  AND l.matched_indent_id IS NOT NULL
  AND i.serial_number IS NOT NULL;
