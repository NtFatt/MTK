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
-- Dumping data for table `admin_users`
--

LOCK TABLES `admin_users` WRITE;
/*!40000 ALTER TABLE `admin_users` DISABLE KEYS */;
/*!40000 ALTER TABLE `admin_users` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `branches`
--

LOCK TABLES `branches` WRITE;
/*!40000 ALTER TABLE `branches` DISABLE KEYS */;
INSERT INTO `branches` VALUES (1,'HCM_Q1','Haidilao - Q1 (Demo)','Quận 1, TP.HCM','0280000000','Asia/Ho_Chi_Minh',1,'09:00:00','22:00:00','2026-02-05 11:40:59','2026-02-05 11:40:59');
/*!40000 ALTER TABLE `branches` ENABLE KEYS */;
UNLOCK TABLES;

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

--
-- Dumping data for table `staff_users`
--

LOCK TABLES `staff_users` WRITE;
/*!40000 ALTER TABLE `staff_users` DISABLE KEYS */;
/*!40000 ALTER TABLE `staff_users` ENABLE KEYS */;
UNLOCK TABLES;


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
  UNIQUE KEY `uq_cart_item` (`cart_id`,`item_id`),
  UNIQUE KEY `uq_cart_item_variant` (`cart_id`,`item_id`,`options_hash`),
  KEY `fk_ci_item` (`item_id`),
  KEY `idx_ci_cart` (`cart_id`),
  CONSTRAINT `fk_ci_cart` FOREIGN KEY (`cart_id`) REFERENCES `carts` (`cart_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ci_item` FOREIGN KEY (`item_id`) REFERENCES `menu_items` (`item_id`),
  CONSTRAINT `ck_ci_qty` CHECK ((`quantity` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cart_items`
--

LOCK TABLES `cart_items` WRITE;
/*!40000 ALTER TABLE `cart_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `cart_items` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `carts`
--

LOCK TABLES `carts` WRITE;
/*!40000 ALTER TABLE `carts` DISABLE KEYS */;
/*!40000 ALTER TABLE `carts` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `client_addresses`
--

LOCK TABLES `client_addresses` WRITE;
/*!40000 ALTER TABLE `client_addresses` DISABLE KEYS */;
/*!40000 ALTER TABLE `client_addresses` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `clients`
--

LOCK TABLES `clients` WRITE;
/*!40000 ALTER TABLE `clients` DISABLE KEYS */;
INSERT INTO `clients` VALUES (1,'0900000000','Demo Client',NULL,'ACTIVE',0.00,5,'2026-02-05 11:40:58','2026-02-05 11:40:58');
/*!40000 ALTER TABLE `clients` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `combo_set_items`
--

LOCK TABLES `combo_set_items` WRITE;
/*!40000 ALTER TABLE `combo_set_items` DISABLE KEYS */;
INSERT INTO `combo_set_items` VALUES (1,4,1,'Nước lẩu',1,1),(1,9,1,'Thịt',1,2),(1,31,1,'Thịt',1,3),(1,71,1,'Rau & Nấm',1,4),(1,88,1,'Tinh bột',1,5),(1,98,1,'Nước uống',1,6),(2,1,1,'Nước lẩu',1,1),(2,4,1,'Nước lẩu',1,2),(2,9,1,'Thịt',1,3),(2,10,1,'Thịt',1,4),(2,31,1,'Thịt',1,5),(2,41,1,'Thịt',1,6),(2,71,1,'Rau & Nấm',1,7),(2,73,1,'Rau & Nấm',1,8),(2,88,1,'Tinh bột',1,9),(2,89,1,'Tinh bột',1,10),(2,98,1,'Nước uống',1,12),(2,99,1,'Nước uống',1,11),(3,1,1,'Nước lẩu',1,1),(3,4,1,'Nước lẩu',1,2),(3,9,2,'Thịt',1,3),(3,10,2,'Thịt',1,4),(3,31,2,'Thịt',1,5),(3,41,2,'Thịt',1,6),(3,71,2,'Rau & Nấm',1,7),(3,73,2,'Rau & Nấm',1,8),(3,88,2,'Tinh bột',1,9),(3,89,2,'Tinh bột',1,10),(3,98,2,'Nước uống',1,12),(3,99,2,'Nước uống',1,11),(4,1,1,'Nước lẩu',1,1),(4,5,1,'Nước lẩu',1,2),(4,17,1,'Thịt',1,4),(4,28,1,'Thịt',1,5),(4,30,1,'Thịt',1,3),(4,51,1,'Hải sản',1,6),(4,77,1,'Rau & Nấm',1,7),(4,85,1,'Rau & Nấm',1,8),(4,92,1,'Tinh bột',1,9),(4,98,1,'Nước uống',1,11),(4,102,1,'Nước uống',1,10),(5,2,1,'Nước lẩu',1,1),(5,3,1,'Nước lẩu',1,2),(5,47,1,'Hải sản',1,3),(5,48,1,'Hải sản',1,4),(5,51,1,'Hải sản',1,5),(5,52,1,'Hải sản',1,6),(5,61,1,'Viên & Há cảo',1,7),(5,71,1,'Rau & Nấm',1,8),(5,92,1,'Tinh bột',1,9),(5,98,1,'Nước uống',1,11),(5,102,1,'Nước uống',1,10),(6,3,1,'Nước lẩu',1,1),(6,5,1,'Nước lẩu',1,2),(6,71,2,'Rau & Nấm',1,3),(6,73,2,'Rau & Nấm',1,5),(6,77,2,'Rau & Nấm',1,4),(6,85,2,'Rau & Nấm',1,6),(6,88,1,'Tinh bột',1,7),(6,102,2,'Nước uống',1,8),(7,4,1,'Nước lẩu',1,1),(7,9,1,'Thịt',1,2),(7,63,1,'Viên & Há cảo',1,3),(7,88,1,'Tinh bột',1,4),(7,98,1,'Nước uống',1,5),(8,1,1,'Nước lẩu',1,1),(8,4,1,'Nước lẩu',1,2),(8,9,3,'Thịt',1,3),(8,10,2,'Thịt',1,4),(8,31,3,'Thịt',1,5),(8,41,2,'Thịt',1,6),(8,47,2,'Hải sản',1,7),(8,48,2,'Hải sản',1,8),(8,61,2,'Viên & Há cảo',1,10),(8,63,2,'Viên & Há cảo',1,9),(8,71,3,'Rau & Nấm',1,11),(8,73,3,'Rau & Nấm',1,12),(8,88,3,'Tinh bột',1,13),(8,89,3,'Tinh bột',1,14),(8,98,3,'Nước uống',1,16),(8,99,3,'Nước uống',1,15);
/*!40000 ALTER TABLE `combo_set_items` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `combo_sets`
--

LOCK TABLES `combo_sets` WRITE;
/*!40000 ALTER TABLE `combo_sets` DISABLE KEYS */;
INSERT INTO `combo_sets` VALUES (1,124,1,1,'SET_PRICE',NULL,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(2,125,2,1,'SET_PRICE',NULL,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(3,126,4,1,'SET_PRICE',NULL,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(4,127,2,1,'SET_PRICE',NULL,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(5,128,2,1,'SET_PRICE',NULL,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(6,129,2,1,'SET_PRICE',NULL,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(7,130,1,1,'SET_PRICE',NULL,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(8,131,6,1,'SET_PRICE',NULL,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58');
/*!40000 ALTER TABLE `combo_sets` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `meat_profiles`
--

LOCK TABLES `meat_profiles` WRITE;
/*!40000 ALTER TABLE `meat_profiles` DISABLE KEYS */;
INSERT INTO `meat_profiles` VALUES (9,'BEEF','Short Plate','USA',150,3,'2026-02-05 11:40:58'),(10,'BEEF','Brisket','AUS',150,2,'2026-02-05 11:40:58'),(11,'BEEF','Deckle','AUS',150,3,'2026-02-05 11:40:58'),(12,'BEEF','Flank','AUS',150,2,'2026-02-05 11:40:58'),(13,'BEEF','Tendon','AUS',200,NULL,'2026-02-05 11:40:58'),(14,'BEEF','Wagyu Striploin','JPN',150,4,'2026-02-05 11:40:58'),(15,'BEEF','Chuck Roll','USA',150,3,'2026-02-05 11:40:58'),(16,'BEEF','Striploin','USA',150,3,'2026-02-05 11:40:58'),(17,'BEEF','Ribeye','USA',150,4,'2026-02-05 11:40:58'),(18,'BEEF','Skirt Steak','USA',150,2,'2026-02-05 11:40:58'),(21,'BEEF','Beef Tongue','USA',150,NULL,'2026-02-05 11:40:58'),(22,'BEEF','Tripe','AUS',200,NULL,'2026-02-05 11:40:58'),(23,'BEEF','Honeycomb Tripe','AUS',200,NULL,'2026-02-05 11:40:58'),(24,'BEEF','Heart','AUS',200,NULL,'2026-02-05 11:40:58'),(25,'BEEF','Oxtail','AUS',300,NULL,'2026-02-05 11:40:58'),(28,'BEEF','Tenderloin','USA',150,3,'2026-02-05 11:40:58'),(29,'BEEF','Beef Tongue Premium','USA',150,NULL,'2026-02-05 11:40:58'),(30,'BEEF','Wagyu A5','JPN',120,5,'2026-02-05 11:40:58'),(31,'PORK','Pork Belly','VN',180,NULL,'2026-02-05 11:40:58'),(32,'PORK','Shoulder','VN',180,NULL,'2026-02-05 11:40:58'),(33,'PORK','Iberico','ESP',160,3,'2026-02-05 11:40:58'),(34,'PORK','Ribs','VN',250,NULL,'2026-02-05 11:40:58'),(36,'PORK','Neck','VN',180,NULL,'2026-02-05 11:40:58'),(37,'PORK','Shank','VN',200,NULL,'2026-02-05 11:40:58'),(38,'PORK','Pig Ear','VN',200,NULL,'2026-02-05 11:40:58'),(39,'PORK','Cartilage Ribs','VN',250,NULL,'2026-02-05 11:40:58'),(41,'LAMB','Lamb Slices','AUS',150,NULL,'2026-02-05 11:40:58'),(42,'LAMB','Lamb Ribs','AUS',250,NULL,'2026-02-05 11:40:58'),(43,'LAMB','Lamb Roll','AUS',150,NULL,'2026-02-05 11:40:58'),(44,'LAMB','Lamb Hump','AUS',200,NULL,'2026-02-05 11:40:58'),(45,'LAMB','Baby Lamb','AUS',150,NULL,'2026-02-05 11:40:58'),(46,'LAMB','Lamb Rack Premium','AUS',250,NULL,'2026-02-05 11:40:58');
/*!40000 ALTER TABLE `meat_profiles` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `member_ranks`
--

LOCK TABLES `member_ranks` WRITE;
/*!40000 ALTER TABLE `member_ranks` DISABLE KEYS */;
INSERT INTO `member_ranks` VALUES (5,'BRONZE','Đồng',0.00,0.00,1,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(6,'SILVER','Bạc',1000000.00,5.00,1,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(7,'GOLD','Vàng',3000000.00,10.00,1,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(8,'DIAMOND','Kim Cương',7000000.00,15.00,1,'2026-02-05 11:40:58','2026-02-05 11:40:58');
/*!40000 ALTER TABLE `member_ranks` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `menu_categories`
--

LOCK TABLES `menu_categories` WRITE;
/*!40000 ALTER TABLE `menu_categories` DISABLE KEYS */;
INSERT INTO `menu_categories` VALUES (1,'Nước lẩu',1,1,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(2,'Combo',2,1,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(3,'Thịt bò',3,1,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(4,'Thịt heo',4,1,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(5,'Thịt cừu',5,1,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(6,'Hải sản',6,1,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(7,'Viên & Há cảo',7,1,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(8,'Rau & Nấm',8,1,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(9,'Mì & Tinh bột',9,1,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(10,'Nước uống',10,1,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(11,'Tráng miệng',11,1,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(12,'Gia vị',12,1,'2026-02-05 11:40:58','2026-02-05 11:40:58');
/*!40000 ALTER TABLE `menu_categories` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `menu_item_option_groups`
--

LOCK TABLES `menu_item_option_groups` WRITE;
/*!40000 ALTER TABLE `menu_item_option_groups` DISABLE KEYS */;
/*!40000 ALTER TABLE `menu_item_option_groups` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `menu_item_stock`
--

LOCK TABLES `menu_item_stock` WRITE;
/*!40000 ALTER TABLE `menu_item_stock` DISABLE KEYS */;
/*!40000 ALTER TABLE `menu_item_stock` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `menu_items`
--

LOCK TABLES `menu_items` WRITE;
/*!40000 ALTER TABLE `menu_items` DISABLE KEYS */;
INSERT INTO `menu_items` VALUES (1,1,'Nước lẩu Tứ Xuyên (cay)','Vị cay tê, đậm đà.',59000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(2,1,'Nước lẩu Tom Yum','Chua cay kiểu Thái.',59000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(3,1,'Nước lẩu Nấm','Thanh ngọt, thơm nấm.',59000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(4,1,'Nước lẩu Xương hầm','Đậm vị xương, dễ ăn.',59000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(5,1,'Nước lẩu Cà chua','Chua ngọt, dễ ăn.',59000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(6,1,'Nước lẩu Hải sản','Ngọt thanh, thơm mùi biển.',69000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(7,1,'Nước lẩu Collagen','Béo nhẹ, sánh mịn.',69000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(8,1,'Nước lẩu Dược thiện','Thảo mộc, thơm nhẹ.',69000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(9,3,'Bò Mỹ thái mỏng (Short Plate)','Mềm, béo nhẹ.',129000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(10,3,'Bắp bò (Brisket)','Thịt chắc, thơm.',139000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(11,3,'Gầu bò','Béo giòn, hợp lẩu cay.',149000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(12,3,'Nạm bò','Mềm vừa, ít mỡ.',139000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(13,3,'Gân bò','Dai giòn, ninh lẩu ngon.',99000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(14,3,'Thăn bò Wagyu (Premium)','Vân mỡ đẹp, mềm.',219000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(15,3,'Lõi vai (Chuck Roll)','Cân bằng nạc - mỡ, mềm.',159000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(16,3,'Thăn ngoại (Striploin)','Mềm, thơm, ít gân.',179000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(17,3,'Ribeye bò Mỹ','Vân mỡ đều, ngậy.',199000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(18,3,'Diềm thăn (Skirt Steak)','Thơm, đậm vị.',169000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(19,3,'Bò cuộn nấm kim châm','Cuộn sẵn, dễ ăn.',149000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(20,3,'Ba chỉ bò cuộn phô mai','Béo thơm, tan chảy.',169000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(21,3,'Lưỡi bò thái lát','Giòn nhẹ, thơm.',179000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(22,3,'Sách bò','Giòn sần sật.',129000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(23,3,'Lá sách bò','Giòn, hợp lẩu cay.',129000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(24,3,'Tim bò','Dai giòn, thơm.',119000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(25,3,'Đuôi bò','Hầm lẩu ngọt nước.',189000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(26,3,'Gầu bò Prime','Béo giòn, premium.',189000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(27,3,'Nạm bò Prime','Mềm, thơm, premium.',179000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(28,3,'Thăn nội (Tenderloin)','Siêu mềm, ít mỡ.',229000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(29,3,'Beef Tongue Premium','Lưỡi bò dày, thơm.',209000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(30,3,'Wagyu A5 (Limited)','Vân mỡ cực đẹp.',399000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(31,4,'Ba chỉ heo','Béo mềm, dễ ăn.',99000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(32,4,'Nạc vai heo','Mềm, ít mỡ.',99000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(33,4,'Heo Iberico (Premium)','Thơm béo, ngọt thịt.',179000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(34,4,'Sườn non','Ninh lẩu ngon.',129000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(35,4,'Nạc dăm heo','Mềm, xen mỡ nhẹ.',109000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(36,4,'Cổ heo thái mỏng','Thơm, giòn nhẹ.',119000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(37,4,'Bắp heo','Thịt chắc, ít mỡ.',119000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(38,4,'Tai heo','Giòn sần sật.',99000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(39,4,'Sườn sụn','Giòn, béo nhẹ.',139000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(40,4,'Heo cuộn nấm','Cuộn sẵn, dễ ăn.',129000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(41,5,'Cừu Úc thái mỏng','Mùi thơm đặc trưng.',159000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(42,5,'Sườn cừu','Thịt dày, ngọt.',199000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(43,5,'Cừu cuộn nấm','Cuộn sẵn, thơm.',179000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(44,5,'Gù cừu','Béo nhẹ, thơm mùi cừu.',189000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(45,5,'Cừu non (Baby Lamb)','Mềm, ít mùi.',209000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(46,5,'Sườn cừu Premium','Dày thịt, ngọt.',239000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(47,6,'Tôm sú','Tươi, chắc thịt.',149000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(48,6,'Mực ống','Giòn, ngọt.',139000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(49,6,'Nghêu','Ngọt nước.',99000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(50,6,'Bạch tuộc','Giòn, ngọt.',149000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(51,6,'Sò điệp','Ngọt, mềm.',179000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(52,6,'Hàu sữa','Béo, ngọt.',189000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(53,6,'Cá hồi phi lê','Béo, thơm.',199000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(54,6,'Thanh cua','Dễ ăn, hợp lẩu chua.',99000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(55,6,'Tôm càng xanh','Thịt chắc.',199000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(56,6,'Mực trứng','Béo, giòn.',169000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(57,6,'Bạch tuộc baby','Nhỏ, giòn.',139000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(58,7,'Bò viên','Dai ngon.',59000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(59,7,'Cá viên','Thơm cá.',49000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(60,7,'Tôm viên','Giòn ngọt.',59000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(61,7,'Há cảo tôm','Nhân tôm, mềm.',69000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(62,7,'Đậu hũ phô mai','Béo thơm.',59000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(63,7,'Bò viên phô mai','Nhân phô mai, béo.',69000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(64,7,'Viên mực','Thơm mùi mực.',59000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(65,7,'Viên cá hồi','Béo, thơm.',69000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(66,7,'Chả cá thác lác','Dai, thơm.',69000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(67,7,'Hoành thánh tôm','Vỏ mỏng, nhân đầy.',79000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(68,7,'Há cảo sò điệp','Ngọt, mềm.',89000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(69,7,'Trứng cút','Bùi, dễ ăn.',39000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(70,7,'Đậu hũ ky cuộn','Thơm đậu, giòn nhẹ.',49000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(71,8,'Nấm kim châm','Giòn, ngọt.',39000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(72,8,'Nấm bào ngư','Mềm, thơm.',49000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(73,8,'Cải thảo','Ngọt nước.',29000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(74,8,'Rau muống','Giòn.',29000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(75,8,'Bắp ngọt','Ngọt.',29000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(76,8,'Khoai môn','Bùi.',39000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(77,8,'Nấm đông cô','Thơm, mềm.',49000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(78,8,'Nấm mỡ','Mềm, dễ ăn.',49000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(79,8,'Rau tần ô','Thơm, hợp lẩu.',39000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(80,8,'Cải xanh','Giòn, ngọt.',29000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(81,8,'Bông cải xanh','Giòn, nhiều chất xơ.',39000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(82,8,'Bí đỏ','Bùi, ngọt.',39000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(83,8,'Đậu bắp','Giòn, nhớt nhẹ.',39000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(84,8,'Măng tươi','Giòn, thơm.',39000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(85,8,'Đậu hũ non','Mềm, béo nhẹ.',39000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(86,8,'Đậu hũ chiên','Béo, thơm.',39000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(87,8,'Khoai lang','Bùi, ngọt.',39000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(88,9,'Mì tươi','Mềm dai.',29000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(89,9,'Udon','Dày, dai.',39000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(90,9,'Miến','Nhẹ, dễ ăn.',29000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(91,9,'Bún tươi','Truyền thống.',29000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(92,9,'Bánh phở','Mềm, dễ ăn.',29000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(93,9,'Miến dong','Dai, thơm.',29000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(94,9,'Bánh đa','Giòn dai.',29000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(95,9,'Khoai tây lát','Bùi, giòn nhẹ.',39000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(96,9,'Bánh quẩy','Giòn, thấm nước lẩu.',29000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(97,10,'Trà đá','',5000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(98,10,'Nước suối','',15000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(99,10,'Coca','Lon 330ml.',19000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(100,10,'Sprite','Lon 330ml.',19000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(101,10,'Fanta','Lon 330ml.',19000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(102,10,'Trà chanh','Chua nhẹ, thơm.',29000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(103,10,'Trà đào','Thơm đào, mát.',39000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(104,10,'Soda chanh','Có ga, mát.',35000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(105,10,'Nước mơ','Chua ngọt, dễ uống.',39000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(106,10,'Sữa đậu nành','Béo nhẹ.',29000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(107,10,'Yakult','Chua ngọt nhẹ.',29000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(108,11,'Chè khúc bạch','Mát, nhẹ.',39000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(109,11,'Kem ly','',29000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(110,11,'Pudding trứng','Mềm, béo.',39000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(111,11,'Sương sáo','Mát, nhẹ.',29000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(112,11,'Chè hạt sen','Thanh, bùi.',39000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(113,11,'Trái cây theo mùa','Tươi, mát.',49000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(114,11,'Mochi','Dẻo, ngọt.',39000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(115,12,'Sa tế','',15000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(116,12,'Nước chấm hải sản','',15000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(117,12,'Nước tương','',10000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(118,12,'Dầu hào','',10000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(119,12,'Dầu mè','',10000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(120,12,'Dấm đen','',10000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(121,12,'Tỏi băm','',10000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(122,12,'Hành phi','',10000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(123,12,'Ớt tươi','',10000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(124,2,'Combo 1 người - Solo','1 nước lẩu + 2 món thịt + 1 rau + 1 tinh bột + 1 nước.',299000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(125,2,'Combo 2 người - Signature','2 nước lẩu + 4 món thịt + 2 rau + 2 tinh bột + 2 nước.',599000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(126,2,'Combo 4 người - Family','2 nước lẩu + 8 món thịt + 4 rau + 4 tinh bột + 4 nước.',1199000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(127,2,'Combo 2 người - Premium Wagyu','2 nước lẩu + Wagyu/Prime + hải sản + rau + tinh bột + 2 nước.',899000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(128,2,'Combo 2 người - Seafood Lover','2 nước lẩu + 6 hải sản + rau + tinh bột + 2 nước.',799000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(129,2,'Combo 2 người - Veggie Light','2 nước lẩu + 8 rau/nấm + tinh bột + 2 nước.',549000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(130,2,'Combo Trẻ em - Kids','1 nước lẩu + 3 món dễ ăn + tinh bột + 1 nước.',329000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58'),(131,2,'Combo Tiệc 6 người - Party','2 nước lẩu + 12 món (thịt/hải sản/viên) + 6 rau + 6 tinh bột + 6 nước.',1799000.00,NULL,1,0,NULL,'2026-02-05 11:40:58','2026-02-05 11:40:58');
/*!40000 ALTER TABLE `menu_items` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `menu_option_groups`
--

LOCK TABLES `menu_option_groups` WRITE;
/*!40000 ALTER TABLE `menu_option_groups` DISABLE KEYS */;
/*!40000 ALTER TABLE `menu_option_groups` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `menu_options`
--

LOCK TABLES `menu_options` WRITE;
/*!40000 ALTER TABLE `menu_options` DISABLE KEYS */;
/*!40000 ALTER TABLE `menu_options` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `order_items`
--

LOCK TABLES `order_items` WRITE;
/*!40000 ALTER TABLE `order_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `order_items` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `order_status_history`
--

LOCK TABLES `order_status_history` WRITE;
/*!40000 ALTER TABLE `order_status_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `order_status_history` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `orders`
--

LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `otp_requests`
--

LOCK TABLES `otp_requests` WRITE;
/*!40000 ALTER TABLE `otp_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `otp_requests` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `payments`
--

LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `restaurant_tables`
--

LOCK TABLES `restaurant_tables` WRITE;
/*!40000 ALTER TABLE `restaurant_tables` DISABLE KEYS */;
INSERT INTO `restaurant_tables` VALUES (4,1,'A01','Zone A',4,'AVAILABLE','8a4c23f9-0287-11f1-9853-02505e5048d3','2026-02-05 11:40:58','2026-02-05 11:40:58'),(5,1,'A02','Zone A',4,'AVAILABLE','8a4c259e-0287-11f1-9853-02505e5048d3','2026-02-05 11:40:58','2026-02-05 11:40:58'),(6,1,'B01','Zone B',6,'AVAILABLE','8a4c2648-0287-11f1-9853-02505e5048d3','2026-02-05 11:40:58','2026-02-05 11:40:58');
/*!40000 ALTER TABLE `restaurant_tables` ENABLE KEYS */;
UNLOCK TABLES;

--
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
-- Dumping data for table `schema_migrations`
--

LOCK TABLES `schema_migrations` WRITE;
/*!40000 ALTER TABLE `schema_migrations` DISABLE KEYS */;
INSERT INTO `schema_migrations` VALUES (1,'001_p0_order_totals_triggers.sql','2026-02-05 11:40:59'),(2,'002_p0_reservation_status_expand.sql','2026-02-05 11:40:59'),(3,'003_p0_menu_combo_meat_tables.sql','2026-02-05 11:40:59'),(4,'004_p2_branches_pricing_stock_search.sql','2026-02-05 11:40:59');
/*!40000 ALTER TABLE `schema_migrations` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `search_synonyms`
--

LOCK TABLES `search_synonyms` WRITE;
/*!40000 ALTER TABLE `search_synonyms` DISABLE KEYS */;
/*!40000 ALTER TABLE `search_synonyms` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `special_offer_rules`
--

LOCK TABLES `special_offer_rules` WRITE;
/*!40000 ALTER TABLE `special_offer_rules` DISABLE KEYS */;
/*!40000 ALTER TABLE `special_offer_rules` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `special_offers`
--

LOCK TABLES `special_offers` WRITE;
/*!40000 ALTER TABLE `special_offers` DISABLE KEYS */;
/*!40000 ALTER TABLE `special_offers` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `stock_holds`
--

LOCK TABLES `stock_holds` WRITE;
/*!40000 ALTER TABLE `stock_holds` DISABLE KEYS */;
/*!40000 ALTER TABLE `stock_holds` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `table_reservations`
--

LOCK TABLES `table_reservations` WRITE;
/*!40000 ALTER TABLE `table_reservations` DISABLE KEYS */;
/*!40000 ALTER TABLE `table_reservations` ENABLE KEYS */;
UNLOCK TABLES;

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
  `opened_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `closed_at` datetime DEFAULT NULL,
  `opened_by_client_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`session_id`),
  UNIQUE KEY `uq_session_key` (`session_key`),
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
-- Dumping data for table `table_sessions`
--

LOCK TABLES `table_sessions` WRITE;
/*!40000 ALTER TABLE `table_sessions` DISABLE KEYS */;
/*!40000 ALTER TABLE `table_sessions` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `vnpay_logs`
--

LOCK TABLES `vnpay_logs` WRITE;
/*!40000 ALTER TABLE `vnpay_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `vnpay_logs` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-02-05 18:44:18
