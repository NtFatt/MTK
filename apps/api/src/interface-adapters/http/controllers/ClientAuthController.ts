import type { Request, Response } from "express";
import { z } from "zod";
import type { RequestClientOtp } from "../../../application/use-cases/auth/RequestClientOtp.js";
import type { VerifyClientOtp } from "../../../application/use-cases/auth/VerifyClientOtp.js";
import type { RotateClientRefreshToken } from "../../../application/use-cases/auth/RotateClientRefreshToken.js";
import type { LogoutClient } from "../../../application/use-cases/auth/LogoutClient.js";

const RequestOtpSchema = z.object({
  phone: z.string().min(6),
  purpose: z.enum(["LOGIN", "REGISTER"]).default("LOGIN"),
});

const VerifyOtpSchema = z.object({
  phone: z.string().min(6),
  purpose: z.enum(["LOGIN", "REGISTER"]).default("LOGIN"),
  otp: z.string().min(4),
});

const RefreshSchema = z.object({
  refreshToken: z.string().min(20),
});

export class ClientAuthController {
  constructor(
    private requestOtp: RequestClientOtp,
    private verifyOtp: VerifyClientOtp,
    private rotateRefresh: RotateClientRefreshToken,
    private logout: LogoutClient,
  ) {}

  request = async (req: Request, res: Response) => {
    const body = RequestOtpSchema.parse(req.body ?? {});
    const r = await this.requestOtp.execute({ phone: body.phone, purpose: body.purpose });
    return res.json({
      otpId: r.otpId,
      expiresAt: r.expiresAt,
      ...(r.devEchoOtp ? { devEchoOtp: r.devEchoOtp } : {}),
    });
  };

  verify = async (req: Request, res: Response) => {
    const body = VerifyOtpSchema.parse(req.body ?? {});
    const userAgent = String(req.headers["user-agent"] ?? "") || null;
    const ipAddress = String(req.ip ?? "") || null;

    const r = await this.verifyOtp.execute({
      phone: body.phone,
      purpose: body.purpose,
      otp: body.otp,
      userAgent,
      ipAddress,
    });

    return res.json(r);
  };

  refresh = async (req: Request, res: Response) => {
    const body = RefreshSchema.parse(req.body ?? {});
    const userAgent = String(req.headers["user-agent"] ?? "") || null;
    const ipAddress = String(req.ip ?? "") || null;

    const r = await this.rotateRefresh.execute({ refreshToken: body.refreshToken, userAgent, ipAddress });
    return res.json(r);
  };

  logoutHandler = async (req: Request, res: Response) => {
    const body = RefreshSchema.parse(req.body ?? {});
    const r = await this.logout.execute({ refreshToken: body.refreshToken });
    return res.json(r);
  };
}
