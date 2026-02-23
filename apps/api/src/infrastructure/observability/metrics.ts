/*
  Minimal Prometheus metrics (no external deps)

  Principles:
  - Keep label cardinality LOW (route normalization; no full URL labels).
  - Metrics are internal; do not treat as SoT.
*/

import os from "node:os";
import { monitorEventLoopDelay } from "node:perf_hooks";

type Labels = Record<string, string>;

function labelsKey(labels: Labels): string {
  const keys = Object.keys(labels).sort();
  return keys.map((k) => `${k}=${labels[k]}`).join(",");
}

function renderLabels(labels: Labels): string {
  const keys = Object.keys(labels).sort();
  if (keys.length === 0) return "";
  const pairs = keys.map((k) => `${k}="${String(labels[k]).replaceAll("\\\\", "\\\\\\\\").replaceAll('"', '\\"')}"`);
  return `{${pairs.join(",")}}`;
}

class Counter {
  private values = new Map<string, number>();
  constructor(public name: string, public help: string) {}

  inc(labels: Labels, v = 1) {
    const key = labelsKey(labels);
    const prev = this.values.get(key) ?? 0;
    this.values.set(key, prev + v);
  }

  render(): string {
    let out = `# HELP ${this.name} ${this.help}\n# TYPE ${this.name} counter\n`;
    for (const [k, val] of this.values.entries()) {
      const labels: Labels = {};
      if (k) {
        for (const pair of k.split(",")) {
          const [a, b] = pair.split("=");
          if (a && b !== undefined) labels[a] = b;
        }
      }
      out += `${this.name}${renderLabels(labels)} ${val}\n`;
    }
    return out;
  }
}

class Gauge {
  private values = new Map<string, number>();
  constructor(public name: string, public help: string) {}

  set(labels: Labels, v: number) {
    const key = labelsKey(labels);
    this.values.set(key, v);
  }

  inc(labels: Labels, v = 1) {
    const key = labelsKey(labels);
    const prev = this.values.get(key) ?? 0;
    this.values.set(key, prev + v);
  }

  render(): string {
    let out = `# HELP ${this.name} ${this.help}\n# TYPE ${this.name} gauge\n`;
    for (const [k, val] of this.values.entries()) {
      const labels: Labels = {};
      if (k) {
        for (const pair of k.split(",")) {
          const [a, b] = pair.split("=");
          if (a && b !== undefined) labels[a] = b;
        }
      }
      out += `${this.name}${renderLabels(labels)} ${val}\n`;
    }
    return out;
  }
}

class Histogram {
  private bucketCounts = new Map<string, number[]>();
  private sums = new Map<string, number>();
  private counts = new Map<string, number>();

  constructor(public name: string, public help: string, public buckets: number[]) {
    this.buckets = [...buckets].sort((a, b) => a - b);
  }

  observe(labels: Labels, v: number) {
    const key = labelsKey(labels);
    const buckets = this.bucketCounts.get(key) ?? new Array(this.buckets.length + 1).fill(0);

    let idx = this.buckets.findIndex((b) => v <= b);
    if (idx === -1) idx = this.buckets.length; // +Inf
    buckets[idx] += 1;

    this.bucketCounts.set(key, buckets);
    this.sums.set(key, (this.sums.get(key) ?? 0) + v);
    this.counts.set(key, (this.counts.get(key) ?? 0) + 1);
  }

  render(): string {
    let out = `# HELP ${this.name} ${this.help}\n# TYPE ${this.name} histogram\n`;

    for (const [k, counts] of this.bucketCounts.entries()) {
      const baseLabels: Labels = {};
      if (k) {
        for (const pair of k.split(",")) {
          const [a, b] = pair.split("=");
          if (a && b !== undefined) baseLabels[a] = b;
        }
      }

      let cumulative = 0;
      for (let i = 0; i < this.buckets.length; i++) {
        cumulative += counts[i] ?? 0;
        const le = this.buckets[i];
        out += `${this.name}_bucket${renderLabels({ ...baseLabels, le: String(le) })} ${cumulative}\n`;
      }

      cumulative += counts[this.buckets.length] ?? 0;
      out += `${this.name}_bucket${renderLabels({ ...baseLabels, le: "+Inf" })} ${cumulative}\n`;

      const sum = this.sums.get(k) ?? 0;
      const count = this.counts.get(k) ?? 0;
      out += `${this.name}_sum${renderLabels(baseLabels)} ${sum}\n`;
      out += `${this.name}_count${renderLabels(baseLabels)} ${count}\n`;
    }

    return out;
  }
}

// -------- Runtime gauges (best-effort) --------
let elDelay: any = null;
try {
  elDelay = monitorEventLoopDelay({ resolution: 20 });
  elDelay.enable();
} catch {
  elDelay = null;
}

