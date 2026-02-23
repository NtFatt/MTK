export type ClientRecord = {
  clientId: string;
  phone: string;
  fullName: string | null;
  email: string | null;
  status: "ACTIVE" | "BLOCKED";
  rankId: string;
};

export interface IClientRepository {
  findByPhone(phone: string): Promise<ClientRecord | null>;
  findById(clientId: string): Promise<ClientRecord | null>;
  createByPhone(phone: string): Promise<ClientRecord>;
}
