import crypto from "node:crypto";
import type { IClientRefreshTokenRepository } from "../../ports/repositories/IClientRefreshTokenRepository.js";
import { createClientAccessToken, createClientRefreshToken, verifyClientRefreshToken, type ClientRefreshPayload } from "../../../infrastructure/security/token.js";

export type RotateClientRefreshTokenInput = {
  refreshToken: string;
  userAgent?: string | null;
  ipAddress?: string | null;
};

export type RotateClientRefreshTokenResult = {
  accessToken: string;
  accessTokenExpiresAt: Date;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
};

export type RotateClientRefreshTokenConfig = {
  accessTokenSecret: string;
  accessTokenTtlMinutes: number;
  refreshTokenSecret: string;
  refreshTokenTtlDays: number;
  refreshHashSecret: string;
};

function hashRefreshToken(cfg: RotateClientRefreshTokenConfig, token: string): string {
  return crypto.createHmac("sha256", cfg.refreshHashSecret).update(token).digest("hex");
}

export class RotateClientRefreshToken {
  constructor(
    private refreshRepo: IClientRefreshTokenRepository,
    private cfg: RotateClientRefreshTokenConfig,
  ) {}

  async execute(input: RotateClientRefreshTokenInput): Promise<RotateClientRefreshTokenResult> {
    const token = String(input.refreshToken ?? "").trim();
    if (!token) throw new Error("INVALID_TOKEN");

    if (!this.cfg.accessTokenSecret || !this.cfg.refreshTokenSecret) throw new Error("CLIENT_TOKEN_SECRET_MISSING");
    if (!this.cfg.refreshHashSecret) throw new Error("CLIENT_REFRESH_HASH_SECRET_MISSING");

    let payload: ClientRefreshPayload;
    try {
      payload = verifyClientRefreshToken(token, this.cfg.refreshTokenSecret);
    } catch (e: any) {
      throw new Error(e?.message ?? "INVALID_TOKEN");
    }

    const now = new Date();
    const jti = payload.jti;
    const clientId = payload.sub;

    const stored = await this.refreshRepo.findByJti(jti);
    if (!stored) throw new Error("INVALID_TOKEN");

    // Reuse detection: token already revoked => revoke all and force re-login
    if (stored.revokedAt) {
      await this.refreshRepo.revokeAllForClient(clientId, now);
      throw new Error("REFRESH_TOKEN_REUSED");
    }

    const computedHash = hashRefreshToken(this.cfg, token);
    if (computedHash !== stored.tokenHash) {
      await this.refreshRepo.revokeAllForClient(clientId, now);
      throw new Error("REFRESH_TOKEN_REUSED");
    }

    const accessTtlSeconds = Math.floor(this.cfg.accessTokenTtlMinutes * 60);
    const refreshTtlSeconds = Math.floor(this.cfg.refreshTokenTtlDays * 24 * 60 * 60);

    const newAccess = createClientAccessToken({ sub: clientId }, this.cfg.accessTokenSecret, accessTtlSeconds);

    const newJti = crypto.randomUUID();
    const newRefresh = createClientRefreshToken({ sub: clientId, jti: newJti }, this.cfg.refreshTokenSecret, refreshTtlSeconds);

    // Atomic-ish rotation: mark old token revoked + create new token
    await this.refreshRepo.revokeByJti(jti, now, newJti);
    await this.refreshRepo.create({
      clientId,
      jti: newJti,
      tokenHash: hashRefreshToken(this.cfg, newRefresh),
      issuedAt: now,
      expiresAt: new Date(now.getTime() + refreshTtlSeconds * 1000),
      userAgent: input.userAgent ?? null,
      ipAddress: input.ipAddress ?? null,
    });

    return {
      accessToken: newAccess,
      accessTokenExpiresAt: new Date(Date.now() + accessTtlSeconds * 1000),
      refreshToken: newRefresh,
      refreshTokenExpiresAt: new Date(Date.now() + refreshTtlSeconds * 1000),
    };
  }
}
