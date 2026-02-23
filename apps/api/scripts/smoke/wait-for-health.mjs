import fs from "node:fs";

function getEnvValue(envJson, key) {
  const v = (envJson.values || []).find((x) => x.key === key);
  return v?.value;
}

function normalizeBaseRoot(baseUrl) {
  return String(baseUrl || "").trim().replace(/\/+$/, "");
}

async function main() {
  const envPath = process.argv[2];
  const timeoutMs = Number(process.argv[3] ?? 30000);

  if (!envPath) {
    console.error("Usage: node scripts/smoke/wait-for-health.mjs <postman_env.json> [timeoutMs]");
    process.exit(1);
  }

  const envJson = JSON.parse(fs.readFileSync(envPath, "utf8"));
  const baseRoot = normalizeBaseRoot(getEnvValue(envJson, "baseUrl") ?? getEnvValue(envJson, "BASE_URL"));

  if (!baseRoot) {
    console.error("❌ Missing baseUrl in Postman env file");
    process.exit(1);
  }

  const healthUrl = baseRoot.endsWith("/api/v1") ? `${baseRoot}/health` : `${baseRoot}/api/v1/health`;
  const start = Date.now();

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(healthUrl, { method: "GET" });
      if (res.ok) {
        console.log(`✅ API reachable: ${healthUrl}`);
        process.exit(0);
      }
    } catch {
      // ignore
    }
    await sleep(500);
  }

  console.error(`❌ API not reachable after ${timeoutMs}ms: ${healthUrl}`);
  console.error("Tip: run API first (pnpm dev) or check PORT/BASE_URL in .env and Postman env.");
  process.exit(1);
}

main();