function normalizeRoute(raw: string | undefined): string {
  const s0 = String(raw ?? "").split("?")[0] ?? "";
  if (!s0) return "unknown";

  let s = s0;

  // Replace UUID-ish tokens
  s = s.replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, ":id");
  // Replace long hex strings / hashes
  s = s.replace(/\b[0-9a-f]{16,}\b/gi, ":id");
  // Replace numeric path segments
  s = s.replace(/\/(\d+)(?=\/|$)/g, "/:id");

  // Collapse repeated slashes
  s = s.replace(/\/+/g, "/");

  return s;
}

export const metrics = {
  // HTTP
  httpRequestsTotal: new Counter("hadilao_http_requests_total", "Total HTTP requests"),
  httpRequestDurationMs: new Histogram(
    "hadilao_http_request_duration_ms",
    "HTTP request duration in milliseconds",
    [5, 10, 25, 50, 100, 200, 500, 1000, 2000, 5000],
  ),
  httpInFlight: new Gauge("hadilao_http_in_flight", "HTTP requests currently in-flight"),
  httpErrorsTotal: new Counter("hadilao_http_errors_total", "Total HTTP error responses (4xx/5xx)"),

  // MySQL
  dbQueriesTotal: new Counter("hadilao_db_queries_total", "Total MySQL queries (query/execute)"),
  dbQueryDurationMs: new Histogram(
    "hadilao_db_query_duration_ms",
    "MySQL query duration in milliseconds",
    [1, 2, 5, 10, 25, 50, 100, 200, 500, 1000, 2000],
  ),
  dbSlowQueriesTotal: new Counter("hadilao_db_slow_queries_total", "Total slow MySQL queries"),

  // Redis
  redisCommandsTotal: new Counter("hadilao_redis_commands_total", "Total Redis commands"),
  redisCommandDurationMs: new Histogram(
    "hadilao_redis_command_duration_ms",
    "Redis command duration in milliseconds",
    [0.5, 1, 2, 5, 10, 25, 50, 100, 200, 500, 1000],
  ),
  redisSlowCommandsTotal: new Counter("hadilao_redis_slow_commands_total", "Total slow Redis commands"),

  // Runtime
  buildInfo: new Gauge("hadilao_build_info", "Build info (value=1)") ,
  processUptimeSeconds: new Gauge("hadilao_process_uptime_seconds", "Process uptime in seconds"),
  processResidentMemoryBytes: new Gauge("hadilao_process_resident_memory_bytes", "Process RSS memory in bytes"),
  processHeapUsedBytes: new Gauge("hadilao_process_heap_used_bytes", "Process heap used in bytes"),
  processHeapTotalBytes: new Gauge("hadilao_process_heap_total_bytes", "Process heap total in bytes"),
  eventLoopDelayMeanMs: new Gauge("hadilao_event_loop_delay_mean_ms", "Event loop delay mean in ms"),
  eventLoopDelayP99Ms: new Gauge("hadilao_event_loop_delay_p99_ms", "Event loop delay p99 in ms"),
  systemLoad1: new Gauge("hadilao_system_load1", "System load average (1m)"),

  // Inventory drift control (Phase-2)
  inventoryRehydrateRunsTotal: new Counter(
    "hadilao_inventory_stock_rehydrate_runs_total",
    "Total inventory stock rehydrate runs",
  ),
  inventoryRehydrateScannedLast: new Gauge(
    "hadilao_inventory_stock_rehydrate_scanned_last",
    "Last inventory stock rehydrate scanned count",
  ),
  inventoryRehydrateCorrectedLast: new Gauge(
    "hadilao_inventory_stock_rehydrate_corrected_last",
    "Last inventory stock rehydrate corrected count",
  ),
  inventoryStockDriftMaxAbsLast: new Gauge(
    "hadilao_inventory_stock_drift_max_abs_last",
    "Last inventory stock drift max absolute value",
  ),
  inventoryStockDriftTotalAbsLast: new Gauge(
    "hadilao_inventory_stock_drift_total_abs_last",
    "Last inventory stock drift total absolute value",
  ),
  inventoryRehydrateLastTimestampSeconds: new Gauge(
    "hadilao_inventory_stock_rehydrate_last_timestamp_seconds",
    "Last inventory stock rehydrate timestamp (unix seconds)",
  ),
  inventoryRehydrateSkippedTotal: new Counter(
    "hadilao_inventory_stock_rehydrate_skipped_total",
    "Total inventory stock rehydrate skipped due to lock contention",
  ),

  render(): string {
    // dynamic gauges
    try {
      this.processUptimeSeconds.set({}, Math.floor(process.uptime()));
      this.processResidentMemoryBytes.set({}, process.memoryUsage().rss);
      this.processHeapUsedBytes.set({}, process.memoryUsage().heapUsed);
      this.processHeapTotalBytes.set({}, process.memoryUsage().heapTotal);
      this.systemLoad1.set({}, os.loadavg?.()[0] ?? 0);

      const version = process.env.npm_package_version ?? "0.0.0";
      this.buildInfo.set({ service: "hadilao-api", version, node: process.version, platform: process.platform }, 1);

      if (elDelay) {
        const meanMs = Number(elDelay.mean) / 1e6;
        const p99Ms = Number(elDelay.percentile(99)) / 1e6;
        this.eventLoopDelayMeanMs.set({}, Math.round(meanMs * 1000) / 1000);
        this.eventLoopDelayP99Ms.set({}, Math.round(p99Ms * 1000) / 1000);
      }
    } catch {
      // ignore
    }

    return (
      this.httpRequestsTotal.render() +
      "\n" +
      this.httpRequestDurationMs.render() +
      "\n" +
      this.httpInFlight.render() +
      "\n" +
      this.httpErrorsTotal.render() +
      "\n" +
      this.dbQueriesTotal.render() +
      "\n" +
      this.dbQueryDurationMs.render() +
      "\n" +
      this.dbSlowQueriesTotal.render() +
      "\n" +
      this.redisCommandsTotal.render() +
      "\n" +
      this.redisCommandDurationMs.render() +
      "\n" +
      this.redisSlowCommandsTotal.render() +
      "\n" +
      this.buildInfo.render() +
      "\n" +
      this.processUptimeSeconds.render() +
      "\n" +
      this.processResidentMemoryBytes.render() +
      "\n" +
      this.processHeapUsedBytes.render() +
      "\n" +
      this.processHeapTotalBytes.render() +
      "\n" +
      this.eventLoopDelayMeanMs.render() +
      "\n" +
      this.eventLoopDelayP99Ms.render() +
      "\n" +
      this.systemLoad1.render() +
      "\n" +
      this.inventoryRehydrateRunsTotal.render() +
      "\n" +
      this.inventoryRehydrateSkippedTotal.render() +
      "\n" +
      this.inventoryRehydrateScannedLast.render() +
      "\n" +
      this.inventoryRehydrateCorrectedLast.render() +
      "\n" +
      this.inventoryStockDriftMaxAbsLast.render() +
      "\n" +
      this.inventoryStockDriftTotalAbsLast.render() +
      "\n" +
      this.inventoryRehydrateLastTimestampSeconds.render()
    );
  },
};

