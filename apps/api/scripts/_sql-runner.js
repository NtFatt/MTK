/* eslint-disable no-console */
// A small SQL runner that supports MySQL-style DELIMITER directives.
// Goal: safely execute .sql files that contain triggers/procedures without naive splitting.
// Works with mysql2/promise connections (single-statement execution).

import fs from "node:fs";
import path from "node:path";

function isNewline(ch) {
  return ch === "\n" || ch === "\r";
}

function stripBom(s) {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

/**
 * Split SQL script into statements using current delimiter.
 * Supports lines like: DELIMITER $$
 *
 * Notes:
 * - This is not a full SQL parser. It is designed for predictable migration scripts.
 * - It avoids splitting inside strings, identifiers, and comments.
 */
export function splitSqlStatements(scriptText) {
  const text = stripBom(String(scriptText ?? ""));
  const lines = text.split(/\r?\n/);

  let delimiter = ";";
  let acc = "";
  const out = [];

  // stateful scanning per chunk
  const flushChunk = (chunk, delim) => {
    // Scan chunk and split by delim while respecting quotes/comments
    const statements = [];
    let buf = "";

    let inSingle = false;
    let inDouble = false;
    let inBacktick = false;
    let inLineComment = false;
    let inBlockComment = false;

    const dlen = delim.length;

    for (let i = 0; i < chunk.length; i++) {
      const ch = chunk[i];
      const next = i + 1 < chunk.length ? chunk[i + 1] : "";

      // Handle line comments
      if (inLineComment) {
        buf += ch;
        if (isNewline(ch)) inLineComment = false;
        continue;
      }

      // Handle block comments
      if (inBlockComment) {
        buf += ch;
        if (ch === "*" && next === "/") {
          buf += next;
          i++;
          inBlockComment = false;
        }
        continue;
      }

      // Enter comments (only when not inside strings/identifiers)
      if (!inSingle && !inDouble && !inBacktick) {
        // "-- " or "--\t" starts a comment in MySQL
        if (ch === "-" && next === "-" && (chunk[i + 2] === " " || chunk[i + 2] === "\t" || isNewline(chunk[i + 2] ?? ""))) {
          buf += ch + next;
          i++;
          inLineComment = true;
          continue;
        }
        if (ch === "#") {
          buf += ch;
          inLineComment = true;
          continue;
        }
        if (ch === "/" && next === "*") {
          buf += ch + next;
          i++;
          inBlockComment = true;
          continue;
        }
      }

      // Toggle string/identifier states
      if (!inDouble && !inBacktick && ch === "'" && !inSingle) {
        inSingle = true;
        buf += ch;
        continue;
      }
      if (inSingle) {
        buf += ch;
        if (ch === "\\" && next) {
          buf += next;
          i++;
          continue;
        }
        if (ch === "'") inSingle = false;
        continue;
      }

      if (!inSingle && !inBacktick && ch === '"' && !inDouble) {
        inDouble = true;
        buf += ch;
        continue;
      }
      if (inDouble) {
        buf += ch;
        if (ch === "\\" && next) {
          buf += next;
          i++;
          continue;
        }
        if (ch === '"') inDouble = false;
        continue;
      }

      if (!inSingle && !inDouble && ch === "`" && !inBacktick) {
        inBacktick = true;
        buf += ch;
        continue;
      }
      if (inBacktick) {
        buf += ch;
        if (ch === "`") inBacktick = false;
        continue;
      }

      // If current position matches delimiter, split
      if (!inSingle && !inDouble && !inBacktick && delim && chunk.slice(i, i + dlen) === delim) {
        const stmt = buf.trim();
        if (stmt) statements.push(stmt);
        buf = "";
        i += dlen - 1;
        continue;
      }

      buf += ch;
    }

    const tail = buf.trim();
    if (tail) statements.push(tail);

    for (const s of statements) {
      // Filter out pure comments
      const trimmed = s.trim();
      if (!trimmed) continue;
      statements.length;
    }

    return statements;
  };

  for (const line of lines) {
    const m = line.match(/^\s*DELIMITER\s+(\S+)\s*$/i);
    if (m) {
      // flush any accumulated text with previous delimiter
      const stmts = flushChunk(acc, delimiter);
      for (const s of stmts) out.push(s);
      acc = "";
      delimiter = m[1];
      continue;
    }
    acc += line + "\n";
  }

  const stmts = flushChunk(acc, delimiter);
  for (const s of stmts) out.push(s);

  return out
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    // remove standalone delimiter resets accidentally captured
    .filter((s) => !/^DELIMITER\s+/i.test(s));
}

export async function runSqlText(conn, sqlText, opts = {}) {
  const { label = "<inline>" } = opts;
  const statements = splitSqlStatements(sqlText);
  for (const st of statements) {
    try {
      await conn.query(st);
    } catch (e) {
      console.error("\n❌ SQL failed in", label);
      console.error("--- Statement ---\n" + st + "\n--- End ---");
      throw e;
    }
  }
}

export async function runSqlFile(conn, filePath) {
  const abs = path.resolve(process.cwd(), filePath);
  const sql = fs.readFileSync(abs, "utf8");
  await runSqlText(conn, sql, { label: abs });
}
