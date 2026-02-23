import { z } from "zod";

/**
 * auth.ts
 *
 * Route map (ưu tiên):
 * - /api/v1/client/otp/request
 * - /api/v1/client/otp/verify
 * - /api/v1/client/refresh
 * - /api/v1/admin/login
 */

export const zRole = z.enum([
  "PUBLIC",
  "CLIENT",
  "ADMIN",
  "BRANCH_MANAGER",
  "STAFF",
  "KITCHEN",
  "CASHIER",
]);

export const zPermission = z.string().min(1);

export const zUserProfile = z
  .object({
    id: z.union([z.string(), z.number()]).optional(),
    username: z.string().optional(),
    fullName: z.string().nullable().optional(),
    role: zRole.optional(),
    permissions: z.array(zPermission).optional(),
    branchId: z.union([z.string(), z.number()]).optional(),
  })
  .partial();

export const zOtpRequestBody = z.object({
  // spec v7 không đóng chặt format, giữ minimal
  phone: z.string().min(6),
});

export const zOtpVerifyBody = z.object({
  phone: z.string().min(6),
  otp: z.string().min(3),
});

export const zAuthTokens = z
  .object({
    accessToken: z.string(),
    refreshToken: z.string().optional(),
    expiresAt: z.string().optional(),
  })
  .partial({ refreshToken: true, expiresAt: true });

export const zClientAuthResponse = z
  .object({
    tokens: zAuthTokens.optional(),
    accessToken: z.string().optional(),
    refreshToken: z.string().optional(),
    profile: zUserProfile.optional(),
  })
  .partial();

export const zAdminLoginBody = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const zAdminLoginResponse = z
  .object({
    accessToken: z.string(),
    refreshToken: z.string().optional(),
    profile: zUserProfile.optional(),
  })
  .partial({ refreshToken: true, profile: true });
