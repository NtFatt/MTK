import crypto from "node:crypto";

function b64u(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function unb64u(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}
function signHmac(secret: string, data: string): string {
  return b64u(crypto.createHmac("sha256", secret).update(data).digest());
}

type JwtHeader = { alg: "HS256"; typ: "JWT" };
const DEFAULT_HEADER: JwtHeader = { alg: "HS256", typ: "JWT" };

function createToken<TPayload extends { iat: number; exp: number }>(payload: TPayload, secret: string): string {
  const header = b64u(Buffer.from(JSON.stringify(DEFAULT_HEADER), "utf8"));
  const payloadPart = b64u(Buffer.from(JSON.stringify(payload), "utf8"));
  const toSign = `${header}.${payloadPart}`;
  const sig = signHmac(secret, toSign);
  return `${toSign}.${sig}`;
}

function verifyToken<T>(token: string, secret: string): T {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("INVALID_TOKEN");
  const [h, p, s] = parts as [string, string, string];
  const expected = signHmac(secret, `${h}.${p}`);
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(s))) throw new Error("INVALID_TOKEN");

  let payload: any;
  try {
    payload = JSON.parse(unb64u(p).toString("utf8"));
  } catch {
    throw new Error("INVALID_TOKEN");
  }
  const now = Math.floor(Date.now() / 1000);
  if (!payload?.exp || now > Number(payload.exp)) throw new Error("TOKEN_EXPIRED");
  return payload as T;
}

// ===== Internal token (ADMIN + STAFF) =====
export type InternalActorType = "ADMIN" | "STAFF";
export type InternalRole = "ADMIN" | "BRANCH_MANAGER" | "STAFF" | "KITCHEN" | "CASHIER";

export type InternalActor = {
  actorType: InternalActorType;
  userId: string;
  username: string;
  role: InternalRole;
  branchId: string | null;
};

export type InternalTokenPayload = {
  sub: string;
  username: string;
  actorType: InternalActorType;
  role: InternalRole;
  branchId?: string | null;
  iat: number;
  exp: number;
};

export function createInternalToken(input: {
  secret: string;
  actor: InternalActor;
  ttlMinutes: number;
}): string {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + Math.max(1, Math.floor(input.ttlMinutes * 60));
  const payload: InternalTokenPayload = {
    sub: input.actor.userId,
    username: input.actor.username,
    actorType: input.actor.actorType,
    role: input.actor.role,
    ...(input.actor.branchId !== null ? { branchId: input.actor.branchId } : { branchId: null }),
    iat,
    exp,
  };
  return createToken(payload, input.secret);
}

export function verifyInternalToken(token: string, secret: string): InternalTokenPayload {
  const payload = verifyToken<any>(token, secret);
  if (!payload?.sub || !payload?.username || !payload?.role || !payload?.exp) throw new Error("INVALID_TOKEN");

  // Backward-compat: legacy internal tokens had no actorType/branchId.
  // We only accept those as ADMIN when role === 'ADMIN'.
  const actorType = payload.actorType ? String(payload.actorType) : "ADMIN";
  const role = String(payload.role);

  // Normalize legacy role name (DB/data may have been MANAGER in older versions).
  // We do NOT grant extra privileges: legacy MANAGER token must re-login.
  if (role === "MANAGER") throw new Error("INVALID_TOKEN");

  const out: InternalTokenPayload = {
    sub: String(payload.sub),
    username: String(payload.username),
    actorType: actorType as InternalActorType,
    role: role as InternalRole,
    branchId: payload.branchId !== undefined ? (payload.branchId === null ? null : String(payload.branchId)) : null,
    iat: Number(payload.iat ?? 0),
    exp: Number(payload.exp),
  };
  return out;
}

// ===== Admin token (strict ADMIN-only helper) =====
export type AdminTokenPayload = {
  sub: string;
  username: string;
  role: string;
  iat: number;
  exp: number;
};

export function createAdminToken(input: {
  secret: string;
  adminId: string;
  username: string;
  role: string;
  ttlMinutes: number;
}): string {
  // Keep compatibility with old callers.
  // Enforce ADMIN-only policy.
  if (String(input.role) !== "ADMIN") throw new Error("ADMIN_ROLE_ONLY");
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + Math.max(1, Math.floor(input.ttlMinutes * 60));
  const payload: AdminTokenPayload = { sub: input.adminId, username: input.username, role: "ADMIN", iat, exp };
  return createToken(payload, input.secret);
}

export function verifyAdminToken(token: string, secret: string): AdminTokenPayload {
  const payload = verifyToken<AdminTokenPayload>(token, secret);
  if (!payload?.sub || !payload?.username || !payload?.role || !payload?.exp) throw new Error("INVALID_TOKEN");
  if (String(payload.role) !== "ADMIN") throw new Error("INVALID_TOKEN");
  return payload;
}

// ===== Client access/refresh token =====
export type ClientAccessPayload = {
  sub: string;
  phone?: string;
  typ: "access";
  iat: number;
  exp: number;
};

export type ClientRefreshPayload = {
  sub: string;
  jti: string;
  typ: "refresh";
  iat: number;
  exp: number;
};

export function createClientAccessToken(
  input: { sub: string; phone?: string },
  secret: string,
  ttlSeconds: number,
): string {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + Math.max(10, Math.floor(ttlSeconds));
  const payload: ClientAccessPayload = {
    sub: input.sub,
    typ: "access",
    iat,
    exp,
    ...(input.phone ? { phone: input.phone } : {}),
  };
  return createToken(payload, secret);
}

export function verifyClientAccessToken(token: string, secret: string): ClientAccessPayload {
  const payload = verifyToken<ClientAccessPayload>(token, secret);
  if (!payload?.sub || payload.typ !== "access") throw new Error("INVALID_TOKEN");
  return payload;
}

export function createClientRefreshToken(
  input: { sub: string; jti: string },
  secret: string,
  ttlSeconds: number,
): string {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + Math.max(60, Math.floor(ttlSeconds));
  const payload: ClientRefreshPayload = { sub: input.sub, jti: input.jti, typ: "refresh", iat, exp };
  return createToken(payload, secret);
}

export function verifyClientRefreshToken(token: string, secret: string): ClientRefreshPayload {
  const payload = verifyToken<ClientRefreshPayload>(token, secret);
  if (!payload?.sub || !payload?.jti || payload.typ !== "refresh") throw new Error("INVALID_TOKEN");
  return payload;
}
