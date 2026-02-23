import fs from "node:fs";
import { spawnSync } from "node:child_process";

function getBaseUrlFromEnvFile(envPath) {
  try {
    const raw = fs.readFileSync(envPath, "utf8");
    const json = JSON.parse(raw);
    const v = (json.values || []).find((x) => x && x.key === "baseUrl");
    return v?.value ? String(v.value) : "";
  } catch {
    return "";
  }
}

const envPath = process.argv[2] || "postman/Hadilao_Smoke_Local.postman_environment.json";
const timeout = process.argv[3] || "30000";

const baseUrl = getBaseUrlFromEnvFile(envPath) || process.env.BASE_URL || "http://localhost:3001";

console.log(`\n🧪 Negative pack -> ${baseUrl}`);

// 1) Run Postman Negative Collection
{
  const r = spawnSync(
    process.execPath,
    ["scripts/smoke/run-smoke.mjs", envPath, "postman/Hadilao_Smoke_Negative_v1.postman_collection.json", timeout],
    { stdio: "inherit", env: { ...process.env, BASE_URL: baseUrl } },
  );
  if (r.status !== 0) process.exit(r.status ?? 1);
}

// 2) NEG-09 Oversell race (deterministic)
{
  console.log("\n🧪 NEG-09 Oversell race (deterministic)");
  const r = spawnSync(
    process.execPath,
    ["scripts/smoke/oversell.mjs"],
    { stdio: "inherit", env: { ...process.env, BASE_URL: baseUrl } },
  );
  if (r.status !== 0) process.exit(r.status ?? 1);
}


// 3) Cleanup: reset dev state so later smokes (realtime, etc.) don't fail due to stale sessions/reservations
{
  console.log("\n🧹 Cleanup: reset dev state");
  const r = spawnSync(
    process.execPath,
    ["scripts/smoke/reset-dev-state.mjs", envPath, "--force"],
    { stdio: "inherit", env: { ...process.env, BASE_URL: baseUrl } },
  );
  if (r.status !== 0) {
    console.warn("⚠️ Cleanup reset-dev-state failed (continuing):", r.status);
  }
}

console.log("\n✅ Negative pack passed");
