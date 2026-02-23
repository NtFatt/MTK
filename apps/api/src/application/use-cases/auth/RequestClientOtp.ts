import crypto from "node:crypto";
import type { IClientRepository } from "../../ports/repositories/IClientRepository.js";
import type { IOtpRepository, OtpPurpose } from "../../ports/repositories/IOtpRepository.js";

export type RequestClientOtpInput = {
  phone: string;
  purpose: OtpPurpose;
};

export type RequestClientOtpResult = {
  otpId: string;
  expiresAt: Date;
  devEchoOtp?: string;
};

export type RequestClientOtpConfig = {
  otpHashSecret: string;
  otpTtlSeconds: number;
  maxAttempts: number;
  devEchoEnabled: boolean;
  devFixedCode?: string;
};

function normalizePhone(p: string): string {
  return p.replace(/\s+/g, "").trim();
}

function genOtpCode(cfg: RequestClientOtpConfig): string {
  if (cfg.devEchoEnabled && cfg.devFixedCode) return cfg.devFixedCode;
  const n = crypto.randomInt(0, 1_000_000);
  return String(n).padStart(6, "0");
}

function hashOtp(cfg: RequestClientOtpConfig, phone: string, purpose: OtpPurpose, otp: string): string {
  // Include purpose + phone to prevent replay across accounts/purposes
  return crypto
    .createHmac("sha256", cfg.otpHashSecret)
    .update(`${phone}:${purpose}:${otp}`)
    .digest("hex");
}

export class RequestClientOtp {
  constructor(
    private clientRepo: IClientRepository,
    private otpRepo: IOtpRepository,
    private cfg: RequestClientOtpConfig,
  ) {}

  async execute(input: RequestClientOtpInput): Promise<RequestClientOtpResult> {
    const phone = normalizePhone(input.phone);
    if (!phone) throw new Error("PHONE_REQUIRED");

    if (!this.cfg.otpHashSecret) throw new Error("OTP_SECRET_MISSING");

    const purpose = input.purpose;
    const existing = await this.clientRepo.findByPhone(phone);

    if (purpose === "LOGIN" && !existing) throw new Error("CLIENT_NOT_FOUND");
    if (purpose === "REGISTER" && existing) throw new Error("CLIENT_ALREADY_EXISTS");

    // Invalidate previous pending OTPs (avoid multiple active codes)
    await this.otpRepo.expireOtherPending(phone, purpose);

    const otp = genOtpCode(this.cfg);
    const otpHash = hashOtp(this.cfg, phone, purpose, otp);

    const expiresAt = new Date(Date.now() + this.cfg.otpTtlSeconds * 1000);
    const created = await this.otpRepo.createRequest({
      phone,
      otpHash,
      purpose,
      expiresAt,
      maxAttempts: this.cfg.maxAttempts,
    });

    return {
      otpId: created.otpId,
      expiresAt: created.expiresAt,
      ...(this.cfg.devEchoEnabled ? { devEchoOtp: otp } : {}),
    };
  }
}
