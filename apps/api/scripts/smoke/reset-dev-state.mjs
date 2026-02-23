import fs from "node:fs";
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

function getEnvValue(envJson, key) {
  const values = Array.isArray(envJson?.values) ? envJson.values : [];
  const found = values.find((v) => v && v.key === key && v.enabled !== false);
  return (found?.value ?? "").toString();
}

function truthy(v) {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "y";
}

function toIntOr(raw, fallback) {
  if (raw === undefined || raw === null || raw === "") return fallback;
  const n = Number(String(raw));
  if (!Number.isFinite(n) || !Number.isInteger(n)) return fallback;
  return n;
}


async function postJson(url, body, headers = {}) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body ?? {}),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const code = json?.code || res.status;
    throw new Error(`HTTP ${res.status} (${code}) ${JSON.stringify(json)}`);
  }
  return json;
}

const [envPath] = process.argv.slice(2);
if (!envPath) die("Usage: node scripts/smoke/reset-dev-state.mjs <env.json>");

const envJson = readJson(envPath);
const baseUrl = getEnvValue(envJson, "baseUrl").trim().replace(/\/+$/, "");
if (!baseUrl) die(`Postman env missing baseUrl: ${envPath}`);

const adminUsername = (getEnvValue(envJson, "adminUsername") || "admin").trim();
const adminPassword = (getEnvValue(envJson, "adminPassword") || "admin123").trim();

const smokeReset = truthy(getEnvValue(envJson, "smokeReset"));
const force = process.argv.includes("--force") || truthy(process.env.SMOKE_RESET_FORCE);
if (!smokeReset && !force) {
  console.log("🟡 Dev reset skipped (set smokeReset=true in Postman environment to enable, or pass --force)");
  process.exit(0);
}

const flushRedis = truthy(getEnvValue(envJson, "smokeResetFlushRedis"));
const branchId = (getEnvValue(envJson, "smokeBranchId") || "").trim();
const smokeRestockRaw = getEnvValue(envJson, "smokeRestock");
const smokeRestock = smokeRestockRaw === "" ? true : truthy(smokeRestockRaw);
const restockQty = toIntOr(getEnvValue(envJson, "smokeRestockQty"), 100);

try {
  // 1) login admin
  const login = await postJson(`${baseUrl}/api/v1/admin/login`, {
    username: adminUsername,
    password: adminPassword,
  });

  const token = String(login?.token ?? "");
  if (!token) die("Admin login returned empty token");

  // 2) reset dev state
  const qs = new URLSearchParams();
  if (branchId) qs.set("branchId", branchId);
  if (flushRedis) qs.set("flushRedis", "true");
  if (smokeRestock) {
    qs.set("restock", "true");
    qs.set("restockQty", String(restockQty));
  }

  const url = `${baseUrl}/api/v1/admin/maintenance/reset-dev-state${qs.toString() ? `?${qs.toString()}` : ""}`;
  const out = await postJson(
    url,
    { confirm: "RESET", flushRedis, restock: smokeRestock, restockQty: restockQty },
    { authorization: `Bearer ${token}` },
  );

  console.log("✅ Dev reset done:", {
    updatedTables: out?.db?.updatedTables,
    closedOpenSessions: out?.db?.closedOpenSessions,
    canceledReservations: out?.db?.canceledReservations,
    restockedBranchId: out?.db?.restockedBranchId,
    restockedQty: out?.db?.restockedQty,
    restockedStockRows: out?.db?.restockedStockRows,
    syncedMenuItemsStockQty: out?.db?.syncedMenuItemsStockQty,
    redisFlushed: out?.redisFlushed,
  });
} catch (e) {
  console.error("❌ Dev reset failed:", e?.message || e);
  process.exit(1);
}
