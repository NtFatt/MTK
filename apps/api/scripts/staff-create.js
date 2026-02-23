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

const ALLOWED_ROLES = new Set(["BRANCH_MANAGER", "STAFF", "KITCHEN", "CASHIER"]);

function normalizeRole(roleRaw) {
  const r = String(roleRaw ?? "").trim().toUpperCase();
  if (!r) return "STAFF";
  if (r === "MANAGER") return "BRANCH_MANAGER";
  return r;
}

async function main() {
  const [username, password, roleArg = "STAFF", branchIdArg, fullName = null] = process.argv.slice(2);
  if (!username || !password || !branchIdArg) {
    console.log("Usage: pnpm staff:create <username> <password> [role] <branchId> [fullName]");
    console.log("  role: BRANCH_MANAGER | STAFF | KITCHEN | CASHIER (legacy MANAGER -> BRANCH_MANAGER)");
    process.exit(1);
  }

  const role = normalizeRole(roleArg);
  if (!ALLOWED_ROLES.has(role)) {
    console.error("❌ Invalid role:", role);
    console.error("Allowed:", Array.from(ALLOWED_ROLES).join(", "));
    process.exit(1);
  }

  const branchId = String(branchIdArg).trim();
  if (!branchId) {
    console.error("❌ branchId is required");
    process.exit(1);
  }

  const cfg = {
    host: process.env.MYSQL_HOST ?? "127.0.0.1",
    port: Number(process.env.MYSQL_PORT ?? 3306),
    user: process.env.MYSQL_USER ?? "root",
    password: process.env.MYSQL_PASSWORD ?? "",
    database: process.env.MYSQL_DATABASE ?? "hadilao_online",
  };

  const conn = await mysql.createConnection({ ...cfg });
  const passHash = hashPassword(password);

  await conn.query(
    `INSERT INTO staff_users (username, password_hash, full_name, role, status, branch_id)
     VALUES (?, ?, ?, ?, 'ACTIVE', ?)
     ON DUPLICATE KEY UPDATE
       password_hash = VALUES(password_hash),
       full_name = VALUES(full_name),
       role = VALUES(role),
       branch_id = VALUES(branch_id),
       status = 'ACTIVE',
       updated_at = CURRENT_TIMESTAMP`,
    [username, passHash, fullName, role, branchId],
  );

  await conn.end();
  console.log("✅ Staff user upserted:", { username, role, branchId, fullName });
}

main().catch((e) => {
  console.error("❌ staff:create failed", e);
  process.exit(1);
});
