-- MySQL dump 10.13  Distrib 8.0.45, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: hadilao_online
-- ------------------------------------------------------
-- Server version	8.0.45

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `admin_users`
--

DROP TABLE IF EXISTS `admin_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_users` (
  `admin_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(60) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `full_name` varchar(120) DEFAULT NULL,
  `role` varchar(30) NOT NULL DEFAULT 'ADMIN',
  `status` varchar(20) NOT NULL DEFAULT 'ACTIVE',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`admin_id`),
  UNIQUE KEY `uq_admin_username` (`username`),
  CONSTRAINT `ck_admin_role` CHECK ((`role` in (_utf8mb4'ADMIN'))),
  CONSTRAINT `ck_admin_status` CHECK ((`status` in (_utf8mb4'ACTIVE',_utf8mb4'DISABLED')))
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `audit_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `actor_type` varchar(20) NOT NULL,
  `actor_id` bigint unsigned DEFAULT NULL,
  `action` varchar(80) NOT NULL,
  `entity` varchar(80) NOT NULL,
  `entity_id` bigint unsigned DEFAULT NULL,
  `payload` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`audit_id`),
  CONSTRAINT `ck_audit_actor` CHECK ((`actor_type` in (_utf8mb4'ADMIN',_utf8mb4'CLIENT',_utf8mb4'SYSTEM',_utf8mb4'STAFF')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--

--
-- Table structure for table `branches`
--

DROP TABLE IF EXISTS `branches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `branches` (
  `branch_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `branch_code` varchar(20) NOT NULL,
  `branch_name` varchar(100) NOT NULL,
  `address` varchar(255) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `timezone` varchar(50) DEFAULT 'Asia/Ho_Chi_Minh',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `open_time` time DEFAULT '09:00:00',
  `close_time` time DEFAULT '22:00:00',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`branch_id`),
  UNIQUE KEY `uq_branch_code` (`branch_code`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--

--
--

--
-- Table structure for table `staff_users`
--

DROP TABLE IF EXISTS `staff_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `staff_users` (
  `staff_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(60) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `full_name` varchar(120) DEFAULT NULL,
  `role` varchar(30) NOT NULL DEFAULT 'STAFF',
  `branch_id` bigint unsigned DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'ACTIVE',
  `last_login_at` datetime(3) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`staff_id`),
  UNIQUE KEY `uq_staff_username` (`username`),
  KEY `idx_staff_branch_role` (`branch_id`,`role`),
  CONSTRAINT `fk_staff_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE SET NULL,
  CONSTRAINT `ck_staff_role` CHECK ((`role` in (_utf8mb4'BRANCH_MANAGER',_utf8mb4'STAFF',_utf8mb4'KITCHEN',_utf8mb4'CASHIER'))),
  CONSTRAINT `ck_staff_status` CHECK ((`status` in (_utf8mb4'ACTIVE',_utf8mb4'DISABLED')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


-- Table structure for table `cart_items`
--

DROP TABLE IF EXISTS `cart_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cart_items` (
  `cart_item_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `cart_id` bigint unsigned NOT NULL,
  `item_id` bigint unsigned NOT NULL,
  `quantity` int NOT NULL,
  `unit_price` decimal(12,2) NOT NULL,
  `item_options` json DEFAULT NULL,
  `options_hash` char(64) NOT NULL DEFAULT '',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`cart_item_id`),
  UNIQUE KEY `uq_cart_item_variant` (`cart_id`,`item_id`,`options_hash`),
  KEY `fk_ci_item` (`item_id`),
  KEY `idx_ci_cart` (`cart_id`),
  KEY `idx_ci_cart_item` (`cart_id`,`item_id`),
  CONSTRAINT `fk_ci_cart` FOREIGN KEY (`cart_id`) REFERENCES `carts` (`cart_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ci_item` FOREIGN KEY (`item_id`) REFERENCES `menu_items` (`item_id`),
  CONSTRAINT `ck_ci_qty` CHECK ((`quantity` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--

--
-- Table structure for table `carts`
--

DROP TABLE IF EXISTS `carts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `carts` (
  `cart_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `branch_id` bigint unsigned DEFAULT NULL,
  `cart_key` char(36) NOT NULL DEFAULT (uuid()),
  `client_id` bigint unsigned DEFAULT NULL,
  `session_id` bigint unsigned DEFAULT NULL,
  `order_channel` varchar(20) NOT NULL,
  `cart_status` varchar(20) NOT NULL DEFAULT 'ACTIVE',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`cart_id`),
  UNIQUE KEY `uq_cart_key` (`cart_key`),
  KEY `fk_cart_client` (`client_id`),
  KEY `fk_cart_session` (`session_id`),
  KEY `idx_cart_branch_status` (`branch_id`,`cart_status`),
  CONSTRAINT `fk_cart_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`),
  CONSTRAINT `fk_cart_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`client_id`),
  CONSTRAINT `fk_cart_session` FOREIGN KEY (`session_id`) REFERENCES `table_sessions` (`session_id`),
  CONSTRAINT `ck_cart_channel` CHECK ((`order_channel` in (_utf8mb4'DINE_IN',_utf8mb4'DELIVERY'))),
  CONSTRAINT `ck_cart_status` CHECK ((`cart_status` in (_utf8mb4'ACTIVE',_utf8mb4'CHECKED_OUT',_utf8mb4'ABANDONED')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--

--
-- Table structure for table `client_addresses`
--

DROP TABLE IF EXISTS `client_addresses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `client_addresses` (
  `address_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `receiver_name` varchar(120) DEFAULT NULL,
  `receiver_phone` varchar(20) DEFAULT NULL,
  `address_line1` varchar(255) NOT NULL,
  `address_line2` varchar(255) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `district` varchar(100) DEFAULT NULL,
  `ward` varchar(100) DEFAULT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`address_id`),
  KEY `fk_addr_client` (`client_id`),
  CONSTRAINT `fk_addr_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`client_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--

--
-- Table structure for table `clients`
--

DROP TABLE IF EXISTS `clients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clients` (
  `client_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `phone` varchar(20) NOT NULL,
  `full_name` varchar(120) DEFAULT NULL,
  `email` varchar(120) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'ACTIVE',
  `total_spend` decimal(12,2) NOT NULL DEFAULT '0.00',
  `rank_id` bigint unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`client_id`),
  UNIQUE KEY `uq_client_phone` (`phone`),
  KEY `fk_client_rank` (`rank_id`),
  CONSTRAINT `fk_client_rank` FOREIGN KEY (`rank_id`) REFERENCES `member_ranks` (`rank_id`),
  CONSTRAINT `ck_client_status` CHECK ((`status` in (_utf8mb4'ACTIVE',_utf8mb4'BLOCKED'))),
  CONSTRAINT `ck_client_totalspend` CHECK ((`total_spend` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--

--
-- Table structure for table `combo_set_items`
--

DROP TABLE IF EXISTS `combo_set_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `combo_set_items` (
  `combo_id` bigint unsigned NOT NULL,
  `item_id` bigint unsigned NOT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `group_name` varchar(60) DEFAULT NULL,
  `is_required` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`combo_id`,`item_id`),
  KEY `idx_csi_item` (`item_id`),
  CONSTRAINT `fk_csi_combo` FOREIGN KEY (`combo_id`) REFERENCES `combo_sets` (`combo_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_csi_item` FOREIGN KEY (`item_id`) REFERENCES `menu_items` (`item_id`),
  CONSTRAINT `ck_csi_qty` CHECK ((`quantity` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--

--
-- Table structure for table `combo_sets`
--

DROP TABLE IF EXISTS `combo_sets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `combo_sets` (
  `combo_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `combo_item_id` bigint unsigned NOT NULL,
  `serve_for` int NOT NULL DEFAULT '1',
  `allow_customization` tinyint(1) NOT NULL DEFAULT '0',
  `pricing_mode` varchar(30) NOT NULL DEFAULT 'SET_PRICE',
  `discount_type` varchar(20) DEFAULT NULL,
  `discount_value` decimal(12,2) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`combo_id`),
  UNIQUE KEY `uq_combo_item` (`combo_item_id`),
  CONSTRAINT `fk_combo_item` FOREIGN KEY (`combo_item_id`) REFERENCES `menu_items` (`item_id`) ON DELETE CASCADE,
  CONSTRAINT `ck_combo_serve_for` CHECK ((`serve_for` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--

--
-- Table structure for table `meat_profiles`
--

DROP TABLE IF EXISTS `meat_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `meat_profiles` (
  `item_id` bigint unsigned NOT NULL,
  `meat_kind` varchar(20) NOT NULL,
  `cut` varchar(80) NOT NULL,
  `origin` varchar(80) DEFAULT NULL,
  `portion_grams` int DEFAULT NULL,
  `marbling_level` tinyint DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`item_id`),
  CONSTRAINT `fk_meat_item` FOREIGN KEY (`item_id`) REFERENCES `menu_items` (`item_id`) ON DELETE CASCADE,
  CONSTRAINT `ck_marbling` CHECK (((`marbling_level` is null) or ((`marbling_level` >= 1) and (`marbling_level` <= 5)))),
  CONSTRAINT `ck_meat_kind` CHECK ((`meat_kind` in (_utf8mb4'BEEF',_utf8mb4'PORK',_utf8mb4'LAMB',_utf8mb4'CHICKEN',_utf8mb4'SEAFOOD',_utf8mb4'OTHER'))),
  CONSTRAINT `ck_portion_grams` CHECK (((`portion_grams` is null) or (`portion_grams` > 0)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--

--
-- Table structure for table `member_ranks`
--

DROP TABLE IF EXISTS `member_ranks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `member_ranks` (
  `rank_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `rank_code` varchar(20) NOT NULL,
  `rank_name` varchar(50) NOT NULL,
  `min_spend` decimal(12,2) NOT NULL DEFAULT '0.00',
  `discount_percent` decimal(5,2) NOT NULL DEFAULT '0.00',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`rank_id`),
  UNIQUE KEY `uq_rank_code` (`rank_code`),
  CONSTRAINT `ck_rank_discount` CHECK (((`discount_percent` >= 0) and (`discount_percent` <= 100))),
  CONSTRAINT `ck_rank_minspend` CHECK ((`min_spend` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--

--
-- Table structure for table `menu_categories`
--

DROP TABLE IF EXISTS `menu_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `menu_categories` (
  `category_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `category_name` varchar(80) NOT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`category_id`),
  UNIQUE KEY `uq_category_name` (`category_name`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--

--
-- Table structure for table `menu_item_option_groups`
--

DROP TABLE IF EXISTS `menu_item_option_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `menu_item_option_groups` (
  `item_id` bigint unsigned NOT NULL,
  `group_id` bigint unsigned NOT NULL,
  `display_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`item_id`,`group_id`),
  KEY `fk_iog_group` (`group_id`),
  CONSTRAINT `fk_iog_group` FOREIGN KEY (`group_id`) REFERENCES `menu_option_groups` (`group_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_iog_item` FOREIGN KEY (`item_id`) REFERENCES `menu_items` (`item_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--

--
-- Table structure for table `menu_item_stock`
--

DROP TABLE IF EXISTS `menu_item_stock`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `menu_item_stock` (
  `branch_id` bigint unsigned NOT NULL,
  `item_id` bigint unsigned NOT NULL,
  `quantity` int NOT NULL DEFAULT '0',
  `last_restock_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`branch_id`,`item_id`),
  KEY `idx_stock_item` (`item_id`),
  CONSTRAINT `fk_stock_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_stock_item` FOREIGN KEY (`item_id`) REFERENCES `menu_items` (`item_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--

--
-- Table structure for table `menu_items`
--

DROP TABLE IF EXISTS `menu_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `menu_items` (
  `item_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `category_id` bigint unsigned NOT NULL,
  `item_name` varchar(120) NOT NULL,
  `description` text,
  `price` decimal(12,2) NOT NULL,
  `image_url` varchar(500) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` int NOT NULL DEFAULT '0',
  `stock_qty` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`item_id`),
  UNIQUE KEY `uq_menu_item_category_name` (`category_id`,`item_name`),
  KEY `fk_item_category` (`category_id`),
  FULLTEXT KEY `ftx_menu_items` (`item_name`,`description`),
  CONSTRAINT `fk_item_category` FOREIGN KEY (`category_id`) REFERENCES `menu_categories` (`category_id`),
  CONSTRAINT `ck_item_price` CHECK ((`price` >= 0)),
  CONSTRAINT `ck_item_stock` CHECK (((`stock_qty` is null) or (`stock_qty` >= 0)))
) ENGINE=InnoDB AUTO_INCREMENT=132 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--

--
-- Table structure for table `menu_option_groups`
--

DROP TABLE IF EXISTS `menu_option_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `menu_option_groups` (
  `group_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `priority` int NOT NULL DEFAULT '0',
  `is_multiple` tinyint(1) NOT NULL DEFAULT '0',
  `is_required` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`group_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--

--
-- Table structure for table `menu_options`
--

DROP TABLE IF EXISTS `menu_options`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `menu_options` (
  `option_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `group_id` bigint unsigned NOT NULL,
  `name` varchar(100) NOT NULL,
  `price_adjustment` decimal(10,2) NOT NULL DEFAULT '0.00',
  `is_available` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`option_id`),
  KEY `idx_opt_group` (`group_id`),
  CONSTRAINT `fk_opt_group` FOREIGN KEY (`group_id`) REFERENCES `menu_option_groups` (`group_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--

--
-- Table structure for table `order_items`
--

DROP TABLE IF EXISTS `order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_items` (
  `order_item_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_id` bigint unsigned NOT NULL,
  `item_id` bigint unsigned NOT NULL,
  `item_name` varchar(120) NOT NULL,
  `unit_price` decimal(12,2) NOT NULL,
  `quantity` int NOT NULL,
  `line_total` decimal(12,2) NOT NULL,
  `item_options` json DEFAULT NULL,
  `pricing_breakdown` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`order_item_id`),
  KEY `fk_oi_item` (`item_id`),
  KEY `idx_oi_order` (`order_id`),
  CONSTRAINT `fk_oi_item` FOREIGN KEY (`item_id`) REFERENCES `menu_items` (`item_id`),
  CONSTRAINT `fk_oi_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE,
  CONSTRAINT `ck_oi_money` CHECK (((`unit_price` >= 0) and (`line_total` >= 0))),
  CONSTRAINT `ck_oi_qty` CHECK ((`quantity` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--

--
-- Table structure for table `order_status_history`
--

DROP TABLE IF EXISTS `order_status_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_status_history` (
  `history_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_id` bigint unsigned NOT NULL,
  `from_status` varchar(30) DEFAULT NULL,
  `to_status` varchar(30) NOT NULL,
  `changed_by_type` varchar(20) NOT NULL,
  `changed_by_id` bigint unsigned DEFAULT NULL,
  `note` varchar(255) DEFAULT NULL,
  `changed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`history_id`),
  KEY `fk_osh_order` (`order_id`),
  CONSTRAINT `fk_osh_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE,
  CONSTRAINT `ck_osh_actor` CHECK ((`changed_by_type` in (_utf8mb4'ADMIN',_utf8mb4'CLIENT',_utf8mb4'SYSTEM',_utf8mb4'STAFF')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orders` (
  `order_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `branch_id` bigint unsigned DEFAULT NULL,
  `order_code` varchar(30) NOT NULL,
  `client_id` bigint unsigned DEFAULT NULL,
  `session_id` bigint unsigned DEFAULT NULL,
  `delivery_address_id` bigint unsigned DEFAULT NULL,
  `order_channel` varchar(20) NOT NULL,
  `order_status` varchar(30) NOT NULL DEFAULT 'NEW',
  `note` varchar(500) DEFAULT NULL,
  `rank_id_snapshot` bigint unsigned DEFAULT NULL,
  `discount_percent_applied` decimal(5,2) NOT NULL DEFAULT '0.00',
  `subtotal_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `discount_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `delivery_fee` decimal(12,2) NOT NULL DEFAULT '0.00',
  `total_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `accepted_at` datetime DEFAULT NULL,
  `prepared_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `canceled_at` datetime DEFAULT NULL,
  PRIMARY KEY (`order_id`),
  UNIQUE KEY `uq_order_code` (`order_code`),
  KEY `fk_order_client` (`client_id`),
  KEY `fk_order_session` (`session_id`),
  KEY `fk_order_addr` (`delivery_address_id`),
  KEY `fk_order_rank_snapshot` (`rank_id_snapshot`),
  KEY `idx_orders_created_at` (`created_at`),
  KEY `idx_orders_status` (`order_status`),
  KEY `idx_orders_channel` (`order_channel`),
  KEY `idx_orders_branch_created` (`branch_id`,`created_at`),
  CONSTRAINT `fk_order_addr` FOREIGN KEY (`delivery_address_id`) REFERENCES `client_addresses` (`address_id`),
  CONSTRAINT `fk_order_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`),
  CONSTRAINT `fk_order_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`client_id`),
  CONSTRAINT `fk_order_rank_snapshot` FOREIGN KEY (`rank_id_snapshot`) REFERENCES `member_ranks` (`rank_id`),
  CONSTRAINT `fk_order_session` FOREIGN KEY (`session_id`) REFERENCES `table_sessions` (`session_id`),
  CONSTRAINT `ck_order_channel` CHECK ((`order_channel` in (_utf8mb4'DINE_IN',_utf8mb4'DELIVERY'))),
  CONSTRAINT `ck_order_money` CHECK (((`subtotal_amount` >= 0) and (`discount_amount` >= 0) and (`delivery_fee` >= 0) and (`total_amount` >= 0))),
  CONSTRAINT `ck_order_status` CHECK ((`order_status` in (_utf8mb4'NEW',_utf8mb4'RECEIVED',_utf8mb4'PREPARING',_utf8mb4'READY',_utf8mb4'SERVING',_utf8mb4'DELIVERING',_utf8mb4'COMPLETED',_utf8mb4'CANCELED',_utf8mb4'PAID')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--

--
-- Table structure for table `otp_requests`
--

DROP TABLE IF EXISTS `otp_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `otp_requests` (
  `otp_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `phone` varchar(20) NOT NULL,
  `otp_hash` varchar(255) NOT NULL,
  `purpose` varchar(30) NOT NULL DEFAULT 'LOGIN',
  `attempts` int NOT NULL DEFAULT '0',
  `max_attempts` int NOT NULL DEFAULT '5',
  `expires_at` datetime NOT NULL,
  `verified_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`otp_id`),
  KEY `idx_otp_phone` (`phone`),
  CONSTRAINT `ck_otp_attempts` CHECK (((`attempts` >= 0) and (`max_attempts` > 0))),
  CONSTRAINT `ck_otp_purpose` CHECK ((`purpose` in (_utf8mb4'LOGIN',_utf8mb4'REGISTER')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `payment_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_id` bigint unsigned NOT NULL,
  `provider` varchar(30) NOT NULL DEFAULT 'VNPAY',
  `amount` decimal(12,2) NOT NULL,
  `currency` varchar(10) NOT NULL DEFAULT 'VND',
  `status` varchar(20) NOT NULL DEFAULT 'INIT',
  `txn_ref` varchar(64) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`payment_id`),
  UNIQUE KEY `uq_pay_txn_ref` (`txn_ref`),
  KEY `idx_pay_order` (`order_id`),
  CONSTRAINT `fk_pay_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE,
  CONSTRAINT `ck_pay_money` CHECK ((`amount` >= 0)),
  CONSTRAINT `ck_pay_status` CHECK ((`status` in (_utf8mb4'INIT',_utf8mb4'REDIRECTED',_utf8mb4'SUCCESS',_utf8mb4'FAILED',_utf8mb4'REFUNDED')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--

--
-- Table structure for table `restaurant_tables`
--

DROP TABLE IF EXISTS `restaurant_tables`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `restaurant_tables` (
  `table_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `branch_id` bigint unsigned NOT NULL DEFAULT '1',
  `table_code` varchar(30) NOT NULL,
  `area_name` varchar(80) DEFAULT NULL,
  `seats` int NOT NULL DEFAULT '4',
  `table_status` varchar(30) NOT NULL DEFAULT 'AVAILABLE',
  `direction_id` char(36) NOT NULL DEFAULT (uuid()),
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`table_id`),
  UNIQUE KEY `uq_direction_id` (`direction_id`),
  UNIQUE KEY `uq_branch_table_code` (`branch_id`,`table_code`),
  CONSTRAINT `fk_table_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`),
  CONSTRAINT `ck_table_seats` CHECK ((`seats` > 0)),
  CONSTRAINT `ck_table_status` CHECK ((`table_status` in (_utf8mb4'AVAILABLE',_utf8mb4'OCCUPIED',_utf8mb4'RESERVED',_utf8mb4'OUT_OF_SERVICE')))
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--

--
-- Table structure for table `client_refresh_tokens`
--

DROP TABLE IF EXISTS `client_refresh_tokens`;

CREATE TABLE `client_refresh_tokens` (
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

-- Table structure for table `schema_migrations`
--

DROP TABLE IF EXISTS `schema_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `schema_migrations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `filename` varchar(255) NOT NULL,
  `applied_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_schema_migrations_filename` (`filename`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--

--
-- Table structure for table `search_synonyms`
--

DROP TABLE IF EXISTS `search_synonyms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `search_synonyms` (
  `syn_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `canonical_term` varchar(80) NOT NULL,
  `synonym_term` varchar(80) NOT NULL,
  `weight` decimal(4,2) NOT NULL DEFAULT '1.00',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`syn_id`),
  KEY `idx_syn_term` (`synonym_term`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--

--
-- Table structure for table `special_offer_rules`
--

DROP TABLE IF EXISTS `special_offer_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `special_offer_rules` (
  `rule_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `description` text,
  `discount_type` enum('PERCENT','FIXED_AMOUNT','FIXED_PRICE') NOT NULL,
  `discount_value` decimal(10,2) NOT NULL,
  `min_order_value` decimal(10,2) DEFAULT '0.00',
  `start_date` datetime NOT NULL,
  `end_date` datetime NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `priority` int NOT NULL DEFAULT '1',
  `conditions_json` json DEFAULT NULL,
  PRIMARY KEY (`rule_id`),
  KEY `idx_offer_validity` (`start_date`,`end_date`,`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--

--
-- Table structure for table `special_offers`
--

DROP TABLE IF EXISTS `special_offers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `special_offers` (
  `offer_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(150) NOT NULL,
  `description` text,
  `banner_url` varchar(500) DEFAULT NULL,
  `start_at` datetime NOT NULL,
  `end_at` datetime NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`offer_id`),
  CONSTRAINT `ck_offer_time` CHECK ((`end_at` > `start_at`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--

--
-- Table structure for table `stock_holds`
--

DROP TABLE IF EXISTS `stock_holds`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_holds` (
  `hold_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `branch_id` bigint unsigned NOT NULL,
  `item_id` bigint unsigned NOT NULL,
  `session_id` bigint unsigned NOT NULL,
  `quantity` int NOT NULL,
  `expires_at` timestamp NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`hold_id`),
  KEY `idx_hold_expires` (`expires_at`),
  KEY `idx_hold_session` (`session_id`),
  KEY `fk_hold_stock` (`branch_id`,`item_id`),
  CONSTRAINT `fk_hold_stock` FOREIGN KEY (`branch_id`, `item_id`) REFERENCES `menu_item_stock` (`branch_id`, `item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--

--
-- Table structure for table `table_reservations`
--

DROP TABLE IF EXISTS `table_reservations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `table_reservations` (
  `reservation_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `branch_id` bigint unsigned NOT NULL DEFAULT '1',
  `reservation_code` varchar(32) NOT NULL,
  `table_id` bigint unsigned NOT NULL,
  `table_code_snapshot` varchar(30) NOT NULL,
  `area_name_snapshot` varchar(80) DEFAULT NULL,
  `party_size` int NOT NULL,
  `contact_phone` varchar(20) NOT NULL,
  `contact_name` varchar(120) DEFAULT NULL,
  `note` varchar(500) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'PENDING',
  `reserved_from` datetime NOT NULL,
  `reserved_to` datetime NOT NULL,
  `expires_at` datetime NOT NULL,
  `confirmed_at` datetime DEFAULT NULL,
  `confirmed_by_admin_id` bigint unsigned DEFAULT NULL,
  `canceled_at` datetime DEFAULT NULL,
  `checked_in_at` datetime DEFAULT NULL,
  `session_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`reservation_id`),
  UNIQUE KEY `uq_reservation_code` (`reservation_code`),
  KEY `fk_resv_session` (`session_id`),
  KEY `fk_resv_admin` (`confirmed_by_admin_id`),
  KEY `idx_fk_table_id` (`table_id`),
  KEY `idx_resv_table_time` (`table_id`,`reserved_from`,`reserved_to`),
  KEY `idx_resv_status_expires` (`status`,`expires_at`),
  KEY `idx_resv_phone` (`contact_phone`),
  KEY `idx_resv_reserved_from` (`reserved_from`),
  KEY `fk_resv_branch` (`branch_id`),
  CONSTRAINT `fk_resv_admin` FOREIGN KEY (`confirmed_by_admin_id`) REFERENCES `admin_users` (`admin_id`),
  CONSTRAINT `fk_resv_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`),
  CONSTRAINT `fk_resv_session` FOREIGN KEY (`session_id`) REFERENCES `table_sessions` (`session_id`),
  CONSTRAINT `fk_resv_table` FOREIGN KEY (`table_id`) REFERENCES `restaurant_tables` (`table_id`),
  CONSTRAINT `ck_resv_party` CHECK ((`party_size` > 0)),
  CONSTRAINT `ck_resv_status` CHECK ((`status` in (_utf8mb4'PENDING',_utf8mb4'CONFIRMED',_utf8mb4'CANCELED',_utf8mb4'CHECKED_IN',_utf8mb4'EXPIRED',_utf8mb4'NO_SHOW',_utf8mb4'COMPLETED'))),
  CONSTRAINT `ck_resv_time` CHECK (((`reserved_to` > `reserved_from`) and (`expires_at` <= `reserved_from`)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--

--
-- Table structure for table `table_sessions`
--

DROP TABLE IF EXISTS `table_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `table_sessions` (
  `session_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `branch_id` bigint unsigned NOT NULL DEFAULT '1',
  `table_id` bigint unsigned NOT NULL,
  `session_key` char(36) NOT NULL DEFAULT (uuid()),
  `status` varchar(20) NOT NULL DEFAULT 'OPEN',
  `open_table_id` bigint unsigned GENERATED ALWAYS AS (CASE WHEN status='OPEN' THEN table_id ELSE NULL END) STORED,
  `opened_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `closed_at` datetime DEFAULT NULL,
  `opened_by_client_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`session_id`),
  UNIQUE KEY `uq_session_key` (`session_key`),
  UNIQUE KEY `uq_open_session_per_table` (`open_table_id`),
  KEY `fk_session_table` (`table_id`),
  KEY `fk_session_client` (`opened_by_client_id`),
  KEY `idx_session_branch_status` (`branch_id`,`status`),
  CONSTRAINT `fk_session_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`),
  CONSTRAINT `fk_session_client` FOREIGN KEY (`opened_by_client_id`) REFERENCES `clients` (`client_id`),
  CONSTRAINT `fk_session_table` FOREIGN KEY (`table_id`) REFERENCES `restaurant_tables` (`table_id`),
  CONSTRAINT `ck_session_status` CHECK ((`status` in (_utf8mb4'OPEN',_utf8mb4'CLOSED')))
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--

--
-- Table structure for table `vnpay_logs`
--

DROP TABLE IF EXISTS `vnpay_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vnpay_logs` (
  `log_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `payment_id` bigint unsigned NOT NULL,
  `log_type` varchar(10) NOT NULL,
  `vnp_TxnRef` varchar(64) NOT NULL,
  `vnp_ResponseCode` varchar(10) DEFAULT NULL,
  `vnp_TransactionNo` varchar(30) DEFAULT NULL,
  `vnp_SecureHash` varchar(255) DEFAULT NULL,
  `raw_query` text,
  `received_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`),
  UNIQUE KEY `uq_vlog` (`vnp_TxnRef`,`log_type`),
  KEY `fk_vlog_payment` (`payment_id`),
  CONSTRAINT `fk_vlog_payment` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`payment_id`) ON DELETE CASCADE,
  CONSTRAINT `ck_vlog_type` CHECK ((`log_type` in (_utf8mb4'RETURN',_utf8mb4'IPN')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-02-05 18:44:18
