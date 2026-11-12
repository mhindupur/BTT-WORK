# fleet-db

1. **Fresh database:** `mysql … < schema.sql`
2. **Existing database:** apply unread `migration_0XX_*.sql` files in numeric order
3. `init-database.sql` only creates the `btt_fleet` database

Latest notable migration: `migration_013_sitecode8_registered_date.sql` (site code width + registered_date + SM notification email).
