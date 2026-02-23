/* eslint-disable no-console */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";
import { runSqlText } from "./_sql-runner.js";

const MIGRATIONS_DIR = path.resolve(process.cwd(), "scripts/migrations");

function envPick(keys, fallback) {
  for (const k of keys) {
    const v = process.env[k];
    if (v !== undefined && v !== "") return v;
  }
  return fallback;
}

function required(name, v) {
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function getDbConfig() {
  // Prefer MYSQL_* (project standard), fallback to DB_* for backward compatibility.
  const host = envPick(["MYSQL_HOST", "DB_HOST"], "127.0.0.1");
  const port = Number(envPick(["MYSQL_PORT", "DB_PORT"], "3306"));
  const user = envPick(["MYSQL_USER", "DB_USER"], "root");
  const password = envPick(["MYSQL_PASSWORD", "DB_PASSWORD"], "");
  const database = envPick(["MYSQL_DATABASE", "DB_NAME"], "hadilao_online");

  return { host, port, user, password, database };
}

async function ensureMigrationsTable(conn) {
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      filename VARCHAR(255) NOT NULL,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_schema_migrations_filename (filename)
    )
  `);
}

async function readApplied(conn) {
  const [rows] = await conn.query("SELECT filename FROM schema_migrations");
  return new Set((rows ?? []).map((r) => r.filename));
}

async function applyMigration(conn, filename, sql) {
  console.log(`\n==> Applying: ${filename}`);
  await conn.beginTransaction();
  try {
    await runSqlText(conn, sql, { label: filename });
    await conn.query("INSERT INTO schema_migrations(filename) VALUES (?)", [filename]);
    await conn.commit();
    console.log(`✓ Done: ${filename}`);
  } catch (e) {
    await conn.rollback();
    console.error(`✗ Failed: ${filename}`);
    throw e;
  }
}

async function main() {
  const cfg = getDbConfig();

  const connection = await mysql.createConnection({
    host: required("MYSQL_HOST/DB_HOST", cfg.host),
    port: cfg.port,
    user: required("MYSQL_USER/DB_USER", cfg.user),
    password: cfg.password,
    database: required("MYSQL_DATABASE/DB_NAME", cfg.database),
    multipleStatements: false, // we split ourselves
  });

  try {
    await ensureMigrationsTable(connection);
    const applied = await readApplied(connection);

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const f of files) {
      if (applied.has(f)) {
        console.log(`Skipping (already applied): ${f}`);
        continue;
      }
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, f), "utf8");
      await applyMigration(connection, f, sql);
    }

    console.log("\n✅ All migrations applied.");
  } finally {
    await connection.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
