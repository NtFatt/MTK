-- Phase 2: Realtime hardening
-- Admin room audit trail (for dashboards, troubleshooting, and post-mortem)

CREATE TABLE IF NOT EXISTS `realtime_admin_audit` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `room` varchar(64) NOT NULL DEFAULT 'admin',
  `event_id` char(36) NOT NULL,
  `event_version` int NOT NULL,
  `seq` bigint unsigned NOT NULL,
  `event_type` varchar(80) NOT NULL,
  `event_at` datetime(3) NOT NULL,
  `scope_json` json NULL,
  `payload_json` json NOT NULL,
  `meta_json` json NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_room_seq` (`room`, `seq`),
  KEY `idx_room_created_at` (`room`, `created_at`),
  KEY `idx_event_type` (`event_type`),
  KEY `idx_event_id` (`event_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
