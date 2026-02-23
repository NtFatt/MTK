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
  const [username, password, fullName = null] = process.argv.slice(2);
  if (!username || !password) {
    console.log("Usage: pnpm admin:create <username> <password> [fullName]");
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

  // Hard policy: admin_users is ADMIN-only.
  await conn.query(
    `INSERT INTO admin_users (username, password_hash, full_name, role, status)
     VALUES (?, ?, ?, 'ADMIN', 'ACTIVE')
     ON DUPLICATE KEY UPDATE
       password_hash = VALUES(password_hash),
       full_name = VALUES(full_name),
       status = 'ACTIVE',
       updated_at = CURRENT_TIMESTAMP`,
    [username, passHash, fullName],
  );

  await conn.end();
  console.log("✅ Admin user upserted:", { username, role: "ADMIN", fullName });
}

main().catch((e) => {
  console.error("❌ admin:create failed", e);
  process.exit(1);
});
