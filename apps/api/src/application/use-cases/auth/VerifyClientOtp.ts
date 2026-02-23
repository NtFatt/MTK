import crypto from "node:crypto";
import type { IClientRepository, ClientRecord } from "../../ports/repositories/IClientRepository.js";
import type { IOtpRepository, OtpPurpose } from "../../ports/repositories/IOtpRepository.js";
import type { IClientRefreshTokenRepository } from "../../ports/repositories/IClientRefreshTokenRepository.js";
import { createClientAccessToken, createClientRefreshToken } from "../../../infrastructure/security/token.js";

export type VerifyClientOtpInput = {
  phone: string;
  otp: string;
  purpose: OtpPurpose;
  userAgent?: string | null;
  ipAddress?: string | null;
};

export type VerifyClientOtpResult = {
  client: Pick<ClientRecord, "clientId" | "phone" | "status" | "fullName" | "email" | "rankId">;
  accessToken: string;
  accessTokenExpiresAt: Date;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
};

export type VerifyClientOtpConfig = {
  otpHashSecret: string;
  accessTokenSecret: string;
  accessTokenTtlMinutes: number;
  refreshTokenSecret: string;
  refreshTokenTtlDays: number;
  refreshHashSecret: string;
};

function normalizePhone(p: string): string {
  return p.replace(/\s+/g, "").trim();
}

function hashOtp(cfg: VerifyClientOtpConfig, phone: string, purpose: OtpPurpose, otp: string): string {
  return crypto
    .createHmac("sha256", cfg.otpHashSecret)
    .update(`${phone}:${purpose}:${otp}`)
    .digest("hex");
}

function hashRefreshToken(cfg: VerifyClientOtpConfig, token: string): string {
  return crypto.createHmac("sha256", cfg.refreshHashSecret).update(token).digest("hex");
}

export class VerifyClientOtp {
  constructor(
    private clientRepo: IClientRepository,
    private otpRepo: IOtpRepository,
    private refreshRepo: IClientRefreshTokenRepository,
    private cfg: VerifyClientOtpConfig,
  ) {}

  async execute(input: VerifyClientOtpInput): Promise<VerifyClientOtpResult> {
    const phone = normalizePhone(input.phone);
    const otp = String(input.otp ?? "").trim();
    if (!phone) throw new Error("PHONE_REQUIRED");
    if (!otp) throw new Error("OTP_REQUIRED");

    if (!this.cfg.otpHashSecret) throw new Error("OTP_SECRET_MISSING");
    if (!this.cfg.accessTokenSecret) throw new Error("CLIENT_TOKEN_SECRET_MISSING");
    if (!this.cfg.refreshTokenSecret) throw new Error("CLIENT_TOKEN_SECRET_MISSING");
    if (!this.cfg.refreshHashSecret) throw new Error("CLIENT_REFRESH_HASH_SECRET_MISSING");

    const purpose = input.purpose;

    const req = await this.otpRepo.findLatestActive(phone, purpose);
    if (!req) throw new Error("OTP_NOT_FOUND");

    if (req.attempts >= req.maxAttempts) throw new Error("OTP_TOO_MANY_ATTEMPTS");

    const computed = hashOtp(this.cfg, phone, purpose, otp);
    if (computed !== req.otpHash) {
      await this.otpRepo.incrementAttempts(req.otpId);
      throw new Error("OTP_INVALID");
    }

    const now = new Date();
    await this.otpRepo.markVerified(req.otpId, now);

    let client = await this.clientRepo.findByPhone(phone);
    if (purpose === "REGISTER") {
      if (!client) client = await this.clientRepo.createByPhone(phone);
    } else {
      if (!client) throw new Error("CLIENT_NOT_FOUND");
    }

    if (client.status === "BLOCKED") throw new Error("CLIENT_BLOCKED");

    const accessTtlSeconds = Math.floor(this.cfg.accessTokenTtlMinutes * 60);
    const refreshTtlSeconds = Math.floor(this.cfg.refreshTokenTtlDays * 24 * 60 * 60);

    const access = createClientAccessToken(
      {
        sub: client.clientId,
        phone: client.phone,
      },
      this.cfg.accessTokenSecret,
      accessTtlSeconds,
    );

    const refreshJti = crypto.randomUUID();
    const refresh = createClientRefreshToken(
      { sub: client.clientId, jti: refreshJti },
      this.cfg.refreshTokenSecret,
      refreshTtlSeconds,
    );

    await this.refreshRepo.create({
      clientId: client.clientId,
      jti: refreshJti,
      tokenHash: hashRefreshToken(this.cfg, refresh),
      issuedAt: now,
      expiresAt: new Date(now.getTime() + refreshTtlSeconds * 1000),
      userAgent: input.userAgent ?? null,
      ipAddress: input.ipAddress ?? null,
    });

    return {
      client: {
        clientId: client.clientId,
        phone: client.phone,
        status: client.status,
        fullName: client.fullName,
        email: client.email,
        rankId: client.rankId,
      },
      accessToken: access,
      accessTokenExpiresAt: new Date(Date.now() + accessTtlSeconds * 1000),
      refreshToken: refresh,
      refreshTokenExpiresAt: new Date(Date.now() + refreshTtlSeconds * 1000),
    };
  }
}
