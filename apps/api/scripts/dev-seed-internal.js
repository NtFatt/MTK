import "dotenv/config";
import mysql from "mysql2/promise";
import crypto from "node:crypto";

function b64u(buf) {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function hashPassword(plain) {
  const N = 2 ** 14;
  const r = 8;
  const p = 1;
  const KEYLEN = 64;
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(plain, salt, KEYLEN, { N, r, p });
  return `scrypt$${N}$${r}$${p}$${b64u(salt)}$${b64u(Buffer.from(key))}`;
}

async function main() {
  const cfg = {
    host: process.env.MYSQL_HOST ?? "127.0.0.1",
    port: Number(process.env.MYSQL_PORT ?? 3306),
    user: process.env.MYSQL_USER ?? "root",
    password: process.env.MYSQL_PASSWORD ?? "",
    database: process.env.MYSQL_DATABASE ?? "hadilao_online",
  };

  const conn = await mysql.createConnection({ ...cfg });

  // Ensure at least one branch exists for dev.
  await conn.query(
    `INSERT INTO branches (branch_code, branch_name, address, phone, timezone, is_active)
     VALUES ('B001', 'Branch 01', 'Dev Address', '0000000000', 'Asia/Ho_Chi_Minh', 1)
     ON DUPLICATE KEY UPDATE branch_name = VALUES(branch_name), is_active = 1, updated_at = CURRENT_TIMESTAMP`,
  );

  const [branchRows] = await conn.query(`SELECT branch_id FROM branches ORDER BY branch_id ASC LIMIT 1`);
  const branchId = String(branchRows?.[0]?.branch_id ?? "1");

  // Admin
  await conn.query(
    `INSERT INTO admin_users (username, password_hash, full_name, role, status)
     VALUES (?, ?, ?, 'ADMIN', 'ACTIVE')
     ON DUPLICATE KEY UPDATE
       password_hash = VALUES(password_hash),
       full_name = VALUES(full_name),
       status = 'ACTIVE',
       updated_at = CURRENT_TIMESTAMP`,
    ["admin", hashPassword("admin123"), "System Admin"],
  );

  // Staff set (branch-scoped)
  const staff = [
    ["bm01", "123456", "Branch Manager 01", "BRANCH_MANAGER"],
    ["staff01", "123456", "Staff 01", "STAFF"],
    ["kitchen01", "123456", "Kitchen 01", "KITCHEN"],
    ["cashier01", "123456", "Cashier 01", "CASHIER"],
  ];

  for (const [username, pass, fullName, role] of staff) {
    await conn.query(
      `INSERT INTO staff_users (username, password_hash, full_name, role, status, branch_id)
       VALUES (?, ?, ?, ?, 'ACTIVE', ?)
       ON DUPLICATE KEY UPDATE
         password_hash = VALUES(password_hash),
         full_name = VALUES(full_name),
         role = VALUES(role),
         status = 'ACTIVE',
         branch_id = VALUES(branch_id),
         updated_at = CURRENT_TIMESTAMP`,
      [username, hashPassword(pass), fullName, role, branchId],
    );
  }

  await conn.end();
  console.log("✅ dev-seed-internal done", { branchId });
}

main().catch((e) => {
  console.error("❌ dev-seed-internal failed", e);
  process.exit(1);
});
