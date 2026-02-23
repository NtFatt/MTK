-- P1: Client OTP auth - refresh token rotation store
-- NOTE: idempotent for db:reset (canonical schema may already include this table)

CREATE TABLE IF NOT EXISTS `client_refresh_tokens` (
  `token_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `jti` char(36) NOT NULL,
  `token_hash` varchar(255) NOT NULL,
  `issued_at` datetime NOT NULL,
  `expires_at` datetime NOT NULL,
  `revoked_at` datetime DEFAULT NULL,
  `replaced_by_jti` char(36) DEFAULT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `ip_address` varchar(64) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`token_id`),
  UNIQUE KEY `uq_client_refresh_jti` (`jti`),
  KEY `idx_client_refresh_client` (`client_id`),
  KEY `idx_client_refresh_expires` (`expires_at`),
  CONSTRAINT `fk_client_refresh_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`client_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
