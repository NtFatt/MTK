import type { IClientRefreshTokenRepository } from "../../ports/repositories/IClientRefreshTokenRepository.js";
import { verifyClientRefreshToken } from "../../../infrastructure/security/token.js";

export type LogoutClientInput = { refreshToken: string };

export type LogoutClientConfig = { refreshTokenSecret: string };

export class LogoutClient {
  constructor(
    private refreshRepo: IClientRefreshTokenRepository,
    private cfg: LogoutClientConfig,
  ) {}

  async execute(input: LogoutClientInput): Promise<{ ok: true }> {
    const token = String(input.refreshToken ?? "").trim();
    if (!token) throw new Error("INVALID_TOKEN");
    if (!this.cfg.refreshTokenSecret) throw new Error("CLIENT_TOKEN_SECRET_MISSING");

    const payload = verifyClientRefreshToken(token, this.cfg.refreshTokenSecret);
    const now = new Date();
    await this.refreshRepo.revokeByJti(payload.jti, now, null);
    return { ok: true };
  }
}
