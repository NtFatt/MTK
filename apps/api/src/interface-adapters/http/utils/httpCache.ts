import crypto from "node:crypto";
import type { Request, Response } from "express";

type CacheSpec = {
  /** Cache-Control max-age (seconds) */
  ttlSeconds: number;
  /** Cache visibility. Default: public */
  visibility?: "public" | "private";
  /** Extra Vary headers to append (comma-separated handled). */
  vary?: string[];
};

function weakEtagFromString(s: string): string {
  // Stable, cheap weak ETag.
  const h = crypto.createHash("sha1").update(s).digest("base64url");
  return `W/"${h}"`;
}

function appendVary(res: Response, values: string[]) {
  const cur = String(res.getHeader("Vary") ?? "").trim();
  const set = new Set(
    cur
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean),
  );
  for (const v of values) if (v) set.add(v);
  if (set.size > 0) res.setHeader("Vary", Array.from(set).join(", "));
}

/**
 * Adds caching headers + weak ETag + 304 support for public GET endpoints.
 * This is meant for demo/enterprise polish (SPEC 6.2: caching headers).
 */
export function sendCachedJson(req: Request, res: Response, body: any, spec: CacheSpec) {
  const ttl = Math.max(0, Number(spec.ttlSeconds) || 0);
  const visibility = spec.visibility ?? "public";

  // Cache-Control
  res.setHeader("Cache-Control", `${visibility}, max-age=${ttl}`);
  appendVary(res, ["Accept-Encoding", ...(spec.vary ?? [])]);

  // ETag
  const payload = `${req.originalUrl}|${JSON.stringify(body)}`;
  const etag = weakEtagFromString(payload);
  res.setHeader("ETag", etag);

  const inm = String(req.headers["if-none-match"] ?? "").trim();
  if (inm && inm === etag) {
    return res.status(304).end();
  }

  return res.json(body);
}
