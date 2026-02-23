import "dotenv/config";
import mysql from "mysql2/promise";
import fs from "node:fs";
import path from "node:path";

function envPick(keys, fallback) {
  for (const k of keys) {
    const v = process.env[k];
    if (v !== undefined && v !== "") return v;
  }
  return fallback;
}

const cfg = {
  host: envPick(["MYSQL_HOST", "DB_HOST"], "127.0.0.1"),
  port: Number(envPick(["MYSQL_PORT", "DB_PORT"], "3306")),
  user: envPick(["MYSQL_USER", "DB_USER"], "root"),
  password: envPick(["MYSQL_PASSWORD", "DB_PASSWORD"], ""),
  database: envPick(["MYSQL_DATABASE", "DB_NAME"], "hadilao_online"),
};

const REQUIRED_TABLES = [
  "admin_users",
  "staff_users",
  "audit_logs",
  "branches",
  "member_ranks",
  "clients",
  "client_addresses",
  "menu_categories",
  "menu_items",
  "menu_item_stock",
  "restaurant_tables",
  "table_sessions",
  "table_reservations",
  "carts",
  "cart_items",
  "orders",
  "order_items",
  "order_status_history",
  "payments",
  "vnpay_logs",
  "table_reservations",
];

function joinInParams(arr) {
  return arr.map(() => "?").join(",");
}

async function main() {
  console.log("⏳ DB init/check =>", {
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    database: cfg.database,
  });

  // 1) ensure DB exists
  const adminConn = await mysql.createConnection({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    multipleStatements: true,
  });

  await adminConn.query(
    `CREATE DATABASE IF NOT EXISTS \`${cfg.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;`
  );
  await adminConn.end();

  // 2) connect to DB
  const conn = await mysql.createConnection({
    ...cfg,
    multipleStatements: true,
  });

  // 2.1) print instance fingerprint
  const [[inst]] = await conn.query(
    `SELECT @@hostname AS host, @@port AS port, @@version AS version, @@datadir AS datadir, DATABASE() AS db;`
  );
  console.log("🧬 MySQL instance =>", inst);

  // 2.2) show tables currently visible (ALIAS to force lowercase key)
  const [allTables] = await conn.query(
    `SELECT table_name AS table_name
     FROM information_schema.tables
     WHERE table_schema = ?
     ORDER BY table_name;`,
    [cfg.database]
  );
  console.log("📦 Tables in DB:", allTables.map((x) => x.table_name));

  // 3) check schema exists (ALIAS to force lowercase key)
  const [tblRows] = await conn.query(
    `SELECT table_name AS table_name
     FROM information_schema.tables
     WHERE table_schema = ?
       AND table_name IN (${joinInParams(REQUIRED_TABLES)});`,
    [cfg.database, ...REQUIRED_TABLES]
  );

  const existing = new Set(tblRows.map((r) => r.table_name));
  const missing = REQUIRED_TABLES.filter((t) => !existing.has(t));

  if (missing.length) {
    console.log("❌ Missing tables:", missing.join(", "));
    console.log("👉 DB chưa đủ schema FULL. Hãy chạy FULL DATABASE SCRIPT (.sql) để tạo tables + triggers.");
    console.log("👉 Sau khi chạy xong, chạy lại: pnpm db:init");
    await conn.end();
    process.exit(0);
  }

  // 4) seed if needed
  const [[rankCount]] = await conn.query(`SELECT COUNT(*) AS c FROM member_ranks;`);
  if (Number(rankCount.c) === 0) {
    const seedPath = path.join(process.cwd(), "scripts", "seed.sql");
    console.log("📄 Using seed file:", seedPath);

    if (!fs.existsSync(seedPath)) {
      console.log("⚠️ scripts/seed.sql not found. Skip seeding.");
    } else {
      const seedSql = fs.readFileSync(seedPath, "utf8");
      await conn.query(seedSql);
      console.log("✅ Seeded basic data (FULL DB).");
    }
  } else {
    console.log("ℹ️ member_ranks already has data. Skip seed.");
  }

  await conn.end();
  console.log("✅ DB init/check done.");
}

main().catch((e) => {
  console.error("❌ DB init failed", e);
  process.exit(1);
});
