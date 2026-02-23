/**
 * Auth API (no auth header).
 *
 * Contract:
 * - Client OTP:    POST /api/v1/client/otp/request, POST /api/v1/client/otp/verify
 * - Client refresh:POST /api/v1/client/refresh
 * - Internal login:POST /api/v1/admin/login
 */
import { apiFetch } from "../../lib/apiFetch";
import { authStore } from "./authStore";
import type { AuthSession, Role } from "./types";

/** Decode JWT payload (no dependency). Returns null if invalid. */
export function decodeJwtClaims(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    let base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    // add padding if missing
    while (base64.length % 4 !== 0) base64 += "=";

    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );

    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function roleFromString(s: unknown): Role {
  const r = String(s ?? "").toUpperCase();
  const roles: Role[] = ["PUBLIC", "CLIENT", "STAFF", "KITCHEN", "CASHIER", "BRANCH_MANAGER", "ADMIN"];
  return roles.includes(r as Role) ? (r as Role) : "PUBLIC";
}

function normalizeBranchId(b: unknown): string | undefined {
  if (b == null) return undefined;
  const s = String(b).trim();
  return s.length ? s : undefined;
}

function getExpiresAtFromClaims(claims: Record<string, unknown> | null): number | undefined {
  const exp = (claims as any)?.exp;
  if (typeof exp === "number" && Number.isFinite(exp)) return exp * 1000; // exp is seconds
  return undefined;
}

/* =========================
 * CLIENT OTP
 * ========================= */

export type OtpRequestPayload = { phone: string };

export async function requestOtp(payload: OtpRequestPayload): Promise<unknown> {
  return apiFetch<unknown>("/client/otp/request", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type OtpVerifyPayload = { phone: string; otp: string };

type VerifyResponse = {
  accessToken?: string;
  refreshToken?: string;
  profile?: {
    id?: string | number;
    fullName?: string | null;
    role?: string;
    permissions?: string[];
    branchId?: string | number;
  };
  expiresAt?: string | number;
};

export async function verifyOtp(payload: OtpVerifyPayload): Promise<AuthSession> {
  const res = await apiFetch<VerifyResponse>("/client/otp/verify", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const accessToken = res?.accessToken;
  if (!accessToken || typeof accessToken !== "string") {
    throw new Error("Missing access token in verify response");
  }

  const claims = decodeJwtClaims(accessToken);
  const profile = res?.profile;

  const user = {
    id:
      profile?.id != null
        ? String(profile.id)
        : typeof (claims as any)?.sub === "string"
          ? (claims as any).sub
          : "",
    fullName: profile?.fullName ?? (typeof (claims as any)?.fullName === "string" ? (claims as any).fullName : undefined),
  };

  const role: Role =
    profile?.role != null ? roleFromString(profile.role) : ((claims as any)?.role ? roleFromString((claims as any).role) : "CLIENT");

  const permissions: string[] =
    Array.isArray(profile?.permissions)
      ? profile!.permissions!.filter((p): p is string => typeof p === "string")
      : Array.isArray((claims as any)?.permissions)
        ? ((claims as any).permissions as unknown[]).filter((p): p is string => typeof p === "string")
        : [];

  const branchId =
    normalizeBranchId(profile?.branchId) ?? normalizeBranchId((claims as any)?.branchId);

  const expiresAt =
    res?.expiresAt != null
      ? typeof res.expiresAt === "string"
        ? new Date(res.expiresAt).getTime()
        : Number(res.expiresAt)
      : getExpiresAtFromClaims(claims);

  return {
    accessToken,
    refreshToken: res?.refreshToken,
    user,
    role,
    permissions,
    branchId,
    expiresAt,
  };
}

/* =========================
 * CLIENT REFRESH
 * ========================= */

type RefreshResponse = {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string | number;
};

export async function refresh(): Promise<AuthSession | null> {
  const current = authStore.getState().session;
  if (!current) return null;

  // Contract: refresh only for CLIENT
  if (current.role !== "CLIENT") return null;

  const refreshToken = current.refreshToken;
  if (!refreshToken) return null;

  try {
    const res = await apiFetch<RefreshResponse>("/client/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });

    const accessToken = res?.accessToken;
    if (!accessToken || typeof accessToken !== "string") return null;

    const claims = decodeJwtClaims(accessToken);

    const role: Role = (claims as any)?.role ? roleFromString((claims as any).role) : current.role;

    const permissions: string[] = Array.isArray((claims as any)?.permissions)
      ? ((claims as any).permissions as unknown[]).filter((p): p is string => typeof p === "string")
      : current.permissions;

    const branchId = normalizeBranchId((claims as any)?.branchId) ?? normalizeBranchId(current.branchId);

    const expiresAt =
      res?.expiresAt != null
        ? typeof res.expiresAt === "string"
          ? new Date(res.expiresAt).getTime()
          : Number(res.expiresAt)
        : getExpiresAtFromClaims(claims) ?? current.expiresAt;

    return {
      ...current,
      accessToken,
      refreshToken: res?.refreshToken ?? refreshToken,
      role,
      permissions,
      branchId,
      expiresAt,
    };
  } catch {
    return null;
  }
}

/* =========================
 * INTERNAL ADMIN LOGIN
 * ========================= */

export type AdminLoginPayload = { username: string; password: string };

type AdminLoginResponse = {
  token?: string;
  accessToken?: string;
  profile?: {
    id?: string | number;
    fullName?: string | null;
    role?: string;
    permissions?: string[];
    branchId?: string | number;
  };
  expiresAt?: string | number;
};

export async function adminLogin(payload: AdminLoginPayload): Promise<AuthSession> {
  const res = await apiFetch<AdminLoginResponse | any>("/admin/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const accessToken =
    (typeof res?.token === "string" && res.token) ||
    (typeof res?.accessToken === "string" && res.accessToken) ||
    (typeof res?.data?.token === "string" && res.data.token) ||
    "";

  if (!accessToken) throw new Error("Admin login did not return token");

  const claims = decodeJwtClaims(accessToken);
  const profile = res?.profile ?? {};

  const user = {
    id:
      profile?.id != null
        ? String(profile.id)
        : typeof (claims as any)?.sub === "string"
          ? (claims as any).sub
          : payload.username,
    fullName: profile?.fullName ?? (typeof (claims as any)?.fullName === "string" ? (claims as any).fullName : undefined),
  };

  const role: Role =
    profile?.role != null ? roleFromString(profile.role) : ((claims as any)?.role ? roleFromString((claims as any).role) : "STAFF");

  const permissions: string[] =
    Array.isArray(profile?.permissions)
      ? (profile.permissions as unknown[]).filter((p): p is string => typeof p === "string")
      : Array.isArray((claims as any)?.permissions)
        ? ((claims as any).permissions as unknown[]).filter((p): p is string => typeof p === "string")
        : [];

  const branchId =
    normalizeBranchId(profile?.branchId) ?? normalizeBranchId((claims as any)?.branchId);

  const expiresAt =
    res?.expiresAt != null
      ? typeof res.expiresAt === "string"
        ? new Date(res.expiresAt).getTime()
        : Number(res.expiresAt)
      : getExpiresAtFromClaims(claims);

  return {
    accessToken,
    refreshToken: undefined, // internal: no refresh in contract
    user,
    role,
    permissions,
    branchId,
    expiresAt,
  };
}