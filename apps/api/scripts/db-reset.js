/* eslint-disable no-console */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";
import { runSqlFile, runSqlText } from "./_sql-runner.js";

function envPick(keys, fallback) {
  for (const k of keys) {
    const v = process.env[k];
    if (v !== undefined && v !== "") return v;
  }
  return fallback;
}

function getDbConfig() {
  const host = envPick(["MYSQL_HOST", "DB_HOST"], "127.0.0.1");
  const port = Number(envPick(["MYSQL_PORT", "DB_PORT"], "3306"));
  const user = envPick(["MYSQL_USER", "DB_USER"], "root");
  const password = envPick(["MYSQL_PASSWORD", "DB_PASSWORD"], "");
  const database = envPick(["MYSQL_DATABASE", "DB_NAME"], "hadilao_online");
  return { host, port, user, password, database };
}

function parseArgs(argv) {
  const out = {
    yes: false,
    skipSeed: false,
    skipMigrate: false,
    restock: true,
    restockQty: 100,
  };

  for (const a of argv) {
    if (a === "--yes" || a === "-y") out.yes = true;
    if (a === "--skip-seed") out.skipSeed = true;
    if (a === "--skip-migrate") out.skipMigrate = true;
    if (a === "--no-restock") out.restock = false;
    if (a === "--restock") out.restock = true;
    if (a.startsWith("--restock-qty=")) {
      const v = Number(a.split("=")[1]);
      if (Number.isFinite(v) && Number.isInteger(v) && v >= 0)
        out.restockQty = v;
    }
  }

  // env overrides (useful for CI)
  const envRestock = String(process.env.DB_RESET_RESTOCK ?? "").trim();
  if (envRestock !== "") {
    out.restock =
      envRestock.toLowerCase() !== "false" &&
      envRestock !== "0" &&
      envRestock.toLowerCase() !== "no";
  }
  const envQty = process.env.DB_RESET_RESTOCK_QTY;
  if (envQty !== undefined && envQty !== null && String(envQty).trim() !== "") {
    const v = Number(String(envQty));
    if (Number.isFinite(v) && Number.isInteger(v) && v >= 0) out.restockQty = v;
  }

  return out;
}

async function restockDemo(conn, { branchId, qty }) {
  let branchIds = [];

  if (branchId) {
    branchIds = [String(branchId)];
  } else {
    const [bRows] = await conn.query(
      `SELECT branch_id AS id FROM branches ORDER BY branch_id ASC`,
    );
    branchIds = (bRows ?? []).map((r) => String(r.id));
  }

  if (!branchIds.length) {
    console.log("\nℹ️  No branches found; skip restock.");
    return null;
  }

  console.log(`
📦 Restocking demo stock (DEV): branches=${branchIds.join(",")}, qty=${qty}`);

  let upserted = 0;
  for (const bid of branchIds) {
    const [s1] = await conn.query(
      `INSERT INTO menu_item_stock (branch_id, item_id, quantity, last_restock_at)
       SELECT ?, mi.item_id, ?, NOW()
       FROM menu_items mi
       WHERE mi.is_active = 1
       ON DUPLICATE KEY UPDATE quantity = VALUES(quantity), last_restock_at = VALUES(last_restock_at)`,
      [bid, qty],
    );
    upserted += Number(s1?.affectedRows ?? 0);
  }

  // Keep legacy column in sync for demos (single value used by some queries)
  const [s2] = await conn.query(
    `UPDATE menu_items SET stock_qty = ? WHERE item_id IS NOT NULL AND is_active = 1`,
    [qty],
  );

  return {
    branchIds,
    qty,
    upsertedStockRows: upserted,
    syncedMenuItemsStockQty: Number(s2?.affectedRows ?? 0),
  };
}

function isConfirmed(args) {
  if (args.yes) return true;
  const env = String(
    process.env.DB_RESET_CONFIRM ?? process.env.MYSQL_RESET_CONFIRM ?? "",
  )
    .trim()
    .toUpperCase();
  return env === "YES" || env === "Y" || env === "TRUE" || env === "1";
}

async function ensureDb(adminConn, dbName) {
  await adminConn.query(
    `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;`,
  );
}

