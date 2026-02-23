import { writeFileSync } from "node:fs";
import path from "node:path";

import type { Express } from "express";
import { createApp } from "../src/infrastructure/http/express/app.js";
import { env } from "../src/infrastructure/config/env.js";

type Endpoint = { method: string; path: string };

function uniqSorted(endpoints: Endpoint[]): Endpoint[] {
  const m = new Map<string, Endpoint>();
  for (const e of endpoints) {
    const key = `${e.method.toUpperCase()} ${e.path}`;
    if (!m.has(key)) m.set(key, { method: e.method.toUpperCase(), path: e.path });
  }
  return Array.from(m.values()).sort((a, b) => {
    if (a.path === b.path) return a.method.localeCompare(b.method);
    return a.path.localeCompare(b.path);
  });
}

function normalizePath(p: string): string {
  if (!p) return "/";
  // Avoid double slashes except protocol (not applicable here)
  return p.replace(/\/+/g, "/").replace(/\/$/, "") || "/";
}

function regexpToPath(regexp: any): string {
  if (!regexp) return "";
  if (regexp.fast_slash) return "";

  let src: string = regexp.source;

  // Common express mount regex: ^\/api\/v1\/?(?=\/|$)
  src = src
    .replace(/^\^\\\//, "/")
    .replace(/\\\/?\(\?=\\\/\|\$\)/g, "")
    .replace(/\(\?=\\\/\|\$\)/g, "")
    .replace(/\$\/?$/g, "")
    .replace(/\\\//g, "/");

  // Strip remaining anchors
  src = src.replace(/^\^/, "").replace(/\$$/, "");

  // Best-effort cleanup for non-literal segments
  src = src.replace(/\(\?:\(\[\^\/\]\+\?\)\)/g, "/:param");

  return src;
}

function walkStack(stack: any[], prefix: string, out: Endpoint[]) {
  for (const layer of stack) {
    if (layer.route && layer.route.path) {
      const routePath = Array.isArray(layer.route.path) ? layer.route.path.join("|") : String(layer.route.path);
      const methods = Object.keys(layer.route.methods || {}).filter((m) => layer.route.methods[m]);
      for (const m of methods) {
        out.push({ method: m.toUpperCase(), path: normalizePath(prefix + routePath) });
      }
      continue;
    }

    if (layer.name === "router" && layer.handle && Array.isArray(layer.handle.stack)) {
      const mount = regexpToPath(layer.regexp);
      walkStack(layer.handle.stack, normalizePath(prefix + mount), out);
    }
  }
}

function listEndpoints(app: Express): Endpoint[] {
  const anyApp: any = app as any;
  const stack = anyApp?._router?.stack;
  if (!Array.isArray(stack)) return [];
  const out: Endpoint[] = [];
  walkStack(stack, "", out);
  return uniqSorted(out);
}

function toMarkdownTable(endpoints: Endpoint[]): string {
  const rows = endpoints.map((e) => `| ${e.method} | ${e.path} |`).join("\n");
  return `| Method | Path |\n|---|---|\n${rows}\n`;
}

function diff(a: Endpoint[], b: Endpoint[]): Endpoint[] {
  const setB = new Set(b.map((x) => `${x.method} ${x.path}`));
  return a.filter((x) => !setB.has(`${x.method} ${x.path}`));
}

function collect(legacyEnabled: boolean): Endpoint[] {
  // Mutate env in-process for generation purposes.
  (env as any).LEGACY_API_ENABLED = legacyEnabled;
  const app = createApp();
  return listEndpoints(app);
}

function main() {
  const now = new Date().toISOString();

  const epOff = collect(false);
  const epOn = collect(true);

  const canonOff = epOff.filter((e) => e.path.startsWith("/api/v1/"));
  const canonOn = epOn.filter((e) => e.path.startsWith("/api/v1/"));
  const legacyOn = epOn.filter((e) => e.path.startsWith("/api/") && !e.path.startsWith("/api/v1/"));

  const addedWhenLegacyOn = diff(canonOn, canonOff);

  const md = `# Hadilao API Route Map\n\nGenerated at: ${now}\n\n## Canonical routes (LEGACY_API_ENABLED=false)\n\n${toMarkdownTable(canonOff)}\n\n## Canonical additions when LEGACY_API_ENABLED=true\n\n> These routes are registered under **/api/v1/** only when the legacy flag is enabled (migration-only).\n\n${toMarkdownTable(addedWhenLegacyOn)}\n\n## Legacy mirror (/api/*) when LEGACY_API_ENABLED=true\n\n> When **LEGACY_API_ENABLED=false**, all **/api/** routes must return **404** (contract lock).\n\n${toMarkdownTable(legacyOn)}\n`;

  const outPath = path.resolve(process.cwd(), "ROUTE_MAP.md");
  writeFileSync(outPath, md, { encoding: "utf-8" });
  // eslint-disable-next-line no-console
  console.log(`✅ Wrote ${outPath} (canonical=${canonOff.length}, legacyOn=${legacyOn.length})`);
}

main();
