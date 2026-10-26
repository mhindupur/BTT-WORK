-- Account Manager role + many-to-many site assignments (view-only)
SET @db := DATABASE();

-- Extend users.role to include account_manager (MySQL / MariaDB)
ALTER TABLE users
  MODIFY COLUMN role ENUM('admin', 'site_manager', 'account_manager') NOT NULL;

CREATE TABLE IF NOT EXISTS client_account_managers (
  client_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (client_id, user_id),
  KEY ix_cam_user (user_id),
  CONSTRAINT fk_cam_client FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE,
  CONSTRAINT fk_cam_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
