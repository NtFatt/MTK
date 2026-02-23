/* eslint-disable no-console */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";
import { splitSqlStatements } from "./_sql-runner.js";

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
    canonical: "scripts/full_schema.sql",
    json: false,
    verbose: false,
  };

  for (const a of argv) {
    if (a === "--json") out.json = true;
    if (a === "--verbose") out.verbose = true;
    if (a.startsWith("--canonical=")) out.canonical = a.split("=")[1];
  }
  return out;
}

function normalizeDDL(ddl) {
  let s = String(ddl ?? "");

  // Strip identifier quoting to reduce formatting-only diffs.
  s = s.replace(/`/g, "");

  // Strip charset introducers in string literals (MySQL may emit _utf8mb4'OPEN').
  s = s.replace(/_(utf8mb4|utf8|latin1|binary)'/gi, "'");

  // Collapse redundant parentheses like ((...)) that MySQL may emit around
  // generated column expressions and CHECK constraints. Semantically identical.
  for (let i = 0; i < 6; i++) {
    const before = s;
    s = s.replace(/\(\s*\(/g, "(").replace(/\)\s*\)/g, ")");
    if (s === before) break;
  }

  // MySQL may emit CREATE TABLE without IF NOT EXISTS.
  s = s.replace(/create\s+table\s+if\s+not\s+exists/gi, "CREATE TABLE");

  // Strip versioned comments emitted by SHOW CREATE TABLE for some index types.
  // Example: /*!50100 WITH PARSER `ngram` */
  s = s.replace(/\/\*!\d+\s+[\s\S]*?\*\//g, "");

  // Ignore table-level AUTO_INCREMENT counter (changes after seeding).
  s = s.replace(/\s+AUTO_INCREMENT=\d+/gi, "");

  // Normalize integer display widths: int(11) -> int, bigint(20) -> bigint, etc.
  s = s.replace(/\b(tinyint|smallint|mediumint|int|integer|bigint)\s*\(\s*\d+\s*\)/gi, "$1");

  // DEFAULT NULL is often implicit for nullable columns; ignore it.
  s = s.replace(/\s+default\s+null/gi, "");

  // USING BTREE is default; ignore it.
  s = s.replace(/\s+using\s+btree/gi, "");

  // Canonicalize definition ordering inside CREATE TABLE so diff is not sensitive
  // to KEY / CONSTRAINT ordering emitted by MySQL.
  s = canonicalizeCreateTableBody(s);

  // Collapse whitespace and lowercase.
  s = s.replace(/\s+/g, " ");
  s = s.trim().toLowerCase();
  return s;
}

function canonicalizeCreateTableBody(ddl) {
  const src = String(ddl ?? "");
  const lower = src.toLowerCase();
  const ct = lower.indexOf("create table");
  if (ct < 0) return src;

  const open = src.indexOf("(", ct);
  if (open < 0) return src;

  // Find matching ')' for the table definition.
  let depth = 0;
  let close = -1;
  for (let i = open; i < src.length; i++) {
    const ch = src[i];
    if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth === 0) {
        close = i;
        break;
      }
    }
  }
  if (close < 0) return src;

  const head = src.slice(0, open + 1);
  const body = src.slice(open + 1, close);
  const tail = src.slice(close);

  const parts = splitTopLevelComma(body);
  const columns = [];
  const defs = [];

  for (const p of parts) {
    const t = p.trim();
    if (!t) continue;
    const tl = t.toLowerCase();

    const isDef =
      tl.startsWith("primary key") ||
      tl.startsWith("unique key") ||
      tl.startsWith("key ") ||
      tl.startsWith("fulltext key") ||
      tl.startsWith("constraint ");

    if (isDef) defs.push(t.replace(/\s+/g, " ").trim());
    else columns.push(t.replace(/\s+/g, " ").trim());
  }

  // Keep column order stable (semantic), but sort keys/constraints so ordering diffs
  // from SHOW CREATE TABLE don't cause false drift.
  defs.sort((a, b) => a.localeCompare(b));

  const newBody = [...columns, ...defs].join(", ");
  return head + newBody + tail;
}

function splitTopLevelComma(s) {
  const out = [];
  let buf = "";
  let depth = 0;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "(") {
      depth++;
      buf += ch;
      continue;
    }
    if (ch === ")") {
      depth = Math.max(0, depth - 1);
      buf += ch;
      continue;
    }
    if (ch === "," && depth === 0) {
      out.push(buf);
      buf = "";
      continue;
    }
    buf += ch;
  }
  if (buf.trim()) out.push(buf);
  return out;
}


function extractCanonicalTables(sqlText) {
  const stmts = splitSqlStatements(sqlText);
  const map = new Map();
  for (const st of stmts) {
    const m = st.match(/create\s+table\s+`?([a-z0-9_]+)`?/i);
    if (!m) continue;
    const table = m[1];
    map.set(table, st.trim());
  }
  return map;
}

async function showCreate(conn, table) {
  const [rows] = await conn.query(`SHOW CREATE TABLE \`${table}\``);
  const r = rows?.[0];
  // mysql2 returns { 'Table': 'x', 'Create Table': '...' }
  const key = Object.keys(r).find((k) => k.toLowerCase().includes("create table"));
  return key ? r[key] : null;
}

