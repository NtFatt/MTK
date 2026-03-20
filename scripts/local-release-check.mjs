import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import readline from "node:readline";

const rootDir = process.cwd();
const pnpmCmd = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const apiEnvPath = path.join(rootDir, "apps", "api", ".env");
const apiEnvExamplePath = path.join(rootDir, "apps", "api", ".env.example");
const apiHealthUrl = "http://localhost:3001/api/v1/health";

function pipeWithPrefix(stream, prefix, target) {
  if (!stream) return;
  const rl = readline.createInterface({ input: stream });
  rl.on("line", (line) => {
    target.write(`${prefix}${line}\n`);
  });
}

function waitForExit(child, timeoutMs = 5_000) {
  return new Promise((resolve) => {
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      resolve();
    }, timeoutMs);

    child.once("exit", () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve();
    });
  });
}

function runPnpm(args, extra = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(pnpmCmd, args, {
      cwd: rootDir,
      stdio: "inherit",
      shell: false,
      env: process.env,
      ...extra,
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Command failed: pnpm ${args.join(" ")} (code=${code ?? "null"}, signal=${signal ?? "none"})`));
    });
  });
}

async function ensureApiEnv() {
  if (fs.existsSync(apiEnvPath)) return;
  fs.copyFileSync(apiEnvExamplePath, apiEnvPath);
  console.log(`ℹ️ Created ${path.relative(rootDir, apiEnvPath)} from .env.example`);
}

async function waitForHealth(timeoutMs = 60_000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const res = await fetch(apiHealthUrl);
      if (res.ok) return;
    } catch {
      // server not ready yet
    }

    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  throw new Error(`API did not become healthy within ${timeoutMs}ms (${apiHealthUrl})`);
}

async function main() {
  await ensureApiEnv();

  console.log("\n==> Reset local data");
  await runPnpm(["local:reset"]);

  console.log("\n==> Static verification");
  await runPnpm(["verify:static"]);

  console.log("\n==> Start API for smoke verification");
  const apiProc = spawn(pnpmCmd, ["-C", "apps/api", "start"], {
    cwd: rootDir,
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
    env: process.env,
  });

  pipeWithPrefix(apiProc.stdout, "[api] ", process.stdout);
  pipeWithPrefix(apiProc.stderr, "[api] ", process.stderr);

  try {
    await waitForHealth();

    console.log("\n==> Smoke verification");
    await runPnpm(["verify:smokes"]);
  } finally {
    if (!apiProc.killed) {
      apiProc.kill("SIGTERM");
    }
    await waitForExit(apiProc);
  }
}

main().catch((error) => {
  console.error(`❌ release:check failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
