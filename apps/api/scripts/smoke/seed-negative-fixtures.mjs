import crypto from "node:crypto";
import fs from "node:fs";
import mysql from "mysql2/promise";
import "dotenv/config";

function die(msg, code = 1) {
  console.error(`❌ ${msg}`);
  process.exit(code);
}

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (e) {
    die(`Cannot read JSON: ${p} (${e?.message || e})`);
  }
}

function writeJson(p, value) {
  fs.writeFileSync(p, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function getEnvValue(envJson, key) {
  const values = Array.isArray(envJson?.values) ? envJson.values : [];
  const found = values.find((v) => v && v.key === key && v.enabled !== false);
  return (found?.value ?? "").toString();
}

function setEnvValue(envJson, key, value) {
  const values = Array.isArray(envJson?.values) ? envJson.values : [];
  const found = values.find((v) => v && v.key === key);
  if (found) {
    found.value = String(value);
    if (found.enabled === undefined) found.enabled = true;
    return;
  }
  values.push({
    key,
    value: String(value),
    type: "default",
    enabled: true,
  });
  envJson.values = values;
}

function envPick(keys, fallback = "") {
  for (const key of keys) {
    const value = process.env[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return String(value);
  }
  return fallback;
}

function makeOrderCode() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `NEGCB-${stamp}-${rand}`.slice(0, 30);
}

async function main() {
  const [sourceEnvPath, outputEnvPath = sourceEnvPath] = process.argv.slice(2);
  if (!sourceEnvPath) {
    die("Usage: node scripts/smoke/seed-negative-fixtures.mjs <source-env.json> [output-env.json]");
  }

  const envJson = readJson(sourceEnvPath);
  const branchOtherId = String(getEnvValue(envJson, "branchOtherId") || "999").trim() || "999";
  const outputPath = outputEnvPath || sourceEnvPath;

  const conn = await mysql.createConnection({
    host: envPick(["MYSQL_HOST", "DB_HOST"], "127.0.0.1"),
    port: Number(envPick(["MYSQL_PORT", "DB_PORT"], "3306")),
    user: envPick(["MYSQL_USER", "DB_USER"], "root"),
    password: envPick(["MYSQL_PASSWORD", "DB_PASSWORD"], ""),
    database: envPick(["MYSQL_DATABASE", "DB_NAME"], "hadilao_online"),
  });

  try {
    await conn.beginTransaction();

    await conn.query(
      `INSERT INTO branches
        (branch_id, branch_code, branch_name, address, phone, timezone, is_active, open_time, close_time)
       VALUES
        (?, ?, ?, 'Smoke Fixture Address', '0900000999', 'Asia/Ho_Chi_Minh', 1, '09:00:00', '22:00:00')
       ON DUPLICATE KEY UPDATE
        branch_code = VALUES(branch_code),
        branch_name = VALUES(branch_name),
        is_active = VALUES(is_active),
        open_time = VALUES(open_time),
        close_time = VALUES(close_time)`,
      [branchOtherId, `SMK${branchOtherId}`, `Smoke Branch ${branchOtherId}`],
    );

    const [itemRows] = await conn.query(
      `SELECT item_id, item_name, price
       FROM menu_items
       WHERE is_active = 1
       ORDER BY item_id ASC
       LIMIT 1`,
    );
    if (!Array.isArray(itemRows) || !itemRows[0]) {
      throw new Error("No active menu item available to seed negative fixture.");
    }

    await conn.query(`DELETE FROM orders WHERE order_code LIKE 'NEGCB-%'`);

    const item = itemRows[0];
    const orderCode = makeOrderCode();
    const itemId = String(item.item_id);
    const itemName = String(item.item_name);
    const unitPrice = Number(item.price ?? 0);
    const safeUnitPrice = Number.isFinite(unitPrice) && unitPrice >= 0 ? unitPrice : 0;
    const note = "Seeded cross-branch order fixture for negative smoke pack";

    const [orderResult] = await conn.query(
      `INSERT INTO orders
        (branch_id, order_code, order_channel, order_status, note,
         discount_percent_applied, subtotal_amount, discount_amount, delivery_fee, total_amount)
       VALUES
        (?, ?, 'DELIVERY', 'NEW', ?, 0, ?, 0, 0, ?)`,
      [branchOtherId, orderCode, note, safeUnitPrice, safeUnitPrice],
    );

    const orderId = String(orderResult.insertId);

    await conn.query(
      `INSERT INTO order_items
        (order_id, item_id, item_name, unit_price, quantity, item_options, line_total)
       VALUES
        (?, ?, ?, ?, 1, NULL, ?)`,
      [orderId, itemId, itemName, safeUnitPrice, safeUnitPrice],
    );

    await conn.query(
      `INSERT INTO order_status_history
        (order_id, from_status, to_status, changed_by_type, changed_by_id, note)
       VALUES
        (?, ?, 'NEW', 'SYSTEM', NULL, ?)`,
      [orderId, null, note],
    );

    await conn.commit();

    setEnvValue(envJson, "orderOther", orderCode);
    writeJson(outputPath, envJson);

    console.log("✅ Seeded negative smoke fixture:", {
      branchOtherId,
      orderCode,
      itemId,
      outputEnvPath: outputPath,
    });
  } catch (e) {
    try {
      await conn.rollback();
    } catch {
      // ignore rollback error
    }
    die(`Negative fixture seed failed: ${e?.message || e}`);
  } finally {
    await conn.end();
  }
}

main();
