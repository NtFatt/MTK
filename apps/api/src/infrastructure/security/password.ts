import crypto from "node:crypto";

const KEYLEN = 64;

function b64u(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function unb64u(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

export function hashPassword(plain: string, opts?: { N?: number; r?: number; p?: number; saltBytes?: number }): string {
  const N = opts?.N ?? 2 ** 14;
  const r = opts?.r ?? 8;
  const p = opts?.p ?? 1;
  const salt = crypto.randomBytes(opts?.saltBytes ?? 16);
  const key = crypto.scryptSync(plain, salt, KEYLEN, { N, r, p });
  return `scrypt$${N}$${r}$${p}$${b64u(salt)}$${b64u(Buffer.from(key))}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  try {
    const parts = stored.split("$");
    if (parts.length !== 6) return false;
    const [algo, Ns, rs, ps, saltB64, expectedB64] = parts as [
      string,
      string,
      string,
      string,
      string,
      string,
    ];
    if (algo !== "scrypt") return false;
    const N = Number(Ns);
    const r = Number(rs);
    const p = Number(ps);
    const salt = unb64u(saltB64);
    const expected = unb64u(expectedB64);
    const actual = crypto.scryptSync(plain, salt, expected.length, { N, r, p });
    return crypto.timingSafeEqual(Buffer.from(actual), expected);
  } catch {
    return false;
  }
}