async function main() {
  const cfg = getDbConfig();
  const args = parseArgs(process.argv.slice(2));

  const canonicalPath = path.resolve(process.cwd(), args.canonical);
  if (!fs.existsSync(canonicalPath)) {
    console.error("❌ Missing canonical file:", canonicalPath);
    process.exit(1);
  }

  const canonicalSql = fs.readFileSync(canonicalPath, "utf8");
  const canonical = extractCanonicalTables(canonicalSql);

  const conn = await mysql.createConnection({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
    multipleStatements: false,
  });

  try {
    const [dbRows] = await conn.query(
      `SELECT table_name AS tableName
       FROM information_schema.tables
       WHERE table_schema = ? AND table_type = 'BASE TABLE'`,
      [cfg.database]
    );

    const dbTables = new Set((dbRows ?? []).map((r) => r.tableName));

    const canonicalTables = new Set([...canonical.keys()]);

    const missing = [...canonicalTables].filter((t) => !dbTables.has(t));
    const extra = [...dbTables].filter((t) => !canonicalTables.has(t) && t !== "schema_migrations");

    const mismatched = [];
    for (const t of canonicalTables) {
      if (!dbTables.has(t)) continue;
      const ddlDb = await showCreate(conn, t);
      const ddlCan = canonical.get(t);
      if (!ddlDb || !ddlCan) continue;

      const a = normalizeDDL(ddlDb);
      const b = normalizeDDL(ddlCan);
      if (a !== b) {
        mismatched.push({
          table: t,
          different: true,
          db: args.verbose ? ddlDb : undefined,
          canonical: args.verbose ? ddlCan : undefined,
        });
      }
    }

    const result = {
      database: cfg.database,
      canonicalFile: args.canonical,
      summary: {
        missingCount: missing.length,
        extraCount: extra.length,
        mismatchedCount: mismatched.length,
      },
      missing,
      extra,
      mismatched: mismatched.map((x) => ({ table: x.table })),
    };

    if (args.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log("\n🧪 DB DIFF against canonical:", args.canonical);
      console.log("DB:", `${cfg.host}:${cfg.port}/${cfg.database}`);

      if (missing.length) {
        console.log("\n❌ Missing tables:");
        for (const t of missing) console.log("  -", t);
      }

      if (extra.length) {
        console.log("\n⚠️  Extra tables (not in canonical):");
        for (const t of extra) console.log("  -", t);
      }

      if (mismatched.length) {
        console.log("\n⚠️  DDL drift tables:");
        for (const x of mismatched) console.log("  -", x.table);
        if (args.verbose) {
          console.log("\n(Verbose) Use --verbose to print full DDL per table.");
        } else {
          console.log("Tip: run again with --verbose to see full CREATE TABLE diff text.");
        }
      }

      if (!missing.length && !extra.length && !mismatched.length) {
        console.log("\n✅ No drift. DB matches canonical.");
      }
    }

    if (missing.length || extra.length || mismatched.length) {
      process.exit(2);
    }
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error("\n❌ db:diff failed", e);
  process.exit(1);
});
