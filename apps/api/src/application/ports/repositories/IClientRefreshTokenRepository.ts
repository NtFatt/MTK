export type RefreshTokenRecord = {
  tokenId: string;
  clientId: string;
  jti: string;
  tokenHash: string;
  issuedAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedByJti: string | null;
};

export interface IClientRefreshTokenRepository {
  create(input: { clientId: string; jti: string; tokenHash: string; issuedAt: Date; expiresAt: Date; userAgent: string | null; ipAddress: string | null }): Promise<void>;
  findByJti(jti: string): Promise<RefreshTokenRecord | null>;
  revokeByJti(jti: string, when: Date, replacedByJti?: string | null): Promise<void>;
  revokeAllForClient(clientId: string, when: Date): Promise<void>;
}
