import fs from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

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

function run(cmd, args) {
  // shell:true is critical on Windows so pnpm/newman resolution works (.cmd)
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: true });
  if (r.error) {
    console.error("❌ spawn error:", r.error);
    process.exit(1);
  }
  if (typeof r.status === "number" && r.status !== 0) {
    process.exit(r.status);
  }
}

const [envPath, collectionPath, timeoutMsStr, folder] = process.argv.slice(2);

if (!envPath || !collectionPath) {
  die("Usage: node scripts/smoke/run-smoke.mjs <env.json> <collection.json> <timeoutMs> [folderName]");
}

const timeoutMs = Number(timeoutMsStr || "30000");
if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) die(`Invalid timeout: ${timeoutMsStr}`);

const envJson = readJson(envPath);
const baseUrl = getEnvValue(envJson, "baseUrl").trim().replace(/\/+$/, "");
if (!baseUrl) die(`Postman env missing baseUrl: ${envPath}`);

const adminUsername = (getEnvValue(envJson, "adminUsername") || "admin").trim();
const adminPassword = (getEnvValue(envJson, "adminPassword") || "admin123").trim();

// 1) wait for API health
run("node", ["scripts/smoke/wait-for-health.mjs", envPath, String(timeoutMs)]);

// 2) ensure admin exists for smoke
run("node", ["scripts/admin-create.js", adminUsername, adminPassword]);
console.log("✅ Admin user upserted:", { username: adminUsername });

// 2.5) Optional: hard reset dev state to avoid NO_TABLE_AVAILABLE from previous runs
run("node", ["scripts/smoke/reset-dev-state.mjs", envPath]);

// 3) run newman (via pnpm exec for workspace-safe resolution)
const newmanArgs = [
  "exec",
  "newman",
  "run",
  collectionPath,
  "-e",
  envPath,
  "--reporters",
  "cli",
  "--bail",
];

// Export environment after run so we can chain further smoke steps (realtime, etc.)
const exportEnvPath = path.join(os.tmpdir(), `hadilao_smoke_env_${Date.now()}.json`);
newmanArgs.push("--export-environment", exportEnvPath);
if (folder) {
  newmanArgs.push("--folder", folder);
}

run("pnpm", newmanArgs);

// 4) Optional realtime sanity (enabled via postman env: smokeRealtime=true)
try {
  const exported = readJson(exportEnvPath);
  const smokeRealtime = truthy(getEnvValue(exported, "smokeRealtime"));

  if (smokeRealtime) {
    // ✅ IMPORTANT: Postman collection (đặc biệt Negative Pack) có thể mở session/chiếm bàn
    // => reset LẦN 2 để trả bàn về AVAILABLE trước khi chạy realtime sanity
    console.log("🧹 Post-run reset before realtime sanity...");
    run("node", ["scripts/smoke/reset-dev-state.mjs", exportEnvPath]);

    // Chạy realtime sanity sau khi đã dọn dẹp môi trường
    run("node", ["scripts/smoke/realtime-sanity.mjs", exportEnvPath, String(timeoutMs)]);
  } else {
    console.log("🟡 Realtime sanity skipped (set smokeRealtime=true in Postman environment to enable)");
  }
} catch (e) {
  console.log("🟡 Realtime sanity skipped (cannot read/process exported env)");
}