export function observeHttp(method: string, status: number, durationMs: number, route?: string) {
  const routeLabel = normalizeRoute(route);
  const labels = {
    method: method.toUpperCase(),
    status: String(status),
    route: routeLabel,
  };
  metrics.httpRequestsTotal.inc(labels, 1);
  metrics.httpRequestDurationMs.observe(labels, durationMs);

  if (status >= 400) {
    metrics.httpErrorsTotal.inc(
      {
        class: status >= 500 ? "5xx" : "4xx",
        route: routeLabel,
      },
      1,
    );
  }
}

export function incHttpInFlight() {
  metrics.httpInFlight.inc({}, 1);
}

export function decHttpInFlight() {
  metrics.httpInFlight.inc({}, -1);
}

export function observeDb(op: string, durationMs: number) {
  metrics.dbQueriesTotal.inc({ op }, 1);
  metrics.dbQueryDurationMs.observe({ op }, durationMs);
}

export function observeDbSlow(op: string) {
  metrics.dbSlowQueriesTotal.inc({ op }, 1);
}

export function observeRedis(cmd: string, durationMs: number) {
  const c = String(cmd ?? "").toUpperCase();
  metrics.redisCommandsTotal.inc({ cmd: c }, 1);
  metrics.redisCommandDurationMs.observe({ cmd: c }, durationMs);
}

export function observeRedisSlow(cmd: string) {
  const c = String(cmd ?? "").toUpperCase();
  metrics.redisSlowCommandsTotal.inc({ cmd: c }, 1);
}

export function observeInventoryRehydrate(input: {
  ok: boolean;
  skipped?: boolean;
  scanned: number;
  corrected: number;
  maxAbsDrift: number;
  totalAbsDrift: number;
  runAtIso: string;
}) {
  if (input.skipped) {
    metrics.inventoryRehydrateSkippedTotal.inc({}, 1);
    return;
  }

  metrics.inventoryRehydrateRunsTotal.inc({ result: input.ok ? "ok" : "err" }, 1);

  metrics.inventoryRehydrateScannedLast.set({}, input.scanned);
  metrics.inventoryRehydrateCorrectedLast.set({}, input.corrected);
  metrics.inventoryStockDriftMaxAbsLast.set({}, input.maxAbsDrift);
  metrics.inventoryStockDriftTotalAbsLast.set({}, input.totalAbsDrift);

  const ts = Date.parse(input.runAtIso);
  if (!Number.isNaN(ts)) metrics.inventoryRehydrateLastTimestampSeconds.set({}, Math.floor(ts / 1000));
}
