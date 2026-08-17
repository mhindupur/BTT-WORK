-- Additive migration: OTP-based password reset for site managers

CREATE TABLE IF NOT EXISTS password_reset_otps (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  phone_e164 VARCHAR(32) NOT NULL,
  otp_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  consumed_at DATETIME NULL,
  attempts INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_pro_user (user_id),
  KEY ix_pro_phone (phone_e164),
  KEY ix_pro_exp (expires_at),
  CONSTRAINT fk_pro_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

