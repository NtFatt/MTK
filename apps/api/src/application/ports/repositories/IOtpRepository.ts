export type OtpPurpose = "LOGIN" | "REGISTER";

export type OtpRequestRecord = {
  otpId: string;
  phone: string;
  otpHash: string;
  purpose: OtpPurpose;
  attempts: number;
  maxAttempts: number;
  expiresAt: Date;
  verifiedAt: Date | null;
  createdAt: Date;
};

export interface IOtpRepository {
  createRequest(input: { phone: string; otpHash: string; purpose: OtpPurpose; expiresAt: Date; maxAttempts: number }): Promise<{ otpId: string; expiresAt: Date }>;
  findLatestActive(phone: string, purpose: OtpPurpose): Promise<OtpRequestRecord | null>;
  incrementAttempts(otpId: string): Promise<void>;
  markVerified(otpId: string, when: Date): Promise<void>;
  expireOtherPending(phone: string, purpose: OtpPurpose): Promise<void>;
}