async function dropDb(adminConn, dbName) {
  await adminConn.query(`DROP DATABASE IF EXISTS \`${dbName}\`;`);
}

async function main() {
  const cfg = getDbConfig();
  const args = parseArgs(process.argv.slice(2));

  console.log("\n⚠️  db:reset is DESTRUCTIVE");
  console.log("    Target DB:", cfg.database);
  console.log("    Host:", `${cfg.host}:${cfg.port}`);

  if (!isConfirmed(args)) {
    console.log("\n❌ Refusing to reset without confirmation.");
    console.log("   Run with: pnpm db:reset --yes");
    console.log("   Or set env: DB_RESET_CONFIRM=YES");
    process.exit(2);
  }

  const adminConn = await mysql.createConnection({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    multipleStatements: false,
  });

  console.log("\n🧨 Dropping database...");
  await dropDb(adminConn, cfg.database);
  console.log("✅ Dropped.");

  console.log("\n🧱 Creating database...");
  await ensureDb(adminConn, cfg.database);
  console.log("✅ Created.");

  await adminConn.end();

  const conn = await mysql.createConnection({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
    multipleStatements: false,
  });

  try {
    console.log("\n📄 Applying canonical FULL schema: scripts/full_schema.sql");
    const schemaPath = path.join(process.cwd(), "scripts", "full_schema.sql");
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Missing canonical schema file: ${schemaPath}`);
    }
    await runSqlFile(conn, "scripts/full_schema.sql");
    console.log("✅ Schema applied.");

    if (!args.skipSeed) {
      const seedPath = path.join(process.cwd(), "scripts", "seed.sql");
      if (fs.existsSync(seedPath)) {
        console.log("\n🌱 Seeding: scripts/seed.sql");
        const seedSql = fs.readFileSync(seedPath, "utf8");
        await runSqlText(conn, seedSql, { label: "seed.sql" });
        console.log("✅ Seed done.");
      } else {
        console.log("\nℹ️  scripts/seed.sql not found. Skip seed.");
      }
    } else {
      console.log("\nℹ️  Skip seed (--skip-seed)");
    }

    if (!args.skipMigrate) {
      console.log("\n🧩 Running migrations (scripts/migrations/*.sql)");
      // Reuse the same migration logic as db-migrate but inline for reliability.
      await conn.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
          filename VARCHAR(255) NOT NULL,
          applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY uq_schema_migrations_filename (filename)
        )
      `);

      const [rows] = await conn.query("SELECT filename FROM schema_migrations");
      const applied = new Set((rows ?? []).map((r) => r.filename));

      const migDir = path.join(process.cwd(), "scripts", "migrations");
      const files = fs.existsSync(migDir)
        ? fs
            .readdirSync(migDir)
            .filter((f) => f.endsWith(".sql"))
            .sort()
        : [];

      for (const f of files) {
        if (applied.has(f)) {
          console.log(`Skipping (already applied): ${f}`);
          continue;
        }
        console.log(`\n==> Applying: ${f}`);
        const sql = fs.readFileSync(path.join(migDir, f), "utf8");
        await conn.beginTransaction();
        try {
          await runSqlText(conn, sql, { label: f });
          await conn.query(
            "INSERT INTO schema_migrations(filename) VALUES (?)",
            [f],
          );
          await conn.commit();
          console.log(`✓ Done: ${f}`);
        } catch (e) {
          await conn.rollback();
          console.error(`✗ Failed: ${f}`);
          throw e;
        }
      }

      console.log("\n✅ Migrations applied.");
    } else {
      console.log("\nℹ️  Skip migrate (--skip-migrate)");
    }

    if (args.restock) {
      const r = await restockDemo(conn, {
        branchId: null,
        qty: args.restockQty,
      });
      if (r) console.log("✅ Demo restock done:", r);
    } else {
      console.log(
        "\nℹ️  Demo restock skipped (--no-restock or DB_RESET_RESTOCK=false)",
      );
    }

    console.log("\n🎉 db:reset completed.");
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error("\n❌ db:reset failed", e);
  process.exit(1);
});
