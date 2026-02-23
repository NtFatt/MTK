/**
 * OTP and refresh auth API. Uses apiFetch (no auth header).
 * Paths per PR-03: /api/v1/auth/otp/request, /api/v1/auth/otp/verify, /api/v1/auth/refresh.
 * DTO from @hadilao/contracts: phone for request; phone + otp for verify.
 */
import { apiFetch } from "../../lib/apiFetch";
import { authStore } from "./authStore";
import type { AuthSession, Role } from "./types";

/** Decode JWT payload (no dependency). Returns null if invalid. */
export function decodeJwtClaims(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
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

/** Request OTP — contract field: phone (confirm contract field name if BE differs). */
export type OtpRequestPayload = { phone: string };

export async function requestOtp(payload: OtpRequestPayload): Promise<unknown> {
  return apiFetch<unknown>("/auth/otp/request", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Verify OTP — contract: phone + otp. Returns session data to build AuthSession. */
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

function roleFromString(s: unknown): Role {
  const r = String(s ?? "").toUpperCase();
  const roles: Role[] = [
    "PUBLIC",
    "CLIENT",
    "STAFF",
    "KITCHEN",
    "CASHIER",
    "BRANCH_MANAGER",
    "ADMIN",
  ];
  return roles.includes(r as Role) ? (r as Role) : "PUBLIC";
}

export async function verifyOtp(payload: OtpVerifyPayload): Promise<AuthSession> {
  const res = await apiFetch<VerifyResponse>("/auth/otp/verify", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const accessToken = res.accessToken ?? (res as { accessToken?: string }).accessToken;
  if (!accessToken || typeof accessToken !== "string") {
    throw new Error("Missing access token in verify response");
  }

  const refreshToken = res.refreshToken;
  const profile = res.profile;
  const expiresAt =
    res.expiresAt != null
      ? typeof res.expiresAt === "string"
        ? new Date(res.expiresAt).getTime()
        : Number(res.expiresAt)
      : undefined;

  let role: Role = "PUBLIC";
  let permissions: string[] = [];
  let branchId: string | number | undefined;
  let user = { id: "", fullName: undefined as string | undefined };

  if (profile) {
    user = {
      id: String(profile.id ?? ""),
      fullName: profile.fullName ?? undefined,
    };
    role = profile.role ? roleFromString(profile.role) : "PUBLIC";
    permissions = Array.isArray(profile.permissions) ? profile.permissions : [];
    branchId = profile.branchId;
  }

  const claims = decodeJwtClaims(accessToken);
  if (claims) {
    if (!user.id && typeof claims.sub === "string") user.id = claims.sub;
    if (role === "PUBLIC" && claims.role) role = roleFromString(claims.role);
    if (permissions.length === 0 && Array.isArray(claims.permissions)) {
      permissions = claims.permissions.filter((p): p is string => typeof p === "string");
    }
    if (branchId == null && claims.branchId != null) {
      branchId = typeof claims.branchId === "number" ? claims.branchId : String(claims.branchId);
    }
    if (expiresAt == null && typeof claims.exp === "number") {
      // exp is seconds
      user = { ...user };
      // store expiresAt in session for client TTL
    }
  }

  const session: AuthSession = {
    accessToken,
    refreshToken,
    user,
    role,
    permissions,
    branchId,
    expiresAt,
  };
  return session;
}

type RefreshResponse = {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string | number;
};

/** Refresh tokens. Only call if endpoint exists in contracts. */
export async function refresh(): Promise<AuthSession | null> {
  const current = authStore.getState().session;
  const refreshToken = current?.refreshToken;
  if (!refreshToken) return null;

  try {
    const res = await apiFetch<RefreshResponse>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
    const accessToken = res?.accessToken;
    if (!accessToken || typeof accessToken !== "string") return null;

    const claims = decodeJwtClaims(accessToken);
    const role: Role = claims?.role ? roleFromString(claims.role) : current.role;
    const permissions = Array.isArray(claims?.permissions)
      ? (claims.permissions as string[])
      : current.permissions;
    const branchId =
      claims?.branchId != null
        ? typeof claims.branchId === "number"
          ? claims.branchId
          : String(claims.branchId)
        : current.branchId;
    const expiresAt =
      res.expiresAt != null
        ? typeof res.expiresAt === "string"
          ? new Date(res.expiresAt).getTime()
          : Number(res.expiresAt)
        : current.expiresAt;

    const session: AuthSession = {
      ...current,
      accessToken,
      refreshToken: res.refreshToken ?? refreshToken,
      role,
      permissions,
      branchId,
      expiresAt,
    };
    return session;
  } catch {
    return null;
  }
}
