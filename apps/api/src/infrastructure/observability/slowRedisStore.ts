import crypto from "crypto";

export type SlowRedisSample = {
  ts: string;
  rid?: string;
  cmd: string;
  durationMs: number;
  fingerprint: string;
  argsPreview: string;
};

const MAX_SAMPLES = 250;
const samples: SlowRedisSample[] = [];

function truncate(s: string, max = 500): string {
  const v = String(s ?? "");
  return v.length <= max ? v : `${v.slice(0, max)}...`;
}

export function fingerprintRedis(cmd: string, args: readonly unknown[]): string {
  const normalized = `${String(cmd ?? "").toUpperCase()} ${args
    .map((a) => {
      const s = String(a ?? "");
      if (s.length > 32) return "...";
      if (/^\d+$/.test(s)) return "?";
      return s;
    })
    .join(" ")}`;
  return crypto.createHash("sha1").update(normalized).digest("hex").slice(0, 16);
}

export function pushSlowRedisSample(sample: Omit<SlowRedisSample, "ts">): void {
  const full: SlowRedisSample = { ts: new Date().toISOString(), ...sample, argsPreview: truncate(sample.argsPreview) };
  samples.push(full);
  if (samples.length > MAX_SAMPLES) samples.splice(0, samples.length - MAX_SAMPLES);
}

export function listSlowRedisSamples(opts?: { limit?: number; minMs?: number }): SlowRedisSample[] {
  const limit = Math.max(1, Math.min(opts?.limit ?? 100, 500));
  const minMs = Math.max(0, opts?.minMs ?? 0);
  return samples
    .filter((s) => s.durationMs >= minMs)
    .slice(-limit)
    .reverse();
}
