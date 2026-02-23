-- NOTE: This file is legacy/reference only. Use scripts/full_schema.sql as the canonical DDL.
-- Keeping this file for historical context; it is not used by db:reset/db:diff.

-- Hadilao Online (BE) - Minimal schema for current codebase
-- MySQL 8.0+

-- Note: DB is created by scripts/db-init.js using MYSQL_DATABASE.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS order_status_history;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS cart_items;
DROP TABLE IF EXISTS carts;
DROP TABLE IF EXISTS table_reservations;
DROP TABLE IF EXISTS table_sessions;
DROP TABLE IF EXISTS restaurant_tables;
DROP TABLE IF EXISTS menu_items;
DROP TABLE IF EXISTS clients;
DROP TABLE IF EXISTS member_ranks;

CREATE TABLE member_ranks (
  rank_id INT AUTO_INCREMENT PRIMARY KEY,
  rank_name VARCHAR(50) NOT NULL,
  discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE clients (
  client_id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  phone VARCHAR(30) NULL,
  rank_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (rank_id) REFERENCES member_ranks(rank_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE restaurant_tables (
  table_id INT AUTO_INCREMENT PRIMARY KEY,
  table_code VARCHAR(20) NOT NULL UNIQUE,
  table_status ENUM('AVAILABLE','OCCUPIED','RESERVED','OUT_OF_SERVICE') NOT NULL DEFAULT 'AVAILABLE',
  direction_id VARCHAR(50) NOT NULL,
  seats INT NOT NULL DEFAULT 4,
  area_name VARCHAR(80) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE table_sessions (
  session_id INT AUTO_INCREMENT PRIMARY KEY,
  session_key VARCHAR(64) NOT NULL UNIQUE DEFAULT (UUID()),
  table_id INT NOT NULL,
  status ENUM('OPEN','CLOSED') NOT NULL DEFAULT 'OPEN',
  opened_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP NULL,
  FOREIGN KEY (table_id) REFERENCES restaurant_tables(table_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE table_reservations (
  reservation_id INT AUTO_INCREMENT PRIMARY KEY,
  reservation_code VARCHAR(30) NOT NULL UNIQUE,
  table_id INT NOT NULL,
  table_code_snapshot VARCHAR(20) NOT NULL,
  area_name_snapshot VARCHAR(80) NOT NULL,
  party_size INT NOT NULL,
  contact_phone VARCHAR(30) NOT NULL,
  contact_name VARCHAR(120) NULL,
  note VARCHAR(255) NULL,
  status ENUM('PENDING','CONFIRMED','CANCELED','EXPIRED','CHECKED_IN','NO_SHOW','COMPLETED') NOT NULL DEFAULT 'PENDING',
  reserved_from DATETIME NOT NULL,
  reserved_to DATETIME NOT NULL,
  expires_at DATETIME NULL,
  confirmed_at DATETIME NULL,
  confirmed_by_admin_id VARCHAR(50) NULL,
  canceled_at DATETIME NULL,
  checked_in_at DATETIME NULL,
  session_id INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (table_id) REFERENCES restaurant_tables(table_id),
  FOREIGN KEY (session_id) REFERENCES table_sessions(session_id),
  INDEX idx_resv_table_time (table_id, reserved_from, reserved_to, status),
  INDEX idx_resv_phone (contact_phone),
  INDEX idx_resv_status (status),
  CHECK (reserved_to > reserved_from),
  CHECK (party_size > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE carts (
  cart_id INT AUTO_INCREMENT PRIMARY KEY,
  cart_key VARCHAR(64) NOT NULL UNIQUE DEFAULT (UUID()),
  session_id INT NULL,
  client_id INT NULL,
  order_channel ENUM('DINE_IN','DELIVERY') NOT NULL,
  cart_status ENUM('ACTIVE','CHECKED_OUT') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES table_sessions(session_id),
  FOREIGN KEY (client_id) REFERENCES clients(client_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE menu_items (
  item_id INT AUTO_INCREMENT PRIMARY KEY,
  item_name VARCHAR(160) NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE cart_items (
  cart_id INT NOT NULL,
  item_id INT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (cart_id, item_id),
  FOREIGN KEY (cart_id) REFERENCES carts(cart_id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES menu_items(item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE orders (
  order_id INT AUTO_INCREMENT PRIMARY KEY,
  order_code VARCHAR(40) NOT NULL UNIQUE,
  client_id INT NULL,
  session_id INT NULL,
  delivery_address_id INT NULL,
  order_channel ENUM('DINE_IN','DELIVERY') NOT NULL,
  order_status ENUM('NEW','RECEIVED','PREPARING','READY','SERVING','DELIVERING','COMPLETED','CANCELED','PAID') NOT NULL DEFAULT 'NEW',
  note TEXT NULL,
  rank_id_snapshot INT NULL,
  discount_percent_applied DECIMAL(5,2) NOT NULL DEFAULT 0,
  delivery_fee DECIMAL(12,2) NOT NULL DEFAULT 0,
  subtotal_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  accepted_at TIMESTAMP NULL,
  prepared_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  canceled_at TIMESTAMP NULL,
  paid_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(client_id),
  FOREIGN KEY (session_id) REFERENCES table_sessions(session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE order_items (
  order_item_id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  item_id INT NOT NULL,
  item_name VARCHAR(160) NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  quantity INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES menu_items(item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Keep order totals in sync
DROP TRIGGER IF EXISTS trg_order_items_ai;
DROP TRIGGER IF EXISTS trg_order_items_au;
DROP TRIGGER IF EXISTS trg_order_items_ad;

DELIMITER $$
CREATE TRIGGER trg_order_items_ai AFTER INSERT ON order_items
FOR EACH ROW
BEGIN
  UPDATE orders o
  SET
    o.subtotal_amount = (SELECT COALESCE(SUM(oi.unit_price * oi.quantity),0) FROM order_items oi WHERE oi.order_id = NEW.order_id),
    o.discount_amount = ROUND(((SELECT COALESCE(SUM(oi.unit_price * oi.quantity),0) FROM order_items oi WHERE oi.order_id = NEW.order_id) * o.discount_percent_applied) / 100, 2),
    o.total_amount = ROUND(
      (SELECT COALESCE(SUM(oi.unit_price * oi.quantity),0) FROM order_items oi WHERE oi.order_id = NEW.order_id)
      - ROUND(((SELECT COALESCE(SUM(oi.unit_price * oi.quantity),0) FROM order_items oi WHERE oi.order_id = NEW.order_id) * o.discount_percent_applied)/100,2)
      + o.delivery_fee, 2
    )
  WHERE o.order_id = NEW.order_id;
END$$

CREATE TRIGGER trg_order_items_au AFTER UPDATE ON order_items
FOR EACH ROW
BEGIN
  UPDATE orders o
  SET
    o.subtotal_amount = (SELECT COALESCE(SUM(oi.unit_price * oi.quantity),0) FROM order_items oi WHERE oi.order_id = NEW.order_id),
    o.discount_amount = ROUND(((SELECT COALESCE(SUM(oi.unit_price * oi.quantity),0) FROM order_items oi WHERE oi.order_id = NEW.order_id) * o.discount_percent_applied) / 100, 2),
    o.total_amount = ROUND(
      (SELECT COALESCE(SUM(oi.unit_price * oi.quantity),0) FROM order_items oi WHERE oi.order_id = NEW.order_id)
      - ROUND(((SELECT COALESCE(SUM(oi.unit_price * oi.quantity),0) FROM order_items oi WHERE oi.order_id = NEW.order_id) * o.discount_percent_applied)/100,2)
      + o.delivery_fee, 2
    )
  WHERE o.order_id = NEW.order_id;
END$$

CREATE TRIGGER trg_order_items_ad AFTER DELETE ON order_items
FOR EACH ROW
BEGIN
  UPDATE orders o
  SET
    o.subtotal_amount = (SELECT COALESCE(SUM(oi.unit_price * oi.quantity),0) FROM order_items oi WHERE oi.order_id = OLD.order_id),
    o.discount_amount = ROUND(((SELECT COALESCE(SUM(oi.unit_price * oi.quantity),0) FROM order_items oi WHERE oi.order_id = OLD.order_id) * o.discount_percent_applied) / 100, 2),
    o.total_amount = ROUND(
      (SELECT COALESCE(SUM(oi.unit_price * oi.quantity),0) FROM order_items oi WHERE oi.order_id = OLD.order_id)
      - ROUND(((SELECT COALESCE(SUM(oi.unit_price * oi.quantity),0) FROM order_items oi WHERE oi.order_id = OLD.order_id) * o.discount_percent_applied)/100,2)
      + o.delivery_fee, 2
    )
  WHERE o.order_id = OLD.order_id;
END$$
DELIMITER ;

CREATE TABLE payments (
  payment_id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  txn_ref VARCHAR(80) NOT NULL UNIQUE,
  status ENUM('INIT','REDIRECTED','SUCCESS','FAILED') NOT NULL DEFAULT 'INIT',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE order_status_history (
  history_id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  from_status VARCHAR(20) NULL,
  to_status VARCHAR(20) NOT NULL,
  changed_by_type ENUM('ADMIN','PAYMENT') NOT NULL,
  changed_by_id VARCHAR(50) NULL,
  note VARCHAR(255) NULL,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
