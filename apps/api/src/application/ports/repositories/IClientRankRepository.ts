export interface IClientRankRepository {
  getDiscountPercentByClientId(clientId: string): Promise<number>;
}
