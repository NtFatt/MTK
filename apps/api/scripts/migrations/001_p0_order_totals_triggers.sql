-- P0: Order totals are always consistent (line_total + order subtotal/discount/total)
-- Uses DELIMITER to allow stored program bodies.

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_recalculate_order_totals $$
CREATE PROCEDURE sp_recalculate_order_totals(IN p_order_id BIGINT UNSIGNED)
BEGIN
  DECLARE v_subtotal DECIMAL(12,2) DEFAULT 0.00;
  DECLARE v_disc_pct DECIMAL(5,2) DEFAULT 0.00;
  DECLARE v_delivery DECIMAL(12,2) DEFAULT 0.00;
  DECLARE v_discount DECIMAL(12,2) DEFAULT 0.00;

  SELECT IFNULL(SUM(line_total), 0.00)
    INTO v_subtotal
    FROM order_items
   WHERE order_id = p_order_id;

  SELECT discount_percent_applied, delivery_fee
    INTO v_disc_pct, v_delivery
    FROM orders
   WHERE order_id = p_order_id
   FOR UPDATE;

  SET v_discount = ROUND(v_subtotal * v_disc_pct / 100, 2);

  UPDATE orders
     SET subtotal_amount = v_subtotal,
         discount_amount = v_discount,
         total_amount = ROUND(v_subtotal - v_discount + v_delivery, 2)
   WHERE order_id = p_order_id;
END $$

DROP TRIGGER IF EXISTS trg_order_items_bi_line_total $$
CREATE TRIGGER trg_order_items_bi_line_total
BEFORE INSERT ON order_items
FOR EACH ROW
BEGIN
  SET NEW.line_total = ROUND(NEW.unit_price * NEW.quantity, 2);
END $$

DROP TRIGGER IF EXISTS trg_order_items_bu_line_total $$
CREATE TRIGGER trg_order_items_bu_line_total
BEFORE UPDATE ON order_items
FOR EACH ROW
BEGIN
  SET NEW.line_total = ROUND(NEW.unit_price * NEW.quantity, 2);
END $$

DROP TRIGGER IF EXISTS trg_order_items_ai_recalc $$
CREATE TRIGGER trg_order_items_ai_recalc
AFTER INSERT ON order_items
FOR EACH ROW
BEGIN
  CALL sp_recalculate_order_totals(NEW.order_id);
END $$

DROP TRIGGER IF EXISTS trg_order_items_au_recalc $$
CREATE TRIGGER trg_order_items_au_recalc
AFTER UPDATE ON order_items
FOR EACH ROW
BEGIN
  CALL sp_recalculate_order_totals(NEW.order_id);
END $$

DROP TRIGGER IF EXISTS trg_order_items_ad_recalc $$
CREATE TRIGGER trg_order_items_ad_recalc
AFTER DELETE ON order_items
FOR EACH ROW
BEGIN
  CALL sp_recalculate_order_totals(OLD.order_id);
END $$

DELIMITER ;

-- Backfill for existing rows (safe)
UPDATE order_items
   SET line_total = ROUND(unit_price * quantity, 2)
 WHERE line_total IS NULL OR line_total = 0;

UPDATE orders o
   SET subtotal_amount = (
         SELECT IFNULL(SUM(oi.line_total), 0.00)
           FROM order_items oi
          WHERE oi.order_id = o.order_id
       ),
       discount_amount = ROUND((
         SELECT IFNULL(SUM(oi.line_total), 0.00)
           FROM order_items oi
          WHERE oi.order_id = o.order_id
       ) * o.discount_percent_applied / 100, 2),
       total_amount = ROUND((
         SELECT IFNULL(SUM(oi.line_total), 0.00)
           FROM order_items oi
          WHERE oi.order_id = o.order_id
       ) - ROUND((
         SELECT IFNULL(SUM(oi.line_total), 0.00)
           FROM order_items oi
          WHERE oi.order_id = o.order_id
       ) * o.discount_percent_applied / 100, 2) + o.delivery_fee, 2);
