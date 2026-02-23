import crypto from "crypto";

export type SlowQuerySample = {
  ts: string;
  rid?: string;
  op: string;
  durationMs: number;
  fingerprint: string;
  sqlPreview: string;
};

const MAX_SAMPLES = 250;
const samples: SlowQuerySample[] = [];

function truncate(s: string, max = 800): string {
  const v = String(s ?? "");
  return v.length <= max ? v : `${v.slice(0, max)}...`;
}

export function fingerprintSql(sql: string): string {
  const normalized = String(sql ?? "")
    .replace(/\/\*[^]*?\*\//g, " ")
    .replace(/--.*$/gm, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/'[^']*'/g, "?")
    .replace(/"[^"]*"/g, "?")
    .replace(/\b\d+\b/g, "?")
    .toLowerCase();

  return crypto.createHash("sha1").update(normalized).digest("hex").slice(0, 16);
}

export function pushSlowQuerySample(sample: Omit<SlowQuerySample, "ts">): void {
  const full: SlowQuerySample = { ts: new Date().toISOString(), ...sample, sqlPreview: truncate(sample.sqlPreview) };
  samples.push(full);
  if (samples.length > MAX_SAMPLES) samples.splice(0, samples.length - MAX_SAMPLES);
}

export function listSlowQuerySamples(opts?: { limit?: number; minMs?: number }): SlowQuerySample[] {
  const limit = Math.max(1, Math.min(opts?.limit ?? 100, 500));
  const minMs = Math.max(0, opts?.minMs ?? 0);
  return samples
    .filter((s) => s.durationMs >= minMs)
    .slice(-limit)
    .reverse();
}
